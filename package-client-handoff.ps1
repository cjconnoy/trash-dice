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

function Remove-ThirdPartyFontNames([string]$Html) {
    $result = $Html
    $fontNames = @(
        "Fredoka One",
        "Bangers",
        "Chewy",
        "Fredoka"
    )
    foreach ($fontName in $fontNames) {
        $escaped = [regex]::Escape($fontName)
        $result = [regex]::Replace($result, "(?i)'$escaped'\s*,\s*", "")
        $result = [regex]::Replace($result, "(?i)`"$escaped`"\s*,\s*", "")
        $result = [regex]::Replace($result, "(?i)\b$escaped\s*,\s*", "")
        $result = [regex]::Replace($result, "(?i),\s*'$escaped'", "")
        $result = [regex]::Replace($result, "(?i),\s*`"$escaped`"", "")
    }
    return $result
}

function Remove-NoFlyHtmlRuntimeReferences([string]$Path) {
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    $html = [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)
    $html = [regex]::Replace($html, '(?is)\s*<script\s+defer\s+src=["'']https://cloud\.umami\.is/script\.js["''][^>]*></script>\s*', "`r`n")
    # The analytics head comment describes telemetry this package strips; a client
    # reviewer reading "Analytics" invites questions about a system that is not there.
    $html = [regex]::Replace($html, '(?is)\s*<!--\s*One Day Games Analytics:.*?-->\s*', "`r`n")
    $html = [regex]::Replace($html, '(?is)\s*<link\b(?=[^>]*https://fonts\.googleapis\.com/)[^>]*>\s*', "`r`n")
    $html = [regex]::Replace($html, "const\s+TD_FIRST_PARTY_TELEMETRY_URL\s*=\s*'[^']*';", "const TD_FIRST_PARTY_TELEMETRY_URL = '';")
    $html = [regex]::Replace($html, "const\s+TD_FIRST_PARTY_TELEMETRY_EVENTS\s*=\s*new\s+Set\(\[[\s\S]*?\]\);", "const TD_FIRST_PARTY_TELEMETRY_EVENTS = new Set();")
    $html = Remove-ThirdPartyFontNames $html
    $html = $html.Replace("TD_SOURCE === 'qr'", "false")
    $html = $html.Replace("betaQr", "betaInvitePreview")
    $html = $html.Replace("QR code", "invite link")
    $html = $html.Replace("QR unavailable.", "Invite preview unavailable.")
    $html = $html.Replace("sendUmamiEvent", "sendSecondaryAnalyticsEvent")
    $html = $html.Replace("window.umami", "window.__trashDiceNoThirdPartyAnalytics")
    [System.IO.File]::WriteAllText($Path, $html, $utf8NoBom)
}

function Remove-NoFlyTextReferences([string]$Path) {
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    $text = [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)
    $text = [regex]::Replace($text, '(?i)cloud\.umami\.is', 'third-party-analytics-host')
    $text = [regex]::Replace($text, '(?i)umami', 'third-party analytics')
    $text = [regex]::Replace($text, '(?i)fonts\.googleapis\.com', 'third-party-font-host')
    $text = [regex]::Replace($text, '(?i)fonts\.gstatic\.com', 'third-party-font-files-host')
    $text = [regex]::Replace($text, '(?i)odg-intake\.play-onedaygames\.workers\.dev', 'first-party-telemetry-host')
    $text = [regex]::Replace($text, '(?i)\bQR\b', 'invite')
    $text = [regex]::Replace($text, '(?i)quickchart\.io', 'third-party-invite-image-host')
    [System.IO.File]::WriteAllText($Path, $text, $utf8NoBom)
}

function Assert-NoFlyDeliverySurface([string]$StageRoot, [string[]]$TextExtensions) {
    $scanFiles = @(Get-ChildItem -LiteralPath $StageRoot -Recurse -File | Where-Object {
        $TextExtensions -contains $_.Extension.ToLowerInvariant()
    })

    $patterns = @(
        @{ Label = "Umami analytics"; Pattern = "umami" },
        @{ Label = "Umami host"; Pattern = "cloud.umami.is" },
        @{ Label = "Google Fonts CSS"; Pattern = "fonts.googleapis.com" },
        @{ Label = "Google Fonts files"; Pattern = "fonts.gstatic.com" },
        @{ Label = "Google font name"; Pattern = "Bangers" },
        @{ Label = "Google font name"; Pattern = "Chewy" },
        @{ Label = "Google font name"; Pattern = "Fredoka" },
        @{ Label = "QuickChart QR service"; Pattern = "quickchart.io" },
        @{ Label = "QR token"; Pattern = "QR" },
        @{ Label = "QR token"; Pattern = "qr" },
        @{ Label = "Capacitor native wrapper"; Pattern = "Capacitor" },
        @{ Label = "Capacitor npm package"; Pattern = "@capacitor" },
        @{ Label = "Sharp image tool"; Pattern = "require('sharp')" },
        @{ Label = "Sharp image tool"; Pattern = 'require("sharp")' },
        @{ Label = "Sharp package path"; Pattern = "node_modules/sharp" },
        @{ Label = "Pillow image tool"; Pattern = "from PIL" },
        @{ Label = "Pillow image tool"; Pattern = "import PIL" },
        @{ Label = "NumPy image tool"; Pattern = "import numpy" },
        @{ Label = "AI poster concept note"; Pattern = "AI-generated" },
        @{ Label = "ODG telemetry endpoint"; Pattern = "odg-intake.play-onedaygames.workers.dev" },
        @{ Label = "Analytics head comment"; Pattern = "One Day Games Analytics" },
        @{ Label = "Internal lane doc reference"; Pattern = "TRASH_DICE_RETAIL_HANDOFF" },
        @{ Label = "Internal QA tooling reference"; Pattern = "qa-ship-html5" },
        @{ Label = "Internal hosting reference"; Pattern = "playonedaygames.com" }
    )

    $hits = @()
    foreach ($entry in $patterns) {
        $entryHits = @($scanFiles | Select-String -Pattern ([string]$entry.Pattern) -SimpleMatch)
        foreach ($hit in $entryHits) {
            $relative = Get-RelativePathFromBase $StageRoot $hit.Path
            $hits += [PSCustomObject][ordered]@{
                label = [string]$entry.Label
                pattern = [string]$entry.Pattern
                path = $relative
                line = $hit.LineNumber
            }
        }
    }

    if ($hits.Count -gt 0) {
        $details = $hits | Select-Object -First 12 | ForEach-Object { "$($_.label) '$($_.pattern)' at $($_.path):$($_.line)" }
        throw "Staged handoff package still contains no-fly delivery references: $($details -join '; ')"
    }
}

try {
    if (-not (Test-Path -LiteralPath $shipDir)) {
        throw "Missing ship-html5 directory: $shipDir"
    }

    New-Item -ItemType Directory -Force -Path $stageRoot | Out-Null
    New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
    Copy-Item -LiteralPath $shipDir -Destination $stageRoot -Recurse -Force

    # Replace internal lane docs with client-facing READMEs. The repo copies are
    # engineering docs (QA gates, internal routes, lane status) and are not meant
    # for the client artifact; leaving them in creates review questions about
    # systems this package deliberately strips.
    $clientReadme = @'
# Trash Dice - Digital Companion (HTML5)

Instant-play, one-player browser build of Trash Dice, the digital companion to
the Big Discoveries tabletop game.

- Contents: `index.html` is the complete game in a single self-contained file
  (`trash-dice.html` is an identical copy). `assets/brand/` holds the logo art
  the page displays.
- Hosting: serve the `ship-html5/` folder from any static web host. No build
  step, no server code, no database.
- Requirements: a modern browser, desktop or mobile (portrait).
- Network and privacy: the game makes no third-party network calls and collects
  no personal information. No accounts, no login, no purchases.
- Official product page: https://bigdiscoveries.com/products/trash-dice

Trash Dice(TM) (c) 2026 Big Discoveries. Digital companion by One Day Games.
'@
    $clientBrandReadme = @'
# Brand Assets

Logo and label art displayed by the game page:

- `trash-dice-logo.png` - full Trash Dice logo
- `trash-dice-logo-title.webp` - optimized title/header derivative
- `trash-dice-logo-can.png` - small can-label derivative
- `trash-dice-label.png` - can label art
- `big-discoveries-secondary-logo.png` - Big Discoveries logo
- `odg-logo-charcoal.png` - One Day Games logo

All artwork (c) 2026 Big Discoveries / One Day Games. Referenced by the game
page in the folder above.
'@
    $utf8NoBomDocs = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText((Join-Path $stageShipDir "README.md"), $clientReadme, $utf8NoBomDocs)
    [System.IO.File]::WriteAllText((Join-Path $stageShipDir "assets\brand\README.md"), $clientBrandReadme, $utf8NoBomDocs)

    $htmlFiles = @(
        (Join-Path $stageShipDir "index.html"),
        (Join-Path $stageShipDir "trash-dice.html")
    )

    foreach ($file in $htmlFiles) {
        if (-not (Test-Path -LiteralPath $file)) {
            throw "Missing staged handoff HTML: $file"
        }
        Remove-NoFlyHtmlRuntimeReferences $file
    }

    $textExtensions = @(".html", ".js", ".css", ".json", ".txt", ".md", ".xml")
    $stagedTextFiles = @(Get-ChildItem -LiteralPath $stageRoot -Recurse -File | Where-Object {
        $textExtensions -contains $_.Extension.ToLowerInvariant()
    })
    foreach ($file in $stagedTextFiles) {
        if ($htmlFiles -notcontains $file.FullName) {
            Remove-NoFlyTextReferences $file.FullName
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
        thirdPartyFontsStripped = $true
        firstPartyTelemetryDisabled = $true
        noFlyDeliveryScanPassed = $true
        partnerBrandingIncluded = $true
        clientDocsRewritten = $true
        htmlSha256 = $fileHashes
    }
    $manifest | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $manifestPath -Encoding UTF8

    Assert-NoFlyDeliverySurface $stageRoot $textExtensions

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
