$ErrorActionPreference = "Stop"

$stableUrl = "https://playonedaygames.com/trash-dice/ios-preview/"
$launcherDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$iconPath = Join-Path $launcherDir "TD.ico"
$desktopDir = [Environment]::GetFolderPath("Desktop")
$startMenuDir = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs"
$desktopShortcut = Join-Path $desktopDir "TD.lnk"
$startMenuShortcut = Join-Path $startMenuDir "TD.lnk"
$fallbackUrl = Join-Path $launcherDir "TD.url"

$browserCandidates = @(
  "C:\Program Files\Google\Chrome\Application\chrome.exe",
  "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
  "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
  "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
)

$browser = $browserCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $browser) {
  throw "No supported browser found. Install Chrome or Edge, then rerun this script."
}
if (-not (Test-Path -LiteralPath $iconPath)) {
  throw "Missing launcher icon: $iconPath"
}

New-Item -ItemType Directory -Force -Path $startMenuDir | Out-Null

$shell = New-Object -ComObject WScript.Shell
foreach ($shortcutPath in @($desktopShortcut, $startMenuShortcut, (Join-Path $launcherDir "TD.lnk"))) {
  $shortcut = $shell.CreateShortcut($shortcutPath)
  $shortcut.TargetPath = $browser
  $shortcut.Arguments = $stableUrl
  $shortcut.WorkingDirectory = Split-Path -Parent $browser
  $shortcut.IconLocation = "$iconPath,0"
  $shortcut.Description = "TD stable Trash Dice preview launcher"
  $shortcut.Save()
}

$urlText = "[InternetShortcut]`r`nURL=$stableUrl`r`nIconFile=$iconPath`r`nIconIndex=0`r`n"
[System.IO.File]::WriteAllText($fallbackUrl, $urlText, [System.Text.Encoding]::ASCII)

[PSCustomObject]@{
  stableUrl = $stableUrl
  desktopShortcut = $desktopShortcut
  startMenuShortcut = $startMenuShortcut
  fallbackUrl = $fallbackUrl
  browser = $browser
  icon = $iconPath
} | ConvertTo-Json
