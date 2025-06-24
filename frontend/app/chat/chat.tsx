import { X, Send } from "lucide-react";
import { useEffect } from "react";
import { useState } from "react";

interface ChatInterfaceProps {
  isChatOpen: boolean;
  setIsChatOpen: (isOpen: boolean) => void;
  socket: WebSocket,
  roomId: string,
  username: string
}

export default function ChatInterface({ setIsChatOpen, socket, roomId, username }:ChatInterfaceProps) {
  const [messages, setMessages] = useState<{ status: string,username: string, message: string }[]>([]);
  const [input, setInput] = useState<string>("");

  useEffect(() => {
    const handleMessage = (m: MessageEvent) => {
      const data = JSON.parse(m.data);
      setMessages((prev) => [...prev, { status: data.status, username: data.username, message: data.msg }]);
    };
  
    socket.addEventListener("message", handleMessage);
  
    return () => {
      socket.removeEventListener("message", handleMessage);
    };
  }, [socket]);

  const handleSendMessage = () => {
    socket.send(JSON.stringify({
        type: "messages",
        roomId: roomId,
        username: username,
        msg: input
    }))
    setInput("")
  };
  return (
    <div className="h-screen fixed top-0 right-0 w-1/4 flex flex-col bg-white/90 backdrop-blur-sm z-30 border border-gray-100">
      {/* Header */}
      <div className="flex justify-between items-center p-4 bg-white border-b border-gray-100">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-800 via-gray-600 to-gray-800 bg-clip-text text-transparent tracking-wide drop-shadow-sm">
            DevTalk
        </h2>
        <button
          onClick={() => setIsChatOpen(false)}
          className="text-gray-500 hover:text-gray-700 transition-colors"
        >
          <X className="h-6 w-6" />
        </button>
      </div>
      
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-gray-200 bg-transparent">
        {messages.map((message, index) => (
          <div key={index} className={`animate-fadeIn ${message.status === "sent" ? "flex justify-end" : "flex justify-start"}`}>
            <div className="max-w-[80%] space-y-1">
              <p className="text-xs font-medium text-gray-500 px-2">
                {message.username}
              </p>
              <div className={`
                rounded-xl px-4 py-2
                ${message.status === "sent" 
                  ? "bg-black text-cyan-50" 
                  : "bg-white text-black border border-rose-50"}
              `}>
                <p className="text-base leading-relaxed">{message.message}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-100">
        <form onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }} className="flex gap-2">
          <input
            type="text"
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-200 transition-colors"
          />
          <button 
            type="submit" 
            className="p-3 rounded-xl bg-black text-white hover:bg-rose-200 focus:outline-none focus:ring-2 focus:ring-rose-200 transition-all duration-200"
          >
            <Send className="h-5 w-5" />
          </button>
        </form>
      </div>
    </div>
  );
};