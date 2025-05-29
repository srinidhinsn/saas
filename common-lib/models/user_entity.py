from database.postgres import Base
from sqlalchemy import Column , Integer, String, ARRAY

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    clientId = Column(String)
    roles = Column(ARRAY(String))
    grants = Column(ARRAY(String))
