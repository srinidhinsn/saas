from sqlalchemy.orm import Session
from uuid import uuid4
from app import models, schemas
from app.schemas.combo import ComboItemCreate, ComboCreate, ComboItemOut, ComboOut
from app.models.combo import MenuCombo, ComboItem
from uuid import UUID

from sqlalchemy.orm import joinedload

def create_combo(db: Session, combo_data: ComboCreate):
    combo = MenuCombo(
        id=uuid4(),
        client_id=combo_data.client_id,
        name=combo_data.name,
        description=combo_data.description,
        price=combo_data.price,
    )
    db.add(combo)
    db.flush()

    combo_items = []
    for item in combo_data.items:
        combo_item = ComboItem(
            id=uuid4(),
            combo_id=combo.id,
            menu_item_id=item.menu_item_id,
            quantity=item.quantity,
        )
        db.add(combo_item)
        combo_items.append(combo_item)

    db.commit()

    # ✅ Return Pydantic schema manually with required fields
    return ComboOut(
        id=combo.id,
        name=combo.name,
        description=combo.description,
        price=combo.price,
        items=[
            ComboItemOut(
                menu_item_id=ci.menu_item_id,
                quantity=ci.quantity
            ) for ci in combo_items
        ]
    )



def update_combo(db: Session, combo_id: UUID, updated_data: ComboCreate):
    combo = db.query(MenuCombo).filter(MenuCombo.id == combo_id).first()
    if not combo:
        return None

    combo.name = updated_data.name
    combo.description = updated_data.description
    combo.price = updated_data.price

    db.query(ComboItem).filter(ComboItem.combo_id == combo_id).delete()

    combo_items = []
    for item in updated_data.items:
        combo_item = ComboItem(
            combo_id=combo_id,
            menu_item_id=item.menu_item_id,
            quantity=item.quantity
        )
        db.add(combo_item)
        combo_items.append(combo_item)

    db.commit()
    db.refresh(combo)

    return ComboOut(
        id=combo.id,
        name=combo.name,
        description=combo.description,
        price=combo.price,
        items=[
            ComboItemOut(
                menu_item_id=ci.menu_item_id,
                quantity=ci.quantity
            ) for ci in combo_items
        ]
    )


def delete_combo(db: Session, combo_id: UUID):
    combo = db.query(MenuCombo).filter(MenuCombo.id == combo_id).first()
    if not combo:
        return False
    db.delete(combo)
    db.commit()
    return True


def get_combos_by_client(db: Session, client_id: UUID):
    combos = db.query(MenuCombo).filter(MenuCombo.client_id == client_id).all()

    result = []
    for combo in combos:
        combo_items = db.query(ComboItem).filter(ComboItem.combo_id == combo.id).all()
        item_list = [
            ComboItemOut(
                menu_item_id=ci.menu_item_id,
                quantity=ci.quantity
            ) for ci in combo_items
        ]

        result.append(ComboOut(
            id=combo.id,
            name=combo.name,
            description=combo.description,
            price=combo.price,
            items=item_list
        ))

    return result





# def create_combo(db: Session, combo_data: ComboCreate):
#     combo = MenuCombo(
#         id=uuid4(),
#         client_id=combo_data.client_id,
#         name=combo_data.name,
#         description=combo_data.description,
#         price=combo_data.price
#     )
#     db.add(combo)
#     db.flush()

#     for item in combo_data.items:
#         combo_item = ComboItem(
#             id=uuid4(),
#             combo_id=combo.id,
#             menu_item_id=item.menu_item_id,
#             quantity=item.quantity
#         )
#         db.add(combo_item)

#     db.commit()
#     db.refresh(combo)
#     return combo
