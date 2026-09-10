QuizAI -- AI-Powered Online Quiz Platform

QuizAI is a full-stack online quiz application that allows users to
create and take quizzes, track results, view leaderboards, and manage
their accounts. The application uses a React/Vite frontend,
Node.js/Express backend, MongoDB database, JWT authentication, email
OTP-based password reset, and AI-powered quiz functionality through
OpenRouter.

🚀 Live Demo

QuizAI:
https://frontend-livid-delta-frb6gfpv8o.vercel.app

📂 GitHub Repository

https://github.com/penjuruvenkatajaswanth-2004/online-quiz-ai

✨ Features

User registration and login

JWT-based authentication

Forgot password with email OTP verification

Secure password reset flow

Create and take online quizzes

AI-assisted quiz functionality

Quiz results and score tracking

Leaderboard

Leaderboard filtering by time period

Personalized welcome experience

Responsive and modern user interface

MongoDB-based data storage

REST API backend

Production deployment with Vercel

🛠️ Tech Stack

Frontend

React 19

Vite

JavaScript

HTML5

CSS3

Backend

Node.js

Express.js

Mongoose

JWT

Nodemailer

Database

MongoDB

AI

OpenRouter API

Deployment

Vercel

🏗️ Project Structure

online-quiz-ai/
├── backend/
│   ├── config/
│   │   └── db.js
│   ├── models/
│   │   ├── OTP.js
│   │   ├── Question.js
│   │   ├── Quiz.js
│   │   ├── Result.js
│   │   └── User.js
│   ├── .env
│   ├── package.json
│   └── server.js
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
│
├── Dockerfile
├── .dockerignore
└── README.md

⚙️ Local Setup

1. Clone the repository

git clone https://github.com/penjuruvenkatajaswanth-2004/online-quiz-ai.git
cd online-quiz-ai

2. Install backend dependencies

cd backend
npm install

3. Install frontend dependencies

Open another terminal:

cd frontend
npm install

4. Configure environment variables

Create a .env file inside the backend directory:

MONGO_URI=your_mongodb_connection_string
PORT=5000
JWT_SECRET=your_jwt_secret
OPENROUTER_API_KEY=your_openrouter_api_key
EMAIL_USER=your_gmail_address
EMAIL_PASS=your_google_app_password

Never commit .env or expose API keys, passwords, JWT secrets, or
database credentials.

5. Start the backend

From the backend directory:

npm start

The backend runs on:

http://localhost:5000

6. Start the frontend

From the frontend directory:

npm run dev

Vite will provide the local frontend URL in the terminal.

🔐 Authentication & Password Reset

QuizAI uses JWT-based authentication for protected application features.

The forgot-password flow works as follows:

User enters their registered email.

The backend generates a verification OTP.

The OTP is sent through Gmail using Nodemailer.

The OTP is stored in MongoDB with an expiration mechanism.

The user verifies the OTP.

The password can then be reset securely.

Google App Passwords are used for Gmail SMTP authentication rather than
a regular Gmail password.

🤖 AI Integration

QuizAI uses the OpenRouter API for AI-powered functionality.

The API key is configured through the backend environment variable:

OPENROUTER_API_KEY=your_openrouter_api_key

Keep this key private and never expose it in frontend code or source
control.

🐳 Docker

The project includes a root-level Dockerfile for running the application
as a unified production container.

Build the image:

docker build -t quiz-ai-app .

Run the container:

docker run --name quiz-ai-test -p 5000:5000 --env-file backend/.env quiz-ai-app:latest

Then open:

http://localhost:5000

🌐 Deployment

The production application uses separate Vercel deployments:

Frontend: React/Vite application

Backend: Node.js/Express API

The frontend uses:

VITE_API_URL=https://online-quiz-ai-backend.vercel.app

The backend provides the API and health endpoint:

https://online-quiz-ai-backend.vercel.app/api/health

📌 Environment Variables

Variable               Purpose

MONGO_URI            MongoDB connection string
PORT                 Backend server port
JWT_SECRET           JWT signing secret
OPENROUTER_API_KEY   OpenRouter AI API key
EMAIL_USER           Gmail account used for OTP emails
EMAIL_PASS           Google App Password for Gmail SMTP
VITE_API_URL         Public backend URL used by the frontend

🔒 Security Notes

Sensitive environment variables are kept outside source control.

.env files should not be committed to GitHub.

Gmail uses a Google App Password for SMTP.

Backend secrets are stored in Vercel environment variables.

Frontend VITE_* variables are public by design, so they must never
contain secrets.

📈 Future Improvements

Advanced quiz analytics

More detailed user statistics

Question difficulty levels

Quiz categories and search

Admin dashboard

More AI-generated quiz features

Improved leaderboard time-period filtering

Additional authentication options

👨‍💻 Author

Penjuru Venkata Jaswanth

Computer Science & Engineering

Project Links

Live Demo: https://frontend-livid-delta-frb6gfpv8o.vercel.app

GitHub:
https://github.com/penjuruvenkatajaswanth-2004/online-quiz-ai

⭐ If you find this project useful, consider giving the repository a
star.
