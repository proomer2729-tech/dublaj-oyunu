
const fs = require('fs');

let content = fs.readFileSync('server/index.js', 'utf8');

const processVideoLogic = \
function processVideoForRoom(room, roomCode, io) {
  room.state = 'PROCESSING';
  io.to(roomCode).emit('room_state_update', room);
  
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

  const path = require('path');
  const originalVideoPath = path.join(__dirname, 'server/public', room.selectedScene.videoUrl);
  const finalVideoName = \\\\\\_final_\\\.mp4\\\;
  const outputPath = path.join(__dirname, 'server/public', 'videos', finalVideoName);
  
  const { mergeAudioVideo } = require('./server/utils/ffmpeg');

  mergeAudioVideo(originalVideoPath, audioTracks, outputPath)
    .then(() => {
      room.state = 'WATCHING';
      room.finalVideoUrl = '/videos/' + finalVideoName;
      io.to(roomCode).emit('room_state_update', room);
    })
    .catch(err => {
      console.error('Merge error:', err);
      room.state = 'LOBBY';
      room.players.forEach(p => p.isReady = false);
      io.to(roomCode).emit('room_state_update', room);
    });
}
\;

// Replace start_recording and add new events
const newEvents = \
  socket.on('start_recording', (roomCode) => {
    const room = rooms[roomCode];
    if (room && room.hostId === socket.id && room.selectedScene) {
      room.state = 'RECORDING';
      
      const allRepliks = [];
      room.selectedScene.characters.forEach(char => {
         char.repliks.forEach(r => allRepliks.push({ ...r, characterId: char.id, characterName: char.name }));
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
         processVideoForRoom(room, roomCode, io);
      } else {
         room.recordingPhase.status = 'PLAYING_TO_NEXT';
         io.to(roomCode).emit('room_state_update', room);
      }
    }
  });
\;

content = content.replace(/socket\.on\\('start_recording'[\\s\\S]*?}\\);\\s*}\\);\\s*socket\\.on\\('player_ready'[\\s\\S]*?}\\);\\s*}\\);/g, newEvents);
content = processVideoLogic + '\\n' + content;

fs.writeFileSync('server/index.js', content);
console.log('Done replacing backend code');

