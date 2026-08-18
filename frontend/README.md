# Dev-Sketch Frontend 🎨

Welcome to **Dev-Sketch**, a collaborative platform where users can **draw, code, and chat** in real-time. This is the **frontend** part of the project, built using **React & Next.js**.

## 🚀 Features
- 🎨 **Real-time Canvas** - Draw and collaborate with others.
- 💬 **Chat System** - Communicate with other users while drawing.
- 🖥️ **Code Editor** - Share and edit code in real-time.
- 🎤 **Voice Chat** Talk with team members.

## 🛠️ Tech Stack
- **Frontend**: Next.js, React, TypeScript
- **Styling**: Tailwind CSS
- **Real-Time**: WebSockets
- **Auth & DB connection**: Node

---

## 📂 Folder Structure

### `app/`
Contains all the **Next.js pages and components**.  
- `page.tsx` - The home page.
- `canvas/` - The collaborative drawing canvas.
- `chat/` - The chat system for real-time communication.
- `editor-comp/` - The collaborative code editor.
- `join/`, `signin/`, `signup/` - Authentication pages.

### `components/`
Reusable **UI components** used across the app.
- `AuthPage.tsx` - Handles authentication UI.
- `Canvas.tsx` - Main drawing canvas component.
- `DrawingToolbar.tsx` - Toolbar for canvas tools (pen, eraser, etc.).
- `Topbar.tsx` - Toolbar for canvas drawing modes.
- `RoomCanvas.tsx` - Manages real-time drawing sessions.
- `VoiceChat.tsx` - Voice chat integration.

### `config/`
Configuration files for different **services and integrations**.
- `monaco.config.ts` - Configures the Monaco code editor.

### `draw/`
Contains core **drawing-related logic**.
- `Game.ts` - Handles the game logic for collaborative drawing.
- `http.ts` - Handles network requests related to drawing.

### `public/`
Static assets such as icons and images.
- `file.svg`, `globe.svg`, `next.svg`, etc.

### `node_modules/`
Contains all **installed dependencies**. (Ignored in Git)

### `config.ts`
Main **configuration file** for the app.

### `next.config.ts`
Next.js **configuration file**.

### `tailwind.config.ts`
Configuration for **Tailwind CSS styling**.

### `tsconfig.json`
Configuration for **TypeScript**.

---

## 📦 Installation & Setup

### 1️⃣ Clone the Repository
```sh
git clone https://github.com/RISHIK92/Dev-Sketch.git
cd Dev-Sketch/frontend
```

### 2️⃣ Install Dependencies
```sh
npm install
```
### 3️⃣ Start the server
```sh
npm run dev
```
