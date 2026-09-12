const { execSync } = require('child_process');
const p = require('@ffmpeg-installer/ffmpeg').path;
execSync('"' + p + '" -f lavfi -i sine=frequency=440:duration=2 -c:a libopus test_audio.webm -y');
const { mergeAudioVideo } = require('./utils/ffmpeg');
mergeAudioVideo('public/videos/ezel-kullanilmak.mp4', [{path: 'test_audio.webm', startTime: 2}], 'public/videos/test3.mp4').then(()=>console.log('done')).catch(console.error);
