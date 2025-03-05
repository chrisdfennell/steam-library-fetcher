from flask import Flask, jsonify, request, send_from_directory
from flask_httpauth import HTTPBasicAuth
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_talisman import Talisman
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
import requests
import os
from dotenv import load_dotenv
import time
from requests.adapters import HTTPAdapter
from requests.packages.urllib3.util.retry import Retry

app = Flask(__name__, static_folder='static', static_url_path='')

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///C:/steam-library-fetcher/users.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Initialize HTTP Basic Authentication
auth = HTTPBasicAuth()

# Load environment variables from .env file
load_dotenv()
API_KEY = os.getenv("STEAM_API_KEY")
if not API_KEY:
    raise ValueError("Steam API key not found in .env file")

# User model
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

@auth.verify_password
def verify_password(username, password):
    user = User.query.filter_by(username=username).first()
    if user and user.check_password(password):
        return username
    return None

# Initialize rate-limiter
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["200 per day", "50 per hour"]
)

# Configure Talisman with CSP
csp = {
    'default-src': "'self'",
    'script-src': ["'self'", "https://cdn.jsdelivr.net"],
    'style-src': ["'self'", "https://fonts.googleapis.com"],
    'font-src': ["'self'", "https://fonts.gstatic.com"],
    'img-src': ["'self'", "http://media.steampowered.com"]
}
Talisman(app, content_security_policy=csp, force_https=True, strict_transport_security=True)

# Configure requests session
session = requests.Session()
retries = Retry(total=3, backoff_factor=1, status_forcelist=[429, 500, 502, 503, 504])
session.mount('http://', HTTPAdapter(max_retries=retries))
session.mount('https://', HTTPAdapter(max_retries=retries))
session.headers.update({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'application/json',
    'Accept-Language': 'en-US,en;q=0.9'
})

def fetch_game_details(appid):
    if not isinstance(appid, (int, str)) or not str(appid).isdigit():
        print(f"Invalid appid: {appid}")
        return {}
    url = f"https://store.steampowered.com/api/appdetails?appids={appid}"
    try:
        response = session.get(url, timeout=5)
        response.raise_for_status()
        data = response.json()
        if str(appid) in data and data[str(appid)]['success']:
            details = data[str(appid)]['data']
            return {
                'genres': [genre['description'] for genre in details.get('genres', [])],
                'release_date': details.get('release_date', {}).get('date', 'Unknown'),
                'categories': [category['description'] for category in details.get('categories', [])]
            }
        return {}
    except requests.exceptions.RequestException as e:
        print(f"HTTP error fetching details for appid {appid}: {e}")
        return {}
    finally:
        time.sleep(0.1)

@app.route('/')
@auth.login_required
@limiter.limit("10 per minute")
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/get_library', methods=['GET'])
@auth.login_required
@limiter.limit("5 per minute")
def get_library():
    username = request.args.get('username')
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 50))
    show_played_only = request.args.get('showPlayedOnly', 'false').lower() == 'true'
    filter_windows = request.args.get('filterWindows', 'false').lower() == 'true'
    filter_mac = request.args.get('filterMac', 'false').lower() == 'true'
    filter_linux = request.args.get('filterLinux', 'false').lower() == 'true'
    filter_deck = request.args.get('filterDeck', 'false').lower() == 'true'
    search_query = request.args.get('search', '').strip().lower()
    date_range = request.args.get('dateRange', 'all')
    sort_by = request.args.get('sortBy', 'name')
    fetch_details = request.args.get('fetchDetails', 'false').lower() == 'true'

    if not username:
        print("No username provided")
        return jsonify({"error": "No username provided"}), 400

    if not isinstance(username, str) or len(username) > 50 or any(c in username for c in '<>"\''):
        print("Invalid username format")
        return jsonify({"error": "Invalid username format"}), 400

    max_per_page = 10000 if per_page > 1000 else 500
    if page < 1 or per_page < 1 or per_page > max_per_page:
        print(f"Invalid pagination parameters: page={page}, per_page={per_page}, max_per_page={max_per_page}")
        return jsonify({"error": "Invalid pagination parameters"}), 400

    valid_sort_options = ['name', 'playtime', 'lastPlayed', 'playtime2Weeks']
    if sort_by not in valid_sort_options:
        print("Invalid sort_by parameter")
        return jsonify({"error": "Invalid sort_by parameter"}), 400

    valid_date_ranges = ['all', 'last30Days', 'lastYear']
    if date_range not in valid_date_ranges:
        print("Invalid date_range parameter")
        return jsonify({"error": "Invalid date_range parameter"}), 400

    if "steamcommunity.com/id/" in username:
        username = username.split("steamcommunity.com/id/")[-1].strip("/")
    elif "steamcommunity.com/profiles/" in username:
        print("Invalid URL format: profiles not supported")
        return jsonify({"error": "Please use the /id/ format, not /profiles/"}), 400

    print(f"Resolving username: {username}")
    resolve_url = f"http://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/?key={API_KEY}&vanityurl={username}"
    try:
        resolve_response = session.get(resolve_url, timeout=5)
        resolve_response.raise_for_status()
        resolve_data = resolve_response.json()
        if resolve_data["response"]["success"] != 1:
            print(f"Failed to resolve username: {username}")
            return jsonify({"error": "Invalid username or profile not found"}), 404
        steam_id = resolve_data["response"]["steamid"]
    except requests.exceptions.RequestException as e:
        print(f"Request error resolving username {username}: {str(e)}")
        return jsonify({"error": f"Failed to resolve username: {str(e)}"}), 500

    library_url = f"http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key={API_KEY}&steamid={steam_id}&format=json&include_appinfo=true"
    try:
        library_response = session.get(library_url, timeout=5)
        if library_response.status_code == 400:
            return jsonify({"error": "Invalid SteamID64 or profile does not exist."}), 400
        if library_response.status_code == 403:
            return jsonify({"error": "Profile is private. Please set your game details to public in Steam (Settings > Privacy)."}), 403
        library_response.raise_for_status()
        library_data = library_response.json()
    except requests.exceptions.RequestException as e:
        print(f"Request error for SteamID {steam_id}: {str(e)}")
        return jsonify({"error": f"Failed to fetch data from Steam API: {str(e)}"}), 500

    if "response" in library_data and "games" in library_data["response"]:
        games = library_data["response"]["games"]
        filtered_games = [game for game in games if isinstance(game, dict) and 'appid' in game and 'name' in game]

        if show_played_only:
            filtered_games = [game for game in filtered_games if game.get('playtime_forever', 0) > 0]
        if filter_windows:
            filtered_games = [game for game in filtered_games if game.get('playtime_windows_forever', 0) > 0]
        if filter_mac:
            filtered_games = [game for game in filtered_games if game.get('playtime_mac_forever', 0) > 0]
        if filter_linux:
            filtered_games = [game for game in filtered_games if game.get('playtime_linux_forever', 0) > 0]
        if filter_deck:
            filtered_games = [game for game in filtered_games if game.get('playtime_deck_forever', 0) > 0]
        if search_query:
            filtered_games = [game for game in filtered_games if search_query in game.get('name', '').lower()]
        if date_range != 'all':
            now = int(time.time())
            cutoff = now - (30 * 24 * 60 * 60) if date_range == 'last30Days' else now - (365 * 24 * 60 * 60)
            filtered_games = [game for game in filtered_games if 'rtime_last_played' in game and game['rtime_last_played'] and game['rtime_last_played'] >= cutoff]

        if sort_by == 'name':
            filtered_games = sorted(filtered_games, key=lambda x: x.get('name', '').lower())
        elif sort_by == 'playtime':
            filtered_games = sorted(filtered_games, key=lambda x: x.get('playtime_forever', 0), reverse=True)
        elif sort_by == 'lastPlayed':
            filtered_games = sorted(filtered_games, key=lambda x: x.get('rtime_last_played', 0), reverse=True)
        elif sort_by == 'playtime2Weeks':
            filtered_games = sorted(filtered_games, key=lambda x: x.get('playtime_2weeks', 0), reverse=True)

        total_games = len(filtered_games)
        if per_page <= 0:
            per_page = 50
        start = max(0, (page - 1) * per_page)
        end = min(start + per_page, total_games)
        paginated_games = filtered_games[start:end]
        total_pages = (total_games + per_page - 1) // per_page if total_games > 0 else 1

        if fetch_details:
            for game in paginated_games:
                game['details'] = fetch_game_details(game['appid'])
        else:
            for game in paginated_games:
                game['details'] = {}

        response = {
            "steam_id": steam_id,
            "games": paginated_games,
            "total_games": total_games,
            "page": page,
            "per_page": per_page,
            "total_pages": total_pages
        }
        print(f"Successfully fetched {len(paginated_games)} games for SteamID {steam_id} (page {page}, total filtered: {total_games})")
        return jsonify(response)
    else:
        print(f"No games found for SteamID {steam_id} or profile is private")
        return jsonify({"error": "No games found or profile is private"}), 404

@app.route('/get_library_by_id', methods=['GET'])
@auth.login_required
@limiter.limit("5 per minute")
def get_library_by_id():
    steam_id = request.args.get('steamid')
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 50))
    show_played_only = request.args.get('showPlayedOnly', 'false').lower() == 'true'
    filter_windows = request.args.get('filterWindows', 'false').lower() == 'true'
    filter_mac = request.args.get('filterMac', 'false').lower() == 'true'
    filter_linux = request.args.get('filterLinux', 'false').lower() == 'true'
    filter_deck = request.args.get('filterDeck', 'false').lower() == 'true'
    search_query = request.args.get('search', '').strip().lower()
    date_range = request.args.get('dateRange', 'all')
    sort_by = request.args.get('sortBy', 'name')
    fetch_details = request.args.get('fetchDetails', 'false').lower() == 'true'

    if not steam_id:
        print("No SteamID64 provided")
        return jsonify({"error": "No SteamID64 provided"}), 400
    if not steam_id.isdigit() or len(steam_id) != 17:
        print("Invalid SteamID64 format")
        return jsonify({"error": "Invalid SteamID64 format"}), 400

    max_per_page = 10000 if per_page > 1000 else 500
    if page < 1 or per_page < 1 or per_page > max_per_page:
        print(f"Invalid pagination parameters: page={page}, per_page={per_page}, max_per_page={max_per_page}")
        return jsonify({"error": "Invalid pagination parameters"}), 400

    valid_sort_options = ['name', 'playtime', 'lastPlayed', 'playtime2Weeks']
    if sort_by not in valid_sort_options:
        print("Invalid sort_by parameter")
        return jsonify({"error": "Invalid sort_by parameter"}), 400

    valid_date_ranges = ['all', 'last30Days', 'lastYear']
    if date_range not in valid_date_ranges:
        print("Invalid date_range parameter")
        return jsonify({"error": "Invalid date_range parameter"}), 400

    print(f"Fetching library for SteamID64: {steam_id}")
    library_url = f"http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key={API_KEY}&steamid={steam_id}&format=json&include_appinfo=true"
    try:
        time.sleep(0.5)
        library_response = session.get(library_url, timeout=10)
        if library_response.status_code == 400:
            print("Steam API returned 400 - Invalid SteamID64 or profile does not exist")
            return jsonify({"error": "Invalid SteamID64 or profile does not exist."}), 400
        if library_response.status_code == 403:
            print("Steam API returned 403 - Profile is private")
            return jsonify({"error": "Profile is private. Please set your game details to public in Steam (Settings > Privacy)."}), 403
        if library_response.status_code == 429:
            print("Steam API returned 429 - Rate limit exceeded")
            return jsonify({"error": "Rate limit exceeded. Please try again later."}), 429
        library_response.raise_for_status()
        library_data = library_response.json()
    except requests.exceptions.RequestException as e:
        print(f"Request error for SteamID {steam_id}: {str(e)}")
        return jsonify({"error": f"Failed to fetch data from Steam API: {str(e)}"}), 500

    if "response" in library_data and "games" in library_data["response"]:
        games = library_data["response"]["games"]
        filtered_games = [game for game in games if isinstance(game, dict) and 'appid' in game and 'name' in game]

        if show_played_only:
            filtered_games = [game for game in filtered_games if game.get('playtime_forever', 0) > 0]
        if filter_windows:
            filtered_games = [game for game in filtered_games if game.get('playtime_windows_forever', 0) > 0]
        if filter_mac:
            filtered_games = [game for game in filtered_games if game.get('playtime_mac_forever', 0) > 0]
        if filter_linux:
            filtered_games = [game for game in filtered_games if game.get('playtime_linux_forever', 0) > 0]
        if filter_deck:
            filtered_games = [game for game in filtered_games if game.get('playtime_deck_forever', 0) > 0]
        if search_query:
            filtered_games = [game for game in filtered_games if search_query in game.get('name', '').lower()]
        if date_range != 'all':
            now = int(time.time())
            cutoff = now - (30 * 24 * 60 * 60) if date_range == 'last30Days' else now - (365 * 24 * 60 * 60)
            filtered_games = [game for game in filtered_games if 'rtime_last_played' in game and game['rtime_last_played'] and game['rtime_last_played'] >= cutoff]

        if sort_by == 'name':
            filtered_games = sorted(filtered_games, key=lambda x: x.get('name', '').lower())
        elif sort_by == 'playtime':
            filtered_games = sorted(filtered_games, key=lambda x: x.get('playtime_forever', 0), reverse=True)
        elif sort_by == 'lastPlayed':
            filtered_games = sorted(filtered_games, key=lambda x: x.get('rtime_last_played', 0), reverse=True)
        elif sort_by == 'playtime2Weeks':
            filtered_games = sorted(filtered_games, key=lambda x: x.get('playtime_2weeks', 0), reverse=True)

        total_games = len(filtered_games)
        if per_page <= 0:
            per_page = 50
        start = max(0, (page - 1) * per_page)
        end = min(start + per_page, total_games)
        paginated_games = filtered_games[start:end]
        total_pages = (total_games + per_page - 1) // per_page if total_games > 0 else 1

        if fetch_details:
            for game in paginated_games:
                game['details'] = fetch_game_details(game['appid'])
        else:
            for game in paginated_games:
                game['details'] = {}

        response = {
            "steam_id": steam_id,
            "games": paginated_games,
            "total_games": total_games,
            "page": page,
            "per_page": per_page,
            "total_pages": total_pages
        }
        print(f"Successfully fetched {len(paginated_games)} games for SteamID {steam_id} (page {page}, total filtered: {total_games})")
        return jsonify(response)
    else:
        print(f"No games found for SteamID {steam_id} or profile is private")
        return jsonify({"error": "No games found or profile is private"}), 404

@app.route('/get_achievements', methods=['GET'])
@auth.login_required
@limiter.limit("5 per minute")
def get_achievements():
    steam_id = request.args.get('steamid')
    appid = request.args.get('appid')

    if not steam_id or not steam_id.isdigit() or len(steam_id) != 17:
        print("Invalid SteamID64 format")
        return jsonify({"error": "Invalid SteamID64"}), 400
    if not appid or not appid.isdigit():
        print("Invalid AppID")
        return jsonify({"error": "Invalid AppID"}), 400

    url = f"http://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v0001/?key={API_KEY}&steamid={steam_id}&appid={appid}"
    try:
        response = session.get(url, timeout=5)
        if response.status_code == 400:
            return jsonify({"error": "Invalid SteamID64 or AppID."}), 400
        if response.status_code == 403:
            return jsonify({"error": "Profile is private. Please set your game details to public in Steam (Settings > Privacy)."}), 403
        response.raise_for_status()
        data = response.json()
        if data.get("playerstats", {}).get("success"):
            return jsonify(data["playerstats"])
        return jsonify({"error": "No achievements found or profile is private"}), 404
    except requests.exceptions.RequestException as e:
        print(f"Request error for achievements (SteamID {steam_id}, appid {appid}): {str(e)}")
        return jsonify({"error": f"Failed to fetch achievements from Steam API: {str(e)}"}), 500

@app.route('/register', methods=['POST'])
@limiter.limit("5 per minute")
def register():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400
    if User.query.filter_by(username=username).first():
        return jsonify({"error": "Username already exists"}), 400
    user = User(username=username)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    return jsonify({"message": "User registered successfully"}), 201

# No hardcoded user creation here anymore; handled by init_db.py
if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=5000)