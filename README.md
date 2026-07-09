# DentAI — AI-Powered Dental Health Platform

A full-stack dental health app with a React web dashboard, React Native mobile app, and FastAPI backend.

---

## Architecture

```
dental-ai/
├── dentai-backend/     # FastAPI + MongoDB Atlas
├── dentai-web/         # React + Vite web app
└── dentai-mobile/      # Expo React Native app
```

**Deployed backend:** `https://dental-ai-8qr1.onrender.com`

---

## Backend Setup

### Prerequisites
- Python 3.12
- MongoDB Atlas account (or local MongoDB)

### Steps

```bash
cd dentai-backend
python -m venv ven
ven\Scripts\activate        # Windows
# source ven/bin/activate   # Mac/Linux
pip install -r requirements.txt
```

Create a `.env` file (copy from `.env.example`):
```env
MONGODB_URL=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/dentai?appName=dental-ai
SECRET_KEY=your-secret-key-min-32-chars
GROQ_API_KEY=your-groq-api-key
GOOGLE_API_KEY=your-google-api-key
```

Seed the database (articles + oral health tips):
```bash
python seed.py
```

Run the server:
```bash
uvicorn app.main:app --reload
```

API docs available at `http://localhost:8000/docs`

---

## Web App Setup

### Prerequisites
- Node.js 18+

### Steps

```bash
cd dentai-web
npm install
npm run dev
```

App runs at `http://localhost:5173`

The web app points to the deployed Render backend by default. To use local backend, set in `src/services/api.ts`:
```ts
const API_URL = 'http://localhost:8000';
```

---

## Mobile App Setup

### Prerequisites
- Node.js 18+
- Expo Go app on your phone (iOS or Android)

### Steps

```bash
cd dentai-mobile
npm install
npx expo start
```

Scan the QR code with Expo Go.

The mobile app points to the deployed Render backend by default. To use local backend, update `lib/api.ts`:
```ts
const API_URL = 'http://<your-local-ip>:8000';
```

---

## Features

### Patient
- AI Chat (streaming, voice input, TTS)
- Symptom Checker
- Smart AI Scan (medicine, tooth, food, habit analysis)
- Book dental appointments
- Education hub with articles

### Dentist
- Dashboard with appointment stats
- Confirm / decline / complete patient bookings
- AI Scan tools (tooth & medicine)
- Education hub

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI, MongoDB Atlas (Motor), Groq AI |
| Web | React, TypeScript, Vite, Axios |
| Mobile | Expo, React Native, TypeScript |
| AI | Groq Llama 4 Scout (vision), Llama 3.1 (chat/symptoms), Whisper (voice) |
| Auth | JWT (access + refresh tokens), bcrypt |
| Rate Limiting | SlowAPI + in-memory fallback |

---

## Environment Variables

### Backend (`.env`)
| Key | Description |
|-----|-------------|
| `MONGODB_URL` | MongoDB Atlas connection string |
| `SECRET_KEY` | JWT signing secret (min 32 chars) |
| `GROQ_API_KEY` | Groq API key for AI features |
| `GOOGLE_API_KEY` | Google API key (optional) |
| `REDIS_URL` | Redis URL (optional, falls back to in-memory) |
| `ENVIRONMENT` | `development` or `production` |

---

## Default Accounts

No seed accounts — register fresh via the app.

Password requirements: min 8 chars, 1 uppercase, 1 digit, 1 special character (e.g. `Dental@123`)
