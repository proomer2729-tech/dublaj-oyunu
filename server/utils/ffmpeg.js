const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
ffmpeg.setFfmpegPath(ffmpegInstaller.path);
const path = require('path');
const fs = require('fs');

/**
 * Merges multiple audio files into a single video file.
 * 
 * @param {string} originalVideoPath - Path to original video (e.g. public/videos/sifir-bir.mp4)
 * @param {Array} audioTracks - Array of objects: { path: string, startTime: number (seconds) }
 * @param {string} outputPath - Path to save the final video
 * @returns {Promise<string>}
 */
const mergeAudioVideo = (originalVideoPath, audioTracks, outputPath) => {
  return new Promise((resolve, reject) => {
    let command = ffmpeg(originalVideoPath);
    
    // Add all audio tracks as inputs
    audioTracks.forEach(track => {
      command = command.input(track.path);
    });

    // Build the complex filter
    // 0:a is original video audio (we can lower its volume or keep it as BGM)
    // 1:a, 2:a, etc. are the uploaded audio chunks
    // We delay each chunk by its startTime.
    
    let filterComplex = '';
    let mixInputs = '';

    if (audioTracks.length === 0) {
      // No recordings at all, just return video with no audio
      command
        .outputOptions(['-map 0:v', '-c:v copy', '-an'])
        .on('end', () => resolve(outputPath))
        .on('error', reject)
        .save(outputPath);
      return;
    }

    // Include muted original audio so the output audio track is exactly as long as the video
    filterComplex += '[0:a]volume=0.0[a0];';
    mixInputs += '[a0]';

    audioTracks.forEach((track, index) => {
      const inputIndex = index + 1; // 1-based because 0 is original video
      const delayMs = Math.round(track.startTime * 1000);
      filterComplex += `[${inputIndex}:a]volume=3.0,adelay=${delayMs}|${delayMs}[a${inputIndex}];`;
      mixInputs += `[a${inputIndex}]`;
    });

    const totalAudioStreams = audioTracks.length + 1;
    filterComplex += `${mixInputs}amix=inputs=${totalAudioStreams}:duration=longest:dropout_transition=0[a_mixed];[a_mixed]volume=${totalAudioStreams}[a_out]`;

    command
      .complexFilter(filterComplex)
      .outputOptions([
        '-map 0:v',      // Keep original video
        '-map [a_out]',  // Use our mixed audio
        '-c:v copy',     // Don't re-encode video (fast)
        '-c:a aac',      // Encode audio to aac
        '-movflags +faststart' // Crucial for HTML5 video playback in Chrome
      ])
      .on('start', (cmdline) => {
        console.log('Started FFmpeg with command:', cmdline);
      })
      .on('end', () => {
        console.log('FFmpeg processing finished successfully.');
        resolve(outputPath);
      })
      .on('error', (err) => {
        console.error('Error during FFmpeg processing:', err.message);
        reject(err);
      })
      .save(outputPath);
  });
};

module.exports = { mergeAudioVideo };
