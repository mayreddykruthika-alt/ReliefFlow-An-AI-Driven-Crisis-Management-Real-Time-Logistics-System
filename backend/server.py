from datetime import datetime, timedelta
import numpy as np
import bcrypt
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from jose import JWTError, jwt
from sklearn.feature_extraction.text import TfidfVectorizer

from db import get_db_connection, get_mongo_collection
from models import (
    RegisterUserRequest, Token, SemanticSearchQuery, 
    FirstAidQuery, DispatchRequest, ReleaseRequest, FeedbackRequest
)

SECRET_KEY = "RELIEF_FLOW_SUPER_SECRET_KEY_2026"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

app = FastAPI(
    title="RELIEF-FLOW Hybrid Microservices Server",
    description="Disaster Relief Management System",
    version="4.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def hash_password(password: str) -> str:
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))


def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        role: str = payload.get("role")
        if username is None or role is None:
            raise credentials_exception
        return {"username": username, "role": role}
    except JWTError:
        raise credentials_exception


# ---------------------------------------------------------
# 1. JWT AUTHENTICATION ENDPOINTS
# ---------------------------------------------------------
@app.post("/api/v1/auth/register", tags=["1. JWT Authentication"])
async def register_user(user_data: RegisterUserRequest):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT user_id FROM users WHERE username = %s;", (user_data.username,))
    if cursor.fetchone():
        cursor.close()
        conn.close()
        raise HTTPException(status_code=400, detail="Username already exists")

    hashed_pwd = hash_password(user_data.password)
    cursor.execute(
        "INSERT INTO users (username, hashed_password, role) VALUES (%s, %s, %s) RETURNING user_id, username, role;",
        (user_data.username, hashed_pwd, user_data.role.upper())
    )
    new_user = cursor.fetchone()
    conn.commit()
    cursor.close()
    conn.close()
    return {"status": "SUCCESS", "message": f"User '{user_data.username}' registered!", "user": new_user}


@app.post("/token", response_model=Token, tags=["1. JWT Authentication"])
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT user_id, username, hashed_password, role FROM users WHERE username = %s;", (form_data.username,))
    user = cursor.fetchone()
    cursor.close()
    conn.close()

    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(status_code=400, detail="Incorrect username or password")

    access_token = create_access_token(data={"sub": user["username"], "role": user["role"]})
    return {"access_token": access_token, "token_type": "bearer", "role": user["role"]}


# ---------------------------------------------------------
# 2. FULL VECTOR SEMANTIC SEARCH (ALL MESSAGES IN DB)
# ---------------------------------------------------------
@app.post("/api/v1/incidents/semantic-search", tags=["2. Vector Database & RAG"])
async def semantic_search(query: SemanticSearchQuery, current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT incident_id, description, severity, status FROM incidents WHERE description IS NOT NULL;")
    all_incidents = cursor.fetchall()
    cursor.close()
    conn.close()

    if not all_incidents:
        return {"searched_query": query.query_text, "results_found": 0, "matches": []}

    descriptions = [str(inc["description"]) for inc in all_incidents]
    descriptions.append(str(query.query_text))

    vectorizer = TfidfVectorizer(stop_words='english', token_pattern=r'(?u)\b\w+\b')
    tfidf_matrix = vectorizer.fit_transform(descriptions).toarray()

    query_vec = tfidf_matrix[-1]
    doc_vectors = tfidf_matrix[:-1]

    scored_matches = []
    for inc, doc_vec in zip(all_incidents, doc_vectors):
        norm_q = np.linalg.norm(query_vec)
        norm_d = np.linalg.norm(doc_vec)
        
        similarity = np.dot(query_vec, doc_vec) / (norm_q * norm_d) if (norm_q > 0 and norm_d > 0) else 0.0

        scored_matches.append({
            "incident_id": inc["incident_id"],
            "description": inc["description"],
            "severity": inc["severity"],
            "status": inc["status"],
            "score": round(float(similarity), 4)
        })

    scored_matches.sort(key=lambda x: x["score"], reverse=True)
    
    k = query.top_k if query.top_k else 10
    top_matches = scored_matches[:k]

    return {
        "searched_query": query.query_text,
        "results_found": len(top_matches),
        "matches": top_matches
    }


# ---------------------------------------------------------
# 3. FIRST-AID CHATBOT
# ---------------------------------------------------------
@app.post("/api/v1/chatbot/first-aid", tags=["2. Vector Database & RAG"])
async def get_first_aid_guidance(query: FirstAidQuery, current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT condition_name, steps, do_not, keywords FROM first_aid_knowledge;")
    all_knowledge = cursor.fetchall()
    cursor.close()
    conn.close()

    user_prompt_lower = query.user_prompt.lower()
    prompt_words = set(user_prompt_lower.split())

    matched_guidance = None
    max_matches = 0

    for record in all_knowledge:
        keywords = set(record['keywords'].lower().split())
        overlap = len(prompt_words.intersection(keywords))
        
        if any(kw in user_prompt_lower for kw in keywords):
            overlap += 2

        if overlap > max_matches:
            max_matches = overlap
            matched_guidance = record

    if matched_guidance and max_matches > 0:
        return {
            "found": True, 
            "condition": matched_guidance["condition_name"], 
            "steps": matched_guidance["steps"], 
            "do_not": matched_guidance["do_not"]
        }

    return {
        "found": False, 
        "condition": "General First-Aid Protocol", 
        "steps": "1. Keep patient calm and immobile. 2. Call local emergency helpline (108/112). 3. Ensure airway is open and monitor breathing.", 
        "do_not": "Do not move victim unnecessarily. Do not give water or food to unconscious victims."
    }


# ---------------------------------------------------------
# 4. TRANSACTION ENGINE (LOCK & FREE)
# ---------------------------------------------------------
@app.post("/api/v1/dispatch/allocate", tags=["3. Transactional Dispatch Engine"])
async def allocate_resource(req: DispatchRequest, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["DISPATCHER", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Forbidden: DISPATCHER role required")

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("BEGIN;")

        cursor.execute("SELECT incident_id FROM incidents WHERE incident_id = %s;", (req.incident_id,))
        if not cursor.fetchone():
            conn.rollback()
            raise HTTPException(status_code=404, detail=f"Incident #{req.incident_id} not found in database")

        cursor.execute("SELECT resource_id, status FROM resources WHERE resource_id = %s FOR UPDATE;", (req.resource_id,))
        res = cursor.fetchone()
        if not res:
            conn.rollback()
            raise HTTPException(status_code=404, detail=f"Resource #{req.resource_id} not found in database")

        if res["status"] != "Available":
            cursor.execute("UPDATE resources SET status = 'Available' WHERE resource_id = %s;", (req.resource_id,))

        cursor.execute("INSERT INTO dispatches (incident_id, resource_id) VALUES (%s, %s);", (req.incident_id, req.resource_id))
        cursor.execute("UPDATE resources SET status = 'Allocated' WHERE resource_id = %s;", (req.resource_id,))
        cursor.execute("UPDATE incidents SET status = 'Dispatched' WHERE incident_id = %s;", (req.incident_id,))

        conn.commit()
        return {
            "status": "SUCCESS", 
            "message": f"SUCCESS: Resource #{req.resource_id} allocated to Incident #{req.incident_id} under FOR UPDATE lock."
        }
    except HTTPException as he:
        conn.rollback()
        raise he
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()


@app.post("/api/v1/dispatch/release", tags=["3. Transactional Dispatch Engine"])
async def release_resource(req: ReleaseRequest, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["DISPATCHER", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Forbidden: DISPATCHER role required")

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("BEGIN;")
        cursor.execute("UPDATE resources SET status = 'Available' WHERE resource_id = %s;", (req.resource_id,))
        cursor.execute("UPDATE incidents SET status = 'Resolved' WHERE incident_id = %s;", (req.incident_id,))
        conn.commit()
        return {
            "status": "SUCCESS", 
            "message": f"SUCCESS: Resource #{req.resource_id} deallocated and restored to 'Available'."
        }
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()


# ---------------------------------------------------------
# 5. AUDIT LOGS & NOSQL FEEDBACK
# ---------------------------------------------------------
@app.get("/api/v1/audit-logs", tags=["4. Audit Trail & Compliance"])
async def get_audit_logs(current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT log_id, entity_name, record_id, action, old_state, new_state, changed_at FROM audit_logs ORDER BY changed_at DESC LIMIT 15;")
    logs = cursor.fetchall()
    cursor.close()
    conn.close()
    return {"audit_trail": logs}


@app.post("/api/v1/feedback", tags=["5. NoSQL Document Store"])
async def submit_feedback(req: FeedbackRequest, current_user: dict = Depends(get_current_user)):
    try:
        collection = get_mongo_collection()
        doc = {
            "incident_id": req.incident_id,
            "submitted_by": current_user["username"],
            "feedback_text": req.feedback_text,
            "rating": req.rating,
            "timestamp": datetime.utcnow()
        }
        res = collection.insert_one(doc)
        return {"status": "SUCCESS", "inserted_id": str(res.inserted_id)}
    except Exception as e:
        return {"status": "SKIPPED", "message": f"MongoDB Note: {str(e)}"}

