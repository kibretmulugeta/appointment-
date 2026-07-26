import asyncio
import logging
from urllib.parse import urlparse
from dns import resolver
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

logger = logging.getLogger("scheduler.database")

client: AsyncIOMotorClient = None
db = None

async def resolve_atlas_srv(hostname: str) -> str:
    """Resolve Atlas SRV records using Google Public DNS (8.8.8.8) to bypass Windows local DNS blocks."""
    try:
        res = resolver.Resolver()
        res.nameservers = ['8.8.8.8', '1.1.1.1', '8.8.4.4']
        srv_records = res.resolve(f"_mongodb._tcp.{hostname}", 'SRV')
        if srv_records:
            return ",".join([f"{r.target.to_text().rstrip('.')}:{r.port}" for r in srv_records])
    except Exception as e:
        logger.warning(f"Google DNS SRV resolution warning: {e}")
    return None

async def connect_to_mongo():
    global client, db
    mongo_uri = settings.MONGO_URI.strip()
    if not mongo_uri:
        raise ValueError("MONGO_URI is missing in configuration settings")

    if "authSource=" not in mongo_uri:
        mongo_uri += "&authSource=admin" if "?" in mongo_uri else "?authSource=admin"

    try:
        client = AsyncIOMotorClient(mongo_uri, serverSelectionTimeoutMS=5000)
        # Verify connection with ping
        await client.admin.command('ping')
        db = client.get_default_database(default='scheduler')
        logger.info(f"✅ MongoDB Atlas Connected: {client.nodes or client.address}")
        return
    except Exception as primary_error:
        logger.warning(f"⚠️ Primary Mongo SRV connection failed ({primary_error}). Resolving via Google Public DNS...")

        if mongo_uri.startswith("mongodb+srv://"):
            try:
                # Parse host and credentials
                parsed_url = urlparse(mongo_uri.replace("mongodb+srv://", "http://"))
                hostname = parsed_url.hostname
                db_name = parsed_url.path or "/scheduler"
                auth = f"{parsed_url.username}:{parsed_url.password}@" if parsed_url.username else ""
                search = parsed_url.query or "retryWrites=true&w=majority&authSource=admin"

                resolved_hosts = await resolve_atlas_srv(hostname)
                if not resolved_hosts and "vfutu6u" in hostname:
                    resolved_hosts = "ac-l5prsh5-shard-00-00.vfutu6u.mongodb.net:27017,ac-l5prsh5-shard-00-01.vfutu6u.mongodb.net:27017,ac-l5prsh5-shard-00-02.vfutu6u.mongodb.net:27017"
                elif not resolved_hosts and "." in hostname:
                    parts = hostname.split(".")
                    prefix = parts[0]
                    domain = ".".join(parts[1:])
                    resolved_hosts = f"{prefix}-shard-00-00.{domain}:27017,{prefix}-shard-00-01.{domain}:27017,{prefix}-shard-00-02.{domain}:27017"
                elif not resolved_hosts:
                    resolved_hosts = hostname

                fallback_uri = f"mongodb://{auth}{resolved_hosts}{db_name}?{search}&ssl=true"
                client = AsyncIOMotorClient(fallback_uri, serverSelectionTimeoutMS=8000)
                await client.admin.command('ping')
                db = client.get_default_database(default='scheduler')
                logger.info(f"✅ MongoDB Atlas Direct Connected via DNS Fallback")
                return
            except Exception as fallback_error:
                logger.error(f"MongoDB Atlas Connection Failed: {fallback_error}")
                raise fallback_error

        raise primary_error

async def close_mongo_connection():
    global client
    if client:
        client.close()
        logger.info("MongoDB Connection Closed")

def get_database():
    return db
