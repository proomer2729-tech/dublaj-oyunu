const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // In production, restrict this to frontend URL
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// Maintenance mode: Block access on Render so the public site is down
if (process.env.RENDER) {
  app.use((req, res, next) => {
    res.send("<body style='background:#111;color:#fff;display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;'><h1>Oyun Kurucu Tarafından Şimdilik Kapatıldı!</h1></body>");
  });
}

app.use(express.static('public', {
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    }
  }
})); // Serve Next.js frontend

// Configure multer for audio uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/videos', express.static(path.join(__dirname, 'public', 'videos')));

// Load scenes data
const scenesData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'scenes.json'), 'utf-8'));

app.get('/api/scenes', (req, res) => {
  res.json(scenesData);
});

// Room state storage (in-memory for now)
const rooms = {};

const multer = require('multer');
const { mergeAudioVideo } = require('./utils/ffmpeg');

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${req.body.roomCode}-${req.body.playerId}-${req.body.replikId}-${Date.now()}.webm`;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

app.post('/api/upload', upload.single('audio'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No audio file uploaded.' });
    
    const { roomCode, playerId, replikId } = req.body;
    const room = rooms[roomCode];
    if (room) {
      if (!room.recordings[playerId]) room.recordings[playerId] = {};
      room.recordings[playerId][replikId] = path.join(__dirname, 'uploads', req.file.filename);
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload audio.' });
  }
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('create_room', (data, callback) => {
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    rooms[roomCode] = {
      code: roomCode,
      hostId: socket.id,
      players: [{ id: socket.id, nickname: data.nickname, avatar: data.avatar, characterId: null, isReady: false }],
      selectedScene: null,
      state: 'LOBBY',
      recordings: {},
      finalVideoUrl: null
    };
    socket.join(roomCode);
    callback({ success: true, roomCode });
    io.to(roomCode).emit('room_state_update', rooms[roomCode]);
  });

  socket.on('join_room', (data, callback) => {
    const room = rooms[data.roomCode];
    if (room) {
      if (room.state !== 'LOBBY') {
        return callback({ success: false, message: 'Oyun zaten başlamış.' });
      }
      const existingPlayer = room.players.find(p => p.nickname === data.nickname);
      if (existingPlayer) {
         return callback({ success: false, message: 'Bu isimde bir oyuncu zaten var.' });
      }
      room.players.push({ id: socket.id, nickname: data.nickname, avatar: data.avatar, characterId: null, isReady: false });
      socket.join(data.roomCode);
      callback({ success: true, roomCode: data.roomCode });
      io.to(data.roomCode).emit('room_state_update', room);
    } else {
      callback({ success: false, message: 'Oda bulunamadı.' });
    }
  });

  socket.on('get_room_state', (roomCode, callback) => {
    const room = rooms[roomCode];
    if (room) {
      // Re-join socket to room if not already in it (useful for reconnects)
      socket.join(roomCode);
      callback({ success: true, room });
      io.to(roomCode).emit('room_state_update', room);
    } else {
      callback({ success: false });
    }
  });

  socket.on('select_scene', (data) => {
    const { roomCode, sceneId } = data;
    const room = rooms[roomCode];
    if (room && room.hostId === socket.id) {
      room.selectedScene = scenesData.find(s => s.id === sceneId);
      io.to(roomCode).emit('room_state_update', room);
    }
  });
  
  socket.on('select_character', (data) => {
    const { roomCode, characterId } = data;
    const room = rooms[roomCode];
    if (room) {
      const player = room.players.find(p => p.id === socket.id);
      if (player) {
         // Prevent selecting an already selected character by another player
         const alreadySelected = room.players.find(p => p.id !== socket.id && p.characterId === characterId);
         if (!alreadySelected) {
             player.characterId = characterId;
             io.to(roomCode).emit('room_state_update', room);
         }
      }
    }
  });

  socket.on('start_recording', (roomCode) => {
    const room = rooms[roomCode];
    if (room && room.hostId === socket.id && room.selectedScene) {
      room.state = 'RECORDING';
      
      const selectedCharacterIds = room.players.map(p => p.characterId).filter(id => id != null);
      const allRepliks = [];
      room.selectedScene.characters.forEach(char => {
         if (selectedCharacterIds.includes(char.id)) {
           char.repliks.forEach(r => allRepliks.push({ ...r, characterId: char.id, characterName: char.name }));
         }
      });
      allRepliks.sort((a, b) => a.startTime - b.startTime);
      
      room.recordingPhase = {
        timeline: allRepliks,
        currentIndex: 0,
        status: 'PLAYING_TO_NEXT'
      };

      io.to(roomCode).emit('room_state_update', room);
    }
  });

  socket.on('reached_replik', (roomCode) => {
    const room = rooms[roomCode];
    if (room && room.recordingPhase && room.recordingPhase.status === 'PLAYING_TO_NEXT') {
      room.recordingPhase.status = 'WAITING_FOR_ACTION';
      io.to(roomCode).emit('room_state_update', room);
    }
  });

  socket.on('watch_scene', (roomCode) => {
    const room = rooms[roomCode];
    if (room && room.recordingPhase && room.recordingPhase.status === 'WAITING_FOR_ACTION') {
      room.recordingPhase.status = 'WATCHING_SCENE';
      io.to(roomCode).emit('room_state_update', room);
    }
  });

  socket.on('finish_watching_scene', (roomCode) => {
    const room = rooms[roomCode];
    if (room && room.recordingPhase && room.recordingPhase.status === 'WATCHING_SCENE') {
      room.recordingPhase.status = 'WAITING_FOR_ACTION';
      io.to(roomCode).emit('room_state_update', room);
    }
  });

  socket.on('start_dubbing', (roomCode) => {
    const room = rooms[roomCode];
    if (room && room.recordingPhase && room.recordingPhase.status === 'WAITING_FOR_ACTION') {
      room.recordingPhase.status = 'DUBBING';
      io.to(roomCode).emit('room_state_update', room);
    }
  });

  socket.on('stop_dubbing', (roomCode) => {
    const room = rooms[roomCode];
    if (room && room.recordingPhase && room.recordingPhase.status === 'DUBBING') {
      room.recordingPhase.status = 'REVIEWING';
      io.to(roomCode).emit('room_state_update', room);
    }
  });

  socket.on('retry_dubbing', (roomCode) => {
    const room = rooms[roomCode];
    if (room && room.recordingPhase && room.recordingPhase.status === 'REVIEWING') {
      room.recordingPhase.status = 'WAITING_FOR_ACTION';
      io.to(roomCode).emit('room_state_update', room);
    }
  });

  socket.on('approve_dubbing', (roomCode) => {
    const room = rooms[roomCode];
    if (room && room.recordingPhase && room.recordingPhase.status === 'REVIEWING') {
      room.recordingPhase.currentIndex++;
      if (room.recordingPhase.currentIndex >= room.recordingPhase.timeline.length) {
         // All done!
         room.state = 'PROCESSING';
         room.recordingPhase = null;
         io.to(roomCode).emit('room_state_update', room);
         
         // Process video
         const audioTracks = [];
         Object.keys(room.recordings).forEach(playerId => {
           const playerRecs = room.recordings[playerId];
           Object.keys(playerRecs).forEach(replikId => {
             let startTime = 0;
             room.selectedScene.characters.forEach(char => {
               const replik = char.repliks.find(r => r.id === replikId);
               if (replik) startTime = replik.startTime;
             });
             audioTracks.push({
               path: playerRecs[replikId],
               startTime: startTime
             });
           });
         });

         const originalVideoPath = path.join(__dirname, 'public', room.selectedScene.videoUrl);
         const finalVideoName = `${roomCode}_final_${Date.now()}.mp4`;
         const outputPath = path.join(__dirname, 'public', 'videos', finalVideoName);

         mergeAudioVideo(originalVideoPath, audioTracks, outputPath)
           .then(() => {
              room.state = 'WATCHING';
              room.finalVideoUrl = `/videos/${finalVideoName}`;
              io.to(roomCode).emit('room_state_update', room);
           })
           .catch(err => {
              console.error('Merge error:', err);
              room.state = 'LOBBY';
              room.players.forEach(p => p.isReady = false);
              io.to(roomCode).emit('room_state_update', room);
           });

      } else {
         room.recordingPhase.status = 'PLAYING_TO_NEXT';
         io.to(roomCode).emit('room_state_update', room);
      }
    }
  });

  // Sync Video Controls (Watching State)
  socket.on('video_control', (data) => {
    const { roomCode, action, currentTime } = data;
    // Broadcast to others in the room
    socket.to(roomCode).emit('sync_video', { action, currentTime });
  });

  // Chat/Reactions
  socket.on('send_reaction', (data) => {
    const { roomCode, emoji } = data;
    io.to(roomCode).emit('new_reaction', { userId: socket.id, emoji });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    for (const code in rooms) {
      const room = rooms[code];
      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        // Do not splice the player. They might reconnect or their frontend might still hold the old ID.
        // Just let them stay in the room.
        
        // If host left, we could theoretically reassign host, but it's safer to just leave it for this simple game.
        if (room.hostId === socket.id && room.players.length > 1) {
          const nextPlayer = room.players.find(p => p.id !== socket.id);
          if (nextPlayer) room.hostId = nextPlayer.id;
        }
        io.to(code).emit('room_state_update', room);
      }
    }
  });
});

// Fallback for SPA routing
app.use((req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3011;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
