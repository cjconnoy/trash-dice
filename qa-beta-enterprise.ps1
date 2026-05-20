param(
  [string]$PublicUrl = "https://playonedaygames.com/trash-dice/beta-v2/",
  [int]$LocalPort = 5175,
  [int]$ForbiddenPreviewPort = 4173,
  [switch]$SkipPublic,
  [switch]$RunMobileVisualQc,
  [switch]$AutoFix
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$script:Failures = New-Object System.Collections.Generic.List[string]
$script:Results = New-Object System.Collections.Generic.List[object]

function Add-EnterpriseResult {
  param(
    [string]$Name,
    [string]$Status,
    [string]$Details = ""
  )

  $script:Results.Add([PSCustomObject]@{
    name = $Name
    status = $Status
    details = $Details
  }) | Out-Null
}

function Invoke-EnterpriseStep {
  param(
    [string]$Name,
    [scriptblock]$Command
  )

  Write-Host "`n[enterprise-qa] $Name"
  try {
    $details = & $Command
    Add-EnterpriseResult $Name "GREEN" ([string]$details)
  } catch {
    $message = $_.Exception.Message
    Add-EnterpriseResult $Name "RED" $message
    $script:Failures.Add("${Name}: $message") | Out-Null
    Write-Host "[enterprise-qa] RED: $message" -ForegroundColor Red
  }
}

function Invoke-CheckedCommand {
  param(
    [string]$Label,
    [string]$FilePath,
    [string[]]$Arguments = @(),
    [string]$WorkingDirectory = $root
  )

  Push-Location $WorkingDirectory
  try {
    & $FilePath @Arguments
    $exitCode = $LASTEXITCODE
  } finally {
    Pop-Location
  }

  if ($exitCode -ne 0) {
    throw "$Label failed with exit code $exitCode."
  }

  return "$Label ok"
}

function Test-ListeningPort {
  param([int]$Port)

  $client = [System.Net.Sockets.TcpClient]::new()
  try {
    $async = $client.BeginConnect("127.0.0.1", $Port, $null, $null)
    if ($async.AsyncWaitHandle.WaitOne(250)) {
      $client.EndConnect($async)
      return $true
    }
    return $false
  } catch {
    return $false
  } finally {
    $client.Dispose()
  }
}

function Wait-ForPort {
  param(
    [int]$Port,
    [int]$TimeoutMs = 10000
  )

  $start = Get-Date
  while (((Get-Date) - $start).TotalMilliseconds -lt $TimeoutMs) {
    if (Test-ListeningPort $Port) { return $true }
    Start-Sleep -Milliseconds 150
  }
  return $false
}

Invoke-EnterpriseStep "Beta mirror and script parse" {
  $indexPath = Join-Path $root "beta\index.html"
  $mirrorPath = Join-Path $root "beta\trash-dice.html"
  $index = Get-Content -LiteralPath $indexPath -Raw
  $mirror = Get-Content -LiteralPath $mirrorPath -Raw

  if ($index -ne $mirror) {
    if ($AutoFix) {
      Copy-Item -LiteralPath $indexPath -Destination $mirrorPath -Force
      $mirror = Get-Content -LiteralPath $mirrorPath -Raw
    } else {
      throw "beta/index.html and beta/trash-dice.html differ. Rerun with -AutoFix to repair the mirror."
    }
  }

  $parseScript = @"
const fs = require('fs');
for (const f of ['beta/index.html', 'beta/trash-dice.html']) {
  const html = fs.readFileSync(f, 'utf8');
  const match = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!match) throw new Error('missing script ' + f);
  new Function(match[1]);
}
console.log('beta scripts and mirror ok');
"@
  Invoke-CheckedCommand "beta script parse" "node" @("-e", $parseScript)
}

Invoke-EnterpriseStep "QA and server syntax" {
  Invoke-CheckedCommand "static server syntax" "node" @("--check", ".\tmp\codex-static-server.js") | Out-Null
  Invoke-CheckedCommand "multiplayer QA syntax" "node" @("--check", ".\qa-beta-multiplayer.js") | Out-Null
  Invoke-CheckedCommand "iPad layout QA syntax" "node" @("--check", ".\qa-beta-ipad-layout.js") | Out-Null
  Invoke-CheckedCommand "room protocol QA syntax" "node" @("--check", ".\qa-beta-room-protocol.js") | Out-Null
  Invoke-CheckedCommand "worker syntax" "node" @("--check", ".\worker\index.js") | Out-Null
  "syntax ok"
}

Invoke-EnterpriseStep "Git whitespace health" {
  Invoke-CheckedCommand "git diff --check" "git" @("diff", "--check") | Out-Null
  Invoke-CheckedCommand "git diff --cached --check" "git" @("diff", "--cached", "--check") | Out-Null
  "git whitespace ok"
}

Invoke-EnterpriseStep "Core readiness dry run" {
  Invoke-CheckedCommand "test-game-readiness" "powershell" @("-ExecutionPolicy", "Bypass", "-File", ".\test-game-readiness.ps1", "-DryRun")
}

Invoke-EnterpriseStep "Forbidden preview port" {
  if (Test-ListeningPort $ForbiddenPreviewPort) {
    throw "127.0.0.1:$ForbiddenPreviewPort is listening. Stop the preview server before sharing public links."
  }
  "port $ForbiddenPreviewPort clear"
}

Invoke-EnterpriseStep "Local nearby mode and room protocol" {
  if (Test-ListeningPort $LocalPort) {
    throw "127.0.0.1:$LocalPort is already listening. Stop it or choose -LocalPort."
  }

  $stdoutPath = Join-Path ([System.IO.Path]::GetTempPath()) "trash-dice-enterprise-server-$LocalPort.out.log"
  $stderrPath = Join-Path ([System.IO.Path]::GetTempPath()) "trash-dice-enterprise-server-$LocalPort.err.log"
  $server = $null

  try {
    $server = Start-Process -FilePath "node" `
      -ArgumentList @(".\tmp\codex-static-server.js", $root, "$LocalPort") `
      -WorkingDirectory $root `
      -WindowStyle Hidden `
      -RedirectStandardOutput $stdoutPath `
      -RedirectStandardError $stderrPath `
      -PassThru

    if (-not (Wait-ForPort $LocalPort 10000)) {
      $stderr = if (Test-Path $stderrPath) { Get-Content -LiteralPath $stderrPath -Raw } else { "" }
      throw "local server did not start on $LocalPort. $stderr"
    }

    Invoke-CheckedCommand "local room protocol QA" "node" @(".\qa-beta-room-protocol.js", "http://127.0.0.1:$LocalPort") | Out-Null
    Invoke-CheckedCommand "local two-client multiplayer QA" "node" @(".\qa-beta-multiplayer.js", "http://127.0.0.1:$LocalPort") | Out-Null
    Invoke-CheckedCommand "local iPad active-game layout QA" "node" @(".\qa-beta-ipad-layout.js", "http://127.0.0.1:$LocalPort/beta/") | Out-Null
    "local nearby mode ok"
  } finally {
    if ($server -and -not $server.HasExited) {
      Stop-Process -Id $server.Id -Force
    }
  }
}

Invoke-EnterpriseStep "Worker deploy dry run" {
  Invoke-CheckedCommand "wrangler deploy dry-run" "npx" @("wrangler", "deploy", "--dry-run") (Join-Path $root "worker")
}

if ($RunMobileVisualQc) {
  Invoke-EnterpriseStep "Canonical mobile visual QC" {
    $oneDayGamesRoot = Split-Path -Parent (Split-Path -Parent $root)
    $visualQc = Join-Path $oneDayGamesRoot "odg-pipeline\test-mobile-visual-qc.ps1"
    if (-not (Test-Path -LiteralPath $visualQc)) {
      throw "mobile visual QC script not found at $visualQc"
    }
    Invoke-CheckedCommand "mobile visual QC" "powershell" @("-ExecutionPolicy", "Bypass", "-File", $visualQc, "-RepoPath", $root)
  }
} else {
  Add-EnterpriseResult "Canonical mobile visual QC" "SKIPPED" "Pass -RunMobileVisualQc for changes that affect mobile, terminal states, or reviewability."
}

if ($SkipPublic) {
  Add-EnterpriseResult "Public byte/protocol/multiplayer QA" "SKIPPED" "Pass without -SkipPublic before partner-facing release or Slack."
} else {
  Invoke-EnterpriseStep "Public byte/protocol/multiplayer QA" {
    Invoke-CheckedCommand "public Beta build QA" "powershell" @("-ExecutionPolicy", "Bypass", "-File", ".\qa-beta-public-build.ps1", "-PublicUrl", $PublicUrl, "-RunMultiplayerQa")
  }
}

$status = if ($script:Failures.Count -eq 0) { "GREEN" } else { "RED" }
$summary = [PSCustomObject]@{
  status = $status
  publicUrl = $PublicUrl
  skippedPublic = [bool]$SkipPublic
  ranMobileVisualQc = [bool]$RunMobileVisualQc
  autoFix = [bool]$AutoFix
  results = $script:Results
  failures = $script:Failures
}

Write-Host "`n[enterprise-qa] summary"
$summary | ConvertTo-Json -Depth 6

if ($script:Failures.Count -ne 0) {
  exit 1
}
