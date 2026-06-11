import os
import json
import asyncio
from datetime import datetime
from urllib.parse import urlsplit
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

# Global DB state
_db_instance = None
_use_fallback = False

class JSONCursor:
    def __init__(self, data):
        self.data = data
        self.index = 0

    def sort(self, field, direction=-1):
        reverse = (direction == -1)
        try:
            self.data.sort(key=lambda x: x.get(field) or "", reverse=reverse)
        except Exception:
            pass
        return self

    def limit(self, count):
        self.data = self.data[:count]
        return self

    def __aiter__(self):
        return self

    async def __anext__(self):
        if self.index >= len(self.data):
            raise StopAsyncIteration
        val = self.data[self.index]
        self.index += 1
        return val

class JSONCollection:
    def __init__(self, db_path, name):
        self.db_path = db_path
        self.name = name
        self.lock = asyncio.Lock()

    def _read(self):
        if not os.path.exists(self.db_path):
            return []
        try:
            with open(self.db_path, "r", encoding="utf-8") as f:
                full_db = json.load(f)
                return full_db.get(self.name, [])
        except Exception:
            return []

    def _write(self, coll_data):
        try:
            full_db = {}
            if os.path.exists(self.db_path):
                try:
                    with open(self.db_path, "r", encoding="utf-8") as f:
                        full_db = json.load(f)
                except Exception:
                    pass
            full_db[self.name] = coll_data
            temp_path = self.db_path + ".tmp"
            with open(temp_path, "w", encoding="utf-8") as f:
                json.dump(full_db, f, indent=2, default=str)
            os.replace(temp_path, self.db_path)
        except Exception as e:
            print(f"FallbackDB Error writing: {e}")

    def _match(self, doc, query):
        if not query:
            return True
        for k, v in query.items():
            if k == "$or":
                matched_or = False
                for sub_q in v:
                    if self._match(doc, sub_q):
                        matched_or = True
                        break
                if not matched_or:
                    return False
            elif isinstance(v, dict):
                for op, op_val in v.items():
                    if op == "$in":
                        doc_val = doc.get(k)
                        # Stringify comparison to be safe with UUIDs/dates
                        op_val_str = [str(val) for val in op_val] if isinstance(op_val, list) else []
                        if str(doc_val) not in op_val_str:
                            return False
            else:
                doc_val = doc.get(k)
                # Compare as strings to be safe with uuid objects vs string ids
                if str(doc_val) != str(v):
                    return False
        return True

    async def find_one(self, query):
        async with self.lock:
            docs = self._read()
            for doc in docs:
                if self._match(doc, query):
                    return doc
            return None

    async def insert_one(self, doc):
        async with self.lock:
            docs = self._read()
            clean_doc = self._clean_doc(doc)
            # Ensure document has a string id
            if "_id" not in clean_doc and "id" in clean_doc:
                clean_doc["_id"] = str(clean_doc["id"])
            elif "_id" not in clean_doc:
                import uuid
                clean_doc["_id"] = str(uuid.uuid4())
            docs.append(clean_doc)
            self._write(docs)
            class InsertResult:
                inserted_id = clean_doc.get("_id")
            return InsertResult()

    async def insert_many(self, docs):
        async with self.lock:
            current_docs = self._read()
            clean_docs = [self._clean_doc(d) for d in docs]
            for clean_doc in clean_docs:
                if "_id" not in clean_doc and "id" in clean_doc:
                    clean_doc["_id"] = str(clean_doc["id"])
                elif "_id" not in clean_doc:
                    import uuid
                    clean_doc["_id"] = str(uuid.uuid4())
            current_docs.extend(clean_docs)
            self._write(current_docs)
            return True

    async def delete_one(self, query):
        async with self.lock:
            docs = self._read()
            for i, doc in enumerate(docs):
                if self._match(doc, query):
                    docs.pop(i)
                    self._write(docs)
                    return True
            return False

    async def update_one(self, query, update, upsert=False):
        async with self.lock:
            docs = self._read()
            found = False
            for doc in docs:
                if self._match(doc, query):
                    # Basic update logic supporting $set
                    if "$set" in update:
                        for k, v in update["$set"].items():
                            doc[k] = self._clean_doc(v)
                    else:
                        for k, v in update.items():
                            doc[k] = self._clean_doc(v)
                    found = True
                    break
            
            if not found and upsert:
                # Basic upsert
                new_doc = {}
                # Extract fields from query
                for k, v in query.items():
                    if not k.startswith("$"):
                        new_doc[k] = v
                # Apply update
                if "$set" in update:
                    for k, v in update["$set"].items():
                        new_doc[k] = self._clean_doc(v)
                else:
                    for k, v in update.items():
                        new_doc[k] = self._clean_doc(v)
                if "_id" not in new_doc:
                    import uuid
                    new_doc["_id"] = str(uuid.uuid4())
                docs.append(new_doc)
            
            self._write(docs)
            return True

    def find(self, query):
        docs = self._read()
        matched_docs = [doc for doc in docs if self._match(doc, query)]
        return JSONCursor(matched_docs)

    async def count_documents(self, query):
        docs = self._read()
        matched_docs = [doc for doc in docs if self._match(doc, query)]
        return len(matched_docs)

    async def create_index(self, keys, unique=False):
        return True

    def _clean_doc(self, doc):
        if not isinstance(doc, dict):
            return doc
        cleaned = {}
        for k, v in doc.items():
            if isinstance(v, dict):
                cleaned[k] = self._clean_doc(v)
            elif isinstance(v, list):
                cleaned[k] = [self._clean_doc(item) if isinstance(item, dict) else str(item) if hasattr(item, 'hex') or isinstance(item, datetime) else item for item in v]
            elif hasattr(v, 'hex'):  # UUID
                cleaned[k] = str(v)
            elif isinstance(v, datetime):
                cleaned[k] = v.isoformat()
            else:
                cleaned[k] = v
        return cleaned

class FallbackDatabase:
    def __init__(self, db_path):
        self.db_path = db_path
        self.collections = {}

    def __getitem__(self, name):
        if name not in self.collections:
            self.collections[name] = JSONCollection(self.db_path, name)
        return self.collections[name]

async def check_db_connection():
    global _db_instance, _use_fallback
    if _db_instance is not None:
        return _db_instance

    db_name = "dentai"
    try:
        parsed = urlsplit(settings.MONGODB_URL)
        name = parsed.path.lstrip('/')
        if name:
            db_name = name
    except Exception:
        pass

    # Don't try connecting if the connection string contains placeholder
    if "<db_username>" in settings.MONGODB_URL or "<username>" in settings.MONGODB_URL:
        print("MongoDB URL contains placeholders. Falling back to local JSON database.")
        fallback_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "dentai_fallback.json")
        _db_instance = FallbackDatabase(fallback_path)
        _use_fallback = True
        return _db_instance

    try:
        print(f"Attempting to connect to MongoDB at: {db_name}")
        client = AsyncIOMotorClient(settings.MONGODB_URL, serverSelectionTimeoutMS=2000)
        # Try pinging database
        await client.admin.command('ismaster')
        print("Connected to MongoDB successfully!")
        _db_instance = client[db_name]
        _use_fallback = False
    except Exception as e:
        print(f"MongoDB connection failed: {e}")
        print("Falling back to local JSON database.")
        fallback_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "dentai_fallback.json")
        _db_instance = FallbackDatabase(fallback_path)
        _use_fallback = True

    return _db_instance

async def get_db():
    db = await check_db_connection()
    yield db

