#!/bin/bash

echo "Starting Steam Library Fetcher..."

# Check if another instance is already running using a lock file
if [ -f "run.lock" ]; then
    echo "Another instance of run.sh is already running. Attempting to stop it..."
    # Free port 5000 if in use
    if lsof -i :5000 > /dev/null; then
        echo "Port 5000 is in use. Stopping the existing server..."
        kill -9 $(lsof -t -i :5000) 2>/dev/null
        if [ $? -eq 0 ]; then
            echo "Killed process on port 5000."
        fi
    fi
    # Free port 5001 if in use (in case the previous instance switched ports)
    if lsof -i :5001 > /dev/null; then
        echo "Port 5001 is in use. Stopping the existing server..."
        kill -9 $(lsof -t -i :5001) 2>/dev/null
        if [ $? -eq 0 ]; then
            echo "Killed process on port 5001."
        fi
    fi
    # Wait briefly to ensure the port is freed
    sleep 2
    # Clean up the old lock file
    rm run.lock
    echo "Previous instance stopped successfully."
fi

# Create a new lock file
echo "running" > run.lock

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python3 is not installed or not in PATH. Please install Python 3.6+."
    rm run.lock
    exit 1
fi

# Set project directory
PROJECT_DIR="$(pwd)"
cd "$PROJECT_DIR" || {
    echo "ERROR: Directory $PROJECT_DIR does not exist."
    rm run.lock
    exit 1
}

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    if [ $? -ne 0 ]; then
        echo "ERROR: Failed to create virtual environment."
        rm run.lock
        exit 1
    fi
}

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to activate virtual environment."
    rm run.lock
    exit 1
fi

# Install dependencies if not already installed
if [ ! -d "venv/lib/python3.*/site-packages/flask" ]; then
    echo "Installing dependencies from requirements.txt..."
    pip install -r requirements.txt
    if [ $? -ne 0 ]; then
        echo "ERROR: Failed to install dependencies. Check requirements.txt or your internet connection."
        rm run.lock
        exit 1
    fi
}

# Check if .env exists, prompt for STEAM_API_KEY if not
if [ ! -f ".env" ]; then
    echo ".env file not found. You need a Steam API key."
    read -p "Enter your Steam API key (get it from https://partner.steamgames.com/): " API_KEY
    if [ -z "$API_KEY" ]; then
        echo "ERROR: No API key provided. Please run the script again and enter a valid key."
        rm run.lock
        exit 1
    fi
    echo "STEAM_API_KEY=$API_KEY" > .env
    echo "Created .env with your Steam API key."
}

# Check if users.db exists, prompt for username/password if not
if [ ! -f "users.db" ]; then
    echo "Setting up initial user..."
    read -p "Enter your desired username: " USERNAME
    if [ -z "$USERNAME" ]; then
        echo "ERROR: No username provided. Please run the script again and enter a valid username."
        rm run.lock
        exit 1
    fi
    read -p "Enter your desired password: " PASSWORD
    if [ -z "$PASSWORD" ]; then
        echo "ERROR: No password provided. Please run the script again and enter a valid password."
        rm run.lock
        exit 1
    fi
    echo "Initializing database with username '$USERNAME'..."
    python3 init_db.py "$USERNAME" "$PASSWORD"
    if [ $? -ne 0 ]; then
        echo "ERROR: Failed to initialize database."
        rm run.lock
        exit 1
    fi
    if [ ! -f "users.db" ]; then
        echo "ERROR: users.db was not created. Check app.py or init_db.py for issues."
        rm run.lock
        exit 1
    fi
    echo "Database file users.db created successfully with username '$USERNAME'."
}

# Free port 5000 if in use (double-check in case something else took it)
echo "Checking if port 5000 is in use..."
if lsof -i :5000 > /dev/null; then
    echo "Port 5000 is in use. Attempting to free it..."
    kill -9 $(lsof -t -i :5000) 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "Port 5000 freed successfully."
    else
        echo "WARNING: Could not free port 5000. Trying port 5001 instead..."
        PORT=5001
    fi
else
    PORT=5000
fi

# Start the server in the foreground
echo "Starting the server on port $PORT..."
echo "Server should be running at http://localhost:$PORT."
echo "Press Ctrl+C to stop the server."
python3 run.py

# Clean up the lock file when the script exits
rm run.lock