import math
import os
import random
import re
from collections import Counter

import pandas as pd
import psycopg as pg
from psycopg.rows import dict_row

def get_db_connection():
    return pg.connect(
        host="localhost",
        port="5432",
        dbname="relief_flow_db",
        user="postgres",
        password="Ks@2007",
        row_factory=dict_row
    )

print("Initializing Lightweight Vector Engine...")

def normalize_tokens(text):
    return re.findall(r"[a-zA-Z0-9]+", (text or "").lower())

def compute_tfidf_vectors(documents):
    tokenized_docs = [normalize_tokens(doc) for doc in documents]
    vocab = sorted({token for tokens in tokenized_docs for token in tokens})
    
    # Fixed typo: changed 'vocvab' to 'vocab'
    doc_frequency = {token: 0 for token in vocab}
    for tokens in tokenized_docs:
        for token in set(tokens):
            doc_frequency[token] += 1

    n_docs = len(tokenized_docs)
    idf = {
        token: math.log((1 + n_docs) / (1 + doc_frequency[token])) + 1.0
        for token in vocab
    }

    vectors = []
    for tokens in tokenized_docs:
        counts = Counter(tokens)
        if not tokens:
            vectors.append({})
            continue

        doc_length = len(tokens)
        vector = {}
        for token, count in counts.items():
            tf = count / doc_length
            vector[token] = tf * idf.get(token, 1.0)
        vectors.append(vector)

    return vectors

def cosine_similarity(vec_a, vec_b):
    keys = set(vec_a) | set(vec_b)
    if not keys:
        return 0.0

    dot_product = sum(vec_a.get(key, 0.0) * vec_b.get(key, 0.0) for key in keys)
    norm_a = math.sqrt(sum(value * value for value in vec_a.values()))
    norm_b = math.sqrt(sum(value * value for value in vec_b.values()))

    if norm_a == 0 or norm_b == 0:
        return 0.0

    return dot_product / (norm_a * norm_b)

def seed_database():
    conn = get_db_connection()
    cursor = conn.cursor()

    print("Clearing old records and seeding database...")
    cursor.execute("TRUNCATE TABLE dispatches, incidents, resources CASCADE;")
    cursor.execute("ALTER SEQUENCE resources_resource_id_seq RESTART WITH 1;")
    cursor.execute("ALTER SEQUENCE incidents_incident_id_seq RESTART WITH 1;")

    # Matched exactly with your pgAdmin 4 table records
    resources_data = [
        ("NDRF Rescue Unit 1", "Rescue Boat", "(78.4867, 17.3850)", "Available", 5),
        ("Central Fire Station", "Fire Engine", "(78.5011, 17.4399)", "Available", 3),
        ("Emergency Response", "Ambulance", "(78.4744, 17.3713)", "Available", 2),
        ("Flood Relief Team", "Rescue Boat", "(78.3808, 17.4483)", "Available", 4),
        ("Aerial Rescue Service", "Helicopter", "(78.4739, 17.4448)", "Available", 6),
        ("Response Engine 2", "Fire Engine", "(78.4747, 17.3616)", "Available", 4),
        ("Trauma Rapid Express 2", "Ambulance", "(78.3489, 17.4401)", "Available", 2),
        ("Military Relief Unit 2", "Helicopter", "(78.5241, 17.5528)", "Available", 6),
        ("Rations Logistics Truck 1", "Supply Truck", "(78.5483, 17.3503)", "Available", 10),
        ("Rapid Relief Supply Truck 2", "Supply Truck", "(78.3481, 17.4962)", "Available", 10),
    ]

    print("Inserting 10 Resources into database...")
    for res in resources_data:
        cursor.execute(
            """
            INSERT INTO resources (name, resource_type, location, status, capacity)
            VALUES (%s, %s, %s::point, %s, %s);
            """,
            (res[0], res[1], res[2], res[3], res[4])
        )

    # Load Messages
    csv_file = "disaster_response_messages_test.csv"
    if not os.path.exists(csv_file) and os.path.exists(os.path.join("..", csv_file)):
        csv_file = os.path.join("..", csv_file)

    if os.path.exists(csv_file):
        df = pd.read_csv(csv_file)
        messages = df['message'].dropna().head(100).tolist()
    else:
        messages = [
            "Water entering houses near river bank, need emergency boat evacuation immediately.",
            "Gas leak reported near market area, multiple citizens suffocating and fainting.",
            "Building collapsed after heavy rainfall, several victims trapped under debris.",
            "High power electric wire snapped on flooded road, urgent electrical rescue needed.",
            "Pregnant woman requiring immediate medical transfer to hospital during flood.",
            "Fire breaking out in residential apartment complex, severe smoke rising."
        ]

    vector_matrix = compute_tfidf_vectors(messages)
    severities = ["Low", "Medium", "High", "Critical"]

    print(f"Generating vectors and seeding {len(messages)} incidents...")

    for idx, (msg, vec) in enumerate(zip(messages, vector_matrix), start=1):
        embedding_vector = [float(value) for value in vec.values()]
        lon = round(random.uniform(78.30, 78.60), 4)
        lat = round(random.uniform(17.30, 17.50), 4)
        location_point = f"({lon}, {lat})"
        sev = random.choice(severities)

        cursor.execute(
            """
            INSERT INTO incidents (description, embedding, location, severity, status)
            VALUES (%s, %s, %s::point, %s, 'Pending');
            """,
            (str(msg), embedding_vector, location_point, sev)
        )

    conn.commit()
    cursor.close()
    conn.close()
    print("Database seeding completed successfully!")

if __name__ == "__main__":
    seed_database()