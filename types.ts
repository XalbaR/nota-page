export enum InstrumentType {
  PIANO = 'PIANO',
  GUITAR = 'GUITAR',
  VIOLIN = 'VIOLIN',
  FLUTE = 'FLUTE',
  SYNTH = 'SYNTH'
}

export interface NoteData {
  id: string;
  pitch: string; // e.g., "C4", "D#5", "R" for rest
  duration: number; // 1.0 = quarter note, 0.5 = eighth note, etc.
  startTime?: number; // Calculated for visualization
}

export interface SongData {
  title: string;
  bpm: number;
  notes: NoteData[];
}

export interface AudioConfig {
  instrument: InstrumentType;
  bpm: number;
}
