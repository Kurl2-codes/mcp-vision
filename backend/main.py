#!/usr/bin/env python3
"""
MCP Vision Backend Application Entry Point
"""

import os
import sys
import uvicorn
from config.settings import settings

def main():
    """Main entry point for the application"""
    # Change to backend directory to ensure .venv and __pycache__ are created here
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
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
