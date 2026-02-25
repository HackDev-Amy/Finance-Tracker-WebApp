# finarc — Personal Finance Management App

A full-stack personal finance web application built with **Django REST Framework** + **React**.

## 🎨 Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Django 4.2, Django REST Framework |
| Auth | JWT via `djangorestframework-simplejwt` |
| Database | MySQL |
| Frontend | React 18, React Router v6 |
| HTTP Client | Axios |
| Charts | Recharts |
| Styling | Custom CSS (Warm Dark theme) |
| Notifications | react-hot-toast |

---

## 📁 Project Structure

```
finance-app/
├── backend/
│   ├── financeapp/          # Django project config
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   ├── core/                # Main app
│   │   ├── models.py        # Income, Expense, SavingsGoal
│   │   ├── serializers.py
│   │   ├── views.py         # ViewSets + Dashboard
│   │   ├── urls.py
│   │   ├── filters.py
│   │   └── admin.py
│   ├── requirements.txt
│   ├── manage.py
│   └── .env.example
│
└── frontend/
    ├── src/
    │   ├── pages/           # LoginPage, RegisterPage, Dashboard, Income, Expenses, Savings
    │   ├── components/
    │   │   ├── layout/      # Sidebar + Layout shell
    │   │   └── common/      # Modal
    │   ├── context/         # AuthContext (JWT session)
    │   ├── services/        # api.js (Axios + interceptors)
    │   ├── App.jsx          # Router + protected routes
    │   └── index.css        # Global styles
    ├── public/
    └── package.json
```

---

## 🚀 Setup Instructions

### Prerequisites

- Python 3.10+
- Node.js 18+
- MySQL 8.0+

---

### 1. Database Setup (MySQL)

```sql
CREATE DATABASE financeapp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'financeapp_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON financeapp.* TO 'financeapp_user'@'localhost';
FLUSH PRIVILEGES;
```

---

### 2. Backend Setup

```bash
cd finance-app/backend

# Create & activate virtual environment
python -m venv venv
source venv/bin/activate          # macOS/Linux
# venv\Scripts\activate           # Windows

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env with your DB credentials and secret key

# Run migrations
python manage.py makemigrations
python manage.py migrate

# Create admin superuser (optional)
python manage.py createsuperuser

# Start development server
python manage.py runserver
```

The API will be available at `http://localhost:8000/api/`

---

### 3. Frontend Setup

```bash
cd finance-app/frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# REACT_APP_API_URL=http://localhost:8000/api  (default)

# Start development server
npm start
```

The app will open at `http://localhost:3000`

---

## 🔐 Environment Variables

### Backend (`backend/.env`)

```env
DJANGO_SECRET_KEY=your-very-secret-django-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

DB_NAME=financeapp
DB_USER=financeapp_user
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=3306

CORS_ALLOWED_ORIGINS=http://localhost:3000
```

### Frontend (`frontend/.env`)

```env
REACT_APP_API_URL=http://localhost:8000/api
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|---------|-------------|
| POST | `/api/auth/register/` | Create account |
| POST | `/api/auth/login/` | Login → JWT tokens |
| POST | `/api/auth/refresh/` | Refresh access token |
| GET | `/api/auth/profile/` | Get current user |
| GET/POST | `/api/income/` | List / create income |
| GET/PUT/DELETE | `/api/income/{id}/` | Get / update / delete income |
| GET | `/api/income/monthly_total/` | Current month income total |
| GET/POST | `/api/expenses/` | List / create expenses |
| GET/PUT/DELETE | `/api/expenses/{id}/` | Get / update / delete expense |
| GET | `/api/expenses/monthly_total/` | Current month expense total |
| GET | `/api/expenses/by_category/` | Expenses grouped by category |
| GET/POST | `/api/savings-goals/` | List / create goals |
| GET/PUT/DELETE | `/api/savings-goals/{id}/` | Get / update / delete goal |
| PATCH | `/api/savings-goals/{id}/add_funds/` | Add amount to goal |
| GET | `/api/dashboard/` | Full dashboard summary |

### Filtering

**Income:** `?source=salary&year=2024&month=11&date_from=2024-01-01&date_to=2024-12-31`

**Expenses:** `?category=food&year=2024&month=11&date_from=...&date_to=...`

---

## 🗄 Database Schema

```
User (Django built-in)
  id, username, email, password, date_joined

Income
  id, user (FK), source, amount, date, notes, created_at, updated_at

Expense
  id, user (FK), title, category, amount, date, notes, created_at, updated_at
  category choices: food, rent, utilities, travel, entertainment,
                    health, shopping, education, savings, other

SavingsGoal
  id, user (FK), name, target_amount, current_amount, deadline, created_at, updated_at
  computed: progress_percentage, is_on_track, days_remaining
```

---

## ✨ Features

- **JWT Authentication** — secure login/register with auto token refresh
- **Income Management** — add/edit/delete income with source, amount, date
- **Expense Tracking** — categorized expenses with filtering by category and month
- **Savings Goals** — create goals, track progress, manually add funds, on-track indicator
- **Dashboard** — stat cards, 6-month bar chart (income vs expenses), category pie chart
- **Input Validation** — both frontend (immediate) and backend (DRF validators)
- **User Isolation** — every user only sees their own data

---

## 🏗 Production Deployment Notes

1. Set `DEBUG=False` in `.env`
2. Set a strong `DJANGO_SECRET_KEY`
3. Configure `ALLOWED_HOSTS` with your domain
4. Run `python manage.py collectstatic`
5. Use Gunicorn/uWSGI + Nginx for Django
6. Run `npm run build` for React production build
7. Serve React build via Nginx or a CDN
