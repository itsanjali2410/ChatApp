import os
import uuid
from datetime import datetime
from fastapi import UploadFile, HTTPException
from PIL import Image
import shutil
from typing import Dict, Any
from zoneinfo import ZoneInfo

# Create uploads directory if it doesn't exist
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(f"{UPLOAD_DIR}/images", exist_ok=True)
os.makedirs(f"{UPLOAD_DIR}/documents", exist_ok=True)

# Allowed file types
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
ALLOWED_DOCUMENT_TYPES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/rtf",
    "application/zip",
    "application/x-zip-compressed",
    "text/csv",
    "application/json",
    "application/xml",
    "text/xml"
}

# Max file sizes (in bytes)
MAX_IMAGE_SIZE = 20 * 1024 * 1024  # 20MB
MAX_DOCUMENT_SIZE = 50 * 1024 * 1024  # 50MB

def get_file_type(content_type: str, filename: str = "") -> str:
    """Determine if file is image or document based on content type and filename"""
    if content_type in ALLOWED_IMAGE_TYPES:
        return "image"
    elif content_type in ALLOWED_DOCUMENT_TYPES:
        return "document"
    elif filename:
        # Fallback to filename extension if content type is not recognized
        ext = filename.lower().split('.')[-1] if '.' in filename else ''
        image_extensions = {'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'}
        document_extensions = {'pdf', 'doc', 'docx', 'txt', 'xls', 'xlsx', 'ppt', 'pptx', 'rtf', 'zip', 'csv', 'json', 'xml'}
        
        if ext in image_extensions:
            return "image"
        elif ext in document_extensions:
            return "document"
    
    return "unknown"

def validate_file(file: UploadFile) -> Dict[str, Any]:
    """Validate uploaded file and return file info"""
    file_type = get_file_type(file.content_type, file.filename or "")
    
    if file_type == "unknown":
        raise HTTPException(
            status_code=400, 
            detail=f"File type {file.content_type} not supported. Supported types: Images (JPG, PNG, GIF, WebP) and Documents (PDF, DOC, DOCX, TXT, XLS, XLSX, PPT, PPTX, RTF, ZIP, CSV, JSON, XML)"
        )
    
    # Check file size
    file.file.seek(0, 2)  # Seek to end
    file_size = file.file.tell()
    file.file.seek(0)  # Reset to beginning
    
    max_size = MAX_IMAGE_SIZE if file_type == "image" else MAX_DOCUMENT_SIZE
    if file_size > max_size:
        file_type_name = "image" if file_type == "image" else "document"
        max_size_mb = max_size // (1024*1024)
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Max size for {file_type_name}s: {max_size_mb}MB (your file: {file_size // (1024*1024)}MB)"
        )
    
    return {
        "type": file_type,
        "size": file_size,
        "content_type": file.content_type
    }

async def save_file(file: UploadFile, file_type: str) -> Dict[str, Any]:
    """Save uploaded file and return file info"""
    # Generate unique filename
    file_id = str(uuid.uuid4())
    file_extension = os.path.splitext(file.filename)[1] if file.filename else ""
    filename = f"{file_id}{file_extension}"
    
    # Determine save path
    subfolder = "images" if file_type == "image" else "documents"
    file_path = os.path.join(UPLOAD_DIR, subfolder, filename)
    
    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # If it's an image, create thumbnail
    thumbnail_path = None
    if file_type == "image":
        try:
            thumbnail_path = await create_thumbnail(file_path, file_id)
        except Exception as e:
            print(f"Failed to create thumbnail: {e}")
    
    return {
        "file_id": file_id,
        "original_filename": file.filename,
        "filename": filename,
        "file_path": file_path,
        "thumbnail_path": thumbnail_path,
        "file_type": file_type,
        "content_type": file.content_type,
        "size": os.path.getsize(file_path),
        "uploaded_at": datetime.now(ZoneInfo("Asia/Kolkata")).isoformat()
    }

async def create_thumbnail(image_path: str, file_id: str) -> str:
    """Create a thumbnail for the image"""
    try:
        with Image.open(image_path) as img:
            # Convert to RGB if necessary
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")
            
            # Create thumbnail (max 200x200)
            img.thumbnail((200, 200), Image.Resampling.LANCZOS)
            
            # Save thumbnail
            thumbnail_path = os.path.join(UPLOAD_DIR, "images", f"{file_id}_thumb.jpg")
            img.save(thumbnail_path, "JPEG", quality=85)
            
            return thumbnail_path
    except Exception as e:
        print(f"Error creating thumbnail: {e}")
        return None

def get_file_url(file_path: str) -> str:
    """Generate URL for accessing the file"""
    # Remove the uploads/ prefix and replace backslashes with forward slashes
    relative_path = file_path.replace("uploads\\", "").replace("uploads/", "").replace("\\", "/")
    
    # Remove leading slash if present to avoid double slashes
    relative_path = relative_path.lstrip("/")
    
    return f"/files/{relative_path}"

def delete_file(file_path: str):
    """Delete a file from storage"""
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
        # Also delete thumbnail if it exists
        if file_path.endswith(('.jpg', '.jpeg', '.png', '.gif', '.webp')):
            thumbnail_path = file_path.replace('.', '_thumb.')
            if os.path.exists(thumbnail_path):
                os.remove(thumbnail_path)
    except Exception as e:
        print(f"Error deleting file {file_path}: {e}")
