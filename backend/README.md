# Exam Management System Backend

This is the backend for the online examination system, built with Node.js, Express, and MongoDB.

## Features

- User Management: Students, Educators, Administrators
- Authentication with JWT
- Student: Registration, Profile, Exams, Results
- Educator: Profile, Questions, Exams, Reports

## Installation

1. cd backend
2. npm install
3. Set up MongoDB
4. npm run dev

## API Endpoints

### Auth
- POST /api/auth/register
- POST /api/auth/login

### Students (requires student auth)
- GET /api/students/profile
- PUT /api/students/profile
- GET /api/students/exams
- GET /api/students/results
- GET /api/students/history

### Educators (requires educator auth)
- GET /api/educators/profile
- PUT /api/educators/profile
- POST /api/educators/questions
- GET /api/educators/questions
- POST /api/educators/exams
- GET /api/educators/exams
- GET /api/educators/performance
- GET /api/educators/reports