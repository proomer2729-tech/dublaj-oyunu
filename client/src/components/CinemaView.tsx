'use client';

import { useEffect, useRef, useState } from 'react';
import { getSocket } from '../lib/socket';
import { motion, AnimatePresence } from 'framer-motion';

const EMOJIS = ['😂', '🔥', '👏', '🌶️', '❤️'];

export default function CinemaView({ room }: { room: any }) {
  const socket = getSocket();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [reactions, setReactions] = useState<{id: string, emoji: string, x: number}[]>([]);

  useEffect(() => {
    socket.on('sync_video', (data: any) => {
      if (!videoRef.current) return;
      
      if (data.action === 'play') {
        videoRef.current.currentTime = data.currentTime;
        videoRef.current.play().catch(e => console.log(e));
      } else if (data.action === 'pause') {
        videoRef.current.currentTime = data.currentTime;
        videoRef.current.pause();
      }
    });

    socket.on('new_reaction', (data: any) => {
      const newReaction = {
        id: Math.random().toString(),
        emoji: data.emoji,
        x: Math.random() * 80 + 10, // 10% to 90% horizontal position
      };
      setReactions(prev => [...prev, newReaction]);
      
      // Remove reaction after animation
      setTimeout(() => {
        setReactions(prev => prev.filter(r => r.id !== newReaction.id));
      }, 3000);
    });

    return () => {
      socket.off('sync_video');
      socket.off('new_reaction');
    };
  }, []);

  const handlePlay = () => {
    if (videoRef.current) {
      socket.emit('video_control', { roomCode: room.code, action: 'play', currentTime: videoRef.current.currentTime });
    }
  };

  const handlePause = () => {
    if (videoRef.current) {
      socket.emit('video_control', { roomCode: room.code, action: 'pause', currentTime: videoRef.current.currentTime });
    }
  };

  const sendReaction = (emoji: string) => {
    socket.emit('send_reaction', { roomCode: room.code, emoji });
  };

  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] p-6">
      <div className="w-full max-w-5xl relative">
        <div className="bg-black rounded-2xl overflow-hidden border-4 border-slate-800 shadow-2xl shadow-pink-500/10 relative">
          <video
            ref={videoRef}
            src={room.finalVideoUrl}
            className="w-full max-h-[70vh] object-contain bg-black"
            controls
            onPlay={handlePlay}
            onPause={handlePause}
            autoPlay
          />
          
          {/* Reaction Overlay */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <AnimatePresence>
              {reactions.map((r) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 1, y: '100%', x: `${r.x}%`, scale: 0.5 }}
                  animate={{ opacity: 0, y: '-20%', scale: 2 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 2.5, ease: 'easeOut' }}
                  className="absolute bottom-0 text-5xl"
                >
                  {r.emoji}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Reaction Bar */}
        <div className="mt-8 flex justify-center gap-4 bg-slate-800 p-4 rounded-full w-max mx-auto border border-slate-700">
          {EMOJIS.map(emoji => (
            <button
              key={emoji}
              onClick={() => sendReaction(emoji)}
              className="text-3xl hover:scale-125 transition-transform p-2"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
