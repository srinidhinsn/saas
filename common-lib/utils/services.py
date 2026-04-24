from sqlalchemy.orm import Session
from fastapi import HTTPException
from entity.inventory_entity import CategoryEntity


def add_master_value(db: Session, client_id: str, category_id: str, value: str):
    role = value.strip().lower()

    if not role:
        raise HTTPException(status_code=400, detail="Value is required")

    category = db.query(CategoryEntity).filter(
        CategoryEntity.id == category_id,
        CategoryEntity.client_id == client_id
    ).first()

    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    items = category.sub_categories or []

    if role in [r.lower() for r in items]:
        raise HTTPException(status_code=409, detail="Value already exists")

    category.sub_categories = items + [role]

    existing_row = db.query(CategoryEntity).filter(
        CategoryEntity.id == role,
        CategoryEntity.client_id == client_id
    ).first()

    if not existing_row:
        db.add(
            CategoryEntity(
                id=role,
                client_id=client_id,
                name=role.capitalize(),
                description=f"{role}",
                sub_categories=None,
                slug=f"_{role}_",
            )
        )

    db.commit()
    db.refresh(category)

    return category.sub_categories


def delete_master_value(db: Session, client_id: str, category_id: str, value: str):
    role = value.strip().lower()

    category = db.query(CategoryEntity).filter(
        CategoryEntity.id == category_id,
        CategoryEntity.client_id == client_id
    ).first()

    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    items = category.sub_categories or []

    if role not in [i.lower() for i in items]:
        raise HTTPException(status_code=404, detail="Value not found")

    category.sub_categories = [i for i in items if i.lower() != role]

    role_row = db.query(CategoryEntity).filter(
        CategoryEntity.id == role,
        CategoryEntity.client_id == client_id
    ).first()

    if role_row:
        db.delete(role_row)

    db.commit()
    db.refresh(category)

    return category.sub_categories


def get_master_values(db: Session, client_id: str, category_id: str):
    category = db.query(CategoryEntity).filter(
        CategoryEntity.id == category_id,
        CategoryEntity.client_id == client_id
    ).first()

    if not category:
        return []

    return category.sub_categories or []
