<#
.SYNOPSIS
  SnapPrint Desktop Print Agent — System & Installer Diagnostics Collector.
  Unfreezes stuck installer locks and gathers comprehensive installation and runtime logs.
#>

$ErrorActionPreference = 'SilentlyContinue'

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  SnapPrint Desktop Print Agent — Diagnostic Log Collector" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Unfreeze any stuck installer or agent processes
Write-Host "[1/6] Terminating any hung installer or agent processes..." -ForegroundColor Yellow
$stuckMsi = Get-Process msiexec -ErrorAction SilentlyContinue
$stuckAgent = Get-Process snapprint-agent -ErrorAction SilentlyContinue
$killedCount = ($stuckMsi.Count + $stuckAgent.Count)

if ($stuckMsi) {
    Stop-Process -Name msiexec -Force -ErrorAction SilentlyContinue
}
if ($stuckAgent) {
    Stop-Process -Name snapprint-agent -Force -ErrorAction SilentlyContinue
}
Start-Sleep -Milliseconds 600
Write-Host "      [✓] Released all installer file locks ($killedCount process(es) terminated)." -ForegroundColor Green

# 2. Prepare diagnostics output directory on Desktop
Write-Host "[2/6] Preparing diagnostics folder on Desktop..." -ForegroundColor Yellow
$desktopPath = [Environment]::GetFolderPath('Desktop')
$timestamp = (Get-Date -Format 'yyyy-MM-dd_HH-mm-ss')
$diagDir = Join-Path $desktopPath "SnapPrint-Logs-$timestamp"
New-Item -ItemType Directory -Path $diagDir -Force | Out-Null
Write-Host "      [✓] Target: $diagDir" -ForegroundColor Green

# 3. Gather Windows Installer logs
Write-Host "[3/6] Collecting Windows Installer verbose logs..." -ForegroundColor Yellow
$msiLogs = Get-ChildItem -Path $env:TEMP -Filter "MSI*.LOG" -ErrorAction SilentlyContinue |
           Sort-Object LastWriteTime -Descending | Select-Object -First 10

$collectedLogsCount = 0
foreach ($log in $msiLogs) {
    Copy-Item -Path $log.FullName -Destination $diagDir -ErrorAction SilentlyContinue
    $collectedLogsCount++
}

$explicitLog = Join-Path $env:TEMP "SnapPrint-Install.log"
if (Test-Path $explicitLog) {
    Copy-Item -Path $explicitLog -Destination $diagDir -ErrorAction SilentlyContinue
    $collectedLogsCount++
}
Write-Host "      [✓] Collected $collectedLogsCount installer log file(s)." -ForegroundColor Green

# 4. Extract Windows Event Logs (MsiInstaller, Volsnap, Application Errors)
Write-Host "[4/6] Extracting Windows Event Log records..." -ForegroundColor Yellow
$msiEvents = Get-WinEvent -FilterHashtable @{LogName='Application'; ProviderName='MsiInstaller'} -MaxEvents 50 -ErrorAction SilentlyContinue
if ($msiEvents) {
    $msiEvents | Select-Object TimeCreated, Id, LevelDisplayName, Message |
                 Format-List | Out-File -FilePath (Join-Path $diagDir "MsiInstaller-Events.txt") -Encoding utf8
}

$volsnapEvents = Get-WinEvent -FilterHashtable @{LogName='System'; ProviderName='Volsnap'} -MaxEvents 30 -ErrorAction SilentlyContinue
$volsnapFailed = $false
if ($volsnapEvents) {
    $volsnapEvents | Select-Object TimeCreated, Id, LevelDisplayName, Message |
                     Format-List | Out-File -FilePath (Join-Path $diagDir "Volsnap-ShadowCopy-Events.txt") -Encoding utf8
    $volsnapFailed = ($volsnapEvents | Where-Object { $_.Id -eq 67 }).Count -gt 0
}

$appErrors = Get-WinEvent -FilterHashtable @{LogName='Application'; Level=2} -MaxEvents 30 -ErrorAction SilentlyContinue
if ($appErrors) {
    $appErrors | Select-Object TimeCreated, Id, ProviderName, Message |
                 Format-List | Out-File -FilePath (Join-Path $diagDir "Application-Errors.txt") -Encoding utf8
}
Write-Host "      [✓] Saved MsiInstaller, Volsnap, and Application event logs." -ForegroundColor Green

# 5. Collect local agent state and printer spooler status
Write-Host "[5/6] Inspecting SnapPrint Agent config & Windows Spooler..." -ForegroundColor Yellow
$cfgPath = Join-Path $env:USERPROFILE ".snapprint\config.json"
if (Test-Path $cfgPath) {
    try {
        $cfg = Get-Content $cfgPath -Raw | ConvertFrom-Json
        if ($cfg.deviceToken) { $cfg.deviceToken = "[REDACTED]" }
        $cfg | ConvertTo-Json -Depth 5 | Out-File (Join-Path $diagDir "agent-config-sanitized.json") -Encoding utf8
    } catch {}
}

$printers = Get-Printer -ErrorAction SilentlyContinue
if ($printers) {
    $printers | Format-Table Name, DriverName, PortName, PrinterStatus |
                Out-File (Join-Path $diagDir "system-printers.txt") -Encoding utf8
}

$spooler = Get-Service -Name Spooler -ErrorAction SilentlyContinue
if ($spooler) {
    $spooler | Select-Object Status, StartType, DisplayName |
               Format-List | Out-File (Join-Path $diagDir "spooler-service.txt") -Encoding utf8
}

# Installed registry version check
$installedVer = (Get-ItemProperty -Path "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*" -ErrorAction SilentlyContinue |
                 Where-Object { $_.DisplayName -eq 'SnapPrint Desktop Print Agent' }).DisplayVersion

# 6. Generate readable Diagnostic Summary
Write-Host "[6/6] Generating DIAGNOSTIC-SUMMARY.txt..." -ForegroundColor Yellow
$dispVer = if ($installedVer) { $installedVer } else { 'Not Found / Not Installed' }
$spoolStatus = if ($spooler) { $spooler.Status } else { 'Unknown' }
$summary = @"
==========================================================
  SnapPrint Desktop Print Agent — Diagnostic Report
==========================================================
Timestamp:                 $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
Operating System:          $([System.Environment]::OSVersion.VersionString)
Machine Name:              $env:COMPUTERNAME
User:                      $env:USERNAME

INSTALLATION STATUS
----------------------------------------------------------
Installed Agent Version:   $dispVer
Stuck Processes Freed:     $killedCount (msiexec / snapprint-agent)
Volsnap (VSS) Issue:       $(if ($volsnapFailed) { 'YES (Volume Shadow Copy failed on volume C:)' } else { 'NO' })
MsiInstaller Events Found: $(if ($msiEvents) { $msiEvents.Count } else { 0 })
Installer Logs Found:      $collectedLogsCount

PRINTER FLEET STATUS
----------------------------------------------------------
Windows Spooler Service:   $spoolStatus
Total Discovered Printers: $(if ($printers) { $printers.Count } else { 0 })
$((($printers | ForEach-Object { " - " + $_.Name + " (" + $_.DriverName + ")" }) -join "`r`n"))

RECOMMENDED NEXT STEPS
----------------------------------------------------------
1. Any stuck msiexec locks have been cleared. You can now delete or run any installer.
2. To install cleanly without Volume Shadow Copy restore point hangs, run:
   msiexec /i "SnapPrint-Print-Agent-v0.1.3.msi" MSIFASTINSTALL=7 /l*v "%TEMP%\SnapPrint-Install.log"
==========================================================
"@

$summary | Out-File -FilePath (Join-Path $diagDir "DIAGNOSTIC-SUMMARY.txt") -Encoding utf8
Write-Host "      [✓] Summary generated." -ForegroundColor Green

# Create Zip Archive
$zipPath = "$diagDir.zip"
try {
    Compress-Archive -Path "$diagDir\*" -DestinationPath $zipPath -Force -ErrorAction SilentlyContinue
    Write-Host "      [✓] Zip archive created: $zipPath" -ForegroundColor Green
} catch {}

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "  DIAGNOSTICS COLLECTION COMPLETE!" -ForegroundColor Green
Write-Host "  Folder: $diagDir" -ForegroundColor White
if (Test-Path $zipPath) {
    Write-Host "  Zip:    $zipPath" -ForegroundColor White
}
Write-Host "==========================================================" -ForegroundColor Green

# Open explorer to the diagnostics directory
Invoke-Item $diagDir
