import { HTTP_Backend } from "@/config";
import axios from "axios";

export async function getExistingShapes(roomId: string) {
    const res = await axios.get(`${HTTP_Backend}/chats/${roomId}`);
    const messages = res.data.messages;

    const shapes = messages
    .map((x: { message: string }) => {
        try {
            const messageData = JSON.parse(x.message);
            return messageData.shape || null;
        } catch (error) {
            console.error("Invalid JSON message:", x.message);
            return null;
        }
    })
    .filter(Boolean); // Remove any null/undefined shapes

    return shapes;
}