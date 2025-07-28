import os
import uuid
from uuid import UUID, uuid4
import hashlib
from pathlib import Path

import traceback
from datetime import datetime
from calendar import monthrange

from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List
from database.postgres import get_db
from models.document_model import Document
from entity.document_entity import DocumentEntity
from models.response_model import ResponseModel
from models.saas_context import SaasContext
from utils.auth import verify_token
from database.base import Base
router = APIRouter()

BASE_UPLOAD_DIR = "uploads"


def create_storage_path():
    now = datetime.now()
    year = str(now.year)
    month = now.strftime("%b")
    day = now.strftime("%d")

    full_path = os.path.join(BASE_UPLOAD_DIR, year, month, day)
    os.makedirs(full_path, exist_ok=True)
    return full_path


def generate_md5(file_obj):
    hash_md5 = hashlib.md5()
    file_obj.seek(0)
    for chunk in iter(lambda: file_obj.read(4096), b""):
        hash_md5.update(chunk)
    file_obj.seek(0)
    return hash_md5.hexdigest()

# Read all documents for a client


@router.get("/read", response_model=ResponseModel[List[Document]])
def read_documents(client_id: str, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    docs = db.query(DocumentEntity).filter(
        DocumentEntity.client_id == client_id, DocumentEntity.deleted != True).all()
    models = DocumentEntity.copyToModels(docs)
    return ResponseModel[List[Document]](screen_id=context.screen_id, data=models)

# Upload document with streaming + save as UUID (no extension)
# @router.post("/upload", response_model=ResponseModel[Document])
# def upload_document(
#     client_id: str = Path(...),
#     file: UploadFile = File(...),
#     description: str = Form(None),
#     category_id: str = Form(None),
#     realm: str = Form(None),
#     created_by: str = Form(None),
#     context: SaasContext = Depends(verify_token),
#     db: Session = Depends(get_db)
# ):

#     uuid_name = str(uuid.uuid4())
#     original_name = file.filename
#     ext = Path(file.filename).suffix
#     filetype = file.content_type

#     folder_path = create_storage_path()
#     file_path = os.path.join(folder_path, uuid_name)

#     with open(file_path, "wb") as f:
#         while chunk := file.file.read(1024 * 1024):
#             f.write(chunk)

#     size_kb = os.path.getsize(file_path) // 1024
#     checksum_md5 = generate_md5(open(file_path, "rb"))

#     doc = DocumentEntity(
#         client_id=client_id,
#         category_id=category_id,
#         name=original_name,
#         description=description,
#         realm=realm,
#         filetype=filetype,
#         extension=ext,
#         size_kb=str(size_kb),
#         is_protected=False,
#         is_active=True,
#         uuid_name=uuid_name,
#         path=file_path,
#         storage_type="local",
#         checksum_md5=checksum_md5,
#         created_by=created_by,
#         last_read_by=None,
#         deleted=False
#     )

#     db.add(doc)
#     db.commit()
#     db.refresh(doc)

#     return ResponseModel[Document](screen_id=context.screen_id, data=DocumentEntity.copyToModel(doc))


@router.post("/upload", response_model=ResponseModel[Document])
def upload_document(
    client_id: str,
    file: UploadFile = File(...),
    description: str = Form(None),
    category_id: str = Form(None),
    realm: str = Form(None),
    created_by: str = Form(None),
    context: SaasContext = Depends(verify_token),
    db: Session = Depends(get_db)
):
    try:
        uuid_name = str(uuid.uuid4())
        original_name = file.filename
        ext = Path(file.filename).suffix
        filetype = file.content_type

        folder_path = create_storage_path()
        file_path = os.path.join(folder_path, uuid_name)

        with open(file_path, "wb") as f:
            while chunk := file.file.read(1024 * 1024):
                f.write(chunk)

        size_kb = os.path.getsize(file_path) // 1024

        with open(file_path, "rb") as f:
            checksum_md5 = generate_md5(f)

        doc = DocumentEntity(
            client_id=client_id,
            category_id=category_id,
            name=original_name,
            description=description,
            realm=realm,
            filetype=filetype,
            extension=ext,
            size_kb=str(size_kb),
            is_protected=False,
            is_active=True,
            uuid_name=uuid_name,
            path=file_path,
            storage_type="local",
            checksum_md5=checksum_md5,
            created_by=created_by,
            last_read_by=None,
            deleted=False
        )

        db.add(doc)
        db.commit()
        db.refresh(doc)
        return ResponseModel[Document](screen_id=context.screen_id, data=DocumentEntity.copyToModel(doc))

    except Exception as e:
        print("❌ Upload failed:", e)
        print(traceback.format_exc())
        raise HTTPException(
            status_code=500, detail="Internal Server Error during upload")

# Secure download route


@router.get("/download/{doc_id}", response_model=None)
def download_document(doc_id: uuid.UUID, context: SaasContext = Depends(verify_token), db: Session = Depends(get_db)):
    doc = db.query(DocumentEntity).filter_by(id=doc_id, deleted=False).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    def iterfile():
        with open(doc.path, "rb") as f:
            while chunk := f.read(1024 * 1024):
                yield chunk

    return StreamingResponse(iterfile(), media_type=doc.filetype, headers={"Content-Disposition": f"attachment; filename={doc.name}"})


@router.post("/replace/{doc_id}", response_model=ResponseModel[Document])
def replace_document(
    client_id: str,
    doc_id: UUID,
    file: UploadFile = File(...),
    description: str = Form(None),
    category_id: str = Form(None),
    realm: str = Form(None),
    updated_by: str = Form(None),
    context: SaasContext = Depends(verify_token),
    db: Session = Depends(get_db)
):
    try:
        # 1. Fetch and deactivate the old document
        old_doc = db.query(DocumentEntity).filter_by(
            id=doc_id, client_id=client_id, deleted=False).first()
        if not old_doc:
            raise HTTPException(status_code=404, detail="Document not found")

        old_doc.is_active = False
        old_doc.last_read_date_time = datetime.now()
        db.commit()

        # 2. Save new file
        uuid_name = str(uuid.uuid4())
        original_name = file.filename
        ext = os.path.splitext(file.filename)[1]
        filetype = file.content_type

        folder_path = create_storage_path()
        file_path = os.path.join(folder_path, uuid_name)

        with open(file_path, "wb") as f:
            while chunk := file.file.read(1024 * 1024):
                f.write(chunk)

        size_kb = os.path.getsize(file_path) // 1024
        with open(file_path, "rb") as f:
            checksum_md5 = generate_md5(f)

        # 3. Create new document record
        new_doc = DocumentEntity(
            client_id=client_id,
            category_id=category_id or old_doc.category_id,
            name=original_name,
            description=description or old_doc.description,
            realm=realm or old_doc.realm,
            filetype=filetype,
            extension=ext,
            size_kb=str(size_kb),
            is_protected=old_doc.is_protected,
            is_active=True,
            uuid_name=uuid_name,
            path=file_path,
            storage_type="local",
            checksum_md5=checksum_md5,
            created_by=updated_by or old_doc.created_by,
            last_read_by=None,
            created_date_time=datetime.now(),
            last_read_date_time=None,
            deleted=False,
            deleted_at=None
        )

        db.add(new_doc)
        db.commit()
        db.refresh(new_doc)

        return ResponseModel[Document](
            screen_id=context.screen_id,
            message="Document replaced successfully",
            data=DocumentEntity.copyToModel(new_doc)
        )

    except Exception as e:
        print("❌ Replace failed:", e)
        print(traceback.format_exc())
        raise HTTPException(
            status_code=500, detail="Internal Server Error during replace")
