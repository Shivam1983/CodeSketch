"use client"
import React, { useState } from 'react';
import { Users, Plus, ArrowLeft, Loader2, Terminal, Code2, Globe2, Sparkles, Zap } from 'lucide-react';
import axios from 'axios';
import { HTTP_Backend } from '@/config';
import { useRouter } from 'next/navigation';

type Mode = 'select' | 'join' | 'create';
type Status = 'idle' | 'loading' | 'success' | 'error';

function App() {
  const [mode, setMode] = useState<Mode>('select');
  const [roomName, setRoomName] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
  
    const token = localStorage.getItem('token');
  
    if (!token) {
      setStatus('error');
      setMessage('User not signed in!');
      setTimeout(() => {
        router.push('/signin');
      }, 1800);
      return;
    }
  
    try {
      const response = await axios.post(
        `${HTTP_Backend}/room`,
        { name: roomName },
        {headers: {
          "Content-Type": "application/json",
          "Authorization": token
      }},
      );
            
      const roomId = response.data.roomId;
      if (response.status === 200) {
        setStatus('success');
        setMessage(`Room ${roomName} has been successfully created!`);
        router.push(`/canvas/${roomId}`);
      } else {
        setStatus('error');
        setMessage('Room name already taken, please try another name.');
      }
    } catch (err) {
      console.log(err);
      setStatus('error');
      setMessage('Internal Server Error, Try Again!');
    }
  };
  

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
  
    const token = localStorage.getItem('token');
  
    if (!token) {
      setStatus('error');
      setMessage('User not signed in!');
      setTimeout(() => {
        router.push('/signin');
      }, 1800);
      return;
    }
  
    try {
      const response = await axios.get(
        `${HTTP_Backend}/room/${roomName}`
      );

      const roomId = response.data.room.id;
  
      if (response.status === 200) {
        setStatus('success');
        setMessage(`You've successfully joined ${roomName}!`);
        router.push(`/canvas/${roomId}`); 
      } else {
        setStatus('error');
        setMessage('Room not found, please check the name or ID.');
      }
    } catch (err) {
      console.log(err);
      setStatus('error');
      setMessage('Room not found');
    }
  };
  

  const resetState = () => {
    setMode('select');
    setRoomName('');
    setStatus('idle');
    setMessage('');
  };

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'text-emerald-500';
      case 'error':
        return 'text-rose-500';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-300 via-teal-50 to-cyan-200 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -inset-[10px] opacity-40">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-rose-200/30 rounded-full blur-[140px] animate-pulse" />
          <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-teal-200/30 rounded-full blur-[140px] animate-pulse delay-75" />
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-cyan-200/30 rounded-full blur-[140px] animate-pulse delay-150" />
        </div>
      </div>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 animate-float-slow">
          <Code2 size={24} className="text-rose-500/40" />
        </div>
        <div className="absolute bottom-20 right-20 animate-float-slower">
          <Sparkles size={28} className="text-teal-400/40" />
        </div>
        <div className="absolute top-20 right-32 animate-float">
          <Globe2 size={32} className="text-cyan-400/40" />
        </div>
      </div>

      <div className="relative z-10 w-full max-w-lg">
        <div className="bg-white/95 backdrop-blur-xl rounded-[3rem] shadow-2xl border border-white">
          {mode === 'select' ? (
            <div className="p-8">
              <div className="relative">
                <div className="absolute -top-20 left-1/2 -translate-x-1/2">
                  <div className="relative">
                    <div className="absolute -inset-4 bg-gradient-to-r from-rose-400 via-teal-400 to-cyan-400 rounded-full blur opacity-50 group-hover:opacity-75 transition animate-tilt"></div>
                    <div className="relative bg-white rounded-full p-6 shadow-lg">
                      <Terminal size={48} className="text-gray-800" />
                    </div>
                  </div>
                </div>
                
                <div className="pt-16 text-center space-y-2">
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-rose-500 via-teal-500 to-cyan-500 bg-clip-text text-transparent">
                    DevSketch
                  </h1>
                  <p className="text-gray-600">Your gateway to collaborative development</p>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-1 gap-4">
                <div className="relative group">
                  <div className="absolute -inset-px bg-gradient-to-r from-rose-400 to-rose-500 rounded-2xl blur-sm opacity-75 group-hover:opacity-100 transition-opacity duration-200"></div>
                  <button onClick={() => setMode('join')} className="relative w-full bg-white rounded-2xl p-6 transition-transform duration-200 group-hover:-translate-y-1">
                    <div className="flex items-center gap-6">
                      <div className="flex-shrink-0">
                        <Users size={28} className="text-rose-500" />
                      </div>
                      <div className="flex-1 text-left">
                        <h3 className="font-semibold text-gray-800 text-lg">Join Existing Room</h3>
                        <p className="text-gray-500 text-sm">Connect with other developers</p>
                      </div>
                      <Zap size={20} className="text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                </div>

                <div className="relative group">
                  <div className="absolute -inset-px bg-gradient-to-r from-teal-400 to-cyan-400 rounded-2xl blur-sm opacity-75 group-hover:opacity-100 transition-opacity duration-200"></div>
                  <button
                    onClick={() => setMode('create')}
                    className="relative w-full bg-white rounded-2xl p-6 transition-transform duration-200 group-hover:-translate-y-1"
                  >
                    <div className="flex items-center gap-6">
                      <div className="flex-shrink-0">
                        <Plus size={28} className="text-teal-500" />
                      </div>
                      <div className="flex-1 text-left">
                        <h3 className="font-semibold text-gray-800 text-lg">Create New Room</h3>
                        <p className="text-gray-500 text-sm">Start a fresh workspace</p>
                      </div>
                      <Zap size={20} className="text-teal-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                </div>
              </div>

              <div className="mt-8 flex items-center justify-center gap-4">
                <div className="flex -space-x-2">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-200 to-rose-300 ring-2 ring-white"
                      style={{
                        transform: `translateX(${i * 2}px)`,
                        zIndex: 4 - i
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 space-y-6">
              <div className="flex items-center gap-4">
                <button
                  onClick={resetState}
                  className="rounded-xl bg-gray-50/50 p-2 text-gray-600 transition-all hover:bg-gray-100/50 hover:text-gray-800"
                >
                  <ArrowLeft size={20} />
                </button>
                <h2 className="text-2xl font-semibold text-gray-800">
                  {mode === 'join' ? 'Join Room' : 'Create Room'}
                </h2>
              </div>

              <form onSubmit={mode === 'join' ? handleJoinRoom : handleCreateRoom} className="space-y-6">
                <div className="space-y-2">
                  <label
                    htmlFor="roomName"
                    className="block text-sm font-medium text-gray-700"
                  >
                    {mode === 'join' ? 'Enter Room Name or ID' : 'Choose Room Name'}
                  </label>
                  <div className="relative group">
                    <div className="absolute -inset-px bg-gradient-to-r from-rose-400 via-teal-400 to-cyan-400 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 blur-sm"></div>
                    <input
                      type="text"
                      id="roomName"
                      value={roomName}
                      onChange={(e) => setRoomName(e.target.value)}
                      className="relative w-full rounded-xl bg-white px-4 py-3 text-gray-700 shadow-sm ring-1 ring-gray-200 placeholder:text-gray-400 focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                      placeholder={mode === 'join' ? 'room-id-123' : 'my-awesome-room'}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="relative w-full group"
                >
                  <div className="absolute -inset-px bg-gradient-to-r from-rose-400 via-teal-400 to-cyan-400 rounded-xl blur-sm opacity-75 group-hover:opacity-100 transition-opacity duration-200"></div>
                  <div className="relative bg-white rounded-xl px-6 py-3 transition-colors group-hover:bg-white/90">
                    <div className="flex items-center justify-center gap-2 bg-gradient-to-r from-rose-500 via-teal-500 to-cyan-500 bg-clip-text text-transparent font-medium">
                      {status === 'loading' ? (
                        <>
                          <Loader2 size={20} className="animate-spin" />
                          <span>Initializing...</span>
                        </>
                      ) : mode === 'join' ? (
                        'Connect to Room'
                      ) : (
                        'Initialize Room'
                      )}
                    </div>
                  </div>
                </button>
              </form>

              {message && (
                <div className={`text-center ${getStatusColor()} bg-white/50 rounded-xl font-medium p-4 shadow-sm ring-1 ring-gray-100`}>
                  {message}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;