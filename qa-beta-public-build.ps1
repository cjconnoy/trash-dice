param(
  [string]$PublicUrl = "https://playonedaygames.com/trash-dice/beta-v2/",
  [string]$ExpectedRoot = "beta",
  [string]$AlphaUrl = "https://playonedaygames.com/trash-dice/alpha-complete/",
  [string]$AlphaRoot = "releases\alpha-complete",
  [int]$ForbiddenPreviewPort = 4173,
  [switch]$RunMultiplayerQa
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

function Get-Sha256 {
  param([byte[]]$Bytes)
  $sha = [System.Security.Cryptography.SHA256]::Create()
  try {
    return [BitConverter]::ToString($sha.ComputeHash($Bytes)).Replace("-", "").ToLowerInvariant()
  } finally {
    $sha.Dispose()
  }
}

function Read-HttpBytes {
  param([string]$Url)
  $client = [System.Net.Http.HttpClient]::new()
  try {
    return $client.GetByteArrayAsync($Url).GetAwaiter().GetResult()
  } catch {
    throw "HTTP fetch failed for ${Url}: $($_.Exception.Message)"
  } finally {
    $client.Dispose()
  }
}

function Join-PublicUrl {
  param(
    [string]$Base,
    [string]$Path,
    [string]$CacheBust
  )
  $cleanBase = $Base.TrimEnd("/")
  $cleanPath = $Path.TrimStart("/")
  $url = if ($cleanPath) { "$cleanBase/$cleanPath" } else { "$cleanBase/" }
  if ($CacheBust) { return "$url?v=$CacheBust" }
  return $url
}

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

if (Test-ListeningPort $ForbiddenPreviewPort) {
  throw "Preview server on 127.0.0.1:$ForbiddenPreviewPort is listening; stop it before sharing public links."
}

$commit = Get-GitValue @("rev-parse", "--short", "HEAD")
$expectedPath = Join-Path $root $ExpectedRoot
$alphaPath = Join-Path $root $AlphaRoot

$localIndex = [System.IO.File]::ReadAllBytes((Join-Path $expectedPath "index.html"))
$localMirror = [System.IO.File]::ReadAllBytes((Join-Path $expectedPath "trash-dice.html"))
$localAlpha = [System.IO.File]::ReadAllBytes((Join-Path $alphaPath "index.html"))

$localIndexHash = Get-Sha256 $localIndex
$localMirrorHash = Get-Sha256 $localMirror
$localAlphaHash = Get-Sha256 $localAlpha
if ($localIndexHash -ne $localMirrorHash) {
  throw "Local Beta index.html and trash-dice.html differ."
}

$publicIndexUrl = Join-PublicUrl $PublicUrl "" $commit
$publicMirrorUrl = Join-PublicUrl $PublicUrl "trash-dice.html" $commit
$publicAlphaUrl = Join-PublicUrl $AlphaUrl "" "dc5a995"

$publicIndex = Read-HttpBytes $publicIndexUrl
$publicMirror = Read-HttpBytes $publicMirrorUrl
$publicAlpha = Read-HttpBytes $publicAlphaUrl

$publicIndexHash = Get-Sha256 $publicIndex
$publicMirrorHash = Get-Sha256 $publicMirror
$publicAlphaHash = Get-Sha256 $publicAlpha

if ($publicIndexHash -ne $localIndexHash) {
  throw "Public Beta index bytes do not match local beta/index.html."
}
if ($publicMirrorHash -ne $localMirrorHash) {
  throw "Public Beta trash-dice.html bytes do not match local beta/trash-dice.html."
}
if ($publicAlphaHash -ne $localAlphaHash) {
  throw "Public Alpha Complete bytes do not match frozen local Alpha Complete."
}

if ($RunMultiplayerQa) {
  & node .\qa-beta-multiplayer.js $PublicUrl
  if ($LASTEXITCODE -ne 0) {
    throw "Public Beta multiplayer QA failed."
  }
}

[PSCustomObject]@{
  status = "BETA PUBLIC BUILD OK"
  commit = $commit
  desktopFull = $PublicUrl
  mobileFull = $PublicUrl
  betaSha256 = $localIndexHash
  publicBetaSha256 = $publicIndexHash
  alphaComplete = $AlphaUrl
  alphaSha256 = $localAlphaHash
  multiplayerQa = [bool]$RunMultiplayerQa
} | ConvertTo-Json -Depth 2
