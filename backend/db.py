import psycopg as pg
from psycopg.rows import dict_row
from pymongo import MongoClient

# PostgreSQL Relational Connection
def get_db_connection():
    return pg.connect(
        host="localhost",
        port="5432",
        dbname="relief_flow_db",
        user="postgres",
        password="Ks@2007",
        row_factory=dict_row
    )

# MongoDB NoSQL Document Store Connection
def get_mongo_collection():
    client = MongoClient("mongodb://localhost:27017/", serverSelectionTimeoutMS=2000)
    db = client["relief_flow_nosql"]
    return db["user_feedback"]