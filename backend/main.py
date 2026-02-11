#!/usr/bin/env python3
"""
MCP Vision Backend Application Entry Point
"""

import uvicorn
from config.settings import settings

def main():
    """Main entry point for the application"""
    print(f"🚀 Starting MCP Vision Backend on {settings.HOST}:{settings.PORT}")
    print(f"📁 Images directory: {settings.IMAGES_DIR}")
    print(f"🗄️  Database: {settings.MONGO_DB_NAME}")
    
    uvicorn.run(
        "app.api:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True,
        log_level="info"
    )

if __name__ == "__main__":
    main()
