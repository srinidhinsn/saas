# saas
Saas application

1. Create a folder named saas_app
2. Clone/Checkout/Pull latest code from git hub from branch backend-dev. CMD: git clone https://github.com/srinidhinsn/saas.git -b backend-dev
3. Create virtual environment under any project using CMD: python -m venv dev
4. Load virtual environment using CMD: dev/Scripts/activate ("deactivate" command - to exit) 
5. CMD: pip install fastapi uvicorn psycopg2-binary sqlalchemy alembic passlib bcrypt python-jose setuptools pytest httpx
6. Under common-lib folder run CMD: python setup.py build
7. Under  folder run CMD: pip install ..\common-lib
8. uvicorn app.main:app --port 8000 --reload - (Used ports 8000, 8001, 8002, 8003) 
9. Copy all content in init.sql and run on pgAdmin.





1)  i changed the route....for the individual items status update and total price change
@router.post("/order_items/update")
def update_order_items(
    client_id: str,
    order_id: Optional[str] = Query(None),
    body: Optional[List[OrderItemModel]] = None,
    single_item: Optional[bool] = Query(False),
    context: SaasContext = Depends(verify_token),
    db: Session = Depends(get_db)
):
    if single_item:
        # Single item update
        if not body or not isinstance(body, list) or len(body) != 1:
            raise HTTPException(
                status_code=400, detail="Single item update requires exactly one item")

        item = body[0]
        if not item.id:
            raise HTTPException(
                status_code=400, detail="Order item ID is required")

        db_item = db.query(DBOrderItem).filter(
            DBOrderItem.id == item.id,
            DBOrderItem.client_id == client_id
        ).first()

        if not db_item:
            raise HTTPException(status_code=404, detail="Order item not found")

        if item.status:
            db_item.status = item.status
        if item.quantity is not None:
            db_item.quantity = item.quantity

        db.commit()
        return ResponseModel(screen_id=context.screen_id, data={"message": "Order item updated successfully"})

    else:
        # Full list update
        if not order_id:
            raise HTTPException(status_code=400, detail="Missing order_id")

        db.query(DBOrderItem).filter(DBOrderItem.order_id == order_id).delete()
        latest_order_item_list = DBOrderItem.copyFromModels(body)
        db.add_all(latest_order_item_list)
        db.commit()
        return ResponseModel(screen_id=context.screen_id, data={"message": "Order items updated successfully"})
   2)  item_name=item.item_name,
                              slug=item.slug,   add this in create_order routes.py 

   3) in tables table>>>>add table_type column in database 
