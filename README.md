# CodeExam - Secure College Coding Examination Platform

A full-stack secure coding examination platform for colleges with anti-cheating detection, automated code evaluation via Judge0, and comprehensive admin management tools.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, Monaco Editor |
| Backend | Node.js, Express, MongoDB (Mongoose) |
| Auth | JWT + bcrypt |
| Code Execution | Judge0 CE (hosted via RapidAPI, switchable to self-hosted) |
| Languages | Python 3.12, Java 17 |

## Features

**Admin**
- Create/manage coding problems with sample and hidden test cases
- Create exams with time windows and student allowlists
- Add students individually or via CSV bulk upload
- View all submissions and violation logs
- View and export leaderboard as CSV

**Student**
- View and start available exams
- Code editor (Monaco) with Python 3 / Java 17 support
- Submit solutions evaluated against hidden test cases
- View submission history and leaderboard
- Anti-cheating: fullscreen enforcement, tab/window switch detection, right-click blocking

## Prerequisites

- Node.js >= 18
- MongoDB (running locally on port 27017)
- RapidAPI key for Judge0 CE (get one at https://rapidapi.com/judge0-official/api/judge0-ce)

## Local Setup

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` with your actual values:

```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/exam-platform
JWT_SECRET=change-this-to-a-random-secret
JWT_EXPIRES_IN=8h
JUDGE0_BASE_URL=https://judge0-ce.p.rapidapi.com
JUDGE0_API_KEY=your-rapidapi-key-here
JUDGE0_API_HOST=judge0-ce.p.rapidapi.com
BCRYPT_SALT_ROUNDS=12
```

Seed the admin user:

```bash
npm run seed
```

This creates the default admin account: `admin@college.edu` / `admin123`

Start the backend:

```bash
npm run dev
```

Backend runs on http://localhost:5000

### 2. Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
```

Edit `.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

Start the frontend:

```bash
npm run dev
```

Frontend runs on http://localhost:3000

## Quick Demo Walkthrough

1. Login as admin (`admin@college.edu` / `admin123`)
2. Add students (manually or CSV with columns: `name, email, rollnumber, password`)
3. Create a problem with sample and hidden test cases
4. Create an exam — select problems, allowed students, set time window
5. Login as a student
6. Start the exam — fullscreen will activate, anti-cheat monitoring begins
7. Write code, submit, see results
8. Back in admin panel: view submissions, violations, leaderboard

## Switching to Self-Hosted Judge0

To switch from RapidAPI to a self-hosted Judge0 instance on your VPS:

1. Deploy Judge0 on your VPS (see https://github.com/judge0/judge0)
2. Update backend `.env`:

```
JUDGE0_BASE_URL=http://your-vps-ip:2358
JUDGE0_API_KEY=your-judge0-auth-token
```

The Judge0 service module automatically detects whether you're using RapidAPI or self-hosted based on the URL and sends the correct authentication headers.

## API Routes

| Method | Route | Role | Description |
|--------|-------|------|-------------|
| POST | /api/auth/login | Public | Login |
| GET | /api/auth/me | Any | Get current user |
| POST | /api/admin/students | Admin | Create student |
| POST | /api/admin/students/bulk | Admin | CSV upload students |
| GET | /api/admin/students | Admin | List students |
| POST | /api/admin/problems | Admin | Create problem |
| GET | /api/admin/problems | Admin | List problems |
| GET | /api/admin/problems/:id | Admin | Get problem |
| PUT | /api/admin/problems/:id | Admin | Update problem |
| POST | /api/admin/exams | Admin | Create exam |
| GET | /api/admin/exams | Admin | List exams |
| PUT | /api/admin/exams/:id | Admin | Update exam |
| GET | /api/admin/submissions | Admin | View submissions |
| GET | /api/admin/violations | Admin | View violations |
| GET | /api/exams | Student | Available exams |
| POST | /api/exams/:examId/start | Student | Start exam |
| GET | /api/exams/:examId/problems | Student | Get exam problems |
| POST | /api/exams/:examId/violations | Student | Report violation |
| POST | /api/exams/:examId/auto-submit | Student | Auto-submit exam |
| POST | /api/submissions | Student | Submit code |
| GET | /api/submissions/exam/:examId | Student | Submission history |
| GET | /api/leaderboard/:examId | Any | Leaderboard |
| GET | /api/leaderboard/:examId/export | Admin | Export CSV |

## Environment Variables

### Backend (.env)

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 5000 |
| MONGODB_URI | MongoDB connection string | mongodb://localhost:27017/exam-platform |
| JWT_SECRET | Secret for signing JWTs | (required) |
| JWT_EXPIRES_IN | Token expiry duration | 8h |
| JUDGE0_BASE_URL | Judge0 API base URL | https://judge0-ce.p.rapidapi.com |
| JUDGE0_API_KEY | API key for Judge0 | (required) |
| JUDGE0_API_HOST | RapidAPI host header | judge0-ce.p.rapidapi.com |
| BCRYPT_SALT_ROUNDS | Password hashing rounds | 12 |

### Frontend (.env.local)

| Variable | Description | Default |
|----------|-------------|---------|
| NEXT_PUBLIC_API_URL | Backend API URL | http://localhost:5000/api |
