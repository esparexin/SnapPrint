@echo off
setlocal
echo ==========================================================
echo   SnapPrint Desktop Print Agent -- Clean Installer
echo ==========================================================
echo [1/2] Terminating any stuck installer locks...
taskkill /F /IM msiexec.exe /T >nul 2>&1
taskkill /F /IM snapprint-agent.exe /T >nul 2>&1
timeout /t 1 /nobreak >nul

set "TARGET_MSI=%~dp0SnapPrint-Print-Agent-v0.1.2.msi"
if not exist "%TARGET_MSI%" set "TARGET_MSI=%~dp0SnapPrint-Print-Agent.msi"
if not exist "%TARGET_MSI%" (
  for %%f in ("%~dp0..\..\*.msi" "%USERPROFILE%\Desktop\*.msi" "%USERPROFILE%\Downloads\SnapPrint*.msi") do (
    if exist "%%~ff" set "TARGET_MSI=%%~ff"
  )
)

if not exist "%TARGET_MSI%" (
  echo Error: Could not find SnapPrint-Print-Agent MSI file.
  echo Please place the MSI installer in this folder or your Desktop.
  pause
  exit /b 1
)

echo [2/2] Installing "%TARGET_MSI%" with instant fast-install and logging...
msiexec.exe /i "%TARGET_MSI%" MSIFASTINSTALL=7 /l*v "%TEMP%\SnapPrint-Install.log"
if %errorlevel% equ 0 (
  echo.
  echo [SUCCESS] SnapPrint Desktop Print Agent installed successfully!
  echo Launch "SnapPrint Desktop" from your Desktop or Start Menu.
) else (
  echo.
  echo [WARNING] Installation exited with code: %errorlevel%
  echo Opening verbose log file: %TEMP%\SnapPrint-Install.log
  start notepad.exe "%TEMP%\SnapPrint-Install.log"
)
echo.
pause
