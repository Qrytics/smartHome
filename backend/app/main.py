"""
Smart Home Backend - Main Application Entry Point

This module initializes the FastAPI application with all necessary middleware,
routers, and configuration.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api import health

# Initialize FastAPI application
app = FastAPI(
    title="Smart Home API",
    description="Backend API for Smart Home capstone project",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, tags=["health"])

# TODO: Add additional routers
# app.include_router(access.router, prefix="/api/access", tags=["access"])
# app.include_router(sensors.router, prefix="/api/sensors", tags=["sensors"])
# app.include_router(policies.router, prefix="/api/policies", tags=["policies"])
# app.include_router(websocket.router, prefix="/ws", tags=["websocket"])


@app.on_event("startup")
async def startup_event():
    """
    Application startup tasks:
    - Initialize database connections
    - Initialize Redis connection
    - Start background workers
    """
    print("=" * 50)
    print("Smart Home Backend Starting...")
    print("=" * 50)
    # TODO: Initialize database connection pool
    # TODO: Initialize Redis connection pool
    # TODO: Start stream processor worker
    print("All services initialized successfully!")


@app.on_event("shutdown")
async def shutdown_event():
    """
    Application shutdown tasks:
    - Close database connections
    - Close Redis connections
    - Stop background workers
    """
    print("=" * 50)
    print("Smart Home Backend Shutting Down...")
    print("=" * 50)
    # TODO: Close database connections
    # TODO: Close Redis connections
    # TODO: Stop background workers
    print("Shutdown complete.")


@app.get("/")
async def root():
    """Root endpoint - provides basic API information"""
    return {
        "name": "Smart Home API",
        "version": "0.1.0",
        "status": "running",
        "docs": "/docs",
        "redoc": "/redoc",
    }


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=settings.API_RELOAD,
        log_level=settings.LOG_LEVEL.lower(),
    )
