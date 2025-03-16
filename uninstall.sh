#!/bin/bash

echo "Starting Steam Library Fetcher uninstallation..."

# Check if the script is running from the correct directory
if [ ! -f "run.sh" ]; then
    echo "ERROR: This script must be run from the Steam Library Fetcher directory containing run.sh."
    echo "Please navigate to the correct directory and try again."
    exit 1
fi

# Stop any running server on port 5000
echo "Checking for server on port 5000..."
if lsof -i :5000 > /dev/null; then
    echo "Server detected on port 5000. Attempting to stop it..."
    kill -9 $(lsof -t -i :5000) 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "Killed process on port 5000."
    else
        echo "Failed to kill process on port 5000. It may require sudo privileges."
    fi
else
    echo "No server running on port 5000."
fi

# Stop any running server on port 5001
echo "Checking for server on port 5001..."
if lsof -i :5001 > /dev/null; then
    echo "Server detected on port 5001. Attempting to stop it..."
    kill -9 $(lsof -t -i :5001) 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "Killed process on port 5001."
    else
        echo "Failed to kill process on port 5001. It may require sudo privileges."
    fi
else
    echo "No server running on port 5001."
fi

# Wait briefly to ensure processes are terminated
sleep 2

# Remove the lock file if it exists
if [ -f "run.lock" ]; then
    echo "Removing lock file..."
    rm "run.lock"
    if [ $? -eq 0 ]; then
        echo "Lock file removed successfully."
    else
        echo "Failed to remove lock file. It may be in use or require sudo privileges."
    fi
else
    echo "No lock file found."
fi

# Check if virtual environment exists and remove it
if [ -d "venv" ]; then
    echo "Removing virtual environment..."
    rm -rf "venv"
    if [ $? -eq 0 ]; then
        echo "Virtual environment and all installed packages removed successfully."
    else
        echo "Failed to remove virtual environment. It may require sudo privileges."
    fi
else
    echo "No virtual environment found."
fi

# Optional: Prompt to remove additional project files
echo
echo "Checking for additional project files (e.g., users.db, .env)..."
if ls users.db .env >/dev/null 2>&1; then
    read -p "Would you like to remove these files as well? (y/n): " REMOVE_FILES
    if [ "$REMOVE_FILES" = "y" ] || [ "$REMOVE_FILES" = "Y" ]; then
        echo "Removing additional project files..."
        rm -f users.db .env
        if [ $? -eq 0 ]; then
            echo "Additional project files removed successfully."
        else
            echo "Failed to remove some additional files. They may be in use or require sudo privileges."
        fi
    else
        echo "Skipping removal of additional project files."
    fi
else
    echo "No additional project files found."
fi

echo
echo "Uninstallation complete. The project directory and core files remain."
echo "To fully remove the project, delete the directory manually (e.g., rm -rf $(pwd))."
exit 0