import React, { useState, useRef } from 'react';
import { X, Music, Play, Square, Download, Sparkles, FileText, Printer } from 'lucide-react';
import { RecordedPerformance } from '../types';
import { audioEngine } from '../utils/audioEngine';
import { downloadMidiFile } from '../utils/midiExport';

interface PartituraModalProps {
  isOpen: boolean;
  onClose: () => void;
  performance: RecordedPerformance | null;
}

// Map note name (e.g. "C4", "F#4") to vertical staff offset for treble/bass clef
function getNoteStaffPosition(noteName: string): { clef: 'treble' | 'bass'; yOffset: number; accidental?: string } {
  const noteMatch = noteName.match(/^([A-G])([#b]?)(-?\d+)$/);
  if (!noteMatch) return { clef: 'treble', yOffset: 0 };

  const [, letter, accidental, octStr] = noteMatch;
  const octave = parseInt(octStr, 10);
  
  let baseVal = 0;
  const noteWeights: Record<string, number> = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };
  baseVal = (octave - 4) * 7 + (noteWeights[letter] || 0);

  if (octave >= 4) {
    const c4Offset = 45;
    const stepPx = 5.5;
    const yOffset = c4Offset - (baseVal * stepPx);
    return { clef: 'treble', yOffset, accidental: accidental || undefined };
  } else {
    const c4BassOffset = 12;
    const stepPx = 5.5;
    const diffFromC4 = ((4 - octave) * 7) + (noteWeights['C'] - (noteWeights[letter] || 0));
    const yOffset = c4BassOffset + (diffFromC4 * stepPx);
    return { clef: 'bass', yOffset, accidental: accidental || undefined };
  }
}

export const PartituraModal: React.FC<PartituraModalProps> = ({ isOpen, onClose, performance }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [activeNoteIndices, setActiveNoteIndices] = useState<Set<number>>(new Set());
  const timeoutsRef = useRef<number[]>([]);

  if (!isOpen || !performance) return null;

  const stopPlayback = () => {
    timeoutsRef.current.forEach((id) => window.clearTimeout(id));
    timeoutsRef.current = [];
    setIsPlaying(false);
    setPlaybackProgress(0);
    setActiveNoteIndices(new Set());
  };

  const handlePlay = () => {
    if (isPlaying) {
      stopPlayback();
      return;
    }

    if (!performance.notes || performance.notes.length === 0) return;

    audioEngine.init();
    audioEngine.setPatch(performance.patch || 'Concert Grand V2');
    setIsPlaying(true);

    const minTimestamp = performance.notes.length > 0 ? Math.min(...performance.notes.map((n) => n.timestamp)) : 0;
    const startTime = Math.max(0, minTimestamp - 400); // Start slightly before the first note

    const maxNoteEnd = performance.notes.reduce((max, n) => Math.max(max, n.timestamp + (n.duration || 500)), 0);
    const timeSpan = Math.max(1500, maxNoteEnd - startTime + 600);
    const totalDurationMs = timeSpan;

    const perfStart = window.performance.now();
    const interval = window.setInterval(() => {
      const elapsedReal = window.performance.now() - perfStart;
      const currentTimelineMs = startTime + elapsedReal;
      const progress = Math.min(100, Math.max(0, ((currentTimelineMs - startTime) / timeSpan) * 100));
      setPlaybackProgress(progress);

      // Compute active notes
      const active = new Set<number>();
      performance.notes.forEach((n, idx) => {
        const noteEnd = n.timestamp + Math.max(n.duration || 300, 350);
        if (currentTimelineMs >= n.timestamp && currentTimelineMs <= noteEnd) {
          active.add(idx);
        }
      });
      setActiveNoteIndices(active);

      if (elapsedReal >= totalDurationMs) {
        clearInterval(interval);
        setIsPlaying(false);
        setPlaybackProgress(0);
        setActiveNoteIndices(new Set());
      }
    }, 25);
    timeoutsRef.current.push(interval);

    performance.notes.forEach((n, idx) => {
      const delay = Math.max(0, n.timestamp - startTime);
      const noteTimeout = window.setTimeout(() => {
        const stopFn = audioEngine.playNote(n.note, n.velocity, n.transpose || 0);
        const stopTimeout = window.setTimeout(() => {
          stopFn();
        }, n.duration || 400);
        timeoutsRef.current.push(stopTimeout);
      }, delay);
      timeoutsRef.current.push(noteTimeout);
    });
  };

  const handleDownloadMidi = () => {
    downloadMidiFile(performance);
  };

  const handlePrint = () => {
    window.print();
  };

  const minTimestamp = performance.notes.length > 0 ? Math.min(...performance.notes.map(n => n.timestamp)) : 0;
  const startTime = Math.max(0, minTimestamp - 400);
  const maxNoteEnd = performance.notes.length > 0 ? performance.notes.reduce((max, n) => Math.max(max, n.timestamp + (n.duration || 500)), 0) : 1000;
  const timeSpan = Math.max(1500, maxNoteEnd - startTime + 600);

  // Chunk notes into systems of ~12 notes each for Full Score (Partitura Completa) multi-system layout
  const NOTES_PER_SYSTEM = 12;
  const systems: typeof performance.notes[] = [];
  for (let i = 0; i < performance.notes.length; i += NOTES_PER_SYSTEM) {
    systems.push(performance.notes.slice(i, i + NOTES_PER_SYSTEM));
  }
  // Ensure at least one empty system if no notes
  if (systems.length === 0) {
    systems.push([]);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
      <div className="bg-[#181b24] border border-[#00d2ff]/40 w-full max-w-5xl h-[92vh] rounded-3xl flex flex-col shadow-2xl overflow-hidden text-[#e1e2ea]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#252a38] flex items-center justify-between bg-[#13161f]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#00d2ff] to-[#7928ca] flex items-center justify-center shadow-lg shadow-[#00d2ff]/20">
              <Music className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-headline font-bold text-white text-lg flex items-center gap-2">
                Partitura Completa (Full Sheet Music Score) <Sparkles className="w-4 h-4 text-[#00d2ff]" />
              </h2>
              <p className="text-xs text-[#94a3b8]">
                {performance.title} • {performance.key} • {performance.bpm} BPM • {performance.totalNotes} notes • {systems.length} systems
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopPlayback();
              onClose();
            }}
            className="w-9 h-9 rounded-lg bg-[#252a38] text-[#94a3b8] hover:text-white hover:bg-[#32384a] flex items-center justify-center transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="px-6 py-3 bg-[#111319] border-b border-[#252a38] flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={handlePlay}
              className={`px-4 py-2 rounded-xl font-headline text-xs font-bold flex items-center gap-2 shadow-lg transition-all ${
                isPlaying
                  ? 'bg-amber-500 text-black shadow-amber-500/30'
                  : 'bg-[#00d2ff] text-[#111319] hover:bg-[#45d1f6] shadow-[#00d2ff]/20'
              }`}
            >
              {isPlaying ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
              {isPlaying ? 'Stop Audio' : 'Play Score with Sync'}
            </button>

            <button
              onClick={handleDownloadMidi}
              className="px-4 py-2 rounded-xl bg-[#252a38] hover:bg-[#32384a] text-white font-headline text-xs font-bold flex items-center gap-2 border border-[#32384a]"
            >
              <Download className="w-4 h-4 text-[#00d2ff]" /> Export MIDI
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-[#252a38] hover:bg-[#32384a] text-white font-headline text-xs font-bold flex items-center gap-2 border border-[#32384a]"
            >
              <Printer className="w-4 h-4 text-[#00d2ff]" /> Print Full Score
            </button>
          </div>

          <div className="text-xs text-[#94a3b8] flex items-center gap-4">
            <span>Patch: <strong className="text-white">{performance.patch}</strong></span>
            <span>Date: <strong className="text-white">{performance.date}</strong></span>
          </div>
        </div>

        {/* Sheet Music Score Sheet (Multi-System Grand Staff Full Score) */}
        <div className="flex-1 overflow-y-auto p-8 bg-[#f2f4f8] text-[#111319] flex flex-col items-center">
          
          {/* Paper Sheet Container */}
          <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-gray-200 p-10 flex flex-col space-y-10 relative">
            
            {/* Sheet Music Header */}
            <div className="text-center space-y-1.5 border-b border-gray-300 pb-6">
              <h1 className="font-headline font-extrabold text-3xl tracking-tight text-gray-900">{performance.title}</h1>
              <div className="flex items-center justify-center gap-6 text-xs font-medium text-gray-600 uppercase tracking-widest pt-1">
                <span>Key: {performance.key}</span>
                <span>•</span>
                <span>Tempo: {performance.bpm} BPM</span>
                <span>•</span>
                <span>Time Sig: 4/4</span>
                <span>•</span>
                <span>Total Notes: {performance.totalNotes}</span>
              </div>
            </div>

            {/* Multi-System Full Score Layout */}
            <div className="space-y-12">
              {systems.map((systemNotes, sysIndex) => {
                // Calculate global index offset for active note highlighting
                const globalOffset = sysIndex * NOTES_PER_SYSTEM;

                return (
                  <div key={`system-${sysIndex}`} className="relative space-y-2">
                    {/* System Header / Measure Number */}
                    <div className="flex justify-between items-center text-xs text-gray-400 font-mono px-2">
                      <span>System {sysIndex + 1} (Bars {sysIndex * 2 + 1}-{sysIndex * 2 + 2})</span>
                      <span>Duration: {Math.round(timeSpan / 1000)}s total</span>
                    </div>

                    {/* Grand Staff Box */}
                    <div className="relative w-full h-[240px] bg-white border-2 border-gray-800 rounded-xl overflow-hidden shadow-sm flex flex-col justify-between py-6 px-4">
                      
                      {/* Playback Progress Line (Global across all systems based on progress percentage) */}
                      {isPlaying && (
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-[#00d2ff] z-30 transition-all duration-75 shadow-[0_0_12px_#00d2ff]"
                          style={{ left: `${playbackProgress}%` }}
                        />
                      )}

                      {/* Treble Staff (G Clef) */}
                      <div className="relative w-full h-[70px] flex flex-col justify-between py-1">
                        {[0, 1, 2, 3, 4].map((i) => (
                          <div key={`treble-line-${sysIndex}-${i}`} className="w-full h-[1px] bg-gray-800" />
                        ))}

                        {/* Clef & Time Signature */}
                        <div className="absolute left-3 -top-2 flex items-center gap-2 select-none pointer-events-none">
                          <span className="font-serif font-bold text-4xl text-gray-900">𝄞</span>
                          <div className="flex flex-col text-[11px] font-bold font-mono text-gray-800 leading-none">
                            <span>4</span>
                            <span>4</span>
                          </div>
                        </div>

                        {/* Render Treble Notes in this system */}
                        <div className="absolute inset-0 left-24 right-6 pointer-events-none">
                          {systemNotes.map((note, sIdx) => {
                            const globalIdx = globalOffset + sIdx;
                            const pos = getNoteStaffPosition(note.note);
                            if (pos.clef !== 'treble') return null;
                            const leftPct = Math.min(96, Math.max(4, ((note.timestamp - startTime) / timeSpan) * 100));
                            const isActive = activeNoteIndices.has(globalIdx);

                            return (
                              <div
                                key={`t-note-${globalIdx}`}
                                className={`absolute flex flex-col items-center transition-all duration-150 ${
                                  isActive ? 'scale-125 z-40' : ''
                                }`}
                                style={{ left: `${leftPct}%`, top: `${pos.yOffset}px` }}
                              >
                                {pos.accidental && (
                                  <span className={`absolute -left-3 -top-1 text-xs font-bold ${isActive ? 'text-[#00d2ff]' : 'text-gray-800'}`}>
                                    {pos.accidental}
                                  </span>
                                )}
                                <div
                                  className={`w-3.5 h-2.5 rounded-full shadow-sm transform -rotate-12 border relative transition-all duration-150 ${
                                    isActive
                                      ? 'bg-[#00d2ff] border-white shadow-[0_0_14px_#00d2ff]'
                                      : 'bg-gray-900 border-black'
                                  }`}
                                >
                                  <div className={`absolute -right-[2px] -top-6 w-[1.5px] h-7 ${isActive ? 'bg-[#00d2ff]' : 'bg-gray-900'}`} />
                                </div>
                                <span
                                  className={`absolute top-3 text-[9px] font-mono font-bold transition-all ${
                                    isActive ? 'text-[#00d2ff] bg-black/90 px-1.5 py-0.5 rounded shadow' : 'text-gray-600'
                                  }`}
                                >
                                  {note.note}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Grand Staff Connecting Brace */}
                      <div className="absolute left-14 top-12 bottom-12 w-3 border-l-2 border-t-2 border-b-2 border-gray-900 rounded-l-md pointer-events-none" />

                      {/* Bass Staff (F Clef) */}
                      <div className="relative w-full h-[70px] flex flex-col justify-between py-1">
                        {[0, 1, 2, 3, 4].map((i) => (
                          <div key={`bass-line-${sysIndex}-${i}`} className="w-full h-[1px] bg-gray-800" />
                        ))}

                        {/* Clef & Time Signature */}
                        <div className="absolute left-3 -top-1 flex items-center gap-2 select-none pointer-events-none">
                          <span className="font-serif font-bold text-3xl text-gray-900">𝄢</span>
                          <div className="flex flex-col text-[11px] font-bold font-mono text-gray-800 leading-none">
                            <span>4</span>
                            <span>4</span>
                          </div>
                        </div>

                        {/* Render Bass Notes in this system */}
                        <div className="absolute inset-0 left-24 right-6 pointer-events-none">
                          {systemNotes.map((note, sIdx) => {
                            const globalIdx = globalOffset + sIdx;
                            const pos = getNoteStaffPosition(note.note);
                            if (pos.clef !== 'bass') return null;
                            const leftPct = Math.min(96, Math.max(4, ((note.timestamp - startTime) / timeSpan) * 100));
                            const isActive = activeNoteIndices.has(globalIdx);

                            return (
                              <div
                                key={`b-note-${globalIdx}`}
                                className={`absolute flex flex-col items-center transition-all duration-150 ${
                                  isActive ? 'scale-125 z-40' : ''
                                }`}
                                style={{ left: `${leftPct}%`, top: `${pos.yOffset}px` }}
                              >
                                {pos.accidental && (
                                  <span className={`absolute -left-3 -top-1 text-xs font-bold ${isActive ? 'text-[#00d2ff]' : 'text-gray-800'}`}>
                                    {pos.accidental}
                                  </span>
                                )}
                                <div
                                  className={`w-3.5 h-2.5 rounded-full shadow-sm transform -rotate-12 border relative transition-all duration-150 ${
                                    isActive
                                      ? 'bg-[#00d2ff] border-white shadow-[0_0_14px_#00d2ff]'
                                      : 'bg-gray-900 border-black'
                                  }`}
                                >
                                  <div className={`absolute -right-[2px] -top-6 w-[1.5px] h-7 ${isActive ? 'bg-[#00d2ff]' : 'bg-gray-900'}`} />
                                </div>
                                <span
                                  className={`absolute top-3 text-[9px] font-mono font-bold transition-all ${
                                    isActive ? 'text-[#00d2ff] bg-black/90 px-1.5 py-0.5 rounded shadow' : 'text-gray-600'
                                  }`}
                                >
                                  {note.note}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>

            {/* Note Sequence Table Summary */}
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 space-y-3 mt-6">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#00d2ff]" /> Full Score Note Table ({performance.notes.length} notes transcribed)
              </h3>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1">
                {performance.notes.map((n, i) => {
                  const isActive = activeNoteIndices.has(i);
                  return (
                    <span
                      key={i}
                      className={`px-3 py-1.5 rounded-lg border font-mono text-xs shadow-xs flex items-center gap-2 transition-all duration-150 ${
                        isActive
                          ? 'bg-[#00d2ff] text-white border-[#00d2ff] shadow-[0_0_12px_#00d2ff] scale-110'
                          : 'bg-white border-gray-200 text-gray-800'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-white' : 'bg-[#00d2ff]'}`} />
                      <strong>#{i + 1}: {n.note}</strong>
                      <span className={`text-[10px] ${isActive ? 'text-white/80' : 'text-gray-400'}`}>({n.duration}ms)</span>
                    </span>
                  );
                })}
              </div>
            </div>

          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#252a38] bg-[#13161f] flex justify-between items-center">
          <p className="text-xs text-[#94a3b8]">AriaKeys Precision Atelier • Complete Score Transcription Engine</p>
          <button
            onClick={() => {
              stopPlayback();
              onClose();
            }}
            className="px-6 py-2.5 rounded-xl bg-[#00d2ff] text-[#111319] font-bold text-xs hover:bg-[#45d1f6] transition-all"
          >
            Close Score
          </button>
        </div>

      </div>
    </div>
  );
};
