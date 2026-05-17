param(
  [string]$PublicUrl = "https://playonedaygames.com/trash-dice/beta-v2/",
  [string]$ExpectedRoot = "beta",
  [string]$AlphaUrl = "https://playonedaygames.com/trash-dice/alpha-complete/",
  [string]$AlphaRoot = "releases\alpha-complete",
  [int]$ForbiddenPreviewPort = 4173,
  [switch]$RunMultiplayerQa
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Net.Http

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

  $current = [Uri]$Url
  for ($i = 0; $i -lt 8; $i++) {
    $request = [System.Net.HttpWebRequest]::Create($current)
    $request.Method = "GET"
    $request.AllowAutoRedirect = $false
    $response = $null
    try {
      $response = $request.GetResponse()
    } catch [System.Net.WebException] {
      if ($_.Exception.Response) {
        $response = $_.Exception.Response
      } else {
        throw "HTTP fetch failed for ${current}: $($_.Exception.Message)"
      }
    }

    try {
      $status = [int]$response.StatusCode
      if ($status -ge 300 -and $status -lt 400) {
        $location = $response.Headers["Location"]
        if (-not $location) { throw "HTTP redirect without Location for ${current}." }
        $current = [Uri]::new($current, $location)
        continue
      }
      if ($status -ne 200) {
        throw "${current} returned HTTP $status."
      }
      $memory = [System.IO.MemoryStream]::new()
      try {
        $response.GetResponseStream().CopyTo($memory)
        return $memory.ToArray()
      } finally {
        $memory.Dispose()
      }
    } finally {
      if ($response) { $response.Dispose() }
    }
  }

  throw "Too many redirects while fetching ${Url}."
}

function Read-GitBlobBytes {
  param([string]$Path)

  $gitPath = $Path.Replace("\", "/")
  $psi = [System.Diagnostics.ProcessStartInfo]::new()
  $psi.FileName = "git"
  $psi.Arguments = "show HEAD:$gitPath"
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.UseShellExecute = $false
  $process = [System.Diagnostics.Process]::Start($psi)
  $memory = [System.IO.MemoryStream]::new()
  try {
    $process.StandardOutput.BaseStream.CopyTo($memory)
    $errorText = $process.StandardError.ReadToEnd()
    $process.WaitForExit()
    if ($process.ExitCode -ne 0) {
      throw "git show HEAD:$gitPath failed: $errorText"
    }
    return $memory.ToArray()
  } finally {
    $memory.Dispose()
    $process.Dispose()
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
  if ($CacheBust) { return "${url}?v=$CacheBust" }
  return $url
}

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

if (Test-ListeningPort $ForbiddenPreviewPort) {
  throw "Preview server on 127.0.0.1:$ForbiddenPreviewPort is listening; stop it before sharing public links."
}

$commit = Get-GitValue @("rev-parse", "--short", "HEAD")
$frozenAlphaSha256 = "b2ad4757102fd844021574a67231a669148c32a9f2e236c7d5f03396d395f31f"
$alphaPath = Join-Path $root $AlphaRoot
$localIndex = Read-GitBlobBytes "$ExpectedRoot/index.html"
$localMirror = Read-GitBlobBytes "$ExpectedRoot/trash-dice.html"
$localAlpha = [System.IO.File]::ReadAllBytes((Join-Path $alphaPath "index.html"))

$localIndexHash = Get-Sha256 $localIndex
$localMirrorHash = Get-Sha256 $localMirror
$localAlphaHash = Get-Sha256 $localAlpha
if ($localIndexHash -ne $localMirrorHash) {
  throw "Local Beta index.html and trash-dice.html differ."
}
if ($localAlphaHash -ne $frozenAlphaSha256) {
  throw "Local Alpha Complete bytes do not match the frozen Alpha SHA."
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
if ($publicAlphaHash -ne $frozenAlphaSha256) {
  throw "Public Alpha Complete bytes do not match frozen local Alpha Complete."
}

if ($RunMultiplayerQa) {
  & node .\qa-beta-multiplayer.js $PublicUrl
  if ($LASTEXITCODE -ne 0) {
    throw "Public Beta multiplayer QA failed."
  }
  & node .\qa-beta-room-protocol.js $PublicUrl
  if ($LASTEXITCODE -ne 0) {
    throw "Public Beta room protocol QA failed."
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
