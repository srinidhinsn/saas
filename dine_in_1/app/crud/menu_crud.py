from sqlalchemy.orm import joinedload
from sqlalchemy.orm import Session
from uuid import UUID
from app import models, schemas

from app.schemas.menu import MenuCategoryBase, MenuCategoryCreate, MenuCategoryUpdate, MenuCategoryOut, MenuItemBase, MenuItemCreate, MenuItemUpdate, MenuItemOut
from app.models.menu_category import MenuCategory
from app.models.menu_item import MenuItem

# ------- Categories -------


def get_categories(db: Session, client_id: UUID):
    return db.query(MenuCategory).filter(MenuCategory.client_id == client_id).all()


def create_category(db: Session, category: MenuCategoryCreate):
    db_category = MenuCategory(**category.dict())
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category


def update_category(db: Session, client_id: UUID, category_id: UUID, updates: MenuCategoryUpdate):
    db_cat = db.query(MenuCategory).filter_by(
        id=category_id, client_id=client_id).first()
    if not db_cat:
        return None
    for key, value in updates.dict(exclude_unset=True).items():
        setattr(db_cat, key, value)
    db.commit()
    db.refresh(db_cat)
    return db_cat


def delete_category(db: Session, client_id: UUID, category_id: UUID):
    db_cat = db.query(MenuCategory).filter_by(
        id=category_id, client_id=client_id).first()
    if not db_cat:
        return None
    db.delete(db_cat)
    db.commit()
    return db_cat


# ------- Menu Items -------


def get_items(db: Session, client_id: UUID):
    return (
        db.query(MenuItem)
        .options(joinedload(MenuItem.category))  # Load related category
        .filter(MenuItem.client_id == client_id)
        .all()
    )


def create_item(db: Session, item: MenuItemCreate):
    db_item = MenuItem(**item.dict())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item


def update_item(db: Session, client_id: UUID, item_id: UUID, updates: MenuItemUpdate):
    db_item = db.query(MenuItem).filter_by(
        id=item_id, client_id=client_id).first()
    if not db_item:
        return None
    for key, value in updates.dict(exclude_unset=True).items():
        setattr(db_item, key, value)
    db.commit()
    db.refresh(db_item)
    return db_item


def delete_item(db: Session, client_id: UUID, item_id: UUID):
    db_item = db.query(MenuItem).filter_by(
        id=item_id, client_id=client_id).first()
    if not db_item:
        return None
    db.delete(db_item)
    db.commit()
    return db_item
