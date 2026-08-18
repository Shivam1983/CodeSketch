"use client";
import { RoomCanvas } from "@/components/RoomCanvas";
import React from "react";
import { useRouter } from "next/navigation";

export default function CanvasPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = React.use(params);
  const router = useRouter();

  if (!roomId || roomId === "undefined" || isNaN(Number(roomId))) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-4">
        <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl max-w-md w-full text-center border border-gray-700">
          <h2 className="text-2xl font-bold text-rose-400 mb-2">Invalid Room</h2>
          <p className="text-gray-300 text-sm mb-6">
            The room identifier is missing, invalid, or could not be found.
          </p>
          <button
            onClick={() => router.push("/join")}
            className="w-full py-3 bg-gradient-to-r from-blue-500 to-teal-500 hover:opacity-95 text-white font-medium rounded-xl transition-all shadow-md active:scale-95"
          >
            Back to Join Room
          </button>
        </div>
      </div>
    );
  }

  return <RoomCanvas roomId={roomId} />;
}

