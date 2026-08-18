# Dev-Sketch 

**Dev-Sketch** is a collaborative platform that allows users to **draw, code, and chat** in real-time. It provides a seamless experience for teams to work together on sketches, share and edit code, and communicate via text or voice chat.

Live Link - https://dev-sketch-frontend.vercel.app/

---

## Features
-  **Real-time Canvas** - Draw and collaborate with others live.
-  **Live Chat System** - Communicate via text while working.
-  **Code Editor** - Share and edit code in real-time.
-  **Voice Chat** - Talk with teammates while collaborating.
-  **Room Management** - Create and join different collaboration rooms.

---

## Tech Stack
- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Backend**:
  - **HTTP Backend**: Node.js, Express.js, Prisma (PostgreSQL)
  - **WebSocket Backend**: Websockets and WebRTC
- **Authentication**: JWT (JSON Web Token)
- **Database**: PostgreSQL (via Prisma ORM)
- **Package Manager**: pnpm and npm

---

## Folder Structure

### `frontend/` ([View Repository](https://github.com/RISHIK92/Dev-Sketch/tree/main/frontend))
This folder contains the **React & Next.js frontend** for Dev-Sketch.  
- Built using **Next.js, React, TypeScript**.  
- Implements **real-time drawing, code sharing, and chat**.  
- Uses **WebSockets** for live updates.  

### `http-backend/` ([View Repository](https://github.com/RISHIK92/Dev-Sketch/tree/main/http-backend))
This is the **HTTP API backend** of Dev-Sketch.  
- Built using **Node.js, Express, Prisma**.  
- Handles **user authentication, database interactions, and API requests**.
- Manages **user profiles, project data, and authentication**.  

### `websocket-backend/` ([View Repository](https://github.com/RISHIK92/Dev-Sketch/tree/main/websocket-backend))
This is the **WebSocket backend** for real-time features.  
- Uses **Socket.io** for live communication.  
- Manages **real-time drawing, code collaboration, and chat events**.  
- Ensures seamless **room-based collaboration**.  

---
## 📢 Contributing
Contributions are welcome! Feel free to submit issues or pull requests to improve Dev-Sketch.
&nbsp;
&nbsp;
## Installation & Setup

### 1️⃣ Clone the Repository
```sh
git clone https://github.com/RISHIK92/Dev-Sketch.git
cd Dev-Sketch
```
🔎 Visit each folder's README for a more detailed view of what each folder does:

## Folder Details

- [Frontend README](https://github.com/RISHIK92/Dev-Sketch/tree/main/frontend)  
- [HTTP Backend README](https://github.com/RISHIK92/Dev-Sketch/tree/main/http-backend)  
- [WebSocket Backend README](https://github.com/RISHIK92/Dev-Sketch/tree/main/websocket-backend)
  
&nbsp;
&nbsp;
&nbsp;
&nbsp;

This README gives a **clear overview** of the entire project. Let me know if you need any edits! 😊
