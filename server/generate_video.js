const { execSync } = require('child_process');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const path = require('path');

try {
  execSync(`"${ffmpegPath}" -f lavfi -i testsrc=duration=30:size=640x360:rate=30 -f lavfi -i sine=frequency=440:duration=30 -c:v libx264 -c:a aac public/videos/sifir-bir-cengo.mp4 -y`, { stdio: 'inherit' });
  execSync(`"${ffmpegPath}" -f lavfi -i testsrc=duration=20:size=640x360:rate=30 -f lavfi -i sine=frequency=440:duration=20 -c:v libx264 -c:a aac public/videos/kolpacino-sabri.mp4 -y`, { stdio: 'inherit' });
  console.log('Videos generated successfully');
} catch (e) {
  console.error(e);
}
