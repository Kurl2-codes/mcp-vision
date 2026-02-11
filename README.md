<div align="center">
  <img src="https://img.icons8.com/isometric/100/visible.png" alt="MCP Vision Logo" width="100" />
  <h1>MCP Vision AI</h1>
  <p><i>A powerful, privacy-first visual intelligence suite running 100% locally.</i></p>

  <p>
    <img src="https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi" alt="FastAPI" />
    <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind" />
    <img src="https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
  </p>
  <p>
    <img src="https://img.shields.io/badge/Google_Gemini-8E75B2?style=for-the-badge&logo=google&logoColor=white" alt="Gemini" />
    <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
    <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  </p>
</div>

<hr />

## 🌟 Core Capabilities

MCP Vision blends the reasoning power of **Google Gemini 2.0 Flash** with high-performance **Local Computer Vision** models.

- 🧠 **Smart Visual Chat**: Context-aware reasoning about images using Gemini 2.0.
- 👤 **Local Face Recognition**: "Remember" identities locally using `DeepFace`. Zero cloud leakage.
- 🔍 **Object Localization**: Pinpoint any object ("Find the blue shirt") with zero-shot `OwlVit`.
- 🖼️ **Visual Memory**: A searchable RAG-powered database of every image the system has "seen".
- 📱 **Mobile Responsive**: Full-featured experience on Desktop, Tablet, and Mobile.
- 🔐 **Protected Access**: Secure glassmorphic login system built-in.

---

## 🛠️ Tech Stack & Architecture

### **Frontend**
- **Framework**: React 18 with Vite
- **Styling**: Tailwind CSS (Glassmorphism & Custom Animations)
- **State Management**: React Hooks & Axios
- **Markdown**: `react-markdown` for rich AI responses

### **Backend**
- **Framework**: FastAPI (High-performance Python)
- **AI Engine**: `DeepFace` (VGG-Face), `OwlVit` (Object Detection), `Google Generative AI` (Gemini)
- **Database**: MongoDB (Identity & History Storage)
- **Process Manager**: `uv` for lightning-fast dependency management

---

## 🚀 Getting Started

### 1. Requirements
- **Python 3.10+** (Recommend using `uv`)
- **Node.js 18+**
- **MongoDB** (Running locally or via Docker)

### 2. Setting up the Brain (Backend)
```powershell
cd backend
# Install dependencies and start
uv run uvicorn app.api:app --reload --port 8000
```

### 3. Setting up the Interface (Frontend)
```powershell
cd frontend
npm install
npm run dev
```

Visit [http://localhost:5173](http://localhost:5173) to start exploring!

---

## 🔒 Security & Privacy

| Feature | Provider | Location | Privacy Level |
| :--- | :--- | :--- | :--- |
| Reasoning | Google Gemini | Cloud | High (Encrypted) |
| Identity Rec | DeepFace | **Local** | **Maximum (Air-gapped)** |
| Object Detection | OwlVit | **Local** | **Maximum (Air-gapped)** |
| Chat History | MongoDB | **Local** | Private |

---

## 📂 Project Navigation

```text
mcp-vision-main/
├── backend/                # Intelligence & API Layer
│   ├── app/                # API Endpoints & Logic
│   ├── core/               # Computer Vision Engines
│   ├── config/             # Environment & Settings
│   └── images/             # Local Data Storage
├── frontend/               # User Interface Layer
│   ├── src/                # React Source Code
│   └── public/             # Static Assets
└── docker-compose.yml      # Orchestration Settings
```

---

<div align="center">
  <p>Built for the future of private visual intelligence.</p>
</div>
