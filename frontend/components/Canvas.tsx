import { useEffect, useRef, useState } from "react";
import { Code2Icon, ChevronLeft, MessageCircle } from "lucide-react";
import { Game } from "@/draw/Game";
import axios from "axios";
import { HTTP_Backend } from "@/config";
import { MonacoEditor } from "@/app/editor-comp/editor";
import { VoiceChat } from "./VoiceChat";
import { Topbar } from "./Topbar";
import ChatInterface from "@/app/chat/chat";

export type Tool =
  | "pencil"
  | "line"
  | "arrow"
  | "rect"
  | "diamond"
  | "circle"
  | "text"
  | "eraser"
  | "move";

export function Canvas({
  roomId,
  socket,
  username
}: {
  socket: WebSocket;
  roomId: string;
  username: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [game, setGame] = useState<Game>();
  const [selectedTool, setSelectedTool] = useState<Tool>("circle");
  const [language, setLanguage] = useState<"javascript" | "python" | "cpp">("javascript");
  const [showEditor, setShowEditor] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    game?.setTool(selectedTool);
  }, [selectedTool, game]);

  useEffect(() => {
    if (canvasRef.current) {
      const g = new Game(canvasRef.current, roomId, socket);
      setGame(g);

      return () => {
        g.destroy();
      };
    }
  }, [canvasRef, roomId, socket]);

  return (
    <div className="h-screen relative flex overflow-hidden">
      {/* Code Editor */}
      {showEditor && (
        <div className={`h-full fixed w-1/4 left-0 top-0 transform transition-transform duration-300 z-20 overflow-hidden`}>
          <MonacoEditor
            roomId={roomId}
            socket={socket}
            language={language}
            onLanguageChange={setLanguage}
          />
          <button
            onClick={() => setShowEditor(false)}
            className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-black text-white p-3 rounded-full shadow-lg hover:bg-red-700 transition-colors"
          >
            <ChevronLeft />
          </button>
        </div>
      )}

      {/* Code Editor Toggle Button */}
      {!showEditor && (
        <button
          onClick={() => setShowEditor(true)}
          className="fixed left-4 top-4 z-30 bg-black rounded-xl shadow-lg p-3 hover:bg-gray-700 transition-colors"
        >
          <Code2Icon className="w-5 h-5" />
        </button>
      )}

      {/* Chat Interface (Always mounted to persist conversation history & receive incoming messages) */}
      <ChatInterface
        isChatOpen={isChatOpen}
        setIsChatOpen={(open) => {
          setIsChatOpen(open);
          if (open) setUnreadCount(0);
        }}
        socket={socket}
        roomId={roomId}
        username={username}
        onNewMessageWhileClosed={() => setUnreadCount((prev) => prev + 1)}
      />

      {/* Chat Toggle Button with Unread Badge */}
      {!isChatOpen && (
        <button
          onClick={() => {
            setIsChatOpen(true);
            setUnreadCount(0);
          }}
          className="fixed right-4 top-4 z-30 bg-black rounded-xl shadow-lg p-3 hover:bg-gray-800 transition-all active:scale-95 group"
          title="Open DevTalk Chat"
        >
          <div className="relative">
            <MessageCircle className="w-5 h-5 text-white" />
            {unreadCount > 0 && (
              <span className="absolute -top-2.5 -right-2.5 bg-rose-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center shadow-lg border-2 border-black animate-pulse">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </div>
        </button>
      )}

      {/* Voice Chat */}
      <VoiceChat roomId={roomId} socket={socket} isChatOpen={isChatOpen} />

      {/* Canvas and Topbar */}
      <div className={`h-full w-full transition-all duration-300 ${showEditor ? "pl-1/4" : ""} ${isChatOpen ? "pr-1/4" : ""}`}>
        <canvas
          ref={canvasRef}
          width={window.innerWidth}
          height={window.innerHeight}
          className="absolute top-0 left-0"
        />
        <Topbar
          selectedTool={selectedTool}
          setSelectedTool={setSelectedTool}
          game={game}
          roomId={roomId}
        />
      </div>
    </div>
  );
}

export async function clearCanvas(roomId: string) {
  const response = await axios.post(`${HTTP_Backend}/clear`, {
    data: {
      roomId,
    },
  });
  if (response.status === 200) {
    console.log("Canvas cleared successfully!");
    window.location.reload();
  }
}