import uuid
from fastapi import HTTPException
from sqlalchemy.orm import Session
from entity.user_entity import User, Person
from entity.client_entity import Address
from models.user_model import  PersonModel

async def set_primary_address_service(address_id: int, context, db: Session):
    person = db.query(Person).filter(Person.id == context.user_id).first()
    ids = list(person.saved_address_ids or [])
    if address_id in ids:
        ids.remove(address_id)
        ids.insert(0, address_id)
        person.saved_address_ids = ids
        db.commit()
    return {"message": "Primary address set"}
