"""
Database Configuration for PostgreSQL with SQLAlchemy and PostGIS
"""
import os
from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
from geoalchemy2 import Geometry

# Load environment variables
load_dotenv()

# Database connection parameters
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = os.getenv('DB_PORT', '5432')
DB_NAME = os.getenv('DB_NAME', 'urban_risk_db')
DB_USER = os.getenv('DB_USER', 'postgres')
DB_PASSWORD = os.getenv('DB_PASSWORD', 'password')

# Create database URL
DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# Create SQLAlchemy engine
engine = create_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    echo=False  # Set to True for SQL query logging
)

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base class for declarative models
Base = declarative_base()

def get_db():
    """
    Database session generator for dependency injection
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def enable_postgis(connection, connection_record):
    """
    Enable PostGIS extension on database connection
    """
    cursor = connection.cursor()
    try:
        cursor.execute("CREATE EXTENSION IF NOT EXISTS postgis;")
        cursor.execute("CREATE EXTENSION IF NOT EXISTS postgis_topology;")
        connection.commit()
    except Exception as e:
        print(f"PostGIS extension error: {e}")
    finally:
        cursor.close()

def init_db():
    """
    Initialize database - enable PostGIS and create all tables
    """
    # Enable PostGIS extension
    with engine.connect() as conn:
        conn.execute("CREATE EXTENSION IF NOT EXISTS postgis;")
        conn.execute("CREATE EXTENSION IF NOT EXISTS postgis_topology;")
        conn.commit()

    # Create all tables
    Base.metadata.create_all(bind=engine)
