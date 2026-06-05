param(
    [string]$Note = "",
    [ValidateSet("feel", "visual", "copy", "bug", "analytics", "launcher", "qa", "other")]
    [string]$Area = "other",
    [ValidateSet("p0", "p1", "p2", "p3")]
    [string]$Priority = "p2",
    [switch]$List,
    [switch]$Json
)

$ErrorActionPreference = "Stop"

$repoRoot = $PSScriptRoot
$queueDir = Join-Path $repoRoot "review-notes"
$queuePath = Join-Path $queueDir "cj-review-queue.jsonl"

function Read-Queue {
    if (-not (Test-Path -LiteralPath $queuePath)) {
        return @()
    }

    $records = @()
    foreach ($line in [System.IO.File]::ReadLines($queuePath)) {
        if (-not $line.Trim()) { continue }
        $records += ($line | ConvertFrom-Json)
    }
    return $records
}

if ($List) {
    $records = Read-Queue
    if ($Json) {
        $records | ConvertTo-Json -Depth 8
    } elseif ($records.Count -eq 0) {
        Write-Host "No CJ review notes queued."
    } else {
        foreach ($record in $records) {
            Write-Host "$($record.id) [$($record.status)] $($record.priority) $($record.area): $($record.note)"
        }
    }
    exit 0
}

if (-not $Note.Trim()) {
    throw "Provide -Note or use -List."
}

New-Item -ItemType Directory -Force -Path $queueDir | Out-Null

$record = [PSCustomObject][ordered]@{
    id = "cj-{0}" -f (Get-Date -Format "yyyyMMdd-HHmmss")
    createdAt = (Get-Date).ToString("o")
    source = "CJ"
    lane = "ship-html5"
    status = "new"
    area = $Area
    priority = $Priority
    note = $Note.Trim()
    alphaTouchAllowed = $false
    iosWorkAllowed = $false
    qa = "pending"
}

($record | ConvertTo-Json -Compress -Depth 8) | Add-Content -LiteralPath $queuePath -Encoding utf8

if ($Json) {
    $record | ConvertTo-Json -Depth 8
} else {
    Write-Host "Queued CJ review note: $($record.id)"
    Write-Host "$($record.priority) $($record.area): $($record.note)"
}
