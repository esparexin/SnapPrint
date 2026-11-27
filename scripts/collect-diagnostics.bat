@echo off
setlocal
echo ==========================================================
echo   SnapPrint Diagnostics ^& Log Collector
echo ==========================================================
echo Running PowerShell diagnostic collector...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0collect-diagnostics.ps1"
echo.
echo Press any key to close this window...
pause >nul
