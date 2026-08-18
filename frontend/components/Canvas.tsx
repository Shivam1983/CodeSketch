import { useEffect, useRef, useState } from "react";
import { Code2Icon, ChevronLeft, MessageCircle } from "lucide-react";
import { Game } from "@/draw/Game";
import axios from "axios";
import { HTTP_Backend } from "@/config";
import { MonacoEditor } from "@/app/editor-comp/editor";
import { VoiceChat } from "./VoiceChat";
import { Topbar } from "./Topbar";
import ChatInterface from "@/app/chat/chat";

export type Tool = "circle" | "rect" | "pencil" | "eraser" | "move";

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

      {/* Chat Interface */}
      {isChatOpen && (
        <div className={`h-4/5 fixed w-1/4 right-0 top-0 transform transition-transform duration-300 z-20 overflow-hidden`}>
          <ChatInterface isChatOpen={isChatOpen} setIsChatOpen={setIsChatOpen} socket={socket} roomId={roomId} username={username}/>
        </div>
      )}

      {/* Chat Toggle Button */}
      {isChatOpen && (
      <ChatInterface 
        isChatOpen={isChatOpen} 
        setIsChatOpen={setIsChatOpen} 
        socket={socket} 
        roomId={roomId} 
        username={username}
      />
    )}

    {/* Chat Toggle Button */}
    {!isChatOpen && (
      <button
        onClick={() => setIsChatOpen(true)}
        className="fixed right-4 top-4 z-30 bg-black rounded-xl shadow-lg p-3 hover:bg-gray-700 transition-colors"
      >
        <MessageCircle className="w-5 h-5 text-white" />
      </button>
    )}

      {/* Voice Chat */}
      {!isChatOpen && (
        <VoiceChat roomId={roomId} socket={socket} />
      )}

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