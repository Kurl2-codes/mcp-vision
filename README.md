# MCP Vision AI 👁️

A powerful, privacy-focused visual AI application running locally on your machine.
Combines **Google Gemini** (for reasoning) with **Local Computer Vision** (for privacy and speed).

## 🚀 Features

-   **Chat with Images**: Ask questions about any image using Gemini 2.0 Flash.
-   **Face Recognition**: "Remember" people's faces locally (using DeepFace). **100% Private & Free**.
-   **Object Finding**: Ask to "Find the cat" and it will locate it using local AI (OwlVit).
-   **Smart Zoom**: Automatically zoom/crop into detected objects.
-   **Gallery & Search**: Semantic search ("Find the blue car") for your image history.

## 📂 Project Structure

```
mcp-vision-main/
├── backend/                # FastAPI capabilities (Python)
│   ├── app/
│   │   └── api.py          # Main API Server
│   ├── core/               # Local AI Tools (Object Detection, etc.)
│   ├── images/             # data storage (uploads & faces)
│   └── requirements.txt    # Python dependencies
├── frontend/               # React Application (Vite + Tailwind)
└── README.md
```

## 🛠️ Quick Start

### 1. Backend (The Brain)
Open a terminal in `backend/`:
```powershell
uv run uvicorn app.api:app --reload --port 8000
```

### 2. Frontend (The Interface)
Open a terminal in `frontend/`:
```powershell
npm run dev
```

Visit **http://localhost:5173** to use the app!

## 🔐 Privacy & AI Usage
-   **Gemini API**: Used ONLY for chat/reasoning. Requires API Key.
-   **DeepFace**: Used for Face Recognition. Runs **locally**. No data sent to cloud.
-   **OwlVit**: Used for Object Detection. Runs **locally**. No data sent to cloud.

## 📝 Configuration
Check the `.env` file in `backend/` to configure your keys:
`GEMINI_API_KEY=your_key_here`
