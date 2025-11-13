from ..config import db
from bson import ObjectId

users_collection = db["users"]


def create_user(user_data: dict):
    return  users_collection.insert_one(user_data)

def get_user_by_email(email: str):
    return  users_collection.find_one({"email": email})

def get_user_by_id(user_id: str):
    return users_collection.find_one({"_id": ObjectId(user_id)})

def list_users():
    users = []
    for user in users_collection.find():
        user["_id"] = str(user["_id"])
        users.append(user)
    return users

def delete_user(email: str):
    return  users_collection.delete_one({"email": email})

def update_user(email: str, updates: dict):
    return users_collection.update_one({"email": email}, {"$set": updates})

def update_user_by_id(user_id: str, updates: dict):
    return users_collection.update_one({"_id": ObjectId(user_id)}, {"$set": updates})