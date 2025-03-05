<<<<<<< HEAD
import sys
from app import app, db
from sqlalchemy import inspect

# Get username and password from command-line arguments
if len(sys.argv) != 3:
    print("Error: Please provide username and password as arguments.")
    print("Usage: python init_db.py <username> <password>")
    sys.exit(1)

username = sys.argv[1]
password = sys.argv[2]

with app.app_context():
    db.create_all()
    inspector = inspect(db.engine)
    tables = inspector.get_table_names()
    if 'user' not in tables:
        print("Error: 'user' table was not created.")
        sys.exit(1)
    else:
        # Check if any user exists; if not, create the custom user
        from app import User
        if not User.query.first():
            new_user = User(username=username)
            new_user.set_password(password)
            db.session.add(new_user)
            db.session.commit()
            print(f"User '{username}' created successfully.")
        else:
            print("Database already has users; skipping user creation.")
=======
import sys
from app import app, db
from sqlalchemy import inspect

# Get username and password from command-line arguments
if len(sys.argv) != 3:
    print("Error: Please provide username and password as arguments.")
    print("Usage: python init_db.py <username> <password>")
    sys.exit(1)

username = sys.argv[1]
password = sys.argv[2]

with app.app_context():
    db.create_all()
    inspector = inspect(db.engine)
    tables = inspector.get_table_names()
    if 'user' not in tables:
        print("Error: 'user' table was not created.")
        sys.exit(1)
    else:
        # Check if any user exists; if not, create the custom user
        from app import User
        if not User.query.first():
            new_user = User(username=username)
            new_user.set_password(password)
            db.session.add(new_user)
            db.session.commit()
            print(f"User '{username}' created successfully.")
        else:
            print("Database already has users; skipping user creation.")
>>>>>>> 4902f97 (Set up Steam Library Fetcher in new directory for GitHub upload and created a new userdatabase for the user/pass as well as a run.bat script to start this whole project.)
        print("Tables created:", tables)