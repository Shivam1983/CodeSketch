# CodeSketch WebSocket Backend ⚡

This is the **WebSocket backend** for **CodeSketch**, a collaborative platform that enables real-time **drawing, coding, and chatting**. It handles live communication between users for seamless collaboration.

---

## 🚀 Features
- 📡 **Real-Time Communication** - Enables live chat, canvas updates, and code sharing.
- 🎨 **Live Drawing Updates** - Syncs drawings across all connected users instantly.
- 🖥️ **Collaborative Code Editing** - Updates shared code in real-time.
- 🎤 **Voice Chat Support** - Manages voice communication between users.
- 📌 **Room Management** - Users can join, leave, and interact in different rooms.

---

## 🛠️ Tech Stack
- **Backend**: Node.js, Express.js
- **Real-Time Communication**: WebSockets
- **Authentication**: JWT (JSON Web Token)
- **Database**: PostgreSQL (via Prisma ORM)
- **Event Handling**: Websockets for real-time interactions

---

## 📂 Folder Structure

### `src/`
Contains the main source code for handling WebSockets.
- `index` - Manages WebSocket connections and events and handles different real-time events (chat, draw, code).

### `config/`
Configuration files for **server, authentication, and WebSocket settings**.

### `.env`
Stores environment variables like WebSocket port, authentication secrets, etc. *(Ignored in Git for security.)*

---

## 📦 Installation & Setup

### 1️⃣ Clone the Repository  
```sh
git clone https://github.com/Shivam1983/CodeSketch.git
cd CodeSketch/websocket-backend
```
### 2️⃣ Install Dependencies
```sh
pnpm install
```

### 3️⃣ Start the server
```sh
pnpm run dev
```
