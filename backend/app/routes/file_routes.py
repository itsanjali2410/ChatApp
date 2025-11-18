from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import os
from ..services.file_service import (
    validate_file, save_file, get_file_url, delete_file,
    UPLOAD_DIR, ALLOWED_IMAGE_TYPES, ALLOWED_DOCUMENT_TYPES
)
from ..dependencies.auth import get_current_user

router = APIRouter(prefix="/files", tags=["Files"])

@router.get("/test")
async def test_file_serving():
    """Test endpoint to verify file serving is working"""
    return {"message": "File serving endpoint is working", "status": "ok"}
@router.post("/upload-test")
async def upload_file_test(file: UploadFile = File(...)):
    """Upload a file (image or document) - TEST ENDPOINT (no auth required)"""
    try:
        print(f"📁 Upload attempt: {file.filename}, Content-Type: {file.content_type}")
        
        # Validate file
        file_info = validate_file(file)
        print(f"✅ File validation passed: {file_info}")
        
        # Save file
        saved_file = await save_file(file, file_info["type"])
        print(f"💾 File saved: {saved_file}")
        
        # Generate URL
        file_url = get_file_url(saved_file["file_path"])
        thumbnail_url = get_file_url(saved_file["thumbnail_path"]) if saved_file["thumbnail_path"] else None
        
        result = {
            "success": True,
            "file_id": saved_file["file_id"],
            "filename": saved_file["original_filename"],
            "file_type": saved_file["file_type"],
            "file_url": file_url,
            "thumbnail_url": thumbnail_url,
            "size": saved_file["size"],
            "uploaded_at": saved_file["uploaded_at"]
        }
        
        print(f"🎉 Upload successful: {result}")
        return result
        
    except HTTPException as e:
        print(f"❌ HTTP Exception: {e.detail}")
        raise
    except Exception as e:
        print(f"❌ General Exception: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload a file (image or document)"""
    try:
        print(f"📁 Upload attempt: {file.filename}, Content-Type: {file.content_type}, Size: {file.size if hasattr(file, 'size') else 'unknown'}")
        
        # Validate file
        file_info = validate_file(file)
        print(f"✅ File validation passed: {file_info}")
        
        # Save file
        saved_file = await save_file(file, file_info["type"])
        print(f"💾 File saved: {saved_file}")
        
        # Generate URL
        file_url = get_file_url(saved_file["file_path"])
        thumbnail_url = get_file_url(saved_file["thumbnail_path"]) if saved_file["thumbnail_path"] else None
        
        result = {
            "success": True,
            "file_id": saved_file["file_id"],
            "filename": saved_file["original_filename"],
            "file_type": saved_file["file_type"],
            "file_url": file_url,
            "thumbnail_url": thumbnail_url,
            "size": saved_file["size"],
            "uploaded_at": saved_file["uploaded_at"]
        }
        
        print(f"🎉 Upload successful: {result}")
        return result
        
    except HTTPException as e:
        print(f"❌ HTTP Exception: {e.detail}")
        raise
    except Exception as e:
        print(f"❌ General Exception: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.post("/upload-profile-picture")
async def upload_profile_picture(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload a profile picture for the current user"""
    try:
        # Validate that it's an image
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="Only image files are allowed for profile pictures")
        
        # Validate file size (max 5MB for profile pictures)
        file_content = await file.read()
        if len(file_content) > 5 * 1024 * 1024:  # 5MB
            raise HTTPException(status_code=400, detail="Profile picture size must be less than 5MB")
        
        # Reset file pointer
        await file.seek(0)
        
        # Save file
        saved_file = await save_file(file, "image")
        
        # Update user profile picture in database
        from ..services.user_service import users_collection, get_user_by_email
        from ..services.admin_service import get_admin_by_email, admin_collection
        user_email = current_user.get("sub")
        role = current_user.get("role", "user")
        
        if role == "admin":
            admin = get_admin_by_email(user_email)
            if not admin:
                raise HTTPException(status_code=404, detail="Admin not found")
            admin_collection.update_one(
                {"_id": admin["_id"]},
                {"$set": {"profile_picture": saved_file["file_path"]}}
            )
        else:
            user = get_user_by_email(user_email)
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            users_collection.update_one(
                {"_id": user["_id"]},
                {"$set": {"profile_picture": saved_file["file_path"]}}
            )
        
        file_url = get_file_url(saved_file["file_path"])
        
        return {
            "success": True,
            "profile_picture_url": file_url,
            "message": "Profile picture updated successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Profile picture upload failed: {str(e)}")

@router.post("/upload-selfie")
async def upload_selfie(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload a selfie for the current user"""
    try:
        # Validate that it's an image
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="Only image files are allowed for selfies")
        
        # Validate file size (max 5MB for selfies)
        file_content = await file.read()
        if len(file_content) > 5 * 1024 * 1024:  # 5MB
            raise HTTPException(status_code=400, detail="Selfie size must be less than 5MB")
        
        # Reset file pointer
        await file.seek(0)
        
        # Save file
        saved_file = await save_file(file, "image")
        
        # Update user selfie in database
        from ..services.user_service import users_collection, get_user_by_email
        from ..services.admin_service import get_admin_by_email, admin_collection
        user_email = current_user.get("sub")
        role = current_user.get("role", "user")
        
        if role == "admin":
            admin = get_admin_by_email(user_email)
            if not admin:
                raise HTTPException(status_code=404, detail="Admin not found")
            admin_collection.update_one(
                {"_id": admin["_id"]},
                {"$set": {"selfie": saved_file["file_path"]}}
            )
        else:
            user = get_user_by_email(user_email)
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            users_collection.update_one(
                {"_id": user["_id"]},
                {"$set": {"selfie": saved_file["file_path"]}}
            )
        
        file_url = get_file_url(saved_file["file_path"])
        
        return {
            "success": True,
            "selfie_url": file_url,
            "message": "Selfie updated successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Selfie upload failed: {str(e)}")

@router.delete("/profile-picture")
async def delete_profile_picture(current_user: dict = Depends(get_current_user)):
    """Remove current user's profile picture."""
    return _clear_user_image("profile_picture", current_user)

@router.delete("/selfie")
async def delete_selfie(current_user: dict = Depends(get_current_user)):
    """Remove current user's selfie."""
    return _clear_user_image("selfie", current_user)

@router.get("/info/supported-types")
async def get_supported_file_types():
    """Get list of supported file types"""
    return {
        "images": list(ALLOWED_IMAGE_TYPES),
        "documents": list(ALLOWED_DOCUMENT_TYPES),
        "max_image_size_mb": 20,
        "max_document_size_mb": 50,
        "max_profile_picture_size_mb": 5,
        "supported_extensions": {
            "images": ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"],
            "documents": ["pdf", "doc", "docx", "txt", "xls", "xlsx", "ppt", "pptx", "rtf", "zip", "csv", "json", "xml"]
        }
    }

@router.get("/{file_path:path}")
async def get_file(file_path: str):
    """Serve uploaded files"""
    # Handle different path formats
    if file_path.startswith('uploads/'):
        file_path = file_path.replace('uploads/', '')
    
    # Remove leading slash if present
    file_path = file_path.lstrip('/')
    
    full_path = os.path.join(UPLOAD_DIR, file_path)
    
    # Debug logging
    print(f"🔍 File request: {file_path}")
    print(f"🔍 Full path: {full_path}")
    print(f"🔍 File exists: {os.path.exists(full_path)}")
    
    if not os.path.exists(full_path):
        # Try alternative path formats
        alt_paths = [
            os.path.join(UPLOAD_DIR, file_path),
            os.path.join(UPLOAD_DIR, "images", file_path),
            os.path.join(UPLOAD_DIR, "documents", file_path),
        ]
        
        for alt_path in alt_paths:
            if os.path.exists(alt_path):
                full_path = alt_path
                break
        else:
            raise HTTPException(status_code=404, detail=f"File not found: {file_path}")
    
    # Get file extension to determine content type
    file_extension = os.path.splitext(full_path)[1].lower()
    content_type_map = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.txt': 'text/plain',
        '.xls': 'application/vnd.ms-excel',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.ppt': 'application/vnd.ms-powerpoint',
        '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        '.zip': 'application/zip',
        '.csv': 'text/csv',
        '.json': 'application/json',
        '.xml': 'application/xml'
    }
    
    content_type = content_type_map.get(file_extension, 'application/octet-stream')
    
    # Set appropriate headers for file download
    # For images, show inline; for documents, force download
    if file_extension in ['.jpg', '.jpeg', '.png', '.gif', '.webp']:
        disposition = f'inline; filename="{os.path.basename(full_path)}"'
    else:
        disposition = f'attachment; filename="{os.path.basename(full_path)}"'
    
    headers = {
        'Content-Type': content_type,
        'Content-Disposition': disposition,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    }
    
    return FileResponse(
        full_path,
        media_type=content_type,
        headers=headers
    )

@router.delete("/{file_id}")
async def delete_uploaded_file(
    file_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete an uploaded file"""
    try:
        # Find the file by ID
        for root, dirs, files in os.walk(UPLOAD_DIR):
            for file in files:
                if file.startswith(file_id):
                    file_path = os.path.join(root, file)
                    delete_file(file_path)
                    return {"success": True, "message": "File deleted"}
        
        raise HTTPException(status_code=404, detail="File not found")
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")

def _clear_user_image(field_name: str, current_user: dict):
    """Utility to remove profile/selfie images for current user/admin."""
    user_email = current_user.get("sub")
    if not user_email:
        raise HTTPException(status_code=400, detail="User email missing in token")

    role = current_user.get("role", "user")
    file_path = None

    if role == "admin":
        from ..services.admin_service import get_admin_by_email, admin_collection
        admin = get_admin_by_email(user_email)
        if not admin:
            raise HTTPException(status_code=404, detail="Admin not found")
        file_path = admin.get(field_name)
        admin_collection.update_one(
            {"_id": admin["_id"]},
            {"$unset": {field_name: ""}}
        )
    else:
        from ..services.user_service import get_user_by_email, users_collection
        user = get_user_by_email(user_email)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        file_path = user.get(field_name)
        users_collection.update_one(
            {"_id": user["_id"]},
            {"$unset": {field_name: ""}}
        )

    if file_path:
        try:
            delete_file(file_path)
        except Exception as exc:
            print(f"Failed to delete {field_name} file {file_path}: {exc}")

    return {"success": True, "message": f"{field_name.replace('_', ' ').title()} removed"}
