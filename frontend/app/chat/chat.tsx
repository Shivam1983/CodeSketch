"use client";

import { X, Send, MessageSquare } from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";

export interface ChatMessage {
  status: "sent" | "received";
  username: string;
  message: string;
  timestamp: number;
}

interface ChatInterfaceProps {
  isChatOpen: boolean;
  setIsChatOpen: (isOpen: boolean) => void;
  socket: WebSocket;
  roomId: string;
  username: string;
  onNewMessageWhileClosed?: () => void;
}

export default function ChatInterface({
  isChatOpen,
  setIsChatOpen,
  socket,
  roomId,
  username,
  onNewMessageWhileClosed,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(`codesketch_chat_${roomId}`);
        if (stored) {
          return JSON.parse(stored);
        }
      } catch (e) {
        console.warn("Failed to load cached chat messages:", e);
      }
    }
    return [];
  });

  const [input, setInput] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isChatOpenRef = useRef<boolean>(isChatOpen);

  useEffect(() => {
    isChatOpenRef.current = isChatOpen;
    if (isChatOpen) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [isChatOpen]);

  // Save messages to localStorage whenever messages change
  const saveMessages = useCallback(
    (newMessages: ChatMessage[]) => {
      setMessages(newMessages);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(`codesketch_chat_${roomId}`, JSON.stringify(newMessages));
        } catch (e) {
          console.warn("Failed to save chat to localStorage:", e);
        }
      }
    },
    [roomId]
  );

  useEffect(() => {
    const handleMessage = (m: MessageEvent) => {
      try {
        const data =
          typeof m.data === "string" ? JSON.parse(m.data) : JSON.parse(m.data.toString());

        // Handle initial chat history from server
        if (data.type === "chat_history" && data.roomId === roomId && Array.isArray(data.messages)) {
          const formattedHistory: ChatMessage[] = data.messages.map(
            (item: { username: string; msg: string; timestamp?: number }) => ({
              status: item.username === username ? "sent" : "received",
              username: item.username === username ? "me" : item.username,
              message: item.msg,
              timestamp: item.timestamp || Date.now(),
            })
          );

          saveMessages(formattedHistory);
          return;
        }

        // Handle incoming single message
        if (data.type === "messages" && data.roomId === roomId && data.msg) {
          const newMsg: ChatMessage = {
            status: data.status,
            username: data.username,
            message: data.msg,
            timestamp: data.timestamp || Date.now(),
          };

          setMessages((prev) => {
            const updated = [...prev, newMsg];
            if (typeof window !== "undefined") {
              try {
                localStorage.setItem(`codesketch_chat_${roomId}`, JSON.stringify(updated));
              } catch (e) {
                console.warn("Failed to save chat to localStorage:", e);
              }
            }
            return updated;
          });

          // If chat panel is closed and message is received from other user, increment unread counter
          if (!isChatOpenRef.current && data.status === "received") {
            onNewMessageWhileClosed?.();
          }

          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
          }, 50);
        }
      } catch (err) {
        console.error("Error parsing chat message:", err);
      }
    };

    socket.addEventListener("message", handleMessage);

    return () => {
      socket.removeEventListener("message", handleMessage);
    };
  }, [socket, roomId, username, saveMessages, onNewMessageWhileClosed]);

  const handleSendMessage = () => {
    if (!input.trim()) return;

    if (socket.readyState === WebSocket.OPEN) {
      socket.send(
        JSON.stringify({
          type: "messages",
          roomId,
          username,
          msg: input.trim(),
        })
      );
    }
    setInput("");
  };

  const formatTime = (ts: number) => {
    try {
      const date = new Date(ts);
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  return (
    <div
      className={`h-screen fixed top-0 right-0 w-80 md:w-96 flex flex-col bg-white/95 backdrop-blur-md z-40 border-l border-gray-200 shadow-2xl transition-all duration-300 ease-in-out ${
        isChatOpen ? "translate-x-0 opacity-100" : "translate-x-full opacity-0 pointer-events-none"
      }`}
    >
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-3.5 bg-gray-900 text-white border-b border-gray-800 shadow-sm">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-gray-800 rounded-lg">
            <MessageSquare className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-wide">DevTalk</h2>
            <p className="text-[10px] text-gray-400">Room #{roomId}</p>
          </div>
        </div>
        <button
          onClick={() => setIsChatOpen(false)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          title="Close Chat"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 space-y-2">
            <MessageSquare className="w-10 h-10 opacity-30 text-gray-400" />
            <p className="text-xs font-medium">No messages yet.</p>
            <p className="text-[11px] text-gray-400">Start the conversation with your team!</p>
          </div>
        ) : (
          messages.map((message, index) => {
            const isMe = message.status === "sent";
            return (
              <div
                key={index}
                className={`flex flex-col ${isMe ? "items-end" : "items-start"} space-y-1`}
              >
                <div className="flex items-center space-x-1 px-1">
                  <span className="text-[10px] font-semibold text-gray-500">
                    {isMe ? "You" : message.username}
                  </span>
                  {message.timestamp && (
                    <span className="text-[9px] text-gray-400">
                      • {formatTime(message.timestamp)}
                    </span>
                  )}
                </div>

                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed shadow-sm break-words ${
                    isMe
                      ? "bg-gray-900 text-white rounded-br-none"
                      : "bg-white text-gray-900 border border-gray-200 rounded-bl-none"
                  }`}
                >
                  {message.message}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 bg-white border-t border-gray-200">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white transition-all"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="p-2 bg-gray-900 text-white rounded-xl hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95"
            title="Send Message"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
};