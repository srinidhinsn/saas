from database.postgres import Base
from sqlalchemy import Column , Integer, String, ARRAY
from .user_model import UserModel, PageDefinitionModel

class User(Base):
    __tablename__ = "User"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, index=True)
    hashed_password = Column(String)
    clientId = Column(String)
    roles = Column(ARRAY(String))
    grants = Column(ARRAY(String))


    @staticmethod
    def copyToModel(user):
        """Convert SQLAlchemy User entities into Pydantic User models."""
        userModel = UserModel(**user.__dict__)
        userModel.__dict__.pop("_sa_instance_state", None)
        return userModel

    @staticmethod
    def copyFromModel(userModel):
        """Convert a single Pydantic DineinOrders model into a SQLAlchemy entity."""
        return User(**userModel.dict(exclude_unset=True))


    @staticmethod
    def copyToModels(users):
        """Convert SQLAlchemy User entities into Pydantic User models."""
        userModels = [UserModel(**user.__dict__) for user in users]

        # Remove SQLAlchemy metadata (_sa_instance_state)
        for model in userModels:
            model.__dict__.pop("_sa_instance_state", None)

        return userModels

    @staticmethod
    def copyFromModels(userModels):
        """Convert Pydantic User models into SQLAlchemy User entities."""
        return [User(**model.dict(exclude_unset=True)) for model in userModels]


class PageDefinition(Base):
    __tablename__ = "PageDefinition"
    id = Column (Integer, primary_key=True, index=True)
    clientId = Column(String)
    role = Column(String)
    module = Column(String)
    operations = Column(ARRAY(String))
    screenId = Column(String)
    loadType = Column(String)

    @staticmethod
    def copyToModels(page_definitions):
        """Convert SQLAlchemy PageDefinition entities into Pydantic models, removing metadata."""
        pageDefinitionModels = [PageDefinitionModel(**page_def.__dict__) for page_def in page_definitions]

        # Remove SQLAlchemy metadata (_sa_instance_state)
        for model in pageDefinitionModels:
            model.__dict__.pop("_sa_instance_state", None)

        return pageDefinitionModels

    @staticmethod
    def copyFromModels(page_models):
        """Convert Pydantic PageDefinition models into SQLAlchemy entities."""
        page_definitions = [
            PageDefinition(**model.dict(exclude_unset=True)) for model in page_models
        ]
        return page_definitions

