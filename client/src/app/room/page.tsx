'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSocket } from '../../lib/socket';
import LobbyView from '../../components/LobbyView';
import RecordingStudio from '../../components/RecordingStudio';
import ProcessingLoader from '../../components/ProcessingLoader';
import CinemaView from '../../components/CinemaView';

import { useSearchParams } from 'next/navigation';

function RoomContent() {
  const [roomState, setRoomState] = useState<any>(null);
  const [scenes, setScenes] = useState<any[]>([]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomCode = searchParams.get('code');

  useEffect(() => {
    const socket = getSocket();
    
    // Fetch scenes from backend
    fetch(`/api/scenes`)
      .then(res => res.json())
      .then(data => setScenes(data))
      .catch(err => console.error("Error fetching scenes", err));

    socket.on('room_state_update', (data) => {
      setRoomState(data);
    });
    
    // Ask for the current state when the page mounts
    if (roomCode) {
      socket.emit('get_room_state', roomCode, (res: any) => {
        if (res.success) {
          setRoomState(res.room);
        } else {
          router.push('/'); // If room doesn't exist, go back home
        }
      });
    } else {
      router.push('/');
    }

    return () => {
      socket.off('room_state_update');
    };
  }, [roomCode, router]);

  if (!roomState) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      <header className="bg-slate-800 border-b border-slate-700 p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-violet-500">
          Dublaj.io
        </h1>
        <div className="flex items-center gap-2 sm:gap-4">
          <button 
            onClick={async (e) => {
              const btn = e.currentTarget;
              const originalText = btn.innerText;
              btn.innerText = '⏳ Kısalıyor...';
              
              const inviteUrl = `${window.location.origin}/?code=${roomState.code}`;
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
            className="bg-green-600 hover:bg-green-500 text-white px-3 sm:px-4 py-2 rounded-lg font-bold shadow-lg text-xs sm:text-sm flex items-center gap-1 transition-all"
          >
            💰 Davet Linkini Kopyala
          </button>
          <div className="bg-slate-900 px-3 sm:px-4 py-2 rounded-lg font-mono font-bold tracking-wider border border-slate-700 text-sm sm:text-base hidden sm:block">
            KOD: <span className="text-pink-500">{roomState.code}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 relative">
        {roomState.state === 'LOBBY' && <LobbyView room={roomState} scenes={scenes} />}
        {roomState.state === 'RECORDING' && <RecordingStudio room={roomState} />}
        {roomState.state === 'PROCESSING' && <ProcessingLoader />}
        {roomState.state === 'WATCHING' && <CinemaView room={roomState} />}
      </main>
    </div>
  );
}

export default function RoomPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900" />}>
      <RoomContent />
    </Suspense>
  );
}


