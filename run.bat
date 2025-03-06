@echo off
setlocal EnableDelayedExpansion

echo Starting Steam Library Fetcher...

:: Check if another instance is already running using a lock file
if exist "run.lock" (
    echo Another instance of run.bat is already running. Attempting to stop it...
    :: Free port 5000 if in use
    netstat -a -n -o | find "5000" >nul
    if %ERRORLEVEL% equ 0 (
        echo Port 5000 is in use. Stopping the existing server...
        for /f "tokens=5" %%a in ('netstat -a -n -o ^| find "5000"') do (
            taskkill /PID %%a /F 2>nul
            if !ERRORLEVEL! equ 0 (
                echo Killed process with PID %%a on port 5000.
            )
        )
    )
    :: Free port 5001 if in use (in case the previous instance switched ports)
    netstat -a -n -o | find "5001" >nul
    if %ERRORLEVEL% equ 0 (
        echo Port 5001 is in use. Stopping the existing server...
        for /f "tokens=5" %%a in ('netstat -a -n -o ^| find "5001"') do (
            taskkill /PID %%a /F 2>nul
            if !ERRORLEVEL! equ 0 (
                echo Killed process with PID %%a on port 5001.
            )
        )
    )
    :: Wait briefly to ensure the port is freed
    timeout /t 2 >nul
    :: Clean up the old lock file
    del run.lock
    echo Previous instance stopped successfully.
)

:: Create a new lock file
echo running > run.lock

:: Check if Python is installed
python --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ERROR: Python is not installed or not in PATH. Please install Python 3.6+ from python.org and add it to PATH.
    del run.lock
    pause
    exit /b 1
)

:: Set project directory
set PROJECT_DIR=C:\steam-library-fetcher
cd /d %PROJECT_DIR% || (
    echo ERROR: Directory %PROJECT_DIR% does not exist.
    del run.lock
    pause
    exit /b 1
)

:: Create virtual environment if it doesn't exist
if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
    if !ERRORLEVEL! neq 0 (
        echo ERROR: Failed to create virtual environment.
        del run.lock
        pause
        exit /b 1
    )
)

:: Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate
if %ERRORLEVEL% neq 0 (
    echo ERROR: Failed to activate virtual environment.
    del run.lock
    pause
    exit /b 1
)

:: Install dependencies if not already installed
if not exist venv\Lib\site-packages\flask (
    echo Installing dependencies from requirements.txt...
    pip install -r requirements.txt
    if !ERRORLEVEL! neq 0 (
        echo ERROR: Failed to install dependencies. Check requirements.txt or your internet connection.
        del run.lock
        pause
        exit /b 1
    )
)

:: Check if .env exists, prompt for STEAM_API_KEY if not
if not exist .env (
    echo .env file not found. You need a Steam API key.
    set /p API_KEY="Enter your Steam API key (get it from https://partner.steamgames.com/): "
    if "!API_KEY!"=="" (
        echo ERROR: No API key provided. Please run the script again and enter a valid key.
        del run.lock
        pause
        exit /b 1
    )
    echo STEAM_API_KEY=!API_KEY! > .env
    echo Created .env with your Steam API key.
)

:: Check if users.db exists, prompt for username/password if not
if not exist users.db (
    echo Setting up initial user...
    set /p USERNAME="Enter your desired username: "
    if "!USERNAME!"=="" (
        echo ERROR: No username provided. Please run the script again and enter a valid username.
        del run.lock
        pause
        exit /b 1
    )
    set /p PASSWORD="Enter your desired password: "
    if "!PASSWORD!"=="" (
        echo ERROR: No password provided. Please run the script again and enter a valid password.
        del run.lock
        pause
        exit /b 1
    )
    echo Initializing database with username '!USERNAME!'...
    python init_db.py "!USERNAME!" "!PASSWORD!"
    if !ERRORLEVEL! neq 0 (
        echo ERROR: Failed to initialize database.
        del run.lock
        pause
        exit /b 1
    )
    if not exist users.db (
        echo ERROR: users.db was not created. Check app.py or init_db.py for issues.
        del run.lock
        pause
        exit /b 1
    )
    echo Database file users.db created successfully with username '!USERNAME!'.
)

:: Free port 5000 if in use (double-check in case something else took it)
echo Checking if port 5000 is in use...
netstat -a -n -o | find "5000" >nul
if %ERRORLEVEL% equ 0 (
    echo Port 5000 is in use. Attempting to free it...
    for /f "tokens=5" %%a in ('netstat -a -n -o ^| find "5000"') do (
        taskkill /PID %%a /F 2>nul
        if !ERRORLEVEL! equ 0 (
            echo Killed process with PID %%a.
        )
    )
    timeout /t 2 >nul
    netstat -a -n -o | find "5000" >nul
    if !ERRORLEVEL! equ 0 (
        echo WARNING: Could not free port 5000. Trying port 5001 instead...
        set PORT=5001
    ) else (
        set PORT=5000
    )
) else (
    set PORT=5000
)

:: Start the server in the same window
echo Starting the server on port %PORT%...
echo Server should be running at http://localhost:%PORT%.
echo Press Ctrl+C to stop the server.
python run.py

:: Clean up the lock file when the script exits
del run.lock