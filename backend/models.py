from pydantic import BaseModel

class RegisterUserRequest(BaseModel):
    username: str
    password: str
    role: str = "DISPATCHER"

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str

class SemanticSearchQuery(BaseModel):
    query_text: str
    top_k: int = 5

class FirstAidQuery(BaseModel):
    user_prompt: str

class DispatchRequest(BaseModel):
    incident_id: int
    resource_id: int

class ReleaseRequest(BaseModel):
    resource_id: int
    incident_id: int

class FeedbackRequest(BaseModel):
    incident_id: int
    feedback_text: str
    rating: int