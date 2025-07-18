
# 🔄 Synthetic Data Generator (React + FastAPI + OpenAI)

A full-stack web application that uses OpenAI to generate synthetic datasets based on user prompts. Supports export in JSON or CSV, interactive preview, and rich filtering with prompt history.

---

## 📚 Documentation & API

- **API Reference & Architecture:** See [ARCHITECTURE.md](./ARCHITECTURE.md) for backend API docs, usage examples, and system diagrams.
- **Frontend:**
  - Main entry: `frontend/src/App.jsx`
  - Data table: `frontend/src/DataTable.jsx`
  - API call: POST `/generate-data` (see below)

### Example API Usage

```bash
curl -X POST http://localhost:8000/generate-data \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Generate 10 users with name and email", "format": "json"}'
```

**Response:**
```json
{
  "json": [
    { "name": "Alice", "email": "alice@example.com" },
    { "name": "Bob", "email": "bob@example.com" }
  ]
}
```

---

## ✨ Features

- 🧠 Natural language prompt → synthetic dataset (via OpenAI)
- 🔄 JSON & CSV format selection
- 📊 Interactive MUI DataGrid table
  - Column-specific filtering, regex and startsWith modes
  - Sorting and pagination
- 💾 One-click download (JSON/CSV)
- 📜 Prompt history with restore, delete, and undo
- ⏳ Loading spinner during API call
- 🔗 Pagination state synced with URL (optional)

---

## 🛠️ Tech Stack

| Layer       | Technology         |
|-------------|--------------------|
| Frontend    | React + Vite       |
| UI          | Material UI (MUI)  |
| Backend     | FastAPI            |
| LLM         | OpenAI API         |
| Styling     | MUI + CSS          |
| State       | React Hooks + LocalStorage |

---

## 📂 Project Structure

```
synthetic-data-app/
├── backend/
│   ├── .env                  # contains OPENAI_API_KEY
│   ├── main.py               # FastAPI backend with /generate-data route
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── DataTable.jsx
│   │   └── main.jsx
│   ├── public/
│   │   └── index.html
│   ├── package.json
│   └── vite.config.js
└── README.md
```

---


## 🐳 Docker Setup (Optional)

You can run the entire stack with Docker and docker-compose:

```bash
docker-compose up --build
```

This will start both backend (FastAPI, port 8000) and frontend (Vite, port 3000) containers. Make sure to set your `OPENAI_API_KEY` in `backend/.env`.

---

## 🚀 Getting Started

### 1. Clone and install

```bash
git clone https://github.com/your-username/synthetic-data-app.git
cd synthetic-data-app
```

### 2. Backend (FastAPI)

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Ensure your `.env` file contains:

```
OPENAI_API_KEY=your-api-key-here
```

### 3. Frontend (React + Vite)

```bash
cd ../frontend
npm install
npm run dev
```

Visit: [http://localhost:3000](http://localhost:3000)

---

## 🧪 Sample Prompts

```txt
Generate 50 fake customer profiles with fields: name, email, age, country
Generate 100 sales records with product, quantity, revenue, and date
Generate a dataset of employee records with id, name, role, and joining_date
```

---

## 📸 Screenshots
<img width="1233" height="462" alt="Screenshot 2025-07-17 at 4 52 40 PM" src="https://github.com/user-attachments/assets/3b89e5f6-1e82-423b-82ae-a7101ff652bc" />

<img width="1181" height="839" alt="Screenshot 2025-07-17 at 4 53 30 PM" src="https://github.com/user-attachments/assets/4f0fce26-717a-4190-84e0-a4a928eef14e" />


---

## 📃 License

MIT License

---


## 🔄 Automated Dependency Updates

This repository uses [Dependabot](https://docs.github.com/en/code-security/supply-chain-security/keeping-your-dependencies-updated-automatically/about-dependabot-version-updates) to keep dependencies up to date:

- **Frontend**: Checks npm dependencies in `/frontend` weekly
- **Backend**: Checks pip dependencies in `/backend` weekly

Pull requests will be automatically opened for outdated dependencies.

---

## 🙌 Contributing

PRs are welcome! Please open an issue for feature requests or bugs.
