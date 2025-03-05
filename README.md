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
- **A Steam API Key**: Obtain from the [Steamworks Developer Portal](https://partner.steamgames.com/). You'll need this to interact with the Steam API.
- **A Steam Account with Public Game Details**: Set your Steam profile’s game details to public (Settings > Privacy in Steam).
- **A Web Browser**: To access the application (e.g., Chrome, Firefox).

## Setup and Running
The application uses a single `run.bat` script to handle both initial setup and regular running.

### First-Time Setup
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
     - Start the server on port `5000` (or `5001` if `5000` is busy).

3. **Access the App**:
   - Open your browser to `http://localhost:5000` (or `5001` if prompted).
   - Log in with the username and password you set during setup.

### Regular Running
- Simply double-click `run.bat` or run:
  ```cmd
  C:\steam-library-fetcher>run.bat
  ```
- If setup is complete (`venv` and `users.db` exist), it skips installation steps and starts the server directly.
- Access `http://localhost:5000` (or `5001`) and log in with your custom credentials.

### Notes
- **Resetting Credentials**: Delete `users.db` and rerun `run.bat` to set a new username/password.
- **Port Conflicts**: The script automatically frees port `5000` or switches to `5001` if needed.

## Security Considerations
- **User Management**: Uses a SQLite database (`users.db`) with hashed passwords set via `run.bat`.
- **HTTPS**: Enforced in production via Talisman (for local testing, HTTP is used).
- **CSP**: Inline scripts/styles removed for better security.
- **Rate-Limiting**: In-memory storage is used locally; configure a backend (e.g., Redis) for production.

## Troubleshooting
- **"Can't reach this page"**: Check the server window for errors. Ensure the port (`5000` or `5001`) is free (`netstat -a -n -o | find "5000"`).
- **Wrong Credentials**: If `admin/securepassword123` still works, delete `users.db` and rerun `run.bat`.
- **Server Crashes**: Run `python run.py` manually to see detailed errors.

## Future Improvements
- Add a user registration UI.
- Enhance filtering options (e.g., by genre, release date).
- Support multiple users with session management.
- Deploy to a public server (e.g., Heroku) with PostgreSQL.

## License
MIT License.