import React, { useState, useEffect, useRef } from 'react';
import { RecordedPerformance, RecordedNote, InstrumentPatch } from '../types';
import { audioEngine } from '../utils/audioEngine';
import { downloadMidiFile } from '../utils/midiExport';

interface SaveRecordingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (recording: RecordedPerformance) => void;
  recordedNotes: RecordedNote[];
  durationSec: number;
  bpm: number;
  keyName: string;
  patch: InstrumentPatch;
  songTitle?: string;
  onViewInLibrary?: () => void;
  onViewPartitura?: (recording: RecordedPerformance) => void;
}

export const SaveRecordingModal: React.FC<SaveRecordingModalProps> = ({
  isOpen,
  onClose,
  onSave,
  recordedNotes,
  durationSec,
  bpm,
  keyName,
  patch,
  songTitle = 'Live Practice',
  onViewInLibrary,
  onViewPartitura,
}) => {
  const [title, setTitle] = useState('');
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [isSavedSuccessfully, setIsSavedSuccessfully] = useState(false);
  const [savedPerformanceRef, setSavedPerformanceRef] = useState<RecordedPerformance | null>(null);
  const previewTimeoutsRef = useRef<number[]>([]);

  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setTitle(`Performance - ${songTitle} (${timeStr})`);
      setIsSavedSuccessfully(false);
      setIsPlayingPreview(false);
      setPlaybackProgress(0);
    } else {
      stopPreview();
    }
  }, [isOpen, songTitle]);

  const stopPreview = () => {
    previewTimeoutsRef.current.forEach((id) => window.clearTimeout(id));
    previewTimeoutsRef.current = [];
    setIsPlayingPreview(false);
    setPlaybackProgress(0);
  };

  const handleTogglePreview = () => {
    if (isPlayingPreview) {
      stopPreview();
      return;
    }

    if (recordedNotes.length === 0) return;

    audioEngine.init();
    audioEngine.setPatch(patch);
    setIsPlayingPreview(true);

    const totalDurationMs = Math.max(
      durationSec * 1000,
      recordedNotes.reduce((max, n) => Math.max(max, n.timestamp + n.duration), 0)
    );

    const start = performance.now();
    const interval = window.setInterval(() => {
      const elapsed = performance.now() - start;
      const progress = Math.min(100, (elapsed / totalDurationMs) * 100);
      setPlaybackProgress(progress);
      if (elapsed >= totalDurationMs) {
        clearInterval(interval);
        setIsPlayingPreview(false);
        setPlaybackProgress(0);
      }
    }, 50);
    previewTimeoutsRef.current.push(interval);

    recordedNotes.forEach((n) => {
      const noteTimeout = window.setTimeout(() => {
        const stopFn = audioEngine.playNote(n.note, n.velocity, n.transpose || 0);
        const stopTimeout = window.setTimeout(() => {
          stopFn();
        }, n.duration);
        previewTimeoutsRef.current.push(stopTimeout);
      }, n.timestamp);
      previewTimeoutsRef.current.push(noteTimeout);
    });
  };

  const handleSave = () => {
    stopPreview();
    const now = new Date();
    const dateFormatted = `${now.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} • ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    const newRecord: RecordedPerformance = {
      id: `rec-${Date.now()}`,
      title: title.trim() || `Performance Take - ${songTitle}`,
      date: dateFormatted,
      durationSec: Math.max(1, durationSec),
      bpm,
      key: keyName,
      patch,
      songRefTitle: songTitle,
      notes: [...recordedNotes],
      totalNotes: recordedNotes.length,
    };

    onSave(newRecord);
    setSavedPerformanceRef(newRecord);
    setIsSavedSuccessfully(true);
  };

  const handleDownloadMidi = () => {
    const tempRecord: RecordedPerformance = {
      id: `rec-${Date.now()}`,
      title: title.trim() || `Performance Take - ${songTitle}`,
      date: new Date().toLocaleDateString(),
      durationSec: Math.max(1, durationSec),
      bpm,
      key: keyName,
      patch,
      songRefTitle: songTitle,
      notes: [...recordedNotes],
      totalNotes: recordedNotes.length,
    };
    downloadMidiFile(tempRecord);
  };

  if (!isOpen) return null;

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-[#1d2025] border border-[#232e42] rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl text-[#e1e2ea]">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#ffbd58] text-[22px]">
              fiber_manual_record
            </span>
            <h3 className="font-headline text-[18px] font-bold text-[#e1e2ea]">
              {isSavedSuccessfully ? 'Performance Saved!' : 'Save Performance Take'}
            </h3>
          </div>
          <button
            onClick={() => {
              stopPreview();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-[#272a30] hover:bg-[#32353b] text-[#bbc9cf] hover:text-[#e1e2ea] flex items-center justify-center transition-colors cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {isSavedSuccessfully ? (
          <div className="space-y-4 py-2">
            <div className="p-4 bg-[#0b0e13] rounded-2xl border border-[#10b981]/40 flex flex-col items-center justify-center text-center space-y-2">
              <span className="w-12 h-12 rounded-full bg-[#10b981]/20 text-[#10b981] flex items-center justify-center">
                <span className="material-symbols-outlined text-[28px]">check_circle</span>
              </span>
              <h4 className="font-headline text-[16px] font-bold text-[#e1e2ea]">
                Saved to 'My Recordings'
              </h4>
              <p className="font-sans text-[12px] text-[#bbc9cf]">
                Your sequence of {recordedNotes.length} notes has been securely archived in your local library.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadMidi}
                  className="py-2.5 px-3 rounded-xl bg-[#272a30] hover:bg-[#32353b] text-[#ffbd58] border border-[#ffbd58]/30 font-headline text-[13px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                  type="button"
                  title="Download .MID standard MIDI file"
                >
                  <span className="material-symbols-outlined text-[16px]">download</span>
                  <span>MIDI</span>
                </button>
                <button
                  onClick={() => {
                    if (savedPerformanceRef && onViewPartitura) {
                      onViewPartitura(savedPerformanceRef);
                    }
                  }}
                  className="py-2.5 px-3 rounded-xl bg-[#272a30] hover:bg-[#32353b] text-[#00d2ff] border border-[#00d2ff]/30 font-headline text-[13px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                  type="button"
                  title="View Sheet Music Score (Partitura)"
                >
                  <span className="material-symbols-outlined text-[16px]">queue_music</span>
                  <span>Partitura</span>
                </button>
                <button
                  onClick={() => {
                    onClose();
                    if (onViewInLibrary) onViewInLibrary();
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-[#00d2ff] hover:bg-[#45d1f6] text-[#001f28] font-headline text-[13px] font-extrabold flex items-center justify-center gap-1 shadow-[0_0_16px_rgba(0,210,255,0.4)] cursor-pointer"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[16px]">library_music</span>
                  Library
                </button>
              </div>
              <button
                onClick={onClose}
                className="w-full py-2 rounded-xl bg-[#272a30] hover:bg-[#32353b] text-[#e1e2ea] font-headline text-[12px] font-semibold cursor-pointer"
                type="button"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Title Input */}
            <div>
              <label className="block font-telemetry text-[11px] uppercase tracking-wider text-[#bbc9cf] mb-1.5">
                Recording Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Name your performance take..."
                className="w-full bg-[#0b0e13] border border-[#232e42] focus:border-[#00d2ff] px-3.5 py-2.5 rounded-xl text-[#e1e2ea] font-headline text-[14px] focus:outline-none transition-colors"
              />
            </div>

            {/* Performance Telemetry Grid */}
            <div className="grid grid-cols-2 gap-2 bg-[#0b0e13] p-3 rounded-2xl border border-[#232e42]">
              <div className="flex items-center gap-2 p-1.5">
                <span className="material-symbols-outlined text-[#00d2ff] text-[18px]">schedule</span>
                <div className="flex flex-col">
                  <span className="font-telemetry text-[10px] text-[#859399] uppercase">Duration</span>
                  <span className="font-telemetry text-[12px] font-bold text-[#e1e2ea]">
                    {formatTime(durationSec)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 p-1.5">
                <span className="material-symbols-outlined text-[#ffbd58] text-[18px]">music_note</span>
                <div className="flex flex-col">
                  <span className="font-telemetry text-[10px] text-[#859399] uppercase">Notes Played</span>
                  <span className="font-telemetry text-[12px] font-bold text-[#e1e2ea]">
                    {recordedNotes.length} notes
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 p-1.5">
                <span className="material-symbols-outlined text-[#00d2ff] text-[18px]">piano</span>
                <div className="flex flex-col">
                  <span className="font-telemetry text-[10px] text-[#859399] uppercase">Instrument</span>
                  <span className="font-telemetry text-[12px] font-bold text-[#e1e2ea] truncate max-w-[120px]">
                    {patch}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 p-1.5">
                <span className="material-symbols-outlined text-[#ffbd58] text-[18px]">speed</span>
                <div className="flex flex-col">
                  <span className="font-telemetry text-[10px] text-[#859399] uppercase">Tempo &amp; Key</span>
                  <span className="font-telemetry text-[12px] font-bold text-[#e1e2ea]">
                    {bpm} BPM • {keyName}
                  </span>
                </div>
              </div>
            </div>

            {/* Preview Audition Player */}
            <div className="bg-[#191c21] p-3 rounded-2xl border border-[#232e42] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-telemetry text-[11px] text-[#bbc9cf] uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px] text-[#00d2ff]">headphones</span>
                  Audition Take
                </span>
                <button
                  onClick={handleTogglePreview}
                  className={`flex items-center gap-1 px-3 py-1 rounded-full font-headline text-[11px] font-bold transition-all cursor-pointer ${
                    isPlayingPreview
                      ? 'bg-[#ffbd58] text-[#001f28] shadow-[0_0_10px_#ffbd58]'
                      : 'bg-[#272a30] hover:bg-[#32353b] text-[#00d2ff] border border-[#00d2ff]/40'
                  }`}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {isPlayingPreview ? 'stop' : 'play_arrow'}
                  </span>
                  {isPlayingPreview ? 'Stop Audio' : 'Play Take'}
                </button>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1.5 rounded-full bg-[#0b0e13] overflow-hidden relative border border-[#232e42]">
                <div
                  className="h-full bg-gradient-to-r from-[#00d2ff] to-[#ffbd58] transition-all duration-100"
                  style={{ width: `${playbackProgress}%` }}
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-2 pt-1 flex-wrap sm:flex-nowrap">
              <button
                onClick={() => {
                  stopPreview();
                  onClose();
                }}
                className="py-2.5 px-3 rounded-xl bg-[#272a30] hover:bg-[#32353b] text-[#bbc9cf] hover:text-[#e1e2ea] font-headline text-[13px] font-semibold transition-colors cursor-pointer"
                type="button"
              >
                Discard
              </button>
              <button
                onClick={handleDownloadMidi}
                className="py-2.5 px-3 rounded-xl bg-[#272a30] hover:bg-[#32353b] text-[#ffbd58] border border-[#ffbd58]/30 font-headline text-[13px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                type="button"
                title="Download .MID standard MIDI file"
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
                <span>.MID</span>
              </button>
              <button
                onClick={handleSave}
                disabled={recordedNotes.length === 0}
                className="flex-1 py-2.5 rounded-xl bg-[#00d2ff] hover:bg-[#45d1f6] disabled:opacity-50 text-[#001f28] font-headline text-[13px] font-extrabold shadow-[0_0_16px_rgba(0,210,255,0.4)] transition-all cursor-pointer"
                type="button"
              >
                Save Take
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
