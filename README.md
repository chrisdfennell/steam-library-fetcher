# Steam Library Fetcher

A Flask-based web application that fetches and displays a user's Steam game library, including playtime statistics, top games, recently played games, and library comparisons with friends. The app includes features like pagination, sorting, filtering, and a dark mode toggle.

## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Setup and Running](#setup-and-running)
- [Security Considerations](#security-considerations)
- [Troubleshooting](#troubleshooting)
- [Future Improvements](#future-improvements)
- [License](#license)

## Overview
The Steam Library Fetcher allows users to input their Steam username or SteamID64 to retrieve their game library via the Steam API. The app displays detailed statistics, a playtime trends chart, top 20 games by playtime, recently played games, and a full paginated list of games. Users can also compare their library with a friend's library. The app is secured with basic HTTP authentication, rate-limiting, and input validation.

## Features
- **Fetch Steam Library**: Retrieve a user's game library using their Steam username or SteamID64.
- **Playtime Statistics**: View total playtime, average playtime, games played, and most active platform.
- **Playtime Trends Chart**: Visualize playtime trends over time using Chart.js.
- **Top 20 Games**: Display the top 20 games by playtime with game icons and details.
- **Recently Played Games**: Show games played in the last 2 weeks or recently.
- **Library Comparison**: Compare your library with a friend's library to find common and unique games.
- **Full List with Pagination**: Browse the full library with pagination, sorting, and filtering options.
- **Dark Mode**: Toggle between light and dark modes with persistence via local storage.
- **Export to CSV**: Export the filtered game list to a CSV file.
- **Shareable Links**: Generate shareable links with current filters and pagination state.
- **Favorites**: Mark games as favorites with persistence via local storage.
- **Security Features**:
  - Basic HTTP authentication with custom username/password set during setup.
  - Rate-limiting to prevent abuse.
  - Input validation to prevent injection attacks.
  - Content Security Policy (CSP) to mitigate XSS attacks.
  - Secure storage of the Steam API key using a `.env` file.

## Prerequisites
Before running the Steam Library Fetcher, ensure you have:
- **Python 3.6+**: Download from [python.org](https://www.python.org/downloads/) and add to PATH.
  - On Windows, this is typically `python`.
  - On macOS/Linux, this is typically `python3`.
- **A Steam API Key**: Obtain from the [Steamworks Developer Portal](https://partner.steamgames.com/). You'll need this to interact with the Steam API.
- **A Steam Account with Public Game Details**: Set your Steam profile’s game details to public (Settings > Privacy in Steam).
- **A Web Browser**: To access the application (e.g., Chrome, Firefox).
- **Git** (optional): To manage version control, if you’re cloning or pushing to GitHub.

## Setup and Running
The application provides scripts to automate setup and running on different operating systems: `run.bat` for Windows, and `run.sh` for macOS and Linux.

### First-Time Setup on Windows
1. **Download the Project**:
   - Download the project files as a ZIP and extract them to `C:\steam-library-fetcher`.

2. **Run the Application**:
   - Double-click `run.bat` in `C:\steam-library-fetcher`, or run it from Command Prompt:
     ```cmd
     C:\steam-library-fetcher>run.bat
     ```
   - The script will:
     - Check for Python and install a virtual environment if needed.
     - Install dependencies from `requirements.txt`.
     - Prompt for your Steam API key (if `.env` doesn’t exist).
     - Prompt for a custom username and password to set up the initial user.
     - Create `users.db` with your credentials.
     - If another instance is running, stop it automatically.
     - Start the server on port `5000` (or `5001` if `5000` is busy) in the same window.
   - To stop the server, press `Ctrl+C` in the Command Prompt window.

3. **Access the App**:
   - Open your browser to `http://localhost:5000` (or `5001` if prompted).
   - Log in with the username and password you set during setup.

### First-Time Setup on macOS or Linux
1. **Download the Project**:
   - Clone the repository or download the project files as a ZIP and extract them to a directory (e.g., `~/steam-library-fetcher`):
     ```bash
     git clone https://github.com/chrisdfennell/steam-library-fetcher.git
     cd steam-library-fetcher
     ```

2. **Make the Script Executable**:
   - Set execute permissions for `run.sh`:
     ```bash
     chmod +x run.sh
     ```

3. **Run the Application**:
   - Run the script:
     ```bash
     ./run.sh
     ```
   - The script will:
     - Check for Python 3 and install a virtual environment if needed.
     - Install dependencies from `requirements.txt`.
     - Prompt for your Steam API key (if `.env` doesn’t exist).
     - Prompt for a custom username and password to set up the initial user.
     - Create `users.db` with your credentials.
     - If another instance is running, stop it automatically.
     - Start the server on port `5000` (or `5001` if `5000` is busy) in the same terminal.
   - To stop the server, press `Ctrl+C` in the terminal.

4. **Access the App**:
   - Open your browser to `http://localhost:5000` (or `5001` if prompted).
   - Log in with the username and password you set during setup.

### Regular Running
- **On Windows**:
  - Double-click `run.bat` or run:
    ```cmd
    C:\steam-library-fetcher>run.bat
    ```
- **On macOS or Linux**:
  - Run the script:
    ```bash
    ./run.sh
    ```
- If setup is complete (`venv` and `users.db` exist), the script skips installation steps and starts the server directly in the same window/terminal.
- If another instance is running, the script will stop it automatically before starting a new one.
- Access `http://localhost:5000` (or `5001`) and log in with your custom credentials.
- To stop the server, press `Ctrl+C` in the window/terminal.

### Notes
- **Resetting Credentials**: Delete `users.db` and rerun the script (`run.bat` or `run.sh`) to set a new username/password.
- **Port Conflicts**: The script automatically frees port `5000` or switches to `5001` if needed.

## Security Considerations
- **User Management**: Uses a SQLite database (`users.db`) with hashed passwords set via the setup script.
- **HTTPS**: Enforced in production via Talisman (for local testing, HTTP is used).
- **CSP**: Inline scripts/styles removed for better security.
- **Rate-Limiting**: In-memory storage is used locally; configure a backend (e.g., Redis) for production.

## Troubleshooting
- **"Can't reach this page"**: Check the server console for errors. Ensure the port (`5000` or `5001`) is free:
  - On Windows: `netstat -a -n -o | find "5000"`
  - On macOS/Linux: `lsof -i :5000`
- **Wrong Credentials**: If `admin/securepassword123` still works, delete `users.db` and rerun the script.
- **Server Crashes**: Check the console output for errors. If needed, run `python run.py` (Windows) or `python3 run.py` (macOS/Linux) manually to see detailed errors.

## Future Improvements
- Add a user registration UI.
- Enhance filtering options (e.g., by genre, release date).
- Support multiple users with session management.
- Deploy to a public server (e.g., Heroku) with PostgreSQL.

## License
MIT License.