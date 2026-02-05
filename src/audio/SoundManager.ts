import { Howl } from 'howler';

type SoundType = 'correct' | 'wrong' | 'lifeLost' | 'levelUp' | 'streak' | 'whoosh' | 'gameOver';

export class SoundManager {
  private sounds: Map<SoundType, Howl> = new Map();
  private enabled: boolean = true;

  constructor() {
    // Generate sounds programmatically using Web Audio API via Howler
    this.initializeSounds();
  }

  private initializeSounds(): void {
    // Create synthesized sounds using base64 data URLs
    // These are simple generated tones

    // Correct answer - bright chime
    this.sounds.set('correct', new Howl({
      src: [this.createToneDataUrl(880, 0.15, 'sine', 0.3)],
      volume: 0.5,
    }));

    // Wrong answer - low buzz
    this.sounds.set('wrong', new Howl({
      src: [this.createToneDataUrl(200, 0.3, 'sawtooth', 0.2)],
      volume: 0.4,
    }));

    // Life lost - descending tone
    this.sounds.set('lifeLost', new Howl({
      src: [this.createDescendingToneDataUrl()],
      volume: 0.5,
    }));

    // Level up - ascending fanfare
    this.sounds.set('levelUp', new Howl({
      src: [this.createAscendingToneDataUrl()],
      volume: 0.5,
    }));

    // Streak - quick ascending notes
    this.sounds.set('streak', new Howl({
      src: [this.createStreakToneDataUrl()],
      volume: 0.4,
    }));

    // Whoosh - quick noise
    this.sounds.set('whoosh', new Howl({
      src: [this.createWhooshDataUrl()],
      volume: 0.3,
    }));

    // Game over - sad descending
    this.sounds.set('gameOver', new Howl({
      src: [this.createGameOverDataUrl()],
      volume: 0.5,
    }));
  }

  private createToneDataUrl(frequency: number, duration: number, type: OscillatorType, gain: number): string {
    const sampleRate = 44100;
    const numSamples = Math.floor(sampleRate * duration);
    const buffer = new Float32Array(numSamples);

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-3 * t / duration);
      let sample = 0;

      switch (type) {
        case 'sine':
          sample = Math.sin(2 * Math.PI * frequency * t);
          break;
        case 'sawtooth':
          sample = 2 * (t * frequency - Math.floor(0.5 + t * frequency));
          break;
        case 'square':
          sample = Math.sin(2 * Math.PI * frequency * t) > 0 ? 1 : -1;
          break;
        default:
          sample = Math.sin(2 * Math.PI * frequency * t);
      }

      buffer[i] = sample * envelope * gain;
    }

    return this.floatArrayToWavDataUrl(buffer, sampleRate);
  }

  private createDescendingToneDataUrl(): string {
    const sampleRate = 44100;
    const duration = 0.4;
    const numSamples = Math.floor(sampleRate * duration);
    const buffer = new Float32Array(numSamples);

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const frequency = 600 - 400 * (t / duration);
      const envelope = Math.exp(-2 * t / duration);
      buffer[i] = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.3;
    }

    return this.floatArrayToWavDataUrl(buffer, sampleRate);
  }

  private createAscendingToneDataUrl(): string {
    const sampleRate = 44100;
    const duration = 0.5;
    const numSamples = Math.floor(sampleRate * duration);
    const buffer = new Float32Array(numSamples);

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    const noteLength = duration / notes.length;

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const noteIndex = Math.min(Math.floor(t / noteLength), notes.length - 1);
      const frequency = notes[noteIndex];
      const localT = t - noteIndex * noteLength;
      const envelope = Math.exp(-2 * localT / noteLength);
      buffer[i] = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.3;
    }

    return this.floatArrayToWavDataUrl(buffer, sampleRate);
  }

  private createStreakToneDataUrl(): string {
    const sampleRate = 44100;
    const duration = 0.3;
    const numSamples = Math.floor(sampleRate * duration);
    const buffer = new Float32Array(numSamples);

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const frequency = 800 + 400 * (t / duration);
      const envelope = Math.exp(-4 * t / duration);
      buffer[i] = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.25;
    }

    return this.floatArrayToWavDataUrl(buffer, sampleRate);
  }

  private createWhooshDataUrl(): string {
    const sampleRate = 44100;
    const duration = 0.15;
    const numSamples = Math.floor(sampleRate * duration);
    const buffer = new Float32Array(numSamples);

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const envelope = Math.sin(Math.PI * t / duration);
      buffer[i] = (Math.random() * 2 - 1) * envelope * 0.2;
    }

    return this.floatArrayToWavDataUrl(buffer, sampleRate);
  }

  private createGameOverDataUrl(): string {
    const sampleRate = 44100;
    const duration = 1.0;
    const numSamples = Math.floor(sampleRate * duration);
    const buffer = new Float32Array(numSamples);

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const frequency = 400 - 200 * (t / duration);
      const envelope = Math.exp(-1.5 * t / duration);
      buffer[i] = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.3;
    }

    return this.floatArrayToWavDataUrl(buffer, sampleRate);
  }

  private floatArrayToWavDataUrl(samples: Float32Array, sampleRate: number): string {
    const numChannels = 1;
    const bitsPerSample = 16;
    const bytesPerSample = bitsPerSample / 8;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = samples.length * bytesPerSample;
    const bufferSize = 44 + dataSize;

    const buffer = new ArrayBuffer(bufferSize);
    const view = new DataView(buffer);

    // WAV header
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, bufferSize - 8, true);
    this.writeString(view, 8, 'WAVE');
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    this.writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    // Write samples
    let offset = 44;
    for (let i = 0; i < samples.length; i++) {
      const sample = Math.max(-1, Math.min(1, samples[i]));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }

    // Convert to base64
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return 'data:audio/wav;base64,' + btoa(binary);
  }

  private writeString(view: DataView, offset: number, string: string): void {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  play(sound: SoundType): void {
    if (!this.enabled) return;
    const howl = this.sounds.get(sound);
    if (howl) {
      howl.play();
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}

export const soundManager = new SoundManager();
