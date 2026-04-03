from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordBearer
from models.saas_context import SaasContext, saasContext
from models.user_model import PageDefinitionModel
from models.order_model import TransactionTypeEnum, MovementTypeEnum
from entity.user_entity import PageDefinition
from entity.inventory_entity import CategoryEntity, InventoryEntity, InventoryTransactionEntity
from database.postgres import get_db
from sqlalchemy.orm import Session
from decimal import Decimal
from typing import Optional
import uuid

SECRET_KEY = "nsn"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")


def hash_password(password: str):
    return pwd_context.hash(password)


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(
    req: Request = None,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    try:
        print("token - ", token)
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        print("Payload - ", payload)

        client_id = payload.get("client_id")

        path = req.url.path
        path_parts = path.split("/")
        url_client_id = path_parts[2]
        url_module = path_parts[3]
        url_operation = path_parts[4]
        roles = payload["roles"]
        grants = payload["grants"]
        realm = payload["realm"]

        if grants.index(realm) < 0:
            raise HTTPException(
                status_code=403,
                detail="Restricted Grant. Please contact administrator.",
            )

        default_realm = "realm"
        default_client_id = "saas"
        records = (
            db.query(CategoryEntity)
            .filter(CategoryEntity.client_id == default_client_id)
            .order_by(CategoryEntity.slug)
            .all()
        )

        print("records - ", records)
        models = CategoryEntity.copyToModels(records)

        print("models - ", models)
        lookup = {cat.id: cat for cat in models}
        default_category = lookup.get(default_realm)

        if default_category:
            if default_category.sub_categories.index(realm) >= 0:
                realm_category = lookup.get(realm)
                print("realm_category - ", realm_category)
                if realm_category.sub_categories.index(url_module) >= 0:
                    access_category = lookup.get(url_module)
                    print("access_category - ", access_category)
                    if access_category.sub_categories.index(url_operation) >= 0:
                        page_definitions = get_page_definition(
                            roles, url_module, url_client_id, db
                        )
                        pageDefinitionModels = PageDefinition.copyToModels(page_definitions)
                        print("pageDefinitionModels - ", pageDefinitionModels)
                        screenId = get_screen_id(pageDefinitionModels, url_operation)
                        print("screen_id - ", screenId)

                        if screenId == "accessRestricted":
                            raise HTTPException(
                                status_code=403,
                                detail="Restricted Access. Please contact administrator.",
                            )

                        context = SaasContext(
                            url_client_id,
                            url_module,
                            url_operation,
                            str(payload.get("user_id")),
                            roles,
                            grants,
                            screenId,
                        )
                        saasContext.set(context)
                    if context is None:
                        raise HTTPException(
                            status_code=403,
                            detail="Restricted Access. Please contact administrator.",
                        )
                    return context
                else:
                    raise HTTPException(
                        status_code=403,
                        detail="Restricted Access. Please contact administrator.",
                    )
            else:
                print(f"User do not have access to ", url_module)
                raise HTTPException(
                    status_code=403,
                    detail="Restricted Grants. Please contact administrator.",
                )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except JWTError as e:
        print(f"Other JWT error: {e}")
        raise HTTPException(status_code=401, detail="Invalid Token")
    except ValueError:
        print(f"User do not have access to ", url_module)
        raise HTTPException(
            status_code=403,
            detail="Restricted Grants. Please contact administrator.",
        )


def get_screen_id(page_definitions, url_operation):
    for page_def in page_definitions:
        if "ALL" in page_def.operations:
            return page_def.screen_id
        if url_operation in page_def.operations and page_def.load_type == "include":
            return page_def.screen_id
        if url_operation not in page_def.operations and page_def.load_type == "exclude":
            return page_def.screen_id
    return "accessRestricted"


def get_page_definition(roles: list[str], module: str, client_id: str, db: Session):
    page_definitions = (
        db.query(PageDefinition)
        .filter(
            PageDefinition.role.in_(roles),
            PageDefinition.module == module,
            PageDefinition.client_id == client_id,
        )
        .all()
    )
    return page_definitions


# ─────────────────────────────────────────────────────────────────────────────
# Shared transaction helpers — used by order_service and order_router
# ─────────────────────────────────────────────────────────────────────────────

def record_transaction(
    db: Session,
    *,
    client_id: str,
    stock_item_id: int,
    inventory_id: Optional[str],
    name: Optional[str],
    transaction_type: TransactionTypeEnum,
    movement_type: MovementTypeEnum,
    quantity: Decimal,
    unit: Optional[str],
    before_stock: Decimal,
    after_stock: Decimal,
    reference_id: Optional[str] = None,
    reference_type: Optional[str] = None,
    created_by: Optional[str] = None,
    remarks: Optional[str] = None,
) -> InventoryTransactionEntity:
    tx = InventoryTransactionEntity(
        transaction_id=str(uuid.uuid4()),
        client_id=client_id,
        stock_item_id=stock_item_id,
        inventory_id=inventory_id,
        name=name,
        transaction_type=transaction_type.value,
        movement_type=movement_type.value,
        quantity=quantity,
        unit=unit,
        before_stock=before_stock,
        after_stock=after_stock,
        reference_id=reference_id,
        reference_type=reference_type,
        created_by=created_by,
        remarks=remarks,
    )
    db.add(tx)
    return tx


def record_partial_transaction(
    db: Session,
    *,
    client_id: str,
    item,
    remove_qty: int,
    transaction_type: TransactionTypeEnum,
    reason: Optional[str],
    order_id: int,
) -> None:
    from entity.inventory_entity import InventoryEntity
    from services.order_service import _convert

    menu_item = (
        db.query(InventoryEntity)
        .filter(
            InventoryEntity.id == item.item_id,
            InventoryEntity.client_id == client_id,
        )
        .first()
    )
    if not menu_item:
        return

    base_remarks = (
        f"{reason or transaction_type.value} | "
        f"{item.item_name} x{remove_qty} (partial) | "
        f"[key={item.frontend_unique_key}]"
    )
    stock_unit = (menu_item.unit or "").strip()
    serving_qty = float(menu_item.serving_quantity or 0)
    serving_unit = (menu_item.serving_unit or "").strip()

    if transaction_type == TransactionTypeEnum.item_cancelled:
        record_transaction(
            db,
            client_id=client_id,
            stock_item_id=menu_item.id,
            inventory_id=menu_item.inventory_id,
            name=menu_item.name,
            transaction_type=TransactionTypeEnum.item_cancelled,
            movement_type=MovementTypeEnum.none,
            quantity=Decimal(str(remove_qty)),
            unit=stock_unit or "pcs",
            before_stock=Decimal(str(menu_item.availability or 0)),
            after_stock=Decimal(str(menu_item.availability or 0)),
            reference_id=str(order_id),
            reference_type="order",
            remarks=f"[ITEM_CANCELLED_PARTIAL] Order #{order_id} — {base_remarks}",
        )

    elif transaction_type == TransactionTypeEnum.wastage:
        if serving_qty > 0 and serving_unit and stock_unit:
            try:
                converted = _convert(serving_qty, serving_unit, stock_unit)
                reversal = Decimal(str(round(converted * remove_qty, 6)))
                before = Decimal(str(menu_item.availability or 0))
                after = before + reversal
                record_transaction(
                    db,
                    client_id=client_id,
                    stock_item_id=menu_item.id,
                    inventory_id=menu_item.inventory_id,
                    name=menu_item.name,
                    transaction_type=TransactionTypeEnum.wastage,
                    movement_type=MovementTypeEnum.reversal,
                    quantity=reversal,
                    unit=stock_unit,
                    before_stock=before,
                    after_stock=after,
                    reference_id=str(order_id),
                    reference_type="order",
                    remarks=f"[WASTAGE_PARTIAL] Order #{order_id} — {base_remarks}",
                )
                menu_item.availability = after
            except ValueError:
                pass

        if menu_item.recipe:
            for ingredient in menu_item.recipe:
                stock_item_id_raw = ingredient.get("stock_item_id")
                recipe_qty = float(ingredient.get("quantity_required") or 0)
                recipe_unit = (ingredient.get("unit") or "").strip()

                if not stock_item_id_raw or recipe_qty <= 0:
                    continue

                stock_item = (
                    db.query(InventoryEntity)
                    .filter(
                        InventoryEntity.id == int(stock_item_id_raw),
                        InventoryEntity.client_id == client_id,
                    )
                    .first()
                )
                if not stock_item:
                    continue

                ing_stock_unit = (stock_item.unit or "").strip()
                try:
                    reversal = _convert(recipe_qty, recipe_unit, ing_stock_unit) * remove_qty
                except ValueError:
                    continue

                reversal_decimal = Decimal(str(round(reversal, 6)))
                before_ing = Decimal(str(stock_item.availability or 0))
                after_ing = before_ing + reversal_decimal

                record_transaction(
                    db,
                    client_id=client_id,
                    stock_item_id=stock_item.id,
                    inventory_id=stock_item.inventory_id,
                    name=stock_item.name,
                    transaction_type=TransactionTypeEnum.wastage,
                    movement_type=MovementTypeEnum.reversal,
                    quantity=reversal_decimal,
                    unit=ing_stock_unit,
                    before_stock=before_ing,
                    after_stock=after_ing,
                    reference_id=str(order_id),
                    reference_type="order",
                    remarks=f"[INGREDIENT_REVERSAL_PARTIAL] Order #{order_id} — {base_remarks}",
                )
                stock_item.availability = after_ing