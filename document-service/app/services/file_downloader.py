import os
import uuid
import requests
from pathlib import Path
from datetime import datetime
import hashlib
from sqlalchemy.orm import Session
from entity.document_entity import DocumentEntity

BASE_DIR = "uploads"

def create_storage_folder():
    now = datetime.now()
    folder_path = os.path.join(BASE_DIR, str(now.year), now.strftime("%b"), now.strftime("%d"))
    os.makedirs(folder_path, exist_ok=True)
    return folder_path

def download_and_store_file(url: str, client_id: str, description: str, category_id: str, realm: str, created_by: str, db: Session):
    response = requests.get(url, stream=True)
    if response.status_code != 200:
        raise Exception(f"Download failed: {response.status_code}")

    original_filename = Path(url).name
    ext = Path(original_filename).suffix
    filetype = response.headers.get("Content-Type", "application/octet-stream")
    uuid_name = str(uuid.uuid4())

    folder_path = create_storage_folder()
    file_path = os.path.join(folder_path, uuid_name)

    with open(file_path, "wb") as f:
        for chunk in response.iter_content(chunk_size=1024 * 1024):
            f.write(chunk)

    size_kb = os.path.getsize(file_path) // 1024

    # Calculate checksum
    hash_md5 = hashlib.md5()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            hash_md5.update(chunk)
    checksum = hash_md5.hexdigest()

    # Save in DB
    doc = DocumentEntity(
        client_id=client_id,
        category_id=category_id,
        name=original_filename,
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
        checksum_md5=checksum,
        created_by=created_by,
        deleted=False
    )

    db.add(doc)
    db.commit()
    db.refresh(doc)

    print(f"✅ File saved at: {file_path}")
    print(f"📌 Record ID: {doc.id}")
    return doc
