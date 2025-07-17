# 🔄 Synthetic Data Generator (React + FastAPI + OpenAI)

A full-stack web application that uses OpenAI to generate synthetic datasets based on user prompts. Supports export in JSON or CSV, interactive preview, and rich filtering with prompt history.

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
├── .env                      # contains OPENAI_API_KEY
└── README.md
```

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

> 📌 UI includes a prompt box, format dropdown, history list, loading state, download, and table preview.

---

## 📃 License

MIT License

---

## 🙌 Contributing

PRs are welcome! Please open an issue for feature requests or bugs.