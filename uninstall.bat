@echo off
setlocal EnableDelayedExpansion

echo Starting Steam Library Fetcher uninstallation...

:: Check if the script is running from the correct directory
if not exist "run.bat" (
    echo ERROR: This script must be run from the Steam Library Fetcher directory containing run.bat.
    echo Please navigate to the correct directory (e.g., C:\steam-library-fetcher) and try again.
    pause
    exit /b 1
)

:: Stop any running server on port 5000
echo Checking for server on port 5000...
netstat -a -n -o | find "5000" >nul
if %ERRORLEVEL% equ 0 (
    echo Server detected on port 5000. Attempting to stop it...
    for /f "tokens=5" %%a in ('netstat -a -n -o ^| find "5000"') do (
        taskkill /PID %%a /F 2>nul
        if !ERRORLEVEL! equ 0 (
            echo Killed process with PID %%a on port 5000.
        ) else (
            echo Failed to kill process with PID %%a. It may require admin privileges.
        )
    )
) else (
    echo No server running on port 5000.
)

:: Stop any running server on port 5001
echo Checking for server on port 5001...
netstat -a -n -o | find "5001" >nul
if %ERRORLEVEL% equ 0 (
    echo Server detected on port 5001. Attempting to stop it...
    for /f "tokens=5" %%a in ('netstat -a -n -o ^| find "5001"') do (
        taskkill /PID %%a /F 2>nul
        if !ERRORLEVEL! equ 0 (
            echo Killed process with PID %%a on port 5001.
        ) else (
            echo Failed to kill process with PID %%a. It may require admin privileges.
        )
    )
) else (
    echo No server running on port 5001.
)

:: Wait briefly to ensure processes are terminated
timeout /t 2 >nul

:: Remove the lock file if it exists
if exist "run.lock" (
    echo Removing lock file...
    del "run.lock"
    if %ERRORLEVEL% equ 0 (
        echo Lock file removed successfully.
    ) else (
        echo Failed to remove lock file. It may be in use or require admin privileges.
    )
) else (
    echo No lock file found.
)

:: Check if virtual environment exists and remove it
if exist "venv" (
    echo Removing virtual environment...
    rmdir /s /q "venv"
    if %ERRORLEVEL% equ 0 (
        echo Virtual environment and all installed packages removed successfully.
    ) else (
        echo Failed to remove virtual environment. It may require admin privileges.
    )
) else (
    echo No virtual environment found.
)

:: Optional: Prompt to remove additional project files
set "REMOVE_FILES="
echo.
echo Additional project files detected (e.g., users.db, .env):
dir "users.db" ".env" 2>nul | findstr . >nul
if %ERRORLEVEL% equ 0 (
    set /p REMOVE_FILES="Would you like to remove these files as well? (y/n): "
    if /i "!REMOVE_FILES!"=="y" (
        echo Removing additional project files...
        del "users.db" ".env" 2>nul
        if %ERRORLEVEL% equ 0 (
            echo Additional project files removed successfully.
        ) else (
            echo Failed to remove some additional files. They may be in use or require admin privileges.
        )
    ) else (
        echo Skipping removal of additional project files.
    )
) else (
    echo No additional project files found.
)

echo.
echo Uninstallation complete. The project directory and core files remain.
echo To fully remove the project, delete the directory manually (e.g., rmdir /s /q C:\steam-library-fetcher).
pause
exit /b 0