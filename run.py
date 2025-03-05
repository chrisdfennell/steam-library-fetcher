import signal
import sys
import os
from app import app

def signal_handler(sig, frame):
    print("\nServer stopped.")
    sys.exit(0)

if __name__ == "__main__":
    signal.signal(signal.SIGINT, signal_handler)
    host = '127.0.0.1'
    port = int(os.environ.get("PORT", 5000))
    url = f"http://{host}:{port}"
    
    print(f"Starting Flask development server...")
    print(f"Server is running at: {url}")
    print(f"Access it in your browser. Press Ctrl+C to stop.")
    app.run(debug=True, host=host, port=port)