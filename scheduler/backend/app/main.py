import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
import os

from app.config import settings
from app.database import connect_to_mongo, close_mongo_connection
from app.services.reminder_service import start_reminder_scheduler

from app.routers import auth, users, contacts, appointments, notifications, maps

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("scheduler.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("🚀 Starting Scheduler FastAPI Backend...")
    try:
        await connect_to_mongo()
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB on startup: {e}")
        
    # Launch background reminder scanner task
    reminder_task = asyncio.create_task(start_reminder_scheduler(interval_seconds=60))
    
    yield
    
    # Shutdown
    reminder_task.cancel()
    await close_mongo_connection()
    logger.info("🛑 Scheduler FastAPI Backend Stopped")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Full-stack Scheduler Application API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware
origins = [
    settings.FRONTEND_URL,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Production flexibility for cross-origin JWT credentials
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database Connection Middleware for Serverless / Cloud Functions
@app.middleware("http")
async def db_connection_middleware(request: Request, call_next):
    try:
        await connect_to_mongo()
    except Exception as e:
        logger.warning(f"Middleware DB connection warning: {e}")
    response = await call_next(request)
    return response

# Register Routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(contacts.router)
app.include_router(appointments.router)
app.include_router(notifications.router)
app.include_router(maps.router)

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "project": settings.PROJECT_NAME}

# Serve Frontend static dist files if compiled (Render / Single Instance)
frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../frontend/dist"))
if os.path.exists(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")
    
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api/"):
            return JSONResponse(status_code=404, content={"detail": "API endpoint not found"})
        file_path = os.path.join(frontend_dist, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.PORT, reload=True)
