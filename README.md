# RemindMe - Smart Task Manager

A modern, full-stack reminder application with secure authentication and persistent cloud storage.

## ✨ Key Features

- **Backend Persistence**: Your tasks are stored securely in MongoDB, ensuring they're never lost.
- **User Isolation**: Private accounts where each user sees only their own reminders.
- **Flexible Login**:
  - Standard Email/Password with OTP verification.
  - One-click **Google Sign-In**.
  - **Apple Sign-In** support.
- **Smart UI**: 
  - Real-time task syncing.
  - Intelligent auth error alerts (auto-hiding and specific messaging).
  - Modern dark/light mode surface.

## 🚀 Tech Stack

- **Frontend**: React, Vite, Tailwind CSS, Lucide Icons, Framer Motion.
- **Backend**: Node.js, Express, Mongoose (MongoDB).
- **Security**: JWT (JSON Web Tokens), Bcryptjs for password hashing.

## 🛠 Setup Instructions

### 1. Backend Configuration
Create a `.env` file in the `backend/` directory with the following:
```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
PORT=5000
GOOGLE_CLIENT_ID=your_google_id
APPLE_CLIENT_ID=your_apple_id
```

### 2. Installation
Install dependencies for both frontend and backend:
```bash
# In the root directory
npm install

# In the backend directory
cd backend
npm install
```

### 3. Running the App
Start both servers simultaneously:

**Backend:**
```bash
cd backend
npm run dev
```

**Frontend:**
```bash
# In the root directory
npm run dev
```

## 📝 Database Reset
To clear the database and start fresh:
```bash
cd backend
node resetDb.js
```
