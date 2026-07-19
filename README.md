# Finance Revenue Automation

A web application that automates the generation of PowerPoint revenue summary reports from Excel trial balance data. Upload your Excel files, and the tool handles revenue mapping, calculations, and PowerPoint slide generation.

## Run locally

From the project root:

```bash
python3 -m venv .venv
.venv/bin/pip install --no-cache-dir -r finance_automation/backend/requirements.txt
```

Start the backend:

```bash
cd finance_automation/backend
../../.venv/bin/python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

In a second terminal, start the frontend:

```bash
cd finance_automation/frontend
npm install
npm run dev
```

Open `http://localhost:3000`.

The frontend calls the backend at `http://localhost:8000/api`.
Backend environment overrides use the `FINANCE_` prefix, for example `FINANCE_DEBUG=true`.
