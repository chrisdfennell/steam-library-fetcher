<<<<<<< HEAD
@echo off
setlocal EnableDelayedExpansion

echo Starting Steam Library Fetcher...

:: Check if Python is installed
python --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ERROR: Python is not installed or not in PATH. Please install Python 3.6+ from python.org and add it to PATH.
    pause
    exit /b 1
)

:: Set project directory
set PROJECT_DIR=C:\steam-library-fetcher
cd /d %PROJECT_DIR% || (
    echo ERROR: Directory %PROJECT_DIR% does not exist.
    pause
    exit /b 1
)

:: Create virtual environment if it doesn't exist
if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
    if !ERRORLEVEL! neq 0 (
        echo ERROR: Failed to create virtual environment.
        pause
        exit /b 1
    )
)

:: Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate
if %ERRORLEVEL% neq 0 (
    echo ERROR: Failed to activate virtual environment.
    pause
    exit /b 1
)

:: Install dependencies if not already installed
if not exist venv\Lib\site-packages\flask (
    echo Installing dependencies from requirements.txt...
    pip install -r requirements.txt
    if !ERRORLEVEL! neq 0 (
        echo ERROR: Failed to install dependencies. Check requirements.txt or your internet connection.
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
        pause
        exit /b 1
    )
    set /p PASSWORD="Enter your desired password: "
    if "!PASSWORD!"=="" (
        echo ERROR: No password provided. Please run the script again and enter a valid password.
        pause
        exit /b 1
    )
    echo Initializing database with username '!USERNAME!'...
    python init_db.py "!USERNAME!" "!PASSWORD!"
    if !ERRORLEVEL! neq 0 (
        echo ERROR: Failed to initialize database.
        pause
        exit /b 1
    )
    if not exist users.db (
        echo ERROR: users.db was not created. Check app.py or init_db.py for issues.
        pause
        exit /b 1
    )
    echo Database file users.db created successfully with username '!USERNAME!'.
)

:: Free port 5000 if in use
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

:: Start the server
echo Starting the server on port %PORT%...
start "" python run.py
echo Server should be running at http://localhost:%PORT%. Check the console for details.
echo If it doesn't start, run 'python run.py' manually to see errors.

:: Keep the window open
=======
@echo off
setlocal EnableDelayedExpansion

echo Starting Steam Library Fetcher...

:: Check if Python is installed
python --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ERROR: Python is not installed or not in PATH. Please install Python 3.6+ from python.org and add it to PATH.
    pause
    exit /b 1
)

:: Set project directory
set PROJECT_DIR=C:\steam-library-fetcher
cd /d %PROJECT_DIR% || (
    echo ERROR: Directory %PROJECT_DIR% does not exist.
    pause
    exit /b 1
)

:: Create virtual environment if it doesn't exist
if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
    if !ERRORLEVEL! neq 0 (
        echo ERROR: Failed to create virtual environment.
        pause
        exit /b 1
    )
)

:: Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate
if %ERRORLEVEL% neq 0 (
    echo ERROR: Failed to activate virtual environment.
    pause
    exit /b 1
)

:: Install dependencies if not already installed
if not exist venv\Lib\site-packages\flask (
    echo Installing dependencies from requirements.txt...
    pip install -r requirements.txt
    if !ERRORLEVEL! neq 0 (
        echo ERROR: Failed to install dependencies. Check requirements.txt or your internet connection.
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
        pause
        exit /b 1
    )
    set /p PASSWORD="Enter your desired password: "
    if "!PASSWORD!"=="" (
        echo ERROR: No password provided. Please run the script again and enter a valid password.
        pause
        exit /b 1
    )
    echo Initializing database with username '!USERNAME!'...
    python init_db.py "!USERNAME!" "!PASSWORD!"
    if !ERRORLEVEL! neq 0 (
        echo ERROR: Failed to initialize database.
        pause
        exit /b 1
    )
    if not exist users.db (
        echo ERROR: users.db was not created. Check app.py or init_db.py for issues.
        pause
        exit /b 1
    )
    echo Database file users.db created successfully with username '!USERNAME!'.
)

:: Free port 5000 if in use
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

:: Start the server
echo Starting the server on port %PORT%...
start "" python run.py
echo Server should be running at http://localhost:%PORT%. Check the console for details.
echo If it doesn't start, run 'python run.py' manually to see errors.

:: Keep the window open
>>>>>>> 4902f97 (Set up Steam Library Fetcher in new directory for GitHub upload and created a new userdatabase for the user/pass as well as a run.bat script to start this whole project.)
pause