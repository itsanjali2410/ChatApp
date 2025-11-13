from ..config import db
import secrets
from datetime import datetime, timedelta
from bson import ObjectId
from zoneinfo import ZoneInfo
from datetime import datetime, timedelta
import secrets
from bson import ObjectId

org_collection = db["organizations"]

def set_org(org_data: dict):
    # to insert org details
    result = org_collection.insert_one(org_data)
    return result

def get_all_orgs():
    # to get all orgs
    orgs = list(org_collection.find())
    for org in orgs:
        org["_id"] = str(org["_id"])
    return orgs

def create_invite(org_id: str, expires_minutes: int = 10080):
    token = secrets.token_urlsafe(24)
    expiry = datetime.now(ZoneInfo("Asia/Kolkata")) + timedelta(minutes=expires_minutes)
    org_collection.update_one(
        {"_id": ObjectId(org_id)},
        {"$push": {"invites": {"token": token, "expires_at": expiry}}},
    )
    return token, expiry

def consume_invite(org_id: str, token: str):
    now = datetime.now(ZoneInfo("Asia/Kolkata"))
    org = org_collection.find_one({
        "_id": ObjectId(org_id),
        "invites": {"$elemMatch": {"token": token, "expires_at": {"$gt": now}}},
    })
    if not org:
        return False
    # remove token after use
    org_collection.update_one({"_id": ObjectId(org_id)}, {"$pull": {"invites": {"token": token}}})
    return True