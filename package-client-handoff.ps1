param(
    [string]$OutputDir = (Join-Path $PSScriptRoot "handoff-packages"),
    [switch]$Json,
    [switch]$KeepStaging
)

$ErrorActionPreference = "Stop"

$repoRoot = $PSScriptRoot
$shipDir = Join-Path $repoRoot "ship-html5"
$stageRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("trash-dice-handoff-" + [System.Guid]::NewGuid().ToString("N"))
$stageShipDir = Join-Path $stageRoot "ship-html5"
$manifestPath = Join-Path $stageRoot "TRASH_DICE_CLIENT_HANDOFF_MANIFEST.json"

function Get-Sha256([string]$Path) {
    return (Get-FileHash -Algorithm SHA256 -LiteralPath $Path).Hash
}

function Get-RepoCommit {
    $commit = & git -C $repoRoot rev-parse --short=12 HEAD 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Unable to read source commit: $commit"
    }
    return (($commit | Select-Object -First 1).ToString().Trim())
}

function Get-RelativePathFromBase([string]$Base, [string]$Path) {
    $baseFull = (Resolve-Path -LiteralPath $Base).Path.TrimEnd([char[]]"\/")
    $pathFull = (Resolve-Path -LiteralPath $Path).Path
    return $pathFull.Substring($baseFull.Length).TrimStart([char[]]"\/")
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

function Remove-ThirdPartyAnalytics([string]$Path) {
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    $html = [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)
    $html = [regex]::Replace($html, '(?is)\s*<script\s+defer\s+src=["'']https://cloud\.umami\.is/script\.js["''][^>]*></script>\s*', "`r`n")
    $html = $html.Replace("sendUmamiEvent", "sendSecondaryAnalyticsEvent")
    $html = $html.Replace("window.umami", "window.__trashDiceNoThirdPartyAnalytics")
    [System.IO.File]::WriteAllText($Path, $html, $utf8NoBom)
}

function Remove-ThirdPartyAnalyticsTextReferences([string]$Path) {
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    $text = [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)
    $text = [regex]::Replace($text, '(?i)cloud\.umami\.is', 'third-party-analytics-host')
    $text = [regex]::Replace($text, '(?i)umami', 'third-party analytics')
    [System.IO.File]::WriteAllText($Path, $text, $utf8NoBom)
}

try {
    if (-not (Test-Path -LiteralPath $shipDir)) {
        throw "Missing ship-html5 directory: $shipDir"
    }

    New-Item -ItemType Directory -Force -Path $stageRoot | Out-Null
    New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
    Copy-Item -LiteralPath $shipDir -Destination $stageRoot -Recurse -Force

    $htmlFiles = @(
        (Join-Path $stageShipDir "index.html"),
        (Join-Path $stageShipDir "trash-dice.html")
    )

    foreach ($file in $htmlFiles) {
        if (-not (Test-Path -LiteralPath $file)) {
            throw "Missing staged handoff HTML: $file"
        }
        Remove-ThirdPartyAnalytics $file
    }

    $textExtensions = @(".html", ".js", ".css", ".json", ".txt", ".md", ".xml")
    $stagedTextFiles = @(Get-ChildItem -LiteralPath $stageRoot -Recurse -File | Where-Object {
        $textExtensions -contains $_.Extension.ToLowerInvariant()
    })
    foreach ($file in $stagedTextFiles) {
        if ($htmlFiles -notcontains $file.FullName) {
            Remove-ThirdPartyAnalyticsTextReferences $file.FullName
        }
    }

    $indexBytes = [System.IO.File]::ReadAllBytes($htmlFiles[0])
    $aliasBytes = [System.IO.File]::ReadAllBytes($htmlFiles[1])
    if (-not [System.Linq.Enumerable]::SequenceEqual($indexBytes, $aliasBytes)) {
        throw "Staged handoff HTML files are not byte-identical after analytics stripping."
    }

    Assert-ScriptParse $htmlFiles

    $indexHtml = [System.IO.File]::ReadAllText($htmlFiles[0], [System.Text.Encoding]::UTF8)
    $versionMatch = [regex]::Match($indexHtml, "const\s+TD_SHIP_VERSION\s*=\s*'([^']+)'")
    if (-not $versionMatch.Success) {
        throw "Unable to find TD_SHIP_VERSION in staged handoff HTML."
    }

    $version = $versionMatch.Groups[1].Value
    $commit = Get-RepoCommit
    $fileHashes = [ordered]@{}
    foreach ($file in $htmlFiles) {
        $relative = Get-RelativePathFromBase $stageRoot $file
        $fileHashes[$relative] = Get-Sha256 $file
    }

    $manifest = [PSCustomObject][ordered]@{
        status = "TRASH_DICE_CLIENT_HANDOFF_READY"
        version = $version
        sourceCommit = $commit
        createdAtUtc = (Get-Date).ToUniversalTime().ToString("o")
        packagedRoot = "ship-html5"
        thirdPartyAnalyticsStripped = $true
        htmlSha256 = $fileHashes
    }
    $manifest | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $manifestPath -Encoding UTF8

    $scanFiles = @(Get-ChildItem -LiteralPath $stageRoot -Recurse -File | Where-Object {
        $textExtensions -contains $_.Extension.ToLowerInvariant()
    })
    $thirdPartyHits = @($scanFiles | Select-String -Pattern "umami" -SimpleMatch)
    if ($thirdPartyHits.Count -gt 0) {
        $details = $thirdPartyHits | Select-Object -First 8 | ForEach-Object { "$($_.Path):$($_.LineNumber)" }
        throw "Staged handoff package still contains third-party analytics references: $($details -join ', ')"
    }

    $safeVersion = $version -replace '[^A-Za-z0-9._+-]', '_'
    $zipName = "trash-dice-client-handoff-$safeVersion-$commit.zip"
    $zipPath = Join-Path $OutputDir $zipName
    if (Test-Path -LiteralPath $zipPath) {
        Remove-Item -LiteralPath $zipPath -Force
    }

    Compress-Archive -Path (Join-Path $stageRoot "*") -DestinationPath $zipPath -CompressionLevel Optimal -Force
    $packageSha = Get-Sha256 $zipPath

    $report = [PSCustomObject][ordered]@{
        status = "TRASH_DICE_CLIENT_HANDOFF_PACKAGE_OK"
        version = $version
        sourceCommit = $commit
        package = $zipPath
        packageSha256 = $packageSha
        htmlSha256 = $fileHashes
        stagedRoot = if ($KeepStaging) { $stageRoot } else { $null }
    }

    if ($Json) {
        $report | ConvertTo-Json -Depth 5
    } else {
        Write-Host "$($report.status)"
        Write-Host "Version: $($report.version)"
        Write-Host "Source commit: $($report.sourceCommit)"
        Write-Host "Package: $($report.package)"
        Write-Host "Package SHA256: $($report.packageSha256)"
        foreach ($entry in $fileHashes.GetEnumerator()) {
            Write-Host "HTML SHA256: $($entry.Value)  $($entry.Key)"
        }
    }
} finally {
    if (-not $KeepStaging -and (Test-Path -LiteralPath $stageRoot)) {
        Remove-Item -LiteralPath $stageRoot -Recurse -Force
    }
}
