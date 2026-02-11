# MCP Vision

A production-ready visual AI application that combines Google Gemini, face recognition, and object detection for intelligent image analysis.

## 🚀 Features

- **Visual Analysis**: Google Gemini API for advanced image understanding
- **Face Recognition**: DeepFace integration for person identification and registration
- **Object Detection**: Local CV models for precise object locating and cropping
- **Memory System**: MongoDB-based search and history tracking
- **Session Management**: Persistent chat sessions with context
- **Production Ready**: Environment-based configuration, Docker deployment, and comprehensive error handling

## 📁 Project Structure

```
mcp-vision/
├── backend/                 # Backend application
│   ├── app/
│   │   ├── __init__.py
│   │   └── api.py          # FastAPI application
│   ├── config/
│   │   ├── __init__.py
│   │   └── settings.py     # Configuration management
│   ├── scripts/
│   │   └── check_models.py # Model availability checker
│   ├── data/               # Data files
│   ├── src/
│   │   └── mcp_vision/     # MCP vision tools
│   ├── main.py            # Application entry point
│   ├── requirements.txt   # Python dependencies
│   └── README.md          # Backend documentation
├── frontend/              # Frontend application
├── images/               # Image storage
│   ├── uploads/          # User uploads
│   └── faces/           # Registered faces
├── .env.example         # Environment template
├── .gitignore           # Git ignore rules
├── Dockerfile           # Docker configuration
├── docker-compose.yml   # Multi-container setup
└── README.md           # This file
```

## 🛠️ Quick Start

### 1. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
# Required: GEMINI_API_KEY
# Optional: MONGO_URI, MONGO_DB_NAME, etc.
```

### 2. Development Setup

```bash
# Start services with Docker Compose
docker-compose up -d

# Or run backend locally
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

### 3. Verify Setup

```bash
# Check model availability
cd backend
python scripts/check_models.py

# Test API
curl http://localhost:8000/
```

## 🐳 Docker Deployment

### Development
```bash
docker-compose up -d
```

### Production
```bash
# Build and run with environment file
docker build -t mcp-vision-backend .
docker run -p 8000:8000 --env-file .env mcp-vision-backend
```

## 📊 API Documentation

Once running, visit:
- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/analyze` | Analyze images with AI |
| POST | `/register_face` | Register a new face |
| GET | `/identities` | List known people |
| POST | `/sessions` | Create chat session |
| GET | `/history` | Get analysis history |

## 🔧 Configuration

### Environment Variables

See `.env.example` for all available options:

```bash
# Required
GEMINI_API_KEY=your_gemini_api_key_here

# Database
MONGO_URI=mongodb://localhost:27017/
MONGO_DB_NAME=mcp_vision_db

# Server
HOST=0.0.0.0
PORT=8000

# Development
DEBUG=false
LOG_LEVEL=INFO
```

### Google Gemini API

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key
3. Add it to your `.env` file as `GEMINI_API_KEY`

## 🔒 Security

- ✅ Environment variables for all secrets
- ✅ No hardcoded credentials
- ✅ CORS configuration
- ✅ Input validation and sanitization
- ✅ `.gitignore` prevents secret commits

## 🧪 Development

### Backend Development

```bash
cd backend

# Install dependencies
uv sync

# Run with hot reload
uvicorn app.api:app --reload --host 0.0.0.0 --port 8000

# Code formatting
ruff check .
ruff format .

# Run tests
pytest
```

### Health Check

```bash
# Verify all dependencies
python scripts/check_models.py
```

## 📝 Architecture

- **FastAPI**: Modern, fast web framework
- **Google Gemini**: State-of-the-art vision AI
- **DeepFace**: Face recognition and analysis
- **MongoDB**: Document storage for history and sessions
- **Docker**: Containerized deployment
- **UV**: Fast Python package management

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support

- Check the [Backend README](backend/README.md) for detailed API documentation
- Use the health check endpoint to verify setup
- Check logs for troubleshooting information
