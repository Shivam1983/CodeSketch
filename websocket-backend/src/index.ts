import { WebSocket, WebSocketServer } from 'ws';
import jwt, { JwtPayload } from "jsonwebtoken";
// import { JWT_SECRET } from '@repo/backend-common/config';
import { PrismaClient } from "@prisma/client";

const prismaClient = new PrismaClient(); // Note the .js extension  // Adjust if necessary based on the folder structure


import dotenv from 'dotenv';
dotenv.config({ path: './config.env' });

const JWT_SECRET = process.env.JWT_SECRET || "123123";

interface User {
  ws: WebSocket;
  rooms: string[];
  userId: string;
}

interface Room {
  clients: Set<WebSocket>;
  users: Set<string>;
}

interface ChatHistoryItem {
  username: string;
  msg: string;
  timestamp: number;
}

const users: User[] = [];
const rooms = new Map<string, Room>();
const roomChatHistory = new Map<string, ChatHistoryItem[]>();

function checkUser(token: string): string | null {
  try {
    console.log("🔍 Verifying Token:", token);
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    console.log("Decoded JWT Payload:", decoded);

    if (!decoded || typeof decoded === "string" || !decoded.userid) {
      console.log("Token Invalid: Missing userId");
      return null;
    }

    return decoded.userid;
  } catch (e) {
    console.log("JWT Verification Failed:", e);
    return null;
  }
}

const PORT = Number(process.env.PORT) || 8080;
const wss = new WebSocketServer({ port: PORT });
console.log(`WebSocket server running on port ${PORT}`);

wss.on("connection", function connection(ws, request) {
  const url = request.url;
  if (!url) return;

  const queryParams = new URLSearchParams(url.split("?")[1]);
  const token = queryParams.get("token") || "";
  const userId = checkUser(token);

  if (userId == null) {
    ws.close();
    return;
  }

  users.push({
    userId,
    rooms: [],
    ws,
  });

  ws.on("message", async function message(data) {
    let parsedData;
    if (typeof data !== "string") {
      parsedData = JSON.parse(data.toString());
    } else {
      parsedData = JSON.parse(data);
    }

    const { type, roomId } = parsedData;

    switch (type) {
      case "join_room": {
        const user = users.find((x) => x.ws === ws);
        if (user) {
          user.rooms.push(roomId);
        }

        if (!rooms.has(roomId)) {
          rooms.set(roomId, {
            clients: new Set(),
            users: new Set()
          });
        }
        const room = rooms.get(roomId)!;
        room.clients.add(ws);
        room.users.add(userId);

        console.log(`Client ${userId} joined room ${roomId}. Total clients: ${room.clients.size}`);

        // Send existing conversation history for this room to the joining client
        if (roomChatHistory.has(roomId)) {
          const history = roomChatHistory.get(roomId)!;
          ws.send(JSON.stringify({
            type: "chat_history",
            roomId,
            messages: history
          }));
        }
        break;
      }

      case "leave_room": {
        const user = users.find((x) => x.ws === ws);
        if (!user) return;
        user.rooms = user.rooms.filter((x) => x !== roomId);

        const room = rooms.get(roomId);
        if (room) {
          room.clients.delete(ws);
          room.users.delete(userId);
          if (room.clients.size === 0) {
            rooms.delete(roomId);
          }
        }
        break;
      }

      case "offer":
      case "answer":
      case "ice-candidate":
      case "hang_up":
      case "reject_call": {
        const room = rooms.get(roomId);
        if (room) {
          room.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              console.log(`Relaying ${type} to peer in room ${roomId}`);
              client.send(JSON.stringify(parsedData));
            }
          });
        }
        break;
      }

      case "code_change": {
        const { code } = parsedData;
        users.forEach((u) => {
          if (u.rooms.includes(roomId) && u.ws !== ws) {
            u.ws.send(JSON.stringify({ type: "code_change", code, roomId }));
          }
        });
        break;
      }

      case "messages": {
        if (!parsedData.msg || !parsedData.msg.trim()) break;
        const msgText = parsedData.msg.trim();
        const senderName = parsedData.username || "Anonymous";
        const timestamp = Date.now();

        // Save to in-memory room conversation history (keep latest 300 messages)
        if (!roomChatHistory.has(roomId)) {
          roomChatHistory.set(roomId, []);
        }
        const history = roomChatHistory.get(roomId)!;
        history.push({
          username: senderName,
          msg: msgText,
          timestamp
        });
        if (history.length > 300) {
          history.shift();
        }

        users.forEach((user) => {
          try {
            if (user.rooms.includes(roomId) && user.ws.readyState === WebSocket.OPEN) {
              const messagePayload = {
                type: "messages",
                status: user.ws === ws ? "sent" : "received",
                username: user.ws === ws ? "me" : senderName,
                rawSender: senderName,
                msg: msgText,
                roomId,
                timestamp
              };
              user.ws.send(JSON.stringify(messagePayload));
            }
          } catch (error) {
            console.error("Error sending message to user:", user, error);
          }
        });
        break;
      }

      case "chat": {
        const { message } = parsedData;
        console.log("room id", roomId, "message", message, "user id", userId);

        const existingUser = await prismaClient.user.findUnique({
          where: { id: userId }
        });

        if (!existingUser) {
          console.log("User does not exist, aborting chat creation");
          return;
        }

        await prismaClient.chat.create({
          data: {
            roomId: Number(roomId),
            message,
            userId
          }
        });

        users.forEach(user => {
          if (user.rooms.includes(roomId)) {
            user.ws.send(JSON.stringify({
              type: "chat",
              message: message,
              roomId
            }));
          }
        });
        break;
      }
    }
  });

  ws.on("close", () => {
    const user = users.find((x) => x.ws === ws);
    if (!user) return;

    user.rooms.forEach(roomId => {
      const room = rooms.get(roomId);
      if (room) {
        room.clients.delete(ws);
        room.users.delete(userId);
        if (room.clients.size === 0) {
          rooms.delete(roomId);
        }
        console.log(`Client ${userId} left room ${roomId}. Total clients: ${room.clients.size}`);
      }
    });

    const userIndex = users.findIndex((x) => x.ws === ws);
    if (userIndex > -1) {
      users.splice(userIndex, 1);
    }
  });
});