import { InstrumentType } from './types';

export const INSTRUMENT_LABELS: Record<InstrumentType, string> = {
  [InstrumentType.PIANO]: 'Piyano',
  [InstrumentType.GUITAR]: 'Gitar',
  [InstrumentType.VIOLIN]: 'Keman',
  [InstrumentType.FLUTE]: 'Flüt',
  [InstrumentType.SYNTH]: 'Synthesizer',
};

export const NOTE_DURATIONS = [
  { label: 'Tam (1/1)', value: 4, symbol: '𝅝' },
  { label: 'Yarım (1/2)', value: 2, symbol: '𝅗𝅥' },
  { label: 'Çeyrek (1/4)', value: 1, symbol: '♩' },
  { label: 'Sekizlik (1/8)', value: 0.5, symbol: '♪' },
  { label: 'Onaltılık (1/16)', value: 0.25, symbol: '𝅘𝅥𝅯' },
];

export const INITIAL_BPM = 120;

export const SOLFEGE_MAP: Record<string, string> = {
  'C': 'DO',
  'C#': 'DO#',
  'D': 'RE',
  'D#': 'RE#',
  'E': 'Mİ',
  'F': 'FA',
  'F#': 'FA#',
  'G': 'SOL',
  'G#': 'SOL#',
  'A': 'LA',
  'A#': 'LA#',
  'B': 'Sİ',
  'R': 'ES'
};
