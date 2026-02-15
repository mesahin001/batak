/**
 * Generate simple sound effects using Web Audio API
 * These are placeholder sounds - replace with real audio files later
 */

export function generateCardShuffleSound(): HTMLAudioElement {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const duration = 0.8;
  const sampleRate = audioContext.sampleRate;
  const buffer = audioContext.createBuffer(1, duration * sampleRate, sampleRate);
  const data = buffer.getChannelData(0);

  // Shuffle sound: rapid white noise bursts
  for (let i = 0; i < buffer.length; i++) {
    if (Math.floor(i / 1000) % 2 === 0) {
      data[i] = (Math.random() * 2 - 1) * 0.1;
    }
  }

  return bufferToAudioElement(buffer, audioContext);
}

export function generateCardPlaySound(): HTMLAudioElement {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const duration = 0.15;
  const sampleRate = audioContext.sampleRate;
  const buffer = audioContext.createBuffer(1, duration * sampleRate, sampleRate);
  const data = buffer.getChannelData(0);

  // Card play: short percussive tap (200 Hz → 100 Hz)
  for (let i = 0; i < buffer.length; i++) {
    const t = i / sampleRate;
    const freq = 200 - (100 * t / duration);
    const envelope = Math.exp(-t * 15);
    data[i] = Math.sin(2 * Math.PI * freq * t) * 0.3 * envelope;
  }

  return bufferToAudioElement(buffer, audioContext);
}

export function generateTrickWinSound(): HTMLAudioElement {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const duration = 0.4;
  const sampleRate = audioContext.sampleRate;
  const buffer = audioContext.createBuffer(1, duration * sampleRate, sampleRate);
  const data = buffer.getChannelData(0);

  // Trick win: ascending arpeggio (C-E-G)
  const notes = [261.63, 329.63, 392.00]; // C4, E4, G4
  const noteLen = buffer.length / 3;

  for (let i = 0; i < buffer.length; i++) {
    const noteIndex = Math.floor(i / noteLen);
    const freq = notes[noteIndex] || notes[2];
    const t = (i % noteLen) / sampleRate;
    const envelope = Math.exp(-t * 8);
    data[i] = Math.sin(2 * Math.PI * freq * t) * 0.2 * envelope;
  }

  return bufferToAudioElement(buffer, audioContext);
}

export function generateBidPlacedSound(): HTMLAudioElement {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const duration = 0.2;
  const sampleRate = audioContext.sampleRate;
  const buffer = audioContext.createBuffer(1, duration * sampleRate, sampleRate);
  const data = buffer.getChannelData(0);

  // Bid placed: two-tone beep (440 Hz)
  for (let i = 0; i < buffer.length; i++) {
    const t = i / sampleRate;
    const envelope = Math.exp(-t * 10);
    data[i] = Math.sin(2 * Math.PI * 440 * t) * 0.25 * envelope;
  }

  return bufferToAudioElement(buffer, audioContext);
}

export function generateRoundCompleteSound(): HTMLAudioElement {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const duration = 0.6;
  const sampleRate = audioContext.sampleRate;
  const buffer = audioContext.createBuffer(1, duration * sampleRate, sampleRate);
  const data = buffer.getChannelData(0);

  // Round complete: descending melody (G-F-E-D-C)
  const notes = [392.00, 349.23, 329.63, 293.66, 261.63]; // G4-F4-E4-D4-C4
  const noteLen = buffer.length / 5;

  for (let i = 0; i < buffer.length; i++) {
    const noteIndex = Math.floor(i / noteLen);
    const freq = notes[noteIndex] || notes[4];
    const t = (i % noteLen) / sampleRate;
    const envelope = Math.exp(-t * 6);
    data[i] = Math.sin(2 * Math.PI * freq * t) * 0.2 * envelope;
  }

  return bufferToAudioElement(buffer, audioContext);
}

export function generateGameCompleteSound(): HTMLAudioElement {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const duration = 1.0;
  const sampleRate = audioContext.sampleRate;
  const buffer = audioContext.createBuffer(1, duration * sampleRate, sampleRate);
  const data = buffer.getChannelData(0);

  // Game complete: fanfare (C-E-G-C')
  const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
  const noteLen = buffer.length / 4;

  for (let i = 0; i < buffer.length; i++) {
    const noteIndex = Math.floor(i / noteLen);
    const freq = notes[noteIndex] || notes[3];
    const t = (i % noteLen) / sampleRate;
    const envelope = Math.exp(-t * 4);
    data[i] = Math.sin(2 * Math.PI * freq * t) * 0.2 * envelope;
  }

  return bufferToAudioElement(buffer, audioContext);
}

/**
 * Convert AudioBuffer to HTMLAudioElement
 */
function bufferToAudioElement(buffer: AudioBuffer, _context: AudioContext): HTMLAudioElement {
  // Create offline context to render buffer to audio data
  const offlineContext = new OfflineAudioContext(
    buffer.numberOfChannels,
    buffer.length,
    buffer.sampleRate
  );

  const source = offlineContext.createBufferSource();
  source.buffer = buffer;
  source.connect(offlineContext.destination);
  source.start();

  const audio = new Audio();

  offlineContext.startRendering().then(renderedBuffer => {
    // Convert to WAV blob
    const wav = audioBufferToWav(renderedBuffer);
    const blob = new Blob([wav], { type: 'audio/wav' });
    audio.src = URL.createObjectURL(blob);
  });

  return audio;
}

/**
 * Convert AudioBuffer to WAV format
 * Based on: https://github.com/Jam3/audiobuffer-to-wav
 */
function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const length = buffer.length * buffer.numberOfChannels * 2 + 44;
  const arrayBuffer = new ArrayBuffer(length);
  const view = new DataView(arrayBuffer);
  const channels: Float32Array[] = [];
  let offset = 0;
  let pos = 0;

  // Write WAV header
  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); // file length - 8
  setUint32(0x45564157); // "WAVE"
  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16); // length = 16
  setUint16(1); // PCM (uncompressed)
  setUint16(buffer.numberOfChannels);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * buffer.numberOfChannels); // avg. bytes/sec
  setUint16(buffer.numberOfChannels * 2); // block-align
  setUint16(16); // 16-bit
  setUint32(0x61746164); // "data" - chunk
  setUint32(length - pos - 4); // chunk length

  // Write interleaved data
  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (pos < length) {
    for (let i = 0; i < buffer.numberOfChannels; i++) {
      const sample = Math.max(-1, Math.min(1, channels[i][offset]));
      view.setInt16(pos, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      pos += 2;
    }
    offset++;
  }

  return arrayBuffer;

  function setUint16(data: number) {
    view.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data: number) {
    view.setUint32(pos, data, true);
    pos += 4;
  }
}
