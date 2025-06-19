# Dev-Sketch HTTP Backend 🖥️

This is the **HTTP backend** for **Dev-Sketch**, a collaborative platform for **drawing, coding, and chatting** in real-time. The backend handles **authentication, database management, and API requests** for the frontend.

## 🚀 Features
- 🔑 **User Authentication** - Sign up, login, and session management.
- 📁 **User & Room Management** - Handles users and collaborative rooms.
- 🔗 **API for Frontend & WebSockets** - Provides data to the frontend and WebSocket server.

---

## 🛠️ Tech Stack
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL (via Prisma ORM)
- **Authentication**: JWT (JSON Web Token)

---

## 📂 Folder Structure

### `src/`
Contains the main backend source code.  
- `index/` - Logic for handling API requests.
- `middleware/` - Authentication and validation middleware.

### `prisma/`
Database schema and migration files for **PostgreSQL**.

### `.env`
Stores environment variables like database URL, JWT secret, and API keys. *(Ignored in Git for security.)*

---

## 📦 Installation & Setup

### 1️⃣ Clone the Repository  
```sh
git clone https://github.com/RISHIK92/Dev-Sketch.git
cd Dev-Sketch/http-backend
```

### 2️⃣ Install Dependencies
```sh
npm install
```

### 3️⃣ Start the server
```sh
npm run dev
```
