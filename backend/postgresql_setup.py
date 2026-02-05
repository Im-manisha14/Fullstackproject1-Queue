"""
PostgreSQL Database Setup and Management Script
Handles database creation, initialization, and maintenance
"""

import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import sys
import os
from datetime import datetime

# Database configuration
DB_CONFIG = {
    'host': 'localhost',
    'user': 'postgres',
    'password': 'Manisha14',
    'database': 'queue'
}

def create_database():
    """Create the database if it doesn't exist"""
    try:
        # Connect to PostgreSQL server (not specific database)
        conn = psycopg2.connect(
            host=DB_CONFIG['host'],
            user=DB_CONFIG['user'],
            password=DB_CONFIG['password']
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        # Check if database exists
        cursor.execute("SELECT 1 FROM pg_database WHERE datname=%s", (DB_CONFIG['database'],))
        exists = cursor.fetchone()
        
        if not exists:
            cursor.execute(f"CREATE DATABASE {DB_CONFIG['database']}")
            print(f"✅ Database '{DB_CONFIG['database']}' created successfully")
        else:
            print(f"ℹ️ Database '{DB_CONFIG['database']}' already exists")
        
        cursor.close()
        conn.close()
        
    except psycopg2.Error as e:
        print(f"❌ Error creating database: {e}")
        sys.exit(1)

def test_connection():
    """Test database connection"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        # Test query
        cursor.execute("SELECT version();")
        version = cursor.fetchone()
        print(f"✅ PostgreSQL connection successful")
        print(f"   Version: {version[0]}")
        
        cursor.close()
        conn.close()
        return True
        
    except psycopg2.Error as e:
        print(f"❌ Database connection failed: {e}")
        return False

def setup_extensions():
    """Setup required PostgreSQL extensions"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        # Enable UUID extension
        cursor.execute("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";")
        
        # Enable crypto functions
        cursor.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto;")
        
        conn.commit()
        print("✅ PostgreSQL extensions enabled successfully")
        
        cursor.close()
        conn.close()
        
    except psycopg2.Error as e:
        print(f"❌ Error setting up extensions: {e}")
        return False

def optimize_database():
    """Apply performance optimizations"""
    optimizations = [
        # Index optimizations will be handled by SQLAlchemy
        "-- Performance optimizations applied via SQLAlchemy models",
        
        # Connection pooling settings (applied at connection level)
        "-- Connection pooling configured in Flask app"
    ]
    
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        # Update table statistics
        cursor.execute("ANALYZE;")
        
        conn.commit()
        print("✅ Database optimizations applied")
        
        cursor.close()
        conn.close()
        
    except psycopg2.Error as e:
        print(f"❌ Error applying optimizations: {e}")

def backup_database(backup_path=None):
    """Create database backup"""
    if not backup_path:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = f"backup_queue_{timestamp}.sql"
    
    try:
        import subprocess
        cmd = [
            'pg_dump',
            '-h', DB_CONFIG['host'],
            '-U', DB_CONFIG['user'],
            '-d', DB_CONFIG['database'],
            '-f', backup_path,
            '--verbose'
        ]
        
        # Set password via environment variable
        env = os.environ.copy()
        env['PGPASSWORD'] = DB_CONFIG['password']
        
        result = subprocess.run(cmd, env=env, capture_output=True, text=True)
        
        if result.returncode == 0:
            print(f"✅ Database backup created: {backup_path}")
        else:
            print(f"❌ Backup failed: {result.stderr}")
            
    except Exception as e:
        print(f"❌ Backup error: {e}")

def restore_database(backup_path):
    """Restore database from backup"""
    try:
        import subprocess
        cmd = [
            'psql',
            '-h', DB_CONFIG['host'],
            '-U', DB_CONFIG['user'],
            '-d', DB_CONFIG['database'],
            '-f', backup_path
        ]
        
        # Set password via environment variable
        env = os.environ.copy()
        env['PGPASSWORD'] = DB_CONFIG['password']
        
        result = subprocess.run(cmd, env=env, capture_output=True, text=True)
        
        if result.returncode == 0:
            print(f"✅ Database restored from: {backup_path}")
        else:
            print(f"❌ Restore failed: {result.stderr}")
            
    except Exception as e:
        print(f"❌ Restore error: {e}")

def check_database_health():
    """Check database health and performance"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        # Check database size
        cursor.execute("""
            SELECT pg_size_pretty(pg_database_size(%s)) as db_size
        """, (DB_CONFIG['database'],))
        db_size = cursor.fetchone()[0]
        
        # Check connection count
        cursor.execute("""
            SELECT count(*) as connections 
            FROM pg_stat_activity 
            WHERE datname = %s
        """, (DB_CONFIG['database'],))
        connections = cursor.fetchone()[0]
        
        # Check table counts
        cursor.execute("""
            SELECT schemaname, tablename, n_tup_ins, n_tup_upd, n_tup_del
            FROM pg_stat_user_tables
            ORDER BY n_tup_ins DESC
        """)
        tables = cursor.fetchall()
        
        print(f"📊 Database Health Report:")
        print(f"   Database Size: {db_size}")
        print(f"   Active Connections: {connections}")
        print(f"   Tables: {len(tables)}")
        
        if tables:
            print("   Table Activity:")
            for table in tables:
                print(f"     {table[1]}: {table[2]} inserts, {table[3]} updates, {table[4]} deletes")
        
        cursor.close()
        conn.close()
        
    except psycopg2.Error as e:
        print(f"❌ Health check failed: {e}")

def main():
    """Main setup function"""
    print("🏥 Healthcare Queue Database Setup")
    print("=" * 40)
    
    # Create database
    create_database()
    
    # Test connection
    if not test_connection():
        sys.exit(1)
    
    # Setup extensions
    setup_extensions()
    
    # Apply optimizations
    optimize_database()
    
    # Health check
    check_database_health()
    
    print("\n✅ Database setup completed successfully!")
    print("\n📋 Next Steps:")
    print("   1. Run: python app.py to start the Flask application")
    print("   2. The app will create tables automatically")
    print("   3. Use /api/initialize-db endpoint to seed initial data")

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='PostgreSQL Database Management')
    parser.add_argument('--backup', action='store_true', help='Create database backup')
    parser.add_argument('--restore', type=str, help='Restore from backup file')
    parser.add_argument('--health', action='store_true', help='Check database health')
    parser.add_argument('--setup', action='store_true', help='Run full setup')
    
    args = parser.parse_args()
    
    if args.backup:
        backup_database()
    elif args.restore:
        restore_database(args.restore)
    elif args.health:
        check_database_health()
    elif args.setup or len(sys.argv) == 1:
        main()
    else:
        parser.print_help()