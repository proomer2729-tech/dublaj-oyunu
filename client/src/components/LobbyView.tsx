'use client';

import { getSocket } from '../lib/socket';
import { motion } from 'framer-motion';
import { Crown, Play, User } from 'lucide-react';

export default function LobbyView({ room, scenes }: { room: any, scenes: any[] }) {
  const socket = getSocket();
  const isHost = room.hostId === socket.id;
  const me = room.players.find((p: any) => p.id === socket.id);

  const handleSelectScene = (sceneId: string) => {
    if (!isHost) return;
    socket.emit('select_scene', { roomCode: room.code, sceneId });
  };

  const handleSelectCharacter = (characterId: string) => {
    socket.emit('select_character', { roomCode: room.code, characterId });
  };

  const handleStart = () => {
    if (!isHost) return;
    // Check if enough players have selected characters based on maxPlayers?
    socket.emit('start_recording', room.code);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Players List */}
      <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <User className="text-violet-500" />
          Oyuncular ({room.players.length})
        </h2>
        <div className="space-y-3">
          {room.players.map((p: any) => (
            <div key={p.id} className="flex items-center gap-3 bg-slate-900 p-3 rounded-xl border border-slate-700">
              <span className="text-2xl">{p.avatar}</span>
              <span className="font-semibold flex-grow">{p.nickname}</span>
              {room.hostId === p.id && <Crown size={20} className="text-yellow-500" />}
            </div>
          ))}
        </div>
      </div>

      {/* Scene & Character Selection */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold mb-4">Sahne Seç</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {scenes.map((scene) => (
              <div 
                key={scene.id}
                onClick={() => handleSelectScene(scene.id)}
                className={`p-4 rounded-xl cursor-pointer transition-all border-2 ${
                  room.selectedScene?.id === scene.id 
                  ? 'border-pink-500 bg-pink-500/10' 
                  : 'border-slate-700 bg-slate-900 hover:border-slate-500'
                } ${!isHost && 'opacity-70 cursor-not-allowed pointer-events-none'}`}
              >
                <div className="text-xs text-violet-400 font-bold mb-1 uppercase tracking-wider">{scene.category}</div>
                <h3 className="font-bold mb-2">{scene.title}</h3>
                <div className="text-sm text-slate-400 flex gap-4">
                  <span>⏱ {scene.duration} sn</span>
                  <span>👥 {scene.maxPlayers} Oyuncu</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {room.selectedScene && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-800 rounded-2xl p-6 border border-slate-700"
          >
            <h2 className="text-xl font-bold mb-4">Karakterini Seç</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {room.selectedScene.characters.map((char: any) => {
                const selectedBy = room.players.find((p: any) => p.characterId === char.id);
                const isMe = selectedBy?.id === socket.id;

                return (
                  <div 
                    key={char.id}
                    onClick={() => !selectedBy && handleSelectCharacter(char.id)}
                    className={`p-4 rounded-xl flex items-center gap-4 border-2 transition-all ${
                      isMe ? 'border-pink-500 bg-pink-500/20' 
                      : selectedBy ? 'border-slate-700 bg-slate-900 opacity-50 cursor-not-allowed'
                      : 'border-slate-700 bg-slate-900 cursor-pointer hover:border-slate-500'
                    }`}
                  >
                    <div className="text-4xl">{char.avatar}</div>
                    <div className="flex-grow">
                      <h3 className="font-bold text-lg">{char.name}</h3>
                      <p className="text-sm text-slate-400">{char.repliks.length} Replik</p>
                    </div>
                    {selectedBy && (
                      <div className="text-xs bg-slate-800 px-2 py-1 rounded-md text-slate-300">
                        {selectedBy.nickname}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {isHost && (
              <div className="mt-8 flex justify-end">
                <button 
                  onClick={handleStart}
                  disabled={!room.players.some((p:any) => p.characterId)}
                  className="bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 disabled:opacity-50 text-white font-bold py-3 px-8 rounded-xl flex items-center gap-2"
                >
                  <Play size={20} />
                  Kayda Başla
                </button>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
