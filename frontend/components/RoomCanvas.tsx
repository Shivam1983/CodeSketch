"use client";

import { WS_URL } from "@/config";
import { useRef, useEffect, useState } from "react";
import { Canvas } from "./Canvas";
import ErrorPage from "./Error";

export function RoomCanvas({ roomId }: { roomId: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] =  useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedToken = localStorage.getItem("token");
      const username = localStorage.getItem("username");
      setUsername(username);
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
          roomId
        });
        console.log(data);
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
    return <div className="text-black">Connecting to server...</div>;
  }

  return (
    <div className="overflow-hidden h-full w-full fixed">
      <Canvas roomId={roomId} socket={socket} username={username || "Guest"} />
      <canvas ref={canvasRef} width={window.innerWidth} height={window.innerHeight}></canvas>
    </div>
  );
}