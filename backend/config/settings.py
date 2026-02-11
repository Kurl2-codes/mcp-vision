"""
Configuration settings for MCP Vision Backend
"""

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Settings:
    """Application settings"""
    
    # API Configuration
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    
    # TensorFlow Configuration
    TF_USE_LEGACY_KERAS: str = os.getenv("TF_USE_LEGACY_KERAS", "1")
    
    # MongoDB Configuration
    MONGO_URI: str = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
    MONGO_DB_NAME: str = os.getenv("MONGO_DB_NAME", "mcp_vision_db")
    
    # Server Configuration
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    
    # Development Settings
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    
    # File Paths
    IMAGES_DIR: str = os.getenv("IMAGES_DIR", "images")
    UPLOADS_DIR: str = os.path.join(IMAGES_DIR, "uploads")
    FACES_DIR: str = os.path.join(IMAGES_DIR, "faces")
    
    @classmethod
    def validate(cls) -> bool:
        """Validate required settings"""
        if not cls.GEMINI_API_KEY:
            print("WARNING: GEMINI_API_KEY not found in environment variables.")
            return False
        return True

    def __str__(self) -> str:
        """String representation of settings (without secrets)"""
        return f"""
MCP Vision Settings:
- Host: {self.HOST}:{self.PORT}
- Database: {self.MONGO_DB_NAME}
- Images Dir: {self.IMAGES_DIR}
- Debug: {self.DEBUG}
- Log Level: {self.LOG_LEVEL}
- TensorFlow Legacy Keras: {self.TF_USE_LEGACY_KERAS}
- Gemini API Key: {'✅ Configured' if self.GEMINI_API_KEY else '❌ Missing'}
        """.strip()

# Global settings instance
settings = Settings()
