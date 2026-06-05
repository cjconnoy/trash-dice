param(
    [switch]$CheckOnly,
    [switch]$Json
)

$ErrorActionPreference = "Stop"

$repoRoot = $PSScriptRoot
$studioRoot = "C:\Users\shove\OneDrive\Desktop\OneDayGames\studio-site"

$source = Join-Path $repoRoot "ship-html5\index.html"
$sourceAssets = Join-Path $repoRoot "ship-html5\assets"
$studioAssets = Join-Path $studioRoot "play\trash-dice\play\assets"
$webAssetExtensions = @(".avif", ".gif", ".ico", ".jpg", ".jpeg", ".png", ".svg", ".webp")
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

function Get-RelativePathFromBase([string]$Base, [string]$Path) {
    $baseFull = (Resolve-Path -LiteralPath $Base).Path.TrimEnd([char[]]"\/")
    $pathFull = (Resolve-Path -LiteralPath $Path).Path
    return $pathFull.Substring($baseFull.Length).TrimStart([char[]]"\/")
}

function Get-ShipWebAssets {
    if (-not (Test-Path -LiteralPath $sourceAssets)) {
        return @()
    }

    return @(Get-ChildItem -LiteralPath $sourceAssets -Recurse -File | Where-Object {
        $webAssetExtensions -contains $_.Extension.ToLowerInvariant()
    })
}

function Sync-ShipAssets {
    if (-not (Test-Path -LiteralPath $sourceAssets)) {
        return
    }

    if (-not (Test-Path -LiteralPath $studioAssets)) {
        New-Item -ItemType Directory -Force -Path $studioAssets | Out-Null
    }

    foreach ($asset in Get-ShipWebAssets) {
        $relativePath = Get-RelativePathFromBase $sourceAssets $asset.FullName
        $targetAsset = Join-Path $studioAssets $relativePath
        $targetDir = Split-Path -Parent $targetAsset
        if (-not (Test-Path -LiteralPath $targetDir)) {
            New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
        }
        Copy-Item -LiteralPath $asset.FullName -Destination $targetAsset -Force
    }
}

function Assert-AssetMirror {
    if (-not (Test-Path -LiteralPath $sourceAssets)) {
        return
    }

    if (-not (Test-Path -LiteralPath $studioAssets)) {
        throw "Missing studio asset mirror: $studioAssets"
    }

    foreach ($asset in Get-ShipWebAssets) {
        $relativePath = Get-RelativePathFromBase $sourceAssets $asset.FullName
        $targetAsset = Join-Path $studioAssets $relativePath
        if (-not (Test-Path -LiteralPath $targetAsset)) {
            throw "Missing mirrored asset: $targetAsset"
        }

        $sourceHash = Get-Sha256 $asset.FullName
        $targetHash = Get-Sha256 $targetAsset
        if ($sourceHash -ne $targetHash) {
            throw "Asset mirror mismatch: $relativePath"
        }
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

    Sync-ShipAssets
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
Assert-AssetMirror
Assert-AlphaClean "after sync"

$report = [PSCustomObject][ordered]@{
    status = "SHIP_HTML5_SYNC_OK"
    mode = if ($CheckOnly) { "check-only" } else { "synced" }
    hash = $uniqueHashes[0]
    files = $allFiles
    assetRoot = if (Test-Path -LiteralPath $sourceAssets) { $sourceAssets } else { $null }
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
