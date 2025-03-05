# Steam Library Fetcher

A Flask-based web application that fetches and displays a user's Steam game library, including playtime statistics, top games, recently played games, and library comparisons with friends. The app includes features like pagination, sorting, filtering, and a dark mode toggle.


## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Setup](#setup)
- [Running the Application](#running-the-application)
- [Security Considerations](#security-considerations)
- [Troubleshooting](#troubleshooting)
- [Future Improvements](#future-improvements)
- [License](#license)


## Overview

The Steam Library Fetcher allows users to input their Steam username or SteamID64 to retrieve their game library via the Steam API. The app displays detailed statistics, a playtime trends chart, top 20 games by playtime, recently played games, and a full paginated list of games. Users can also compare their library with a friend's library. The app is secured with basic HTTP authentication, rate-limiting, and input validation.


## Features

- **Fetch Steam Library:** Retrieve a user's game library using their Steam username or SteamID64.
- **Playtime Statistics:** View total playtime, average playtime, games played, and most active platform.
- **Playtime Trends Chart:** Visualize playtime trends over time using Chart.js.
- **Top 20 Games:** Display the top 20 games by playtime with game icons and details.
- **Recently Played Games:** Show games played in the last 2 weeks or recently.
- **Library Comparison:** Compare your library with a friend's library to find common and unique games.
- **Full List with Pagination:** Browse the full library with pagination, sorting, and filtering options.
- **Dark Mode:** Toggle between light and dark modes with persistence via local storage.
- **Export to CSV:** Export the filtered game list to a CSV file.
- **Shareable Links:** Generate shareable links with current filters and pagination state.
- **Favorites:** Mark games as favorites with persistence via local storage.
- **Security Features:**
  - Basic HTTP authentication to restrict access.
  - Rate-limiting to prevent abuse.
  - Input validation to prevent injection attacks.
  - Content Security Policy (CSP) to mitigate XSS attacks.
  - Secure storage of the Steam API key using a .env file.


## Prerequisites

Before setting up the Steam Library Fetcher, ensure you have the following:

- **Python 3.6+:** The application is built using Python. You can download it from [python.org](https://www.python.org/downloads/).
- **pip:** Python’s package manager, which comes bundled with Python.
- **A Steam API Key:** Obtain a Steam API key by registering on the [Steamworks Developer Portal](https://partner.steamgames.com/). You'll need this to interact with the Steam API.
- **A Steam Account with Public Game Details:** Ensure your Steam profile’s game details are set to public (e.g., Chrome, Firefox).
- **A Web Browser:** To access the application (e.g., Chrome, Firefox).


## Installation

### Step 1: Download the Project

Download the project files as a ZIP and extract them to a directory (e.g., C:\steam-library-fetcher).

### Step 2: Set Up a Virtual Environment (Optional but Recommended)

A virtual environment isolates the project’s dependencies from your global Python environment.

1. Navigate to the project directory:

cd C:\steam-library-fetcher

2. Create a virtual environment:

python -m venv venv

3. Activate the virtual environment:

- On Windows:

venv\Scripts\activate

- On macOS/Linux:

source venv/bin/activate

You should see (venv) in your terminal prompt.

### Step 3: Install Dependencies

The project requires several Python packages, listed in the requirements.txt file. Install them using pip:

1. Ensure you have a requirements.txt file in the project directory with the following content:

flask
requests
flask-httpauth
flask-limiter
python-dotenv
flask-talisman
waitress

2. Install the dependencies:

pip install -r requirements.txt

This will install Flask, Waitress, and other required packages.


## Setup

### Step 1: Create the .env File

The Steam API key is stored in a .env file to keep it secure.

1. Create a file named .env in the project directory (C:\steam-library-fetcher\.env).

2. Add your Steam API key to the file:

STEAM_API_KEY=your_steam_api_key_here

Replace your_steam_api_key_here with your actual Steam API key.

3. Ensure the file is named exactly .env (not .env.txt). On Windows, you may need to enable "File name extensions" in File Explorer to confirm the name.

### Step 2: Verify the Directory Structure

Ensure your project directory looks like this:
```
C:\steam-library-fetcher
 ├── app.py
 ├── run.py
 ├── .env
 ├── requirements.txt
 └── static/
     └── index.html
```
- app.py: The main Flask application with API routes.
- run.py: The script to start the Waitress server.
- .env: Contains your Steam API key.
- requirements.txt: Lists the Python dependencies.
- static/index.html: The frontend HTML file.

### Step 3: Customize Credentials (Optional)

The app uses basic HTTP authentication with a hardcoded username and password (admin/securepassword123). These are defined in app.py:

users = {
    "admin": "securepassword123"
}

To change the credentials, edit the users dictionary in app.py with your preferred username and password. For production, consider using a proper user database with hashed passwords (see [Security Considerations](#security-considerations)).


## Running the Application

1. **Start the Server:**

Navigate to the project directory and run run.py:

cd C:\steam-library-fetcher
python run.py

You should see the following output:

Starting Waitress server...
Server is running at: http://localhost:5000
Credentials for access:
  Username: admin
  Password: securepassword123

Access it in your browser or click the link above. Press Ctrl+C to stop.

2. **Access the App:**

- Open your web browser and go to http://localhost:5000.
- Log in with the credentials displayed in the terminal (default: admin/securepassword123).
- Enter your Steam username or SteamID64 (e.g., 76561198025171445) and optionally a friend's username or SteamID64.
- Click "Get Libraries" to fetch and display the game library.

3. **Stop the Server:**

- To stop the server, press Ctrl+C in the terminal. You’ll see:

Waitress server stopped.


## Security Considerations

The app includes several security measures, but there are additional steps to consider for production use:

- **Basic Authentication:**
  - The app uses basic HTTP authentication with hardcoded credentials. For production, store user credentials in a database (e.g., SQLite) and hash passwords using werkzeug.security.
  - Example:

    from werkzeug.security import generate_password_hash, check_password_hash

    users = {
        "admin": generate_password_hash("securepassword123")
    }

    @auth.verify_password
    def verify_password(username, password):
        if username in users and check_password_hash(users[username], password):
            return username
        return None

- **Rate-Limiting:**
  - Rate-limiting is enabled to prevent abuse (e.g., 5 requests per minute for API endpoints). Adjust limits in app.py if needed.

- **Content Security Policy (CSP):**
  - The app uses flask-talisman to enforce a CSP. Inline scripts and styles are allowed ('unsafe-inline') due to the current design of index.html. For better security, move inline scripts and styles to external files and remove 'unsafe-inline'.

- **HTTPS:**
  - The app currently runs over HTTP. For production, enable HTTPS by providing SSL certificates to Waitress in run.py:

    serve(
        app,
        host=host,
        port=port,
        threads=4,
        _quiet=False,
        ssl_context=('cert.pem', 'key.pem')
    )

  - Use a service like Let’s Encrypt to obtain free SSL certificates.

- **Environment Variables:**
  - The Steam API key is stored in a .env file. Ensure this file is not committed to version control.

- **Network Access:**
  - The app is configured to run on 127.0.0.1 (localhost only). If you need to access it from other devices on your network, change host to '0.0.0.0' in run.py, but configure your firewall to restrict access.


## Troubleshooting

### Common Issues

- **"Steam API key not found in .env file":**
  - Ensure the .env file exists in C:\steam-library-fetcher and contains STEAM_API_KEY=your_key.
  - Verify that python-dotenv is installed (pip install python-dotenv).

- **"Error fetching data: HTTP error! Status: 400":**
  - Check the Python logs for details. Common causes:
  - Invalid pagination parameters: Ensure per_page and page values are within allowed limits.
  - Invalid SteamID64: Verify the SteamID64 is 17 digits long.
  - Profile is private: Ensure the Steam profile’s game details are set to public.

- **Images Not Loading:**
  - Verify that the Steam API returns img_icon_url for games. If not, the game may not have an icon.
  - Check the browser console for CSP errors. The CSP in app.py should allow img-src from http://media.steampowered.com.

- **"ModuleNotFoundError: No module named 'flask-limiter'":**
  - Ensure all dependencies are installed (pip install -r requirements.txt).

- **"Page 1 of 1 (Total Games)":**
  - If the total games count is incorrect, check the Python logs for errors in fetching or filtering the game library.

### Debugging Tips

- **Python Logs:** Check the terminal where run.py is running for detailed logs about API requests, filtering, and errors.
- **Browser Console:** Open the browser developer tools (F12 > Console) to see client-side errors, such as failed API requests.
- **Network Tab:** Use the browser’s Network tab (F12 > Network) to inspect the HTTP requests and responses, including status codes and error messages.


## Future Improvements

- **User Database:** Replace hardcoded credentials with a proper user database (e.g., SQLite) and hashed passwords.
- **HTTPS Support:** Enable HTTPS for secure communication.
- **External Scripts/Styles:** Move inline scripts and styles to external files to remove 'unsafe-inline' from the CSP.
- **Advanced Filtering:** Add more filtering options, such as filtering by genre or release date.
- **Deployment:** Deploy the app to a cloud provider (e.g., Heroku, Render, or a VPS) for public access.


## License

This project is licensed under the MIT License. Feel free to modify and distribute it as needed.
        
