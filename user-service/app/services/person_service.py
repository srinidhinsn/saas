import uuid
from fastapi import HTTPException
from sqlalchemy.orm import Session
from entity.user_entity import User, Person
from entity.client_entity import Address
from models.user_model import  PersonModel

async def get_person_details_service(context,db: Session):
    try:
        user_uuid = uuid.UUID(str(context.user_id))
    except ValueError:
        raise HTTPException(status_code=400,detail="Invalid user_id format")

    person = (db.query(Person).filter(Person.id == user_uuid).first())

    if not person:
        person = Person(id=user_uuid,email=None,phone=None,first_name=None,last_name=None,dob=None)

        db.add(person)
        db.commit()
        db.refresh(person)

    return {"person": PersonModel.from_orm(person)}
    
async def update_person_details_service(client_id: str,person_req,body: dict,context,db: Session):
    target_user_id = (
        body.get("user_id")
        or context.user_id
    )

    roles = body.get("roles")

    try:
        user_uuid = uuid.UUID(str(target_user_id))
    except ValueError:
        raise HTTPException(status_code=400,detail="Invalid user_id")

    user_entity = (db.query(User).filter(User.id == user_uuid,User.client_id == client_id).first())

    if not user_entity:
        raise HTTPException(status_code=404,detail="User not found")

    person_entity = (db.query(Person).filter(Person.id == user_uuid).first())

    if person_entity:
        person_entity.first_name = person_req.first_name
        person_entity.last_name = person_req.last_name
        person_entity.dob = person_req.dob
        person_entity.email = person_req.email
        person_entity.phone = person_req.phone
        action = "updated"

    else:
        person_entity = Person(
            id=user_uuid,
            first_name=person_req.first_name,
            last_name=person_req.last_name,
            dob=person_req.dob,
            email=person_req.email,
            phone=person_req.phone
        )

        db.add(person_entity)
        action = "added"

    if roles is not None:
        user_entity.roles = [
            str(r).strip()
            for r in roles
        ]

    db.commit()
    db.refresh(user_entity)

    return {"message": f"User details {action} successfully","user_id": str(user_entity.id)}

async def get_all_persons_service(client_id: str,db: Session):
    results = (
        db.query(Person,User.username,User.roles).join(User,Person.id == User.id).filter(User.client_id == client_id).all())

    persons = []

    for person, username, roles in results:
        if isinstance(roles, str):
            roles = [roles.strip("{}")]
        elif roles is None:
            roles = []

        persons.append({
            **Person.copyToModel(person).dict(),
            "username": username,
            "role": roles[0] if roles else ""
        })

    return {"persons": persons}

async def save_address_service(add,context,db: Session):
    try:
        user_uuid = uuid.UUID(str(context.user_id))
    except ValueError:
        raise HTTPException(status_code=400,detail="Invalid user id")

    person = (db.query(Person).filter(Person.id == user_uuid).first())

    if not person:
        raise HTTPException(status_code=404,detail="Person not found")

    address = Address(
        address_line1=add.address_line1,
        address_line2=add.address_line2,
        name=add.name,
        city=add.city,
        state=add.state,
        country=add.country,
        pincode=add.pincode,
        contact_name=add.contact_name,
        contact_number=add.contact_number
    )

    db.add(address)
    db.flush()

    address_ids = list(person.saved_address_ids or [])

    address_ids.append(address.id)

    person.saved_address_ids = address_ids

    db.commit()

    return {"message": "Address added successfully","address_id": address.id}

async def get_addresses_service(context,db: Session):
    person = (db.query(Person).filter(Person.id == context.user_id).first())

    if not person or not person.saved_address_ids:
        return {"addresses": []}

    addresses = (db.query(Address).filter(Address.id.in_(person.saved_address_ids)).all())
   
    addr_map = {a.id: a for a in addresses}
    ordered = [
        Address.copyToModel(addr_map[aid])
        for aid in person.saved_address_ids
        if aid in addr_map
    ]

    return {"addresses": ordered}

async def update_address_service(address_id: int,add,db: Session):
    address = (db.query(Address).filter(Address.id == address_id).first())

    if not address:
        raise HTTPException(status_code=404,detail="Address not found")

    address.address_line1 = add.address_line1
    address.address_line2 = add.address_line2
    address.name = add.name
    address.city = add.city
    address.state = add.state
    address.country = add.country
    address.pincode = add.pincode
    address.contact_name = add.contact_name
    address.contact_number = add.contact_number

    db.commit()
    db.refresh(address)

    return {"message":"Address updated successfully"}


async def get_customer_addresses_service(customer_id: str,db: Session):
    try:
        customer_uuid = uuid.UUID(str(customer_id))
    except ValueError:
        raise HTTPException(status_code=400,detail="Invalid customer_id")

    person = (db.query(Person).filter(Person.id == customer_uuid).first())

    if (not person or not person.saved_address_ids):
        return []

    addresses = (db.query(Address).filter(Address.id.in_(person.saved_address_ids)).all())

    return [
        Address.copyToModel(a).dict()
        for a in addresses
    ]

async def set_primary_address_service(address_id: int, context, db: Session):
    person = db.query(Person).filter(Person.id == context.user_id).first()
    ids = list(person.saved_address_ids or [])
    if address_id in ids:
        ids.remove(address_id)
        ids.insert(0, address_id)
        person.saved_address_ids = ids
        db.commit()
    return {"message": "Primary address set"}
