import { HTTP_Backend } from "@/config";
import axios from "axios";

export async function getExistingShapes(roomId: string) {
  if (!roomId || roomId === "undefined" || isNaN(Number(roomId))) {
    return [];
  }
  try {
    const res = await axios.get(`${HTTP_Backend}/chats/${roomId}`);
    const messages = res.data.messages || [];

    let currentShapes: any[] = [];

    messages.forEach((x: { message: string }) => {
      try {
        const messageData = JSON.parse(x.message);
        if (messageData.type === "update" && Array.isArray(messageData.shapes)) {
          currentShapes = messageData.shapes;
        } else if (messageData.shape) {
          currentShapes.push(messageData.shape);
        }
      } catch (error) {
        console.error("Invalid JSON message in shape history:", x.message);
      }
    });

    return currentShapes;
  } catch (err) {
    console.error("Error fetching existing shapes:", err);
    return [];
  }
}