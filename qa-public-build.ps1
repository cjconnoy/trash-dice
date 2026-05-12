param(
  [string]$PublicBaseUrl = "https://tel-sight-rice-extent.trycloudflare.com",
  [int]$OriginPort = 5175,
  [int]$ForbiddenPreviewPort = 4173
)

$ErrorActionPreference = "Stop"

function Get-GitValue {
  param([string[]]$Arguments)
  $value = & git @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "git $($Arguments -join ' ') failed"
  }
  return ($value | Select-Object -First 1).Trim()
}

function Assert-ListeningPort {
  param(
    [int]$Port,
    [bool]$ShouldListen
  )

  $connection = Get-NetTCPConnection -LocalAddress 127.0.0.1 -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  if ($ShouldListen -and -not $connection) {
    throw "Expected local origin on 127.0.0.1:$Port, but nothing is listening."
  }
  if (-not $ShouldListen -and $connection) {
    throw "Preview server on 127.0.0.1:$Port is listening; stop it before sharing public links."
  }
}

function Read-HttpBytes {
  param([string]$Url)
  $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 30
  if ($response.StatusCode -ne 200) {
    throw "$Url returned HTTP $($response.StatusCode)."
  }
  return [System.Text.Encoding]::UTF8.GetBytes($response.Content)
}

function Get-Sha256 {
  param([byte[]]$Bytes)
  $sha = [System.Security.Cryptography.SHA256]::Create()
  try {
    return [BitConverter]::ToString($sha.ComputeHash($Bytes)).Replace("-", "").ToLowerInvariant()
  } finally {
    $sha.Dispose()
  }
}

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$fullHash = Get-GitValue @("rev-parse", "HEAD")
$shortHash = Get-GitValue @("rev-parse", "--short", "HEAD")
$base = $PublicBaseUrl.TrimEnd("/")
$indexUrl = "$base/index.html?v=$shortHash"
$mirrorUrl = "$base/trash-dice.html?v=$shortHash"

Assert-ListeningPort -Port $ForbiddenPreviewPort -ShouldListen $false
Assert-ListeningPort -Port $OriginPort -ShouldListen $true

$indexLocal = [System.IO.File]::ReadAllBytes((Join-Path $root "index.html"))
$mirrorLocal = [System.IO.File]::ReadAllBytes((Join-Path $root "trash-dice.html"))
$indexHash = Get-Sha256 $indexLocal
$mirrorHash = Get-Sha256 $mirrorLocal
if ($indexHash -ne $mirrorHash) {
  throw "index.html and trash-dice.html differ locally."
}

$publicIndex = Read-HttpBytes $indexUrl
$publicMirror = Read-HttpBytes $mirrorUrl
$publicIndexHash = Get-Sha256 $publicIndex
$publicMirrorHash = Get-Sha256 $publicMirror

if ($publicIndexHash -ne $indexHash) {
  throw "Public index.html bytes do not match local index.html."
}
if ($publicMirrorHash -ne $mirrorHash) {
  throw "Public trash-dice.html bytes do not match local trash-dice.html."
}

[PSCustomObject]@{
  status = "PUBLIC BUILD OK"
  commit = $fullHash
  desktopFull = $indexUrl
  mobileFull = $indexUrl
  mirrorFull = $mirrorUrl
  localSha256 = $indexHash
  publicSha256 = $publicIndexHash
} | ConvertTo-Json -Depth 2
