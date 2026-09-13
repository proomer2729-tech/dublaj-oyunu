'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSocket } from '../lib/socket';
import { Mic, Users, Video } from 'lucide-react';
import { motion } from 'framer-motion';

const AVATARS = ['😎', '🤡', '🤠', '👽', '👻', '🤖'];

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [roomCode, setRoomCode] = useState(searchParams.get('code') || '');
  const [error, setError] = useState('');

  const handleCreateRoom = () => {
    if (!nickname.trim()) {
      setError('Lütfen bir takma ad girin!');
      return;
    }
    const socket = getSocket();
    socket.emit('create_room', { nickname, avatar }, (res: any) => {
      if (res.success) {
        router.push(`/room?code=${res.roomCode}`);
      }
    });
  };

  const handleJoinRoom = () => {
    if (!nickname.trim()) {
      setError('Lütfen bir takma ad girin!');
      return;
    }
    if (!roomCode.trim() || roomCode.length !== 6) {
      setError('Lütfen 6 haneli geçerli bir oda kodu girin!');
      return;
    }
    const socket = getSocket();
    socket.emit('join_room', { roomCode: roomCode.toUpperCase(), nickname, avatar }, (res: any) => {
      if (res.success) {
        router.push(`/room?code=${res.roomCode}`);
      } else {
        setError(res.message);
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="text-6xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-500 flex items-center justify-center gap-4">
          <Mic size={48} className="text-pink-500" />
          Dublajer.ioi
        </h1>
        <p className="text-xl text-slate-400">Arkadaşlarınla efsane sahneleri yeniden seslendir!</p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-slate-800 p-8 rounded-2xl shadow-2xl max-w-md w-full border border-slate-700"
      >
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-400 mb-2">Avatar Seç</label>
          <div className="flex justify-between">
            {AVATARS.map((a) => (
              <button
                key={a}
                onClick={() => setAvatar(a)}
                className={`text-3xl p-2 rounded-xl transition-all ${avatar === a ? 'bg-slate-700 ring-2 ring-pink-500 scale-110' : 'hover:bg-slate-700'}`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-400 mb-2">Takma Ad</label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-colors"
            placeholder="Kaptan Dublaj"
            maxLength={15}
          />
        </div>

        {error && (
          <div className="mb-4 text-red-400 text-sm text-center bg-red-900/20 py-2 rounded-lg">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={handleCreateRoom}
            className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-pink-500/20"
          >
            <Video size={20} />
            Yeni Oda Kur
          </button>
          
          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-slate-700"></div>
            <span className="flex-shrink-0 mx-4 text-slate-500 text-sm">VEYA</span>
            <div className="flex-grow border-t border-slate-700"></div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              className="flex-grow bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500 text-center font-mono tracking-widest uppercase"
              placeholder="6 HANELİ KOD"
              maxLength={6}
            />
            <button
              onClick={handleJoinRoom}
              className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-6 rounded-xl transition-colors flex items-center gap-2"
            >
              <Users size={20} />
              Katıl
            </button>
          </div>
        </div>
      </motion.div>

      {/* Share Button */}
      <button 
        onClick={async (e) => {
          const btn = e.currentTarget;
          const originalText = btn.innerText;
          btn.innerText = '⏳ Kısalıyor...';
          
          const inviteUrl = `${window.location.origin}`;
          try {
            const res = await fetch('/api/shorten', { 
              method: 'POST', 
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ url: inviteUrl })
            });
            const data = await res.json();
            navigator.clipboard.writeText(data.shortUrl);
            btn.innerText = '✅ Link Kopyalandı!';
            setTimeout(() => btn.innerText = originalText, 2000);
          } catch(err) {
            navigator.clipboard.writeText(inviteUrl);
            btn.innerText = '✅ Kopyalandı!';
            setTimeout(() => btn.innerText = originalText, 2000);
          }
        }}
        className="fixed bottom-6 left-6 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-full font-bold shadow-2xl shadow-green-500/20 hover:scale-105 transition-transform flex items-center gap-2 z-50 border-2 border-white/10"
      >
        💰 Oyunu Paylaş & Kazan
      </button>

      {/* Donate Button */}
      <a 
        href="https://donate.bynogame.com/dublajer" 
        target="_blank" 
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-3 rounded-full font-bold shadow-2xl shadow-orange-500/20 hover:scale-105 transition-transform flex items-center gap-2 z-50 border-2 border-white/10"
      >
        ☕ Bize Kahve Ismarla
      </a>
    </div>
  );
}
export default function Home() { return <Suspense fallback={<div></div>}><HomeContent /></Suspense>; }
