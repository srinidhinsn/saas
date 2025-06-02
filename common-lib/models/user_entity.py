from database.postgres import Base
from sqlalchemy import Column , Integer, String, ARRAY

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, index=True)
    hashed_password = Column(String)
    clientId = Column(String)
    roles = Column(ARRAY(String))
    grants = Column(ARRAY(String))

class PageDefinition(Base):
    __tablename__ = "pageDefinition"
    id = Column (Integer, primary_key=True, index=True)
    clientId = Column(String)
    role = Column(String)
    module = Column(String)
    operations = Column(ARRAY(String))
    screenId = Column(String)
    loadType = Column(String)


