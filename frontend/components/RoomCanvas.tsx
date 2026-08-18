"use client";

import { WS_URL } from "@/config";
import { useEffect, useState } from "react";
import { Canvas } from "./Canvas";
import ErrorPage from "./Error";

export function RoomCanvas({ roomId }: { roomId: string }) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedToken = localStorage.getItem("token");
      const storedUsername = localStorage.getItem("username");
      setUsername(storedUsername);
      setToken(storedToken);
    }
  }, []);

  useEffect(() => {
    if (token) {
      const ws = new WebSocket(`${WS_URL}?token=${token}`);

      ws.onopen = () => {
        setSocket(ws);
        const data = JSON.stringify({
          type: "join_room",
          roomId,
        });
        ws.send(data);
      };

      return () => {
        ws.close();
      };
    }
  }, [token, roomId]);

  if (token === null) {
    return <ErrorPage />;
  }

  if (!socket) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-950 text-gray-300 font-medium">
        Connecting to collaborative server...
      </div>
    );
  }

  return (
    <div className="overflow-hidden h-full w-full fixed">
      <Canvas roomId={roomId} socket={socket} username={username || "Guest"} />
    </div>
  );
}