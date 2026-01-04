import { InstrumentType, NoteData } from '../types';

// Map note names to frequencies
const getFrequency = (note: string): number => {
  if (note === 'R' || note === 'REST') return 0;
  
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = parseInt(note.slice(-1));
  const key = note.slice(0, -1);
  const semitone = notes.indexOf(key);
  
  if (semitone === -1) return 0;

  // A4 = 440Hz, which is the 57th semitone relative to C0
  // Formula: f = 440 * (2 ^ ((n - 57) / 12))
  const absoluteSemitone = (octave * 12) + semitone;
  // A4 is (4 * 12) + 9 = 57
  return 440 * Math.pow(2, (absoluteSemitone - 57) / 12);
};

export class AudioService {
  private audioContext: AudioContext | null = null;
  private isPlaying: boolean = false;
  private scheduledNotes: AudioScheduledSourceNode[] = [];

  constructor() {
    // Lazy initialization on user interaction usually
  }

  private initContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  public stop() {
    this.isPlaying = false;
    this.scheduledNotes.forEach(node => {
      try {
        node.stop();
        node.disconnect();
      } catch (e) {
        // Ignore errors if already stopped
      }
    });
    this.scheduledNotes = [];
  }

  public async playSequence(notes: NoteData[], bpm: number, instrument: InstrumentType, onComplete: () => void) {
    this.initContext();
    if (!this.audioContext) return;

    this.stop(); // Clear previous
    this.isPlaying = true;

    const lookahead = 0.1; // Scheduling lookahead
    let currentTime = this.audioContext.currentTime + lookahead;

    notes.forEach((note, index) => {
      if (!this.isPlaying) return;

      const durationSec = (note.duration * 60) / bpm;
      
      if (note.pitch !== 'R' && note.pitch !== 'REST') {
        this.playNote(note.pitch, currentTime, durationSec, instrument);
      }

      currentTime += durationSec;
    });

    // Schedule cleanup/callback
    setTimeout(() => {
        if(this.isPlaying) {
            this.isPlaying = false;
            onComplete();
        }
    }, (currentTime - this.audioContext.currentTime) * 1000);
  }

  public playTone(pitch: string, instrument: InstrumentType) {
      this.initContext();
      if(!this.audioContext) return;
      this.playNote(pitch, this.audioContext.currentTime, 0.5, instrument);
  }

  private playNote(pitch: string, startTime: number, duration: number, instrument: InstrumentType) {
    if (!this.audioContext) return;

    const freq = getFrequency(pitch);
    if (freq <= 0) return;

    const osc = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    osc.frequency.value = freq;
    osc.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    // Instrument Synthesis Logic
    switch (instrument) {
      case InstrumentType.PIANO:
        osc.type = 'sine';
        // Exponential decay
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.8, startTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        break;

      case InstrumentType.VIOLIN:
        osc.type = 'sawtooth';
        // Slow attack, sustain
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.5, startTime + 0.2); // Slower attack
        gainNode.gain.setValueAtTime(0.5, startTime + duration - 0.1);
        gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
        break;

      case InstrumentType.FLUTE:
        osc.type = 'triangle'; // Closer to flute than sine sometimes
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.6, startTime + 0.05);
        gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
        break;

      case InstrumentType.GUITAR:
        osc.type = 'triangle';
        // Pluck envelope
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.7, startTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        break;

      case InstrumentType.SYNTH:
        osc.type = 'square';
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
        gainNode.gain.linearRampToValueAtTime(0.3, startTime + duration - 0.05);
        gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
        break;
        
      default:
        osc.type = 'sine';
        gainNode.gain.setValueAtTime(0.5, startTime);
        gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
    }

    osc.start(startTime);
    osc.stop(startTime + duration);
    this.scheduledNotes.push(osc);
    
    // Cleanup reference after playing
    osc.onended = () => {
        const index = this.scheduledNotes.indexOf(osc);
        if (index > -1) {
            this.scheduledNotes.splice(index, 1);
        }
    };
  }
}

export const audioService = new AudioService();
