import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.app.config import settings
from backend.app.database import engine, Base
from backend.app.services.connection_manager import manager
from backend.app.services.pipeline import pipeline
from backend.app.routers import (
    status_router,
    monitor_router,
    video_router,
    detections_router,
    alerts_router,
    ws_router,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("drone_surveillance")
if settings.DEBUG:
    logger.setLevel(logging.DEBUG)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize database tables
    logger.info("Initializing database schema...")
    Base.metadata.create_all(bind=engine)

    # Attach event loop to connection manager
    loop = asyncio.get_running_loop()
    manager.set_loop(loop)
    logger.info("Surveillance backend startup complete.")

    yield

    # Shutdown: clean up background pipeline if active
    logger.info("Shutting down surveillance backend...")
    if pipeline.is_active:
        try:
            pipeline.stop_session()
        except Exception as e:
            logger.warning(f"Error stopping surveillance pipeline during shutdown: {e}")
    logger.info("Shutdown finished.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Backend service for AI Drone Surveillance System providing real-time detection, tracking, streaming, and alert management.",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception during {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred in surveillance backend."},
    )


# Include REST API routers under /api
app.include_router(status_router, prefix=settings.API_PREFIX)
app.include_router(monitor_router, prefix=settings.API_PREFIX)
app.include_router(video_router, prefix=settings.API_PREFIX)
app.include_router(detections_router, prefix=settings.API_PREFIX)
app.include_router(alerts_router, prefix=settings.API_PREFIX)

# Include WebSocket router at root
app.include_router(ws_router)


if __name__ == "__main__":
    import uvicorn

    # Bind strictly to configured host (default 127.0.0.1) - never publicly by default
    uvicorn.run(
        "backend.app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )
