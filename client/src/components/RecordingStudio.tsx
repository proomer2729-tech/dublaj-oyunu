import React, { useState, useRef, useEffect, useMemo } from 'react';
import { getSocket } from '../lib/socket';

export default function RecordingStudio({ room }: { room: any }) {
  const socket = getSocket();
  const roomCode = room.code;
  const me = room.players.find((p: any) => p.id === socket.id);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [recordings, setRecordings] = useState<{[key:string]: Blob}>({});
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [hearOriginal, setHearOriginal] = useState(false);
  const audioChunksRef = useRef<Blob[]>([]);
  const activeMediaRecorder = useRef<MediaRecorder | null>(null);

  const myCharacter = useMemo(() => {
    if (!room || !room.selectedScene || !me) return null;
    const p = room.players.find((p: any) => p.id === me.id);
    if (!p || !p.characterId) return null;
    return room.selectedScene.characters.find((c: any) => c.id === p.characterId);
  }, [room, me]);

  // Initialize Microphone Stream
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ 
      audio: { 
        echoCancellation: false, 
        noiseSuppression: false,
        autoGainControl: false
      } 
    })
      .then(stream => {
        setMediaStream(stream);
      })
      .catch(err => {
        console.error('Mic access denied', err);
        alert('Lütfen mikrofon erişimine izin verin!');
      });
  }, []);

  const phase = room?.recordingPhase;
  const currentReplik = phase ? phase.timeline[phase.currentIndex] : null;
  const isMyTurn = currentReplik && myCharacter && currentReplik.characterId === myCharacter.id;

  // Video State Sync
  useEffect(() => {
    if (!phase || !currentReplik || !videoRef.current) return;

    if (phase.status === 'WAITING_FOR_ACTION') {
      videoRef.current.currentTime = currentReplik.startTime;
      videoRef.current.pause();
    } else if (phase.status === 'WATCHING_SCENE') {
      if (Math.abs(videoRef.current.currentTime - currentReplik.startTime) > 0.5) {
        videoRef.current.currentTime = currentReplik.startTime;
      }
      videoRef.current.play().catch(e => console.error(e));
    } else if (phase.status === 'DUBBING') {
      if (Math.abs(videoRef.current.currentTime - currentReplik.startTime) > 0.5) {
        videoRef.current.currentTime = currentReplik.startTime;
      }
      videoRef.current.play().catch(e => console.error(e));
    } else if (phase.status === 'REVIEWING') {
      videoRef.current.pause();
    } else if (phase.status === 'PLAYING_TO_NEXT') {
      videoRef.current.play().catch(e => console.error(e));
    }
  }, [phase?.status, currentReplik?.id]);

  // Audio Recording Sync
  useEffect(() => {
    if (!phase || !currentReplik || !isMyTurn || !mediaStream) return;

    if (phase.status === 'DUBBING') {
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(mediaStream, { mimeType: 'audio/webm' });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      const tiedReplikId = currentReplik.id;
      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setRecordings(prev => ({ ...prev, [tiedReplikId]: audioBlob }));
      };
      recorder.start(100);
      activeMediaRecorder.current = recorder;
    } else if (phase.status === 'REVIEWING' || phase.status === 'WAITING_FOR_ACTION' || phase.status === 'WATCHING_SCENE') {
      if (activeMediaRecorder.current && activeMediaRecorder.current.state === 'recording') {
        activeMediaRecorder.current.stop();
        activeMediaRecorder.current = null;
      }
    }
  }, [phase?.status]);

  // Time update for progress and state triggers
  const handleTimeUpdate = () => {
    if (!videoRef.current || !phase || !currentReplik) return;
    const time = videoRef.current.currentTime;
    setCurrentTime(time);

    if (phase.status === 'PLAYING_TO_NEXT') {
      if (time >= currentReplik.startTime) {
        videoRef.current.pause();
        if (room.hostId === me?.id) {
          socket.emit('reached_replik', roomCode);
        }
      }
    } else if (phase.status === 'WATCHING_SCENE') {
      if (time >= currentReplik.endTime) {
        videoRef.current.pause();
        if (isMyTurn) {
          socket.emit('finish_watching_scene', roomCode);
        }
      }
    } else if (phase.status === 'DUBBING') {
      if (time >= currentReplik.endTime + 1.0) {
        videoRef.current.pause();
        if (isMyTurn) {
          socket.emit('stop_dubbing', roomCode);
        }
      }
    }
  };

  const handleApproveDubbing = async (replikId: string) => {
    const audioBlob = recordings[replikId];
    if (!audioBlob) {
       socket.emit('approve_dubbing', roomCode);
       return;
    }
    
    const formData = new FormData();
    formData.append('roomCode', roomCode);
    if (me) formData.append('playerId', me.id);
    formData.append('replikId', replikId);
    formData.append('audio', audioBlob, 'audio.webm');

    try {
      setUploadStatus('Ses Yükleniyor...');
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      setUploadStatus('');
      socket.emit('approve_dubbing', roomCode);
    } catch (e) {
      console.error(e);
      alert('Ses yüklenirken bir hata oluştu! Lütfen tekrar deneyin.');
      setUploadStatus('');
    }
  };

  const handleVideoEnded = () => {
    if (!phase || !currentReplik) return;
    if (phase.status === 'DUBBING' && isMyTurn) {
      socket.emit('stop_dubbing', roomCode);
    } else if (phase.status === 'WATCHING_SCENE' && isMyTurn) {
      socket.emit('finish_watching_scene', roomCode);
    } else if (phase.status === 'PLAYING_TO_NEXT' && room.hostId === me?.id) {
      socket.emit('reached_replik', roomCode);
    }
  };

  const progressPct = phase ? ((phase.currentIndex) / phase.timeline.length) * 100 : 0;
  
  // Video should be muted DURING dubbing so the original audio doesn't bleed into the mic.
  // Otherwise, they should hear it.
  const isVideoMuted = phase?.status === 'DUBBING' && !hearOriginal;

  return (
    <div className="flex flex-col h-full bg-gray-900 overflow-y-auto">
      {/* Video Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="relative w-full max-w-4xl bg-black rounded-lg shadow-2xl overflow-hidden">
          <video 
            ref={videoRef}
            src={room.selectedScene?.videoUrl} 
            className="w-full max-h-[50vh] object-contain bg-black"
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleVideoEnded}
            muted={isVideoMuted}
            playsInline
            preload="auto"
          />
          
          {/* Progress Bar */}
          {phase && (
            <div className="absolute top-0 left-0 w-full h-1 bg-gray-800">
              <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${progressPct}%` }}></div>
            </div>
          )}
        </div>

        <button 
          onClick={() => {
            if (videoRef.current && currentReplik) {
              videoRef.current.load();
              setTimeout(() => {
                if (videoRef.current) {
                  videoRef.current.currentTime = currentReplik.startTime;
                  videoRef.current.play().catch(e => console.error(e));
                }
              }, 100);
            }
          }}
          className="mt-2 text-xs text-gray-500 underline hover:text-gray-300 transition-colors"
        >
          Video donduysa veya siyah ekranda kaldıysa buraya tıkla
        </button>

        {/* State Machine UI */}
        {phase && currentReplik && (
          <div className="w-full max-w-4xl bg-gray-800 p-6 rounded-xl mt-4 text-center shadow-xl border border-gray-700">
            <div className="text-xl font-bold mb-2 flex items-center justify-center gap-2 text-white">
              {currentReplik.characterId === myCharacter?.id ? '🎤 Senin Sıran!' : `🎬 ${currentReplik.characterName} Bekleniyor`}
            </div>
            <div className="text-gray-300 italic mb-6 text-lg">"{currentReplik.text}"</div>
            
            {uploadStatus && <div className="text-blue-400 mb-4 animate-pulse">{uploadStatus}</div>}

            {isMyTurn ? (
              <div className="flex flex-col items-center gap-4 w-full">
                  <div className="flex items-center gap-2 mb-2 bg-gray-700/50 px-4 py-2 rounded-lg">
                    <input 
                      type="checkbox" 
                      id="hearOriginal" 
                      checked={hearOriginal} 
                      onChange={(e) => setHearOriginal(e.target.checked)}
                      className="w-4 h-4 cursor-pointer rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
                    />
                    <label htmlFor="hearOriginal" className="cursor-pointer text-sm text-gray-300">
                      Kaydederken orijinal sesi duy (Kulaklık önerilir)
                    </label>
                  </div>
                  {phase.status === 'WAITING_FOR_ACTION' && (
                    <div className="flex gap-4 justify-center w-full">
                      <button onClick={() => {
                        if (videoRef.current && currentReplik) {
                          videoRef.current.currentTime = currentReplik.startTime;
                          videoRef.current.play().catch(e => console.error('Play blocked:', e));
                        }
                        socket.emit('watch_scene', roomCode);
                      }} className="flex-1 max-w-[200px] bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg transition-colors">
                        👁️ Sahneyi İzle
                      </button>
                      <button onClick={() => {
                        if (videoRef.current && currentReplik) {
                          videoRef.current.currentTime = currentReplik.startTime;
                          videoRef.current.play().catch(e => console.error('Play blocked:', e));
                        }
                        socket.emit('start_dubbing', roomCode);
                      }} className="flex-1 max-w-[250px] bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-lg shadow-[0_0_15px_rgba(239,68,68,0.5)] transition-all transform hover:scale-105">
                        🎙️ Şimdi Seslendir
                      </button>
                    </div>
                  )}
                
                {phase.status === 'WATCHING_SCENE' && (
                  <div className="text-blue-400 font-bold animate-pulse text-xl">
                    👀 Orijinal Sahne İzleniyor...
                  </div>
                )}
                
                {phase.status === 'DUBBING' && (
                  <div className="text-red-500 font-bold animate-pulse text-2xl flex items-center justify-center gap-3 w-full">
                    <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                    Kaydediliyor... Konuş! ({(currentReplik.endTime + 1.0 - currentTime).toFixed(1)} sn)
                  </div>
                )}
                
                {phase.status === 'REVIEWING' && (
                  <div className="flex flex-col items-center gap-6 w-full">
                     <div className="text-gray-300 font-medium">🎧 Kaydettiğin Sesi Dinle:</div>
                     {recordings[currentReplik.id] && (
                       <audio controls src={URL.createObjectURL(recordings[currentReplik.id])} className="w-full max-w-md" />
                     )}
                     <div className="flex gap-4 w-full justify-center">
                       <button onClick={() => socket.emit('retry_dubbing', roomCode)} className="flex-1 max-w-[200px] bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-colors">
                         🔄 Tekrar Kaydet
                       </button>
                       <button onClick={() => handleApproveDubbing(currentReplik.id)} className="flex-1 max-w-[200px] bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg shadow-[0_0_15px_rgba(34,197,94,0.4)] transition-all transform hover:scale-105">
                         ✅ Devam Et
                       </button>
                     </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-gray-400 font-bold text-lg">
                {phase.status === 'WAITING_FOR_ACTION' && `${currentReplik.characterName} hazırlanıyor...`}
                {phase.status === 'WATCHING_SCENE' && `${currentReplik.characterName} sahneyi izliyor...`}
                {phase.status === 'DUBBING' && (
                  <span className="text-red-400 flex justify-center items-center gap-2">
                    <div className="w-3 h-3 bg-red-400 rounded-full animate-ping"></div>
                    {currentReplik.characterName} dublaj yapıyor...
                  </span>
                )}
                {phase.status === 'REVIEWING' && `${currentReplik.characterName} sesini dinliyor...`}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
