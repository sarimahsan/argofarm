# ArgoFarm — AI-Powered Crop Diagnostics Platform

Intelligent crop disease detection and farmer advisory system for Pakistan using ML vision models and community-driven insights.

---

## 📋 Tech Stack

| Component | Technology |
|-----------|-----------|
| **Backend** | Flask (Python 3.9+) + MySQL |
| **Frontend** | Vanilla JavaScript + Vite |
| **AI Model** | TensorFlow 2.12 + Groq Llama 3.2 Vision |
| **Map** | Leaflet.js (Disease outbreak radar) |
| **Charts** | Chart.js (Health analytics) |

---

## 🚀 Quick Start

### Prerequisites
- Python 3.9+
- Node.js 16+
- **MySQL 8.0+** (optional — SQLite is auto-fallback)
- Git

### 1️⃣ Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate
# Activate (Mac/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file (copy template)
copy .env.example .env

# ⭐ Initialize database (creates all tables automatically)
python init_db.py
# ✅ If MySQL is configured: uses MySQL
# ✅ If MySQL unavailable: auto-creates SQLite (local_db.sqlite)

# Start server
python app.py
# Runs on http://localhost:5000
```

### 2️⃣ Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
# Runs on http://localhost:5173

# Build for production
npm run build
```

---

## �️ Database Setup (Auto-Managed)

The **`init_db.py`** script handles database initialization with smart fallback:

### Option A: MySQL (Production)
```bash
# Set in .env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=agrofarm

# Run init script
cd backend
python init_db.py
# ✅ Creates tables in MySQL
```

### Option B: SQLite (Development — Zero Setup)
```bash
# Just run (no .env needed)
cd backend
python init_db.py
# ✅ Auto-creates local_db.sqlite file
# ✅ Perfect for quick local testing
```

**Tables Created:**
- `users` — Farmer profiles
- `scans` — Disease detection results
- `chat_history` — AI chat conversations
- `diseases` — Disease reference database
- `community_posts` — Forum discussions
- `marketplace_items` — Wholesale listings

---

## �📂 Project Structure

```
ArgoFarm/
├── backend/
│   ├── app.py                    # Flask app entry point
│   ├── init_db.py                # Database initialization
│   ├── requirements.txt           # Python dependencies
│   ├── config/                   # Configuration (dev/prod)
│   ├── models/                   # Database models
│   ├── routes/                   # API endpoints
│   │   ├── auth.py               # Authentication & registration
│   │   ├── dashboard.py          # Analytics & outbreak radar
│   │   ├── scan.py               # Image upload & ML prediction
│   │   ├── chat.py               # CropMind AI chat
│   │   ├── history.py            # Scan history
│   │   ├── community.py          # Community forum
│   │   ├── planner.py            # Crop planning
│   │   ├── wholesale.py          # Marketplace
│   ├── utils/
│   │   ├── ml_pipeline.py        # TensorFlow model loading
│   │   ├── groq_client.py        # Groq API integration
│   │   ├── database.py           # MySQL connection
│   │   ├── auth_utils.py         # JWT & password hashing
│   ├── tests/                    # Unit & integration tests
│   ├── static/uploads/           # User scan uploads
│
├── frontend/
│   ├── src/
│   │   ├── main.js               # App entry point
│   │   ├── api.js                # API client
│   │   ├── router.js             # Page routing
│   │   ├── state.js              # Global state management
│   │   ├── pages/                # Page components
│   │   │   ├── landing.js        # Login/Register
│   │   │   ├── dashboard.js      # Main dashboard + radar
│   │   │   ├── chat.js           # CropMind AI chat
│   │   │   ├── scan.js           # Image upload interface
│   │   │   ├── history.js        # Scan history
│   │   │   ├── community.js      # Community posts
│   │   │   ├── planner.js        # Crop planning
│   │   │   ├── wholesale.js      # Marketplace
│   │   ├── components/           # Reusable UI components
│   │   ├── style.css             # Global styles
│   ├── index.html                # HTML template
│   ├── vite.config.js            # Vite configuration
│
├── Notebooks/                    # ML model training notebooks
├── .gitignore                    # Git ignore rules
├── .env.example                  # Environment template
└── README.md                     # This file
```

---

## 🔑 Key Features

| Feature | Status | Details |
|---------|--------|---------|
| **Authentication** | ✅ | JWT-based login/register with bcrypt |
| **Crop Scanning** | ✅ | Upload image → Groq Vision AI → Disease detection |
| **Outbreak Radar** | ✅ | Real-time geospatial visualization of all scans |
| **CropMind Chat** | ✅ | AI advisor for crop queries & recommendations |
| **Scan History** | ✅ | Persistent scan records with confidence scores |
| **Community Forum** | ✅ | Farmer discussions & knowledge sharing |
| **Crop Planner** | ✅ | Seasonal planning & recommendations |
| **Marketplace** | ✅ | Wholesale/retail price tracking |

---

## 🔌 API Endpoints

### Authentication
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `GET /api/v1/auth/profile` - Get user profile
- `PUT /api/v1/auth/profile` - Update profile

### Dashboard
- `GET /api/v1/dashboard/analytics` - User analytics
- `GET /api/v1/dashboard/outbreaks` - All scans (for radar)

### Scanning
- `POST /api/v1/scan/predict` - Upload image & get diagnosis

### Chat
- `POST /api/v1/chat/send` - Send message to AI
- `POST /api/v1/chat/recommend_crop` - Get crop recommendations

### Community
- `GET /api/v1/community/posts` - Fetch forum posts
- `POST /api/v1/community/posts` - Create post

---

## 🧪 Testing

```bash
cd backend

# Run all tests
pytest

# Run specific test file
pytest tests/test_auth_utils.py

# Run with coverage
pytest --cov=.
```

---

## 🔐 Environment Variables

Create `.env` in `backend/`:

```env
# Database
DATABASE_URL=mysql://root:password@localhost:3306/agrofarm
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=agrofarm

# JWT
JWT_SECRET=your_super_secret_key_change_this
JWT_EXPIRY_DAYS=7

# Groq AI
GROQ_API_KEY=your_groq_api_key

# Flask
FLASK_ENV=development
FLASK_DEBUG=1
```

---

## 🛠️ Common Commands

```bash
# Backend: Run server
cd backend && python app.py

# Backend: Run tests
cd backend && pytest

# Frontend: Dev server
cd frontend && npm run dev

# Frontend: Build
cd frontend && npm run build

# Database: Reset
cd backend && python init_db.py
```

---

## 📊 Database Schema

Key tables:
- **users** — Farmer profiles & regions
- **scans** — Disease detection results
- **chat_sessions** — AI conversation history
- **community_posts** — Forum discussions
- **crop_plans** — Seasonal planning records

---

## 🚨 Common Issues

| Issue | Solution |
|-------|----------|
| `ModuleNotFoundError: No module named 'flask'` | Run `pip install -r requirements.txt` |
| `Error connecting to MySQL` | Check DB credentials in `.env`, ensure MySQL is running |
| `GROQ_API_KEY not set` | Add your Groq API key to `.env` |
| `Vite dev server fails` | Clear `node_modules` and run `npm install` again |

---

## 📝 Notes for Developers

1. **Backend API responses** use standard JSON format: `{status, data, message}`
2. **Frontend state** is managed globally in `src/state.js`
3. **Authentication** token is stored in `localStorage` with key `authToken`
4. **Outbreak Radar** updates automatically when dashboard loads
5. **ML model** (TensorFlow) is pre-trained and loaded at startup
6. **Groq API** handles real-time image analysis (no local GPU needed)

---

## 📞 Support

For questions or issues:
- Check existing database records with `python init_db.py`
- Review API responses in browser DevTools → Network tab
- Check backend logs for error details
- Run tests to verify functionality: `pytest -v`

---

**Happy coding! 🚀**
