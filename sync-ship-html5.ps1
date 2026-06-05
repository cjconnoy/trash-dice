param(
    [switch]$CheckOnly,
    [switch]$Json
)

$ErrorActionPreference = "Stop"

$repoRoot = $PSScriptRoot
$studioRoot = "C:\Users\shove\OneDrive\Desktop\OneDayGames\studio-site"

$source = Join-Path $repoRoot "ship-html5\index.html"
$targets = @(
    (Join-Path $repoRoot "ship-html5\trash-dice.html"),
    (Join-Path $studioRoot "play\trash-dice\play\index.html"),
    (Join-Path $studioRoot "play\trash-dice\play\trash-dice.html")
)
$allFiles = @($source) + $targets

function Invoke-GitDiff([string]$Repo, [string[]]$Paths) {
    $output = & git -C $Repo diff -- $Paths 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "git diff failed in $Repo for $($Paths -join ', '): $output"
    }
    return ($output -join "`n")
}

function Assert-AlphaClean([string]$When) {
    $gameDiff = Invoke-GitDiff $repoRoot @("releases/alpha-complete", "play/trash-dice/alpha-complete")
    if ($gameDiff.Trim()) {
        throw "Alpha Complete game diff is not clean $When."
    }

    $studioDiff = Invoke-GitDiff $studioRoot @("play/trash-dice/alpha-complete")
    if ($studioDiff.Trim()) {
        throw "Alpha Complete studio diff is not clean $When."
    }
}

function Get-Sha256([string]$Path) {
    return (Get-FileHash -Algorithm SHA256 -LiteralPath $Path).Hash
}

function Assert-ScriptParse([string[]]$Files) {
    $nodeCode = @'
const fs = require('fs');
const files = process.argv.slice(1).filter(arg => arg !== '--');
for (const file of files) {
  const html = fs.readFileSync(file, 'utf8');
  const match = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!match) throw new Error(`${file}: missing script`);
  new Function(match[1]);
}
console.log(`script parse ok (${files.length} files)`);
'@
    & node -e $nodeCode -- @Files
    if ($LASTEXITCODE -ne 0) {
        throw "Script parse failed."
    }
}

if (-not (Test-Path -LiteralPath $source)) {
    throw "Missing ship source: $source"
}

Assert-AlphaClean "before sync"

if (-not $CheckOnly) {
    foreach ($target in $targets) {
        $targetDir = Split-Path -Parent $target
        if (-not (Test-Path -LiteralPath $targetDir)) {
            New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
        }
        Copy-Item -LiteralPath $source -Destination $target -Force
    }
}

foreach ($file in $allFiles) {
    if (-not (Test-Path -LiteralPath $file)) {
        throw "Missing mirror file: $file"
    }
}

$hashes = @{}
foreach ($file in $allFiles) {
    $hashes[$file] = Get-Sha256 $file
}

$uniqueHashes = @($hashes.Values | Select-Object -Unique)
if ($uniqueHashes.Count -ne 1) {
    $details = $hashes.GetEnumerator() | Sort-Object Name | ForEach-Object { "$($_.Value)  $($_.Name)" }
    throw "Ship mirrors do not hash-match:`n$($details -join "`n")"
}

Assert-ScriptParse $allFiles
Assert-AlphaClean "after sync"

$report = [PSCustomObject][ordered]@{
    status = "SHIP_HTML5_SYNC_OK"
    mode = if ($CheckOnly) { "check-only" } else { "synced" }
    hash = $uniqueHashes[0]
    files = $allFiles
}

if ($Json) {
    $report | ConvertTo-Json -Depth 4
} else {
    Write-Host "$($report.status): $($report.mode)"
    Write-Host "SHA256: $($report.hash)"
    foreach ($file in $allFiles) {
        Write-Host "OK: $file"
    }
}
