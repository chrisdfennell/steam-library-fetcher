import signal
import sys
from waitress import serve
from app import app, users  # Import the users dictionary from app.py

def signal_handler(sig, frame):
    print("\nWaitress server stopped.")
    sys.exit(0)

if __name__ == "__main__":
    signal.signal(signal.SIGINT, signal_handler)
    host = '127.0.0.1'  # Changed to localhost for security, revert to '0.0.0.0' if network access is needed
    port = 5000
    url = f"http://localhost:{port}"
    
    # Prepare the credentials message
    credentials = "\n".join([f"  Username: {username}\n  Password: {password}" for username, password in users.items()])
    
    print(f"Starting Waitress server...")
    print(f"Server is running at: {url}")
    print("Credentials for access:")
    print(credentials)
    print(f"\nAccess it in your browser or click the link above. Press Ctrl+C to stop.")
    serve(app, host=host, port=port, threads=4, _quiet=False)
    print("Waitress server stopped.")