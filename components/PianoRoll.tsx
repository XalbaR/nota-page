import React from 'react';
import { NoteData } from '../types';

interface PianoRollProps {
  notes: NoteData[];
  isPlaying: boolean;
  onNoteClick?: (noteId: string) => void;
  editModeDuration?: number | null;
  activeNoteIndex?: number | null;
}

export const PianoRoll: React.FC<PianoRollProps> = ({ notes, onNoteClick, editModeDuration, activeNoteIndex }) => {
  if (notes.length === 0) {
    return (
      <div className="h-48 w-full bg-slate-800 rounded-lg flex items-center justify-center border-2 border-dashed border-slate-600 text-slate-400">
        Notaları görüntülemek için bir görsel yükleyin.
      </div>
    );
  }

  // Calculate grid
  const pitchMap: Record<string, number> = {};
  // Fix type inference by explicitly typing as string array and removing redundant initial sort
  const pitches: string[] = Array.from(new Set(notes.map(n => n.pitch).filter(p => p !== 'R')));
  
  // Custom sort for pitch (A3, B3, C4...) is complex, simplified lexical for now or mapped
  // Better: Extract octave and tone
  const getNoteValue = (note: string) => {
      const octave = parseInt(note.slice(-1)) || 0;
      const key = note.slice(0, -1);
      const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
      return octave * 12 + keys.indexOf(key);
  };

  const sortedUniquePitches = pitches.sort((a: string, b: string) => getNoteValue(b) - getNoteValue(a)); // Descending for display (high up)
  
  const MAX_WIDTH = 100; // arbitrary units
  const totalDuration = notes.reduce((acc, n) => acc + n.duration, 0);

  let currentPos = 0;
  
  return (
    <div className="w-full overflow-x-auto bg-slate-900 rounded-lg p-4 shadow-inner">
      <div className="relative" style={{ minWidth: '800px', height: `${Math.max(200, sortedUniquePitches.length * 40)}px` }}>
        {/* Background Grid Rows */}
        {sortedUniquePitches.map((pitch, idx) => (
           <div key={pitch} className="absolute w-full h-8 border-b border-slate-800 flex items-center" style={{ top: idx * 40 }}>
             <span className="text-xs text-slate-500 w-8 pl-1">{pitch}</span>
             <div className="flex-1 h-full bg-slate-900/50"></div>
           </div>
        ))}

        {/* Notes */}
        {notes.map((note, index) => {
           const widthPct = (note.duration / totalDuration) * 100;
           const leftPct = (currentPos / totalDuration) * 100;
           currentPos += note.duration;

           if (note.pitch === 'R') return null; // Skip rests in visual or show as gray block

           const pitchIndex = sortedUniquePitches.indexOf(note.pitch);
           if (pitchIndex === -1) return null;

           const isActive = index === activeNoteIndex;

           return (
             <div
               key={note.id}
               onClick={() => onNoteClick && onNoteClick(note.id)}
               className={`absolute h-6 rounded-sm border shadow-lg transition-all ${
                 isActive 
                    ? 'bg-green-500 border-green-300 shadow-green-500/50 scale-110 z-10' 
                    : 'bg-gradient-to-r from-indigo-500 to-purple-500 border-indigo-400'
               } ${
                 editModeDuration ? 'cursor-cell hover:bg-indigo-400 hover:border-white' : 'cursor-pointer hover:brightness-110'
               }`}
               title={`${note.pitch} (${note.duration}) - ${isActive ? 'Çaliyor' : 'Tıkla ve Düzenle'}`}
               style={{
                 left: `${leftPct}%`,
                 width: `${widthPct}%`,
                 top: `${pitchIndex * 40 + 4}px`, // +4 for vertical centering in 40px row
                 minWidth: '4px'
               }}
             />
           );
        })}
      </div>
    </div>
  );
};
