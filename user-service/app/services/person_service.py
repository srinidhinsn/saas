import uuid
from fastapi import HTTPException
from sqlalchemy.orm import Session
from entity.user_entity import User, Person
from entity.client_entity import Address
from models.user_model import  PersonModel
from utils.auth import hash_password

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
    target_user_id = (body.get("user_id") or context.user_id)
    roles = body.get("roles")
    new_password = body.get("password")
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
    if new_password:
        if len(new_password) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
        user_entity.hashed_password = hash_password(new_password)
    db.commit()
    db.refresh(user_entity)

    return {"message": f"User details {action} successfully","user_id": str(user_entity.id)}

async def get_all_persons_service(client_id: str,db: Session):
    results = (db.query(Person,User.username,User.roles).join(User,Person.id == User.id)
                 .filter(User.client_id == client_id).all())

    persons = []
    for person, username, roles in results:
        if isinstance(roles, str):
            roles = [roles.strip("{}")]
        elif roles is None:
            roles = []

        persons.append({**Person.copyToModel(person).dict(),"username": username,"role": roles[0] if roles else ""})
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

    return {  "message":"Address updated successfully"}

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

async def find_or_create_customer_service(email, phone, shipping_address, customer_id, address_id, db: Session):
    person = None

    if customer_id:
        try:
            candidate_uuid = uuid.UUID(str(customer_id))
            person = db.query(Person).filter(Person.id == candidate_uuid).first()
        except ValueError:
            pass

    if not person and phone:
        person = db.query(Person).filter(Person.phone == phone).first()
    if not person and email:
        person = db.query(Person).filter(Person.email == email).first()

    if not person:
        is_real_name = (
            customer_id
            and customer_id.strip()
            and customer_id != phone
            and customer_id != email
        )

        if is_real_name:
            fallback_name = customer_id.strip()
        else:
            next_index = db.query(Person).count() + 1
            fallback_name = f"customer_{next_index}"
            while db.query(Person).filter(Person.first_name == fallback_name).first():
                next_index += 1
                fallback_name = f"customer_{next_index}"

        person = Person(
            id=uuid.uuid4(),
            email=email or None,
            phone=phone or None,
            first_name=fallback_name,
            last_name=None,
            dob=None,
            saved_address_ids=[],
        )
        db.add(person)
        db.flush()
    else:
        if email:
            person.email = email
        if phone:
            person.phone = phone

    resolved_address_id = None

    if shipping_address:
        existing_ids = list(person.saved_address_ids or [])
        target = None
        if address_id:
            try:
                target_id = int(address_id)
                if target_id in existing_ids:
                    target = db.query(Address).filter(Address.id == target_id).first()
            except (TypeError, ValueError):
                pass

        if target:
            if target.address_line1 != shipping_address:
                target.address_line1 = shipping_address
                target.contact_name = person.first_name
                target.contact_number = phone
            resolved_address_id = target.id

        else:
            existing = db.query(Address).filter(Address.id.in_(existing_ids)).all() if existing_ids else []
            match = next((a for a in existing if a.address_line1 == shipping_address), None)

            if match:
                resolved_address_id = match.id
            else:
                new_address = Address(
                    address_line1=shipping_address,
                    contact_name=person.first_name,
                    contact_number=phone,
                )
                db.add(new_address)
                db.flush()
                person.saved_address_ids = existing_ids + [new_address.id]
                resolved_address_id = new_address.id

    db.commit()
    db.refresh(person)

    return {
        "person_id": str(person.id),
        "first_name": person.first_name,
        "email": person.email,
        "phone": person.phone,
        "shipping_address": shipping_address or "",
        "address_id": resolved_address_id,
        "saved_address_ids": person.saved_address_ids or [],
    }

async def search_customers_service(q: str, db: Session):
    query = db.query(Person)
    if q:
        like = f"%{q}%"
        query = query.filter((Person.phone.ilike(like)) | (Person.email.ilike(like)) | (Person.first_name.ilike(like)))
    persons = query.limit(20).all()

    results = []
    for p in persons:
        addr = ""
        if p.saved_address_ids:
            a = db.query(Address).filter(Address.id == p.saved_address_ids[0]).first()
            if a:
                addr = a.address_line1
        results.append({
            "customer_id": str(p.id),
            "contact_email": p.email or "",
            "contact_phone": p.phone or "",
            "shipping_address": addr,
        })
    return results
