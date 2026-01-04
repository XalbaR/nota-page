import React, { useState, useCallback, useRef, useEffect } from 'react';
import { InstrumentType, NoteData } from './types';
import { INITIAL_BPM, INSTRUMENT_LABELS, NOTE_DURATIONS } from './constants';
import { audioService } from './services/audioService';
import { analyzeSheetMusic, fileToGenerativePart } from './services/geminiService';
import { PianoRoll } from './components/PianoRoll';
import {  Play, Square, Music, Upload, Loader2, Wand2, Volume2, Clock, Activity } from 'lucide-react';

const App: React.FC = () => {
  const [bpm, setBpm] = useState(INITIAL_BPM);
  const [instrument, setInstrument] = useState<InstrumentType>(InstrumentType.PIANO);
  const [notes, setNotes] = useState<NoteData[]>([]);
  const [isAnalyzeLoading, setIsAnalyzeLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // New state for duration editing
  const [selectedDurationTool, setSelectedDurationTool] = useState<number | null>(null);
  const [playingNoteIndex, setPlayingNoteIndex] = useState<number | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Playback tracking effect
  useEffect(() => {
    if (!isPlaying) {
      setPlayingNoteIndex(null);
      return;
    }

    // Add a small delay to sync visually with audio start latency
    const startTime = Date.now() + 100;
    let animationFrameId: number;

    const tick = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      
      let currentTimeCursor = 0;
      let foundIndex = -1;
      const secPerBeat = 60 / bpm;

      for (let i = 0; i < notes.length; i++) {
        const noteDurationSec = notes[i].duration * secPerBeat;
        // Check if elapsed time is within this note's window
        if (elapsed >= currentTimeCursor && elapsed < currentTimeCursor + noteDurationSec) {
          foundIndex = i;
          break;
        }
        currentTimeCursor += noteDurationSec;
      }

      setPlayingNoteIndex(foundIndex);

      // Continue loop if we haven't exceeded total duration significantly
      if (elapsed < currentTimeCursor + 1) { 
         animationFrameId = requestAnimationFrame(tick);
      }
    };

    animationFrameId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, bpm, notes]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    if (!file.type.startsWith('image/')) {
      setError("Lütfen geçerli bir resim dosyası yükleyin.");
      return;
    }

    setIsAnalyzeLoading(true);
    setError(null);

    try {
      const base64Data = await fileToGenerativePart(file);
      const generatedNotes = await analyzeSheetMusic(base64Data, file.type);
      setNotes(generatedNotes);
    } catch (err) {
      setError("Nota analizi sırasında bir hata oluştu. Lütfen tekrar deneyin.");
      console.error(err);
    } finally {
      setIsAnalyzeLoading(false);
    }
  };

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      audioService.stop();
      setIsPlaying(false);
    } else {
      if (notes.length === 0) {
        setError("Çalınacak nota bulunamadı.");
        return;
      }
      setIsPlaying(true);
      audioService.playSequence(notes, bpm, instrument, () => {
        setIsPlaying(false);
      });
    }
  }, [isPlaying, notes, bpm, instrument]);

  const handleNoteChange = (id: string, field: keyof NoteData, value: string | number) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, [field]: value } : n));
  };

  const handlePianoRollClick = (noteId: string) => {
    if (selectedDurationTool !== null) {
      // If a duration tool is selected, apply it to the clicked note
      handleNoteChange(noteId, 'duration', selectedDurationTool);
      // Optional: Play a short tone to confirm change
      const note = notes.find(n => n.id === noteId);
      if (note) {
          audioService.playTone(note.pitch, instrument);
      }
    } else {
      // Just play the note preview if no tool selected
      const note = notes.find(n => n.id === noteId);
      if (note) {
          audioService.playTone(note.pitch, instrument);
      }
    }
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-purple-500 selection:text-white">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-tr from-purple-600 to-indigo-500 p-2 rounded-lg">
              <Music className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              NotaOku
            </h1>
          </div>
          <div className="text-sm text-slate-400 hidden sm:block">
            AI Destekli Optik Müzik Tanıma
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        
        {/* Main Controls Section */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Upload Card */}
          <div className="lg:col-span-1 bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-xl flex flex-col justify-center items-center text-center space-y-4">
            <div className="p-4 bg-slate-800 rounded-full">
              <Upload className="w-8 h-8 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Nota Görseli Yükle</h2>
              <p className="text-slate-400 text-sm mt-1">Yapay zeka notaları okusun</p>
            </div>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              className="hidden" 
              accept="image/*"
            />
            
            <button 
              onClick={triggerUpload}
              disabled={isAnalyzeLoading}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
            >
              {isAnalyzeLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analiz Ediliyor...
                </>
              ) : (
                <>
                  <Wand2 className="w-5 h-5" />
                  Görsel Seç
                </>
              )}
            </button>
            {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
          </div>

          {/* Playback Controls Card */}
          <div className="lg:col-span-2 bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Volume2 className="w-5 h-5 text-indigo-400" />
                Oynatma Kontrolü
              </h2>
              <div className={`px-3 py-1 rounded-full text-xs font-mono ${isPlaying ? 'bg-green-500/20 text-green-400 animate-pulse' : 'bg-slate-800 text-slate-500'}`}>
                {isPlaying ? 'ÇALIYOR' : 'DURDU'}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Enstrüman</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(INSTRUMENT_LABELS).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setInstrument(key as InstrumentType)}
                      className={`px-3 py-2 text-sm rounded-lg border transition-all ${
                        instrument === key 
                          ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-900/50' 
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750 hover:border-slate-600'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                 <div className="space-y-2">
                    <label className="text-xs uppercase tracking-wider text-slate-500 font-semibold flex justify-between">
                      <span>Tempo (BPM)</span>
                      <span className="text-white">{bpm}</span>
                    </label>
                    <input
                      type="range"
                      min="40"
                      max="240"
                      value={bpm}
                      onChange={(e) => setBpm(Number(e.target.value))}
                      className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                 </div>

                 <button
                  onClick={togglePlay}
                  disabled={notes.length === 0}
                  className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all ${
                    isPlaying 
                      ? 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20' 
                      : 'bg-green-500 text-slate-900 hover:bg-green-400 shadow-lg shadow-green-900/20'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isPlaying ? (
                    <>
                      <Square className="fill-current w-5 h-5" /> Durdur
                    </>
                  ) : (
                    <>
                      <Play className="fill-current w-5 h-5" /> Oynat
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Visualization & Editor */}
        <section className="space-y-4">
          
          {/* Active Note Display */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-lg relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-purple-500/5"></div>
             <div className="relative z-10 flex items-center gap-3">
               <div className={`w-3 h-3 rounded-full ${isPlaying ? 'bg-green-500 animate-pulse shadow-lg shadow-green-500/50' : 'bg-slate-600'}`} />
               <div className="flex flex-col">
                  <span className="text-slate-400 text-sm font-medium">Şu an Çalınan</span>
                  <span className="text-xs text-slate-500">{isPlaying ? 'Oynatılıyor...' : 'Bekleniyor'}</span>
               </div>
             </div>
             <div className="relative z-10 flex items-center gap-4">
                {playingNoteIndex !== null && notes[playingNoteIndex] ? (
                  <>
                     <div className="text-right">
                       <div className="text-4xl font-mono font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                         {notes[playingNoteIndex].pitch}
                       </div>
                     </div>
                     <Activity className="w-8 h-8 text-slate-700 animate-pulse" />
                  </>
                ) : (
                  <div className="text-4xl font-mono font-bold text-slate-700">--</div>
                )}
             </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
               <h2 className="text-xl font-bold text-white flex items-center gap-2">
                 <Clock className="w-5 h-5 text-indigo-400" />
                 Nota Düzenleyicisi
               </h2>
               <div className="text-sm text-slate-400 mt-1">
                  {notes.length} nota tespit edildi. Bir süre seçin ve değiştirmek için notaya tıklayın.
               </div>
            </div>

            {/* Note Duration Selector Toolbar */}
            <div className="flex flex-wrap gap-2 bg-slate-900 p-2 rounded-xl border border-slate-800">
               <button
                  onClick={() => setSelectedDurationTool(null)}
                  className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                     selectedDurationTool === null ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-800'
                  }`}
               >
                 Seçim Yok
               </button>
               <div className="w-px bg-slate-700 mx-1 self-center h-6"></div>
               {NOTE_DURATIONS.map((dur) => (
                 <button
                   key={dur.value}
                   onClick={() => setSelectedDurationTool(dur.value)}
                   className={`px-3 py-2 text-sm rounded-lg flex items-center gap-2 transition-all ${
                     selectedDurationTool === dur.value
                       ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                       : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                   }`}
                   title={`${dur.label} uygula`}
                 >
                   <span className="text-lg leading-none">{dur.symbol}</span>
                   <span className="hidden sm:inline text-xs font-medium">{dur.label.split(' ')[0]}</span>
                 </button>
               ))}
            </div>
          </div>
          
          <PianoRoll 
            notes={notes} 
            isPlaying={isPlaying} 
            onNoteClick={handlePianoRollClick}
            editModeDuration={selectedDurationTool}
            activeNoteIndex={playingNoteIndex}
          />

          {/* Detailed Note List Editor (Collapsible or Scrollable) */}
          {notes.length > 0 && (
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-400">
                  <thead className="bg-slate-950 text-slate-200 uppercase font-medium">
                    <tr>
                      <th className="px-6 py-3">#</th>
                      <th className="px-6 py-3">Nota (Pitch)</th>
                      <th className="px-6 py-3">Süre (Duration)</th>
                      <th className="px-6 py-3">Dinle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {notes.map((note, index) => (
                      <tr key={note.id} className={`transition-colors ${index === playingNoteIndex ? 'bg-indigo-900/30' : 'hover:bg-slate-800/50'}`}>
                        <td className="px-6 py-3">{index + 1}</td>
                        <td className="px-6 py-3">
                          <input 
                            type="text" 
                            value={note.pitch}
                            onChange={(e) => handleNoteChange(note.id, 'pitch', e.target.value.toUpperCase())}
                            className="bg-transparent border border-slate-700 rounded px-2 py-1 text-white w-20 focus:border-indigo-500 outline-none"
                          />
                        </td>
                        <td className="px-6 py-3">
                           <select
                            value={note.duration}
                            onChange={(e) => handleNoteChange(note.id, 'duration', parseFloat(e.target.value))}
                            className="bg-transparent border border-slate-700 rounded px-2 py-1 text-white focus:border-indigo-500 outline-none"
                           >
                             {NOTE_DURATIONS.map(d => (
                               <option key={d.value} value={d.value}>{d.symbol} {d.label}</option>
                             ))}
                           </select>
                        </td>
                        <td className="px-6 py-3">
                          <button 
                             onClick={() => audioService.playTone(note.pitch, instrument)}
                             className="p-1 hover:text-indigo-400 transition-colors"
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default App;
