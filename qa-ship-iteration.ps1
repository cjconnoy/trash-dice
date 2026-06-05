param(
    [switch]$NoSync,
    [switch]$SkipShipQa,
    [switch]$SkipRetailQa,
    [switch]$Sequential,
    [switch]$Json
)

$ErrorActionPreference = "Stop"

$repoRoot = $PSScriptRoot
$checks = @()

function Add-Check([string]$Name, [string]$Status, [string]$Detail) {
    $script:checks += [PSCustomObject][ordered]@{
        name = $Name
        status = $Status
        detail = $Detail
    }
}

function Invoke-Step([string]$Name, [scriptblock]$Block) {
    try {
        & $Block
        Add-Check $Name "green" "passed"
    } catch {
        Add-Check $Name "red" $_.Exception.Message
        throw
    }
}

function Start-QaJob([string]$Name, [string]$ScriptName) {
    Start-Job -Name $Name -ScriptBlock {
        param([string]$Repo, [string]$Script)
        Set-Location -LiteralPath $Repo
        & node $Script
        if ($LASTEXITCODE -ne 0) {
            throw "$Script failed with exit code $LASTEXITCODE"
        }
    } -ArgumentList $repoRoot, $ScriptName
}

if (-not $NoSync) {
    Invoke-Step "sync ship mirrors" {
        & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $repoRoot "sync-ship-html5.ps1") | Out-Host
    }
}

$qaScripts = @()
if (-not $SkipShipQa) {
    $qaScripts += [PSCustomObject]@{ name = "ship html5 qa"; script = "qa-ship-html5.js" }
}
if (-not $SkipRetailQa) {
    $qaScripts += [PSCustomObject]@{ name = "retail loop qa"; script = "qa-retail-loop.js" }
}

if ($qaScripts.Count -eq 0) {
    Add-Check "browser qa" "yellow" "all browser QA skipped"
} elseif ($Sequential) {
    foreach ($qa in $qaScripts) {
        Invoke-Step $qa.name {
            Set-Location -LiteralPath $repoRoot
            & node $qa.script
            if ($LASTEXITCODE -ne 0) {
                throw "$($qa.script) failed with exit code $LASTEXITCODE"
            }
        }
    }
} else {
    $jobs = @()
    foreach ($qa in $qaScripts) {
        $jobs += Start-QaJob $qa.name $qa.script
    }

    Wait-Job -Job $jobs | Out-Null
    $failed = $false
    foreach ($job in $jobs) {
        $output = Receive-Job -Job $job -Keep 2>&1
        $detail = ($output | Out-String).Trim()
        if ($job.State -eq "Completed") {
            Add-Check $job.Name "green" $detail
        } else {
            Add-Check $job.Name "red" $detail
            $failed = $true
        }
        Remove-Job -Job $job -Force
    }
    if ($failed) {
        throw "One or more QA jobs failed."
    }
}

$red = @($checks | Where-Object { $_.status -eq "red" }).Count
$yellow = @($checks | Where-Object { $_.status -eq "yellow" }).Count
$report = [PSCustomObject][ordered]@{
    status = if ($red -gt 0) { "red" } elseif ($yellow -gt 0) { "yellow" } else { "green" }
    generatedAt = (Get-Date).ToString("o")
    mode = if ($Sequential) { "sequential" } else { "parallel" }
    checks = $checks
}

if ($Json) {
    $report | ConvertTo-Json -Depth 8
} else {
    Write-Host "SHIP ITERATION QA: $($report.status.ToUpper())"
    foreach ($check in $checks) {
        Write-Host "$($check.status.ToUpper()): $($check.name)"
    }
}

if ($report.status -eq "red") {
    exit 1
}
