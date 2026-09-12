const { execSync } = require('child_process');
const p = require('@ffmpeg-installer/ffmpeg').path;

try {
  // Create a mono audio file
  execSync('"' + p + '" -f lavfi -i sine=frequency=440:duration=2 -ac 1 -c:a libopus test_mono.webm -y');
  
  // Test adelay with 2 arguments on mono
  execSync('"' + p + '" -i test_mono.webm -af "adelay=1000|1000" test_delay.wav -y', {stdio:'inherit'});
  console.log("Success with 1000|1000 on mono");
} catch(e) {
  console.error("Failed!", e.message);
}
