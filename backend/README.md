# MCP Vision Backend

A production-ready FastAPI backend for visual AI analysis using Google Gemini, face recognition, and MongoDB storage.

## 🚀 Features

- **Visual Analysis**: Google Gemini API for image understanding
- **Face Recognition**: DeepFace integration for person identification
- **Object Detection**: Local CV models for object locating
- **Memory System**: MongoDB-based search and history
- **Session Management**: Chat session persistence
- **Production Ready**: Environment-based configuration, logging, and error handling

## 📁 Project Structure

```
backend/
├── app/
│   ├── __init__.py          # App initialization
│   └── api.py               # Main FastAPI application
├── config/
│   ├── __init__.py
│   └── settings.py          # Configuration management
├── scripts/
│   └── check_models.py      # Model availability checker
├── data/                    # Data files (models.txt, etc.)
├── src/
│   └── mcp_vision/          # MCP vision tools
├── main.py                  # Application entry point
├── requirements.txt         # Python dependencies
├── pyproject.toml          # Project configuration
└── README.md               # This file
```

## 🔧 Setup

### 1. Environment Configuration

Copy the example environment file:
```bash
cp ../.env.example ../.env
```

Edit `.env` with your actual values:
- `GEMINI_API_KEY`: Your Google Gemini API key
- `MONGO_URI`: MongoDB connection string
- `MONGO_DB_NAME`: Database name

### 2. Install Dependencies

```bash
# Using uv (recommended)
uv sync

# Or using pip
pip install -r requirements.txt
```

### 3. Start the Application

```bash
# Development mode
python main.py

# Or directly with uvicorn
uvicorn app.api:app --host 0.0.0.0 --port 8000 --reload
```

## 📊 Health Check

Verify all dependencies are working:
```bash
python scripts/check_models.py
```

## 🛠️ API Endpoints

### Core Analysis
- `POST /analyze` - Analyze images with AI
- `POST /questionnaire` - Process VLA questionnaire
- `POST /zoom` - Crop objects from images

### Face Recognition
- `POST /register_face` - Register a new face
- `GET /identities` - List known people

### Session Management
- `POST /sessions` - Create new chat session
- `GET /sessions` - List all sessions
- `GET /sessions/{session_id}` - Get session history

### History & Search
- `GET /history` - Get analysis history
- `GET /` - Health check endpoint

## 🔒 Security

- Environment variables for all secrets
- No hardcoded credentials
- CORS configuration
- Input validation and sanitization

## 🐳 Docker Deployment

```dockerfile
# Build
docker build -t mcp-vision-backend .

# Run
docker run -p 8000:8000 --env-file .env mcp-vision-backend
```

## 📝 Environment Variables

See `.env.example` for all available configuration options.

## 🤝 Development

- Code formatting with `ruff`
- Testing with `pytest`
- Hot reload in development mode
- Comprehensive error logging

## 📄 License

MIT License - see LICENSE file for details.
