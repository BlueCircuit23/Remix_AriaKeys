import React, { useState, useEffect, useRef } from 'react';
import {
  Song,
  InstrumentPatch,
  RecordedNote,
  RecordedPerformance,
  KeyLabelMode,
  PracticeMode,
  ScaleGuide,
  BluetoothLatencyConfig,
} from '../types';
import { audioEngine, midiNumberToNote } from '../utils/audioEngine';
import {
  MetronomeModal,
  TimeSignature,
  MetronomeTimbre,
  getTempoName,
} from './MetronomeModal';
import { SaveRecordingModal } from './SaveRecordingModal';
import { AudioSettingsModal } from './AudioSettingsModal';
import { detectChord, DetectedChord } from '../utils/chordDetector';

interface PlayScreenProps {
  currentSong: Song;
  onSongChange: (song: Song) => void;
  onSaveRecording?: (recording: RecordedPerformance) => void;
  onNavigateToLibrary?: () => void;
  onOpenStudioDrawer?: () => void;
  selectedPatch?: InstrumentPatch;
  onPatchChange?: (patch: InstrumentPatch) => void;
  bluetoothConfig?: BluetoothLatencyConfig;
  onViewPartitura?: (recording: RecordedPerformance) => void;
}

const TIME_SIG_BEATS: Record<TimeSignature, { count: number; defaultAccents: boolean[] }> = {
  '2/4': { count: 2, defaultAccents: [true, false] },
  '3/4': { count: 3, defaultAccents: [true, false, false] },
  '4/4': { count: 4, defaultAccents: [true, false, false, false] },
  '6/8': { count: 6, defaultAccents: [true, false, false, true, false, false] },
};

const ALL_PATCHES: InstrumentPatch[] = [
  'Concert Grand V2',
  'Intimate Felt Upright',
  'Bright Pop Yamaha C7',
  'Honky-Tonk Saloon',
  'Rhodes Mk8',
  'Wurlitzer 200A',
  'Clavinet D6 Funk',
  'Yamaha DX7 FM Ballad',
  'Harpsichord Baroque',
  'Cathedral Pipe Organ',
  'Hammond B3 Tonewheel',
  'Celestial Synth',
  '80s Synthwave DX',
  'Blade Runner CS-80',
  'Celesta & Music Box',
  'Lo-Fi Vinyl Tape',
  'Jazz Vibraphone',
  'Upright Studio',
];

const SOLFEGE_MAP: Record<string, string> = {
  C: 'Do',
  'C#': 'Do♯',
  D: 'Re',
  'D#': 'Re♯',
  E: 'Mi',
  F: 'Fa',
  'F#': 'Fa♯',
  G: 'Sol',
  'G#': 'Sol♯',
  A: 'La',
  'A#': 'La♯',
  B: 'Si',
};

const KEYBOARD_SHORTCUTS_WHITE: string[] = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', "'", 'Z', 'X', 'C', 'V'];
const KEYBOARD_SHORTCUTS_BLACK: Record<string, string> = {
  'C#': 'W',
  'D#': 'E',
  'F#': 'T',
  'G#': 'Y',
  'A#': 'U',
};

const SCALE_NOTES: Record<ScaleGuide, string[]> = {
  none: [],
  'C Major': ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
  'A Minor': ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
  'G Major': ['G', 'A', 'B', 'C', 'D', 'E', 'F#'],
  Pentatonic: ['C', 'D', 'E', 'G', 'A'],
  Blues: ['C', 'D#', 'F', 'F#', 'G', 'A#'],
};

export const PlayScreen: React.FC<PlayScreenProps> = ({
  currentSong,
  onSongChange: _onSongChange,
  onSaveRecording,
  onNavigateToLibrary,
  onOpenStudioDrawer,
  selectedPatch: propSelectedPatch,
  onPatchChange: propOnPatchChange,
  bluetoothConfig,
  onViewPartitura,
}) => {
  // Sound Engine state
  const [selectedPatch, setSelectedPatch] = useState<InstrumentPatch>(
    propSelectedPatch || 'Concert Grand V2'
  );

  useEffect(() => {
    if (propSelectedPatch && propSelectedPatch !== selectedPatch) {
      setSelectedPatch(propSelectedPatch);
    }
  }, [propSelectedPatch]);

  const handleSelectPatch = (patch: InstrumentPatch) => {
    setSelectedPatch(patch);
    audioEngine.setPatch(patch);
    if (propOnPatchChange) {
      propOnPatchChange(patch);
    }
    setIsPatchMenuOpen(false);
  };
  const [isPatchMenuOpen, setIsPatchMenuOpen] = useState(false);
  const [bpm, setBpm] = useState(currentSong.bpm || 76);
  const [transpose, setTranspose] = useState(0);
  const [isSustain, setIsSustain] = useState(true);
  const [baseOctave, setBaseOctave] = useState(3); // C3 - C5
  const [isPlayingWaterfall, setIsPlayingWaterfall] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(0.75);
  const [handFilter, setHandFilter] = useState<'both' | 'L' | 'R'>('both');
  const [currentBar, setCurrentBar] = useState(16);
  const [liveVelocity, setLiveVelocity] = useState(112);
  const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set());

  // Interactive Learning & Practice Controls
  const [practiceMode, setPracticeMode] = useState<PracticeMode>('flow');
  const [keyLabelMode, setKeyLabelMode] = useState<KeyLabelMode>('notes');
  const [scaleGuide, setScaleGuide] = useState<ScaleGuide>('none');
  const [loopSection, setLoopSection] = useState<'all' | '1-4' | '5-8' | '9-12' | '13-16'>('all');
  const [isAudioSettingsOpen, setIsAudioSettingsOpen] = useState(false);
  const [isScaleMenuOpen, setIsScaleMenuOpen] = useState(false);
  const [isLoopMenuOpen, setIsLoopMenuOpen] = useState(false);

  // Score & Combo Streak
  const [score, setScore] = useState(14850);
  const [combo, setCombo] = useState(12);
  const [hitFeedback, setHitFeedback] = useState<{ text: string; id: number } | null>(null);

  // Detected chord in real time
  const [detectedChord, setDetectedChord] = useState<DetectedChord | null>(null);

  // Waterfall animation offset
  const [streamProgress, setStreamProgress] = useState(0);
  const [isWaitingForNote, setIsWaitingForNote] = useState(false);
  const currentTargetNote = 'E4';

  // Metronome & Tempo state
  const [timeSignature, setTimeSignature] = useState<TimeSignature>('4/4');
  const [accentBeats, setAccentBeats] = useState<boolean[]>([true, false, false, false]);
  const [isAccentEnabled, setIsAccentEnabled] = useState<boolean>(true);
  const [isMetronomeAudible, setIsMetronomeAudible] = useState<boolean>(true);
  const [metronomeVolume, setMetronomeVolume] = useState<number>(0.4);
  const [metronomeTimbre, setMetronomeTimbre] = useState<MetronomeTimbre>('acoustic');
  const [isMetronomeModalOpen, setIsMetronomeModalOpen] = useState<boolean>(false);
  const [metronomeBeat, setMetronomeBeat] = useState(0);

  // Live Performance Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const [recordedNotesCount, setRecordedNotesCount] = useState(0);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [savedTakeNotes, setSavedTakeNotes] = useState<RecordedNote[]>([]);
  const [savedTakeDuration, setSavedTakeDuration] = useState(0);
  const [recordingNotification, setRecordingNotification] = useState<string | null>(null);

  const recordedNotesRef = useRef<RecordedNote[]>([]);
  const recordingStartTimeRef = useRef<number>(0);
  const activeRecordingNotesRef = useRef<
    Map<string, { startTime: number; velocity: number; transpose: number }>
  >(new Map());

  // Real-time chord detection on active notes changes
  useEffect(() => {
    if (activeNotes.size >= 2) {
      const chord = detectChord(Array.from(activeNotes));
      setDetectedChord(chord);
    } else {
      setDetectedChord(null);
    }
  }, [activeNotes]);

  // Recording timer
  useEffect(() => {
    let interval: number;
    if (isRecording) {
      interval = window.setInterval(() => {
        setRecSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const handleStartRecording = () => {
    setIsRecording(true);
    setRecSeconds(0);
    recordedNotesRef.current = [];
    activeRecordingNotesRef.current.clear();
    recordingStartTimeRef.current = performance.now();
    setRecordedNotesCount(0);
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    // Flush any still-depressed notes
    const now = performance.now();
    activeRecordingNotesRef.current.forEach((active, note) => {
      const duration = Math.max(120, Math.round(now - active.startTime));
      const timestamp = Math.max(0, Math.round(active.startTime - recordingStartTimeRef.current));
      recordedNotesRef.current.push({
        note,
        timestamp,
        duration,
        velocity: active.velocity,
        transpose: active.transpose,
      });
    });
    activeRecordingNotesRef.current.clear();

    const finalNotes = [...recordedNotesRef.current];
    setRecordedNotesCount(finalNotes.length);

    if (finalNotes.length > 0) {
      setSavedTakeNotes(finalNotes);
      setSavedTakeDuration(Math.max(1, recSeconds));
      setIsSaveModalOpen(true);
    } else {
      setRecordingNotification('Recording ended: No notes were played.');
      setTimeout(() => setRecordingNotification(null), 3000);
    }
  };

  const handleToggleRecord = () => {
    if (isRecording) {
      handleStopRecording();
    } else {
      handleStartRecording();
    }
  };

  const handleSaveRecordingCommit = (newRecord: RecordedPerformance) => {
    if (onSaveRecording) {
      onSaveRecording(newRecord);
    }
    setRecordingNotification(`Saved "${newRecord.title}" to My Recordings!`);
    setTimeout(() => setRecordingNotification(null), 5000);
  };

  // Metronome pulse & audio click tick with beat accents
  useEffect(() => {
    if (!isPlayingWaterfall) return;
    const intervalMs = (60 / bpm) * 1000;
    const totalBeats = accentBeats.length || 4;

    const interval = window.setInterval(() => {
      setMetronomeBeat((prev) => {
        const next = (prev + 1) % totalBeats;
        const isAccented = isAccentEnabled && !!accentBeats[next];
        if (isMetronomeAudible) {
          audioEngine.playMetronomeTick(isAccented, metronomeVolume, metronomeTimbre);
        }
        return next;
      });
    }, intervalMs);

    return () => clearInterval(interval);
  }, [
    isPlayingWaterfall,
    bpm,
    accentBeats,
    isAccentEnabled,
    isMetronomeAudible,
    metronomeVolume,
    metronomeTimbre,
  ]);

  const handleTimeSignatureChange = (sig: TimeSignature) => {
    setTimeSignature(sig);
    setAccentBeats(TIME_SIG_BEATS[sig].defaultAccents);
    setMetronomeBeat(0);
  };

  const handleToggleAccentBeat = (index: number) => {
    setAccentBeats((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  };

  const handleToggleMasterAccent = () => {
    setIsAccentEnabled((prev) => !prev);
  };

  // Waterfall continuous animation loop with Wait Mode support
  useEffect(() => {
    if (!isPlayingWaterfall || isWaitingForNote) return;
    let animId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      setStreamProgress((prev) => {
        const next = (prev + dt * playbackSpeed * 0.8) % 10;
        // In Wait Mode, pause when target note is exactly at the hit horizon
        if (practiceMode === 'wait' && next > 4.8 && next < 5.2) {
          setIsWaitingForNote(true);
          return 5.0;
        }
        return next;
      });

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPlayingWaterfall, playbackSpeed, practiceMode, isWaitingForNote]);

  // Sync sustain with audioEngine
  const handleToggleSustain = () => {
    const next = !isSustain;
    setIsSustain(next);
    audioEngine.setSustain(next);
  };

  // Play Note handler (Tactile, Keyboard, and Web MIDI)
  const handleNoteDown = (note: string, customVelocity?: number) => {
    const vel = customVelocity ?? (Math.floor(Math.random() * 20) + 102);
    setLiveVelocity(vel);
    audioEngine.playNote(note, vel, transpose);
    setActiveNotes((prev) => new Set(prev).add(note));

    // Scoring & Combo logic
    if (practiceMode === 'wait' && isWaitingForNote && note === currentTargetNote) {
      setIsWaitingForNote(false);
      setScore((s) => s + 100);
      setCombo((c) => c + 1);
      setHitFeedback({ text: 'PERFECT! +100', id: Date.now() });
    } else {
      setScore((s) => s + 45);
      setCombo((c) => c + 1);
      setHitFeedback({ text: 'GREAT! +45', id: Date.now() });
    }

    // Capture note into active recording buffer if REC is active
    if (isRecording) {
      activeRecordingNotesRef.current.set(note, {
        startTime: performance.now(),
        velocity: vel,
        transpose,
      });
    }
  };

  const handleNoteUp = (note: string) => {
    audioEngine.stopNote(note);
    setActiveNotes((prev) => {
      const next = new Set(prev);
      next.delete(note);
      return next;
    });

    // Finalize note duration and commit to recording sequence
    if (isRecording && activeRecordingNotesRef.current.has(note)) {
      const active = activeRecordingNotesRef.current.get(note)!;
      activeRecordingNotesRef.current.delete(note);
      const duration = Math.max(100, Math.round(performance.now() - active.startTime));
      const timestamp = Math.max(0, Math.round(active.startTime - recordingStartTimeRef.current));
      recordedNotesRef.current.push({
        note,
        timestamp,
        duration,
        velocity: active.velocity,
        transpose: active.transpose,
      });
      setRecordedNotesCount(recordedNotesRef.current.length);
    }
  };

  // Physical computer keyboard event listener
  useEffect(() => {
    const keyMap: Record<string, string> = {
      // White keys
      a: `C${baseOctave}`,
      s: `D${baseOctave}`,
      d: `E${baseOctave}`,
      f: `F${baseOctave}`,
      g: `G${baseOctave}`,
      h: `A${baseOctave}`,
      j: `B${baseOctave}`,
      k: `C${baseOctave + 1}`,
      l: `D${baseOctave + 1}`,
      ';': `E${baseOctave + 1}`,
      "'": `F${baseOctave + 1}`,
      z: `G${baseOctave + 1}`,
      x: `A${baseOctave + 1}`,
      c: `B${baseOctave + 1}`,
      v: `C${baseOctave + 2}`,
      // Black keys
      w: `C#${baseOctave}`,
      e: `D#${baseOctave}`,
      t: `F#${baseOctave}`,
      y: `G#${baseOctave}`,
      u: `A#${baseOctave}`,
      o: `C#${baseOctave + 1}`,
      p: `D#${baseOctave + 1}`,
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const note = keyMap[e.key.toLowerCase()];
      if (note) {
        handleNoteDown(note);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const note = keyMap[e.key.toLowerCase()];
      if (note) {
        handleNoteUp(note);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [baseOctave, transpose, isRecording, isWaitingForNote, practiceMode]);

  // Real Hardware Web MIDI Controller Integration
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('requestMIDIAccess' in navigator)) return;
    type MIDIAccessType = {
      inputs: { values: () => Iterable<{ onmidimessage?: ((e: { data?: Uint8Array | number[] }) => void) | null }> };
      onstatechange?: (() => void) | null;
    };

    let midiAccess: MIDIAccessType | null = null;

    const onMidiMessage = (e: { data?: Uint8Array | number[] }) => {
      const data = e.data;
      if (!data || data.length < 2) return;
      const status = data[0];
      const cmd = status >> 4;
      const noteNumber = data[1];
      const velocity = data.length > 2 ? data[2] : 64;
      const noteName = midiNumberToNote(noteNumber);

      if (cmd === 9 && velocity > 0) {
        handleNoteDown(noteName, velocity);
      } else if (cmd === 8 || (cmd === 9 && velocity === 0)) {
        handleNoteUp(noteName);
      }
    };

    const bindInputs = (access: MIDIAccessType) => {
      for (const input of access.inputs.values()) {
        input.onmidimessage = onMidiMessage;
      }
    };

    try {
      const nav = navigator as unknown as { requestMIDIAccess?: () => Promise<MIDIAccessType> };
      if (typeof nav?.requestMIDIAccess === 'function') {
        nav
          .requestMIDIAccess()
          .then((access) => {
            midiAccess = access;
            bindInputs(access);
            access.onstatechange = () => bindInputs(access);
          })
          .catch(() => {});
      }
    } catch {
      // Ignore MIDI access restrictions in sandbox/iframe
    }

    return () => {
      if (midiAccess) {
        for (const input of midiAccess.inputs.values()) {
          input.onmidimessage = null;
        }
      }
    };
  }, [baseOctave, transpose, isRecording, practiceMode, isWaitingForNote]);

  const formatRecTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Build the 2-octave key layout (e.g. C3 to C5)
  const o1 = baseOctave;
  const o2 = baseOctave + 1;
  const o3 = baseOctave + 2;

  const whiteKeys: string[] = [
    `C${o1}`, `D${o1}`, `E${o1}`, `F${o1}`, `G${o1}`, `A${o1}`, `B${o1}`,
    `C${o2}`, `D${o2}`, `E${o2}`, `F${o2}`, `G${o2}`, `A${o2}`, `B${o2}`,
    `C${o3}`,
  ];

  const blackKeys: { note: string; leftPercent: number }[] = [
    { note: `C#${o1}`, leftPercent: 4.8 },
    { note: `D#${o1}`, leftPercent: 11.5 },
    { note: `F#${o1}`, leftPercent: 24.9 },
    { note: `G#${o1}`, leftPercent: 31.6 },
    { note: `A#${o1}`, leftPercent: 38.3 },
    { note: `C#${o2}`, leftPercent: 51.7 },
    { note: `D#${o2}`, leftPercent: 58.4 },
    { note: `F#${o2}`, leftPercent: 71.8 },
    { note: `G#${o2}`, leftPercent: 78.5 },
    { note: `A#${o2}`, leftPercent: 85.2 },
  ];

  const isNoteInScale = (note: string): boolean => {
    if (scaleGuide === 'none') return false;
    const baseName = note.replace(/[0-8]/, '');
    return SCALE_NOTES[scaleGuide]?.includes(baseName) ?? false;
  };

  const getKeyLabel = (note: string, isWhite: boolean, index: number): string => {
    if (keyLabelMode === 'none') return '';
    if (keyLabelMode === 'notes') return note;
    if (keyLabelMode === 'solfege') {
      const baseName = note.replace(/[0-8]/, '');
      return SOLFEGE_MAP[baseName] || note;
    }
    if (keyLabelMode === 'shortcuts') {
      if (isWhite) {
        return KEYBOARD_SHORTCUTS_WHITE[index] || '';
      } else {
        const baseName = note.replace(/[0-8]/, '');
        return KEYBOARD_SHORTCUTS_BLACK[baseName] || '';
      }
    }
    return note;
  };

  return (
    <div className="flex flex-col w-full max-w-2xl mx-auto select-none overflow-hidden pb-28 pt-1">
      {/* Sound Engine HUD / Top Control Bar */}
      <div className="w-full px-3 py-2 flex flex-col gap-2.5 bg-[#0b0e13]/85 backdrop-blur-md border-b border-[#232e42]/60 shadow-md">
        {/* Row 1: Studio Telemetry, Reverb FX Drawer & Instrument Selector */}
        <div className="flex items-center justify-between gap-2 relative">
          <div className="flex items-center gap-1.5">
            {/* Panel Lateral Superior Izquierdo Trigger */}
            {onOpenStudioDrawer && (
              <button
                onClick={onOpenStudioDrawer}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-[#191c21] hover:bg-[#252a34] text-[#00d2ff] border border-[#232e42] hover:border-[#00d2ff]/50 transition-all active:scale-95 shadow-sm cursor-pointer shrink-0"
                title="Abrir panel lateral de estilos de sonido y Bluetooth sin latencia"
                type="button"
              >
                <span className="material-symbols-outlined text-[17px]">tune</span>
                <span className="hidden sm:inline font-headline text-[11px] font-bold">
                  Panel FX & BT
                </span>
                {bluetoothConfig?.isEnabled && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ffbd58] shadow-[0_0_6px_#ffbd58] animate-pulse" />
                )}
              </button>
            )}

            {/* Instrument Patch Selector */}
            <div className="relative">
              <button
                onClick={() => setIsPatchMenuOpen(!isPatchMenuOpen)}
                className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1d2025] hover:bg-[#272a30] text-[#e1e2ea] border border-[#232e42] transition-all active:scale-95 shadow-sm cursor-pointer"
                type="button"
              >
                <span
                  className="material-symbols-outlined text-[#00d2ff] text-[18px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  piano
                </span>
                <span className="font-telemetry text-[12px] font-semibold tracking-tight text-[#e1e2ea] max-w-[110px] truncate">
                  {selectedPatch}
                </span>
                <span className="material-symbols-outlined text-[#859399] text-[16px] group-hover:text-[#00d2ff] transition-colors">
                  expand_more
                </span>
              </button>

              {/* Patch menu popup */}
              {isPatchMenuOpen && (
                <div className="absolute top-11 left-0 z-50 bg-[#1d2025] border border-[#232e42] rounded-xl shadow-2xl p-1.5 min-w-[210px] space-y-1">
                  {ALL_PATCHES.map((patch) => (
                    <button
                      key={patch}
                      onClick={() => handleSelectPatch(patch)}
                      className={`w-full text-left px-3 py-1.5 rounded-lg text-[12px] font-telemetry flex items-center justify-between cursor-pointer ${
                        selectedPatch === patch
                          ? 'bg-[#00d2ff]/20 text-[#00d2ff] font-bold'
                          : 'text-[#e1e2ea] hover:bg-[#272a30]'
                      }`}
                      type="button"
                    >
                      <span>{patch}</span>
                      {selectedPatch === patch && (
                        <span className="material-symbols-outlined text-[16px]">check</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Audio FX & Acoustics button */}
            <button
              onClick={() => setIsAudioSettingsOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-[#1d2025] hover:bg-[#272a30] text-[#ffbd58] border border-[#232e42] text-[11px] font-headline font-bold active:scale-95 transition-all cursor-pointer shadow-sm"
              type="button"
              title="Acoustic Studio & Convolution Reverb"
            >
              <span className="material-symbols-outlined text-[16px]">surround_sound</span>
              <span className="hidden xs:inline">FX Studio</span>
            </button>
          </div>

          {/* Practice Mode Toggle: Flow vs Wait Mode */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPracticeMode((m) => (m === 'flow' ? 'wait' : 'flow'))}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-headline font-bold transition-all cursor-pointer ${
                practiceMode === 'wait'
                  ? 'bg-[#ea9f00]/20 border-[#ea9f00] text-[#ffbd58] shadow-[0_0_12px_rgba(255,189,88,0.4)]'
                  : 'bg-[#191c21] border-[#232e42] text-[#859399]'
              }`}
              type="button"
              title="Wait Mode pauses until the correct note is struck"
            >
              <span className="material-symbols-outlined text-[15px]">
                {practiceMode === 'wait' ? 'pan_tool' : 'play_circle'}
              </span>
              <span>{practiceMode === 'wait' ? 'Wait Mode' : 'Flow Mode'}</span>
            </button>

            {/* Recording Module Control */}
            <button
              onClick={handleToggleRecord}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all active:scale-95 cursor-pointer shadow-md ${
                isRecording
                  ? 'bg-[#ea9f00]/15 border-[#ea9f00]/60 shadow-[0_0_16px_-2px_rgba(255,189,88,0.45)] ring-1 ring-[#ffbd58]/30'
                  : 'bg-[#1d2025] hover:bg-[#272a30] border-[#232e42] opacity-80 hover:opacity-100'
              }`}
              type="button"
              title={isRecording ? 'Click to Stop and Save Recording' : 'Start Recording Performance'}
            >
              <span className="relative flex h-2 w-2">
                {isRecording && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ffbd58] opacity-75" />
                )}
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    isRecording ? 'bg-[#ffbd58]' : 'bg-[#859399]'
                  }`}
                />
              </span>
              <span
                className={`font-telemetry text-[12px] font-bold tracking-wider ${
                  isRecording ? 'text-[#ffbd58]' : 'text-[#bbc9cf]'
                }`}
              >
                REC
              </span>
              <span className="font-telemetry text-[10px] text-[#bbc9cf] font-medium ml-0.5">
                {formatRecTime(recSeconds)}
              </span>
              {isRecording && recordedNotesCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-[#ea9f00]/25 text-[#ffbd58] font-telemetry text-[9px] font-bold">
                  {recordedNotesCount}
                </span>
              )}
            </button>

            {/* Quick Stop & Save button when recording */}
            {isRecording && (
              <button
                onClick={handleStopRecording}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-[#ffbd58] hover:bg-[#ffca28] text-[#001f28] font-headline text-[11px] font-extrabold shadow-[0_0_12px_rgba(255,189,88,0.4)] active:scale-95 cursor-pointer transition-all"
                type="button"
                title="Stop recording and save take"
              >
                <span className="material-symbols-outlined text-[14px]">save</span>
                <span>Save</span>
              </button>
            )}
          </div>
        </div>

        {/* Recording Saved / Feedback Notification Banner */}
        {recordingNotification && (
          <div className="px-3 py-2 rounded-xl bg-[#00d2ff]/15 border border-[#00d2ff]/40 backdrop-blur-md flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-2 min-w-0">
              <span className="material-symbols-outlined text-[#00d2ff] text-[18px] shrink-0">check_circle</span>
              <span className="font-telemetry text-[12px] font-bold text-[#e1e2ea] truncate">
                {recordingNotification}
              </span>
            </div>
            {onNavigateToLibrary && (
              <button
                onClick={onNavigateToLibrary}
                className="px-2.5 py-1 rounded-lg bg-[#00d2ff] text-[#001f28] font-headline text-[11px] font-extrabold hover:bg-[#4cd6fb] transition-all cursor-pointer flex items-center gap-1 shrink-0 ml-2"
                type="button"
              >
                <span>View My Recordings</span>
                <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
              </button>
            )}
          </div>
        )}

        {/* Row 2: Precision Studio Controls (Metronome, Transpose, Key Labels, Scales, Sustain) */}
        <div className="flex items-center justify-between gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {/* Customizable Metronome Pill with Live Beat Accent Visualizer */}
          <div className="flex items-center bg-[#191c21] border border-[#232e42] hover:border-[#00d2ff]/40 px-2 py-1 rounded-full shadow-sm shrink-0 transition-all">
            <div
              onClick={() => setIsMetronomeModalOpen(true)}
              role="button"
              tabIndex={0}
              className="flex items-center gap-0.5 mr-1 cursor-pointer"
              title="Click to customize metronome beat accents & BPM"
            >
              {accentBeats.map((isAccented, idx) => {
                const isCurrent = metronomeBeat === idx;
                const hasAccent = isAccented && isAccentEnabled;
                return (
                  <span
                    key={idx}
                    className={`transition-all duration-100 rounded-full ${
                      isCurrent
                        ? hasAccent
                          ? 'w-2 h-2 bg-[#ffbd58] shadow-[0_0_10px_#ffbd58] scale-125'
                          : 'w-2 h-2 bg-[#00d2ff] shadow-[0_0_8px_#00d2ff] scale-125'
                        : hasAccent
                        ? 'w-1.5 h-1.5 bg-[#ffbd58]/40 border border-[#ffbd58]/80'
                        : 'w-1.5 h-1.5 bg-[#272a30] border border-[#3c494e]'
                    }`}
                  />
                );
              })}
            </div>

            <button
              onClick={() => setIsMetronomeModalOpen(true)}
              className="flex items-center gap-1 cursor-pointer group text-left"
              type="button"
            >
              <span className="font-telemetry text-[12px] font-bold text-[#00d2ff]">
                {bpm}
              </span>
              <span className="hidden xs:inline-block px-1 py-0.2 rounded bg-[#0b0e13] font-telemetry text-[8px] text-[#bbc9cf] font-medium border border-[#272a30]">
                {timeSignature}
              </span>
            </button>

            {/* Quick BPM Steppers */}
            <div className="flex items-center gap-0.5 ml-1">
              <button
                onClick={() => setBpm((b) => Math.max(30, b - 1))}
                className="w-4 h-4 rounded-full bg-[#1d2025] hover:bg-[#32353b] flex items-center justify-center text-[#e1e2ea] active:scale-90 transition-transform cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[11px]">remove</span>
              </button>
              <button
                onClick={() => setBpm((b) => Math.min(260, b + 1))}
                className="w-4 h-4 rounded-full bg-[#1d2025] hover:bg-[#32353b] flex items-center justify-center text-[#e1e2ea] active:scale-90 transition-transform cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[11px]">add</span>
              </button>
            </div>

            {/* Audio Click Toggle Button */}
            <button
              onClick={() => setIsMetronomeAudible(!isMetronomeAudible)}
              className={`p-0.5 rounded-full transition-colors cursor-pointer ml-1 ${
                isMetronomeAudible ? 'text-[#00d2ff]' : 'text-[#859399]'
              }`}
              type="button"
            >
              <span className="material-symbols-outlined text-[14px]">
                {isMetronomeAudible ? 'volume_up' : 'volume_off'}
              </span>
            </button>
          </div>

          {/* Key Labels Mode Switcher */}
          <div className="flex items-center bg-[#191c21] border border-[#232e42] p-0.5 rounded-full shrink-0">
            {(['notes', 'solfege', 'shortcuts'] as KeyLabelMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setKeyLabelMode(mode)}
                className={`px-2 py-0.5 rounded-full font-telemetry text-[10px] font-bold capitalize transition-all cursor-pointer ${
                  keyLabelMode === mode
                    ? 'bg-[#00d2ff] text-[#001f28]'
                    : 'text-[#859399] hover:text-[#e1e2ea]'
                }`}
                type="button"
              >
                {mode === 'shortcuts' ? 'Keys' : mode}
              </button>
            ))}
          </div>

          {/* Scale Guide Highlighting Dropdown */}
          <div className="relative shrink-0">
            <button
              onClick={() => setIsScaleMenuOpen(!isScaleMenuOpen)}
              className={`flex items-center gap-1 px-2 py-1 rounded-full border text-[10px] font-telemetry font-bold transition-all cursor-pointer ${
                scaleGuide !== 'none'
                  ? 'bg-[#00d2ff]/20 border-[#00d2ff] text-[#00d2ff]'
                  : 'bg-[#191c21] border-[#232e42] text-[#859399]'
              }`}
              type="button"
            >
              <span className="material-symbols-outlined text-[13px]">lightbulb</span>
              <span>{scaleGuide === 'none' ? 'Scale Guide' : scaleGuide}</span>
            </button>

            {isScaleMenuOpen && (
              <div className="absolute top-8 left-0 z-50 bg-[#1d2025] border border-[#232e42] rounded-xl shadow-2xl p-1 min-w-[130px] space-y-0.5">
                {(['none', 'C Major', 'A Minor', 'G Major', 'Pentatonic', 'Blues'] as ScaleGuide[]).map((sc) => (
                  <button
                    key={sc}
                    onClick={() => {
                      setScaleGuide(sc);
                      setIsScaleMenuOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1 rounded-lg text-[11px] font-telemetry flex items-center justify-between cursor-pointer ${
                      scaleGuide === sc ? 'bg-[#00d2ff]/20 text-[#00d2ff] font-bold' : 'text-[#e1e2ea] hover:bg-[#272a30]'
                    }`}
                    type="button"
                  >
                    <span>{sc === 'none' ? 'No Guide' : sc}</span>
                    {scaleGuide === sc && <span className="material-symbols-outlined text-[13px]">check</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Transpose Key Semitone Pill */}
          <div className="flex items-center bg-[#191c21] border border-[#232e42] px-2 py-0.5 rounded-full shadow-sm shrink-0">
            <span className="font-telemetry text-[11px] font-bold text-[#e1e2ea] mr-1.5">
              C {transpose !== 0 && <span className="text-[#00d2ff]">{transpose > 0 ? `+${transpose}` : transpose}</span>}
            </span>
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => setTranspose((t) => Math.max(-12, t - 1))}
                className="w-4 h-4 rounded-full bg-[#1d2025] flex items-center justify-center text-[#e1e2ea] hover:bg-[#32353b] active:scale-90 transition-transform cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[11px]">remove</span>
              </button>
              <button
                onClick={() => setTranspose((t) => Math.min(12, t + 1))}
                className="w-4 h-4 rounded-full bg-[#1d2025] flex items-center justify-center text-[#e1e2ea] hover:bg-[#32353b] active:scale-90 transition-transform cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[11px]">add</span>
              </button>
            </div>
          </div>

          {/* Tactile Sustain Pedal Toggle */}
          <button
            onClick={handleToggleSustain}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full border transition-all active:scale-95 shrink-0 cursor-pointer ${
              isSustain
                ? 'bg-[#191c21] border-[#00d2ff]/40 text-[#00d2ff] shadow-[0_0_10px_rgba(0,210,255,0.25)]'
                : 'bg-[#191c21] border-[#232e42] text-[#859399]'
            }`}
            type="button"
          >
            <span className="material-symbols-outlined text-[14px]">tune</span>
            <span className="font-telemetry text-[10px] font-bold uppercase tracking-wider">
              {isSustain ? 'SUS' : 'DRY'}
            </span>
          </button>
        </div>
      </div>

      {/* Falling Note Stream Visualizer & Telemetry HUD */}
      <div className="relative w-full bg-[#0b0e13] overflow-hidden shadow-inner flex flex-col justify-end border-b border-[#232e42]" style={{ height: '190px' }}>
        {/* Harmonic Subtle Grid Lines */}
        <div className="absolute inset-0 opacity-15 pointer-events-none flex justify-between px-3">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="w-px h-full bg-[#3c494e]" />
          ))}
        </div>

        {/* Live Score & Combo Meter Overlay */}
        <div className="absolute top-2 right-3 z-30 flex items-center gap-2">
          <div className="px-2.5 py-1 rounded-full bg-[#14171d]/90 border border-[#232e42] backdrop-blur-md flex items-center gap-1.5 shadow-md">
            <span className="font-telemetry text-[11px] font-bold text-[#e1e2ea]">
              {score.toLocaleString()} <span className="text-[#859399] font-normal text-[9px]">PTS</span>
            </span>
            <span className="h-2.5 w-px bg-[#272a30]" />
            <span className="font-telemetry text-[11px] font-black text-[#ffbd58]">
              {combo}x 🔥
            </span>
          </div>
        </div>

        {/* Floating Hit Feedback Popup */}
        {hitFeedback && (
          <div
            key={hitFeedback.id}
            className="absolute top-10 right-6 z-40 px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#00d2ff] to-[#45d1f6] text-[#001f28] font-headline text-[11px] font-black shadow-[0_0_16px_rgba(0,210,255,0.7)] animate-bounce"
          >
            {hitFeedback.text}
          </div>
        )}

        {/* Active Hit Target Horizon Line with Pulse Light */}
        <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-[#00d2ff]/20 via-[#00d2ff]/90 to-[#00d2ff]/20 shadow-[0_0_14px_rgba(0,210,255,0.85)] z-20" />

        {/* Falling Cascade Notes (Synthesia Style with Bluetooth Zero-Latency Lookahead Compensation) */}
        {(() => {
          const btVisualShift = bluetoothConfig?.isEnabled
            ? (bluetoothConfig.compensationMs / 1000) * 35
            : 0;

          return (
            <>
              {/* Left Hand Amber Chord Pad C3 */}
              {(handFilter === 'both' || handFilter === 'L') && (
                <div
                  className="absolute left-[3.5%] w-6 rounded-full bg-gradient-to-t from-[#ffbd58] via-[#ea9f00] to-[#ffbd58]/30 shadow-[0_0_16px_rgba(255,189,88,0.7)] opacity-90 z-10 animate-pulse transition-all"
                  style={{
                    bottom: `${((((streamProgress * 22) + btVisualShift) % 110) + 12)}px`,
                    height: '80px',
                  }}
                >
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-1 rounded bg-[#ffbd58] text-[#442b00] font-telemetry text-[9px] font-bold">
                    C3
                  </div>
                </div>
              )}

              {/* Left Hand Amber Melodic G3 */}
              {(handFilter === 'both' || handFilter === 'L') && (
                <div
                  className="absolute left-[30.5%] w-6 rounded-full bg-gradient-to-t from-[#ffbd58] via-[#ea9f00] to-[#ffbd58]/30 shadow-[0_0_12px_rgba(255,189,88,0.6)] opacity-85 z-10 transition-all"
                  style={{
                    bottom: `${((((streamProgress * 25) + 40 + btVisualShift) % 130) + 10)}px`,
                    height: '50px',
                  }}
                />
              )}

              {/* Right Hand Electric Cyan Stream C4 */}
              {(handFilter === 'both' || handFilter === 'R') && (
                <div
                  className="absolute left-[51.5%] w-6 rounded-full bg-gradient-to-b from-[#a5e7ff]/30 via-[#00d2ff] to-[#a5e7ff] shadow-[0_0_14px_rgba(0,210,255,0.6)] opacity-85 z-10 transition-all"
                  style={{
                    bottom: `${((((streamProgress * 28) + 70 + btVisualShift) % 140) + 10)}px`,
                    height: '70px',
                  }}
                />
              )}
            </>
          );
        })()}

        {/* Right Hand Target Hit Note E4 - Radiant Bloom at Horizon */}
        {(handFilter === 'both' || handFilter === 'R') && (
          <div
            className="absolute bottom-0 left-[65.2%] w-6 rounded-full bg-gradient-to-t from-[#00d2ff] via-[#47d6ff] to-[#b6ebff] shadow-[0_0_24px_rgba(0,210,255,0.9)] z-10 flex flex-col justify-end items-center pb-1"
            style={{ height: '110px' }}
          >
            <span className="w-3 h-3 rounded-full bg-white shadow-[0_0_10px_#ffffff]" />
          </div>
        )}

        {/* Wait Mode Active Indicator Banner */}
        {isWaitingForNote && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 px-4 py-2 rounded-2xl bg-[#ea9f00]/95 text-[#001f28] shadow-[0_0_30px_rgba(255,189,88,0.8)] backdrop-blur-md flex items-center gap-2 animate-pulse">
            <span className="material-symbols-outlined text-[20px]">pan_tool</span>
            <div className="font-headline font-black text-[13px] uppercase tracking-wider">
              WAITING FOR KEY: [ {currentTargetNote} ]
            </div>
          </div>
        )}

        {/* Right Hand Hit Sharp F#4 - Black Key Target */}
        {(handFilter === 'both' || handFilter === 'R') && (
          <div
            className="absolute bottom-0 left-[74.8%] w-4 rounded-full bg-gradient-to-t from-[#45d1f6] via-[#00d2ff] to-[#b6ebff] shadow-[0_0_20px_rgba(69,209,246,0.95)] z-20"
            style={{ height: '75px' }}
          />
        )}

        {/* Floating Sheet / Waterfall Telemetry Overlay Bar */}
        <div className="relative z-30 mx-3 mb-2 flex items-center justify-between gap-2 p-1.5 rounded-xl bg-[#1d2025]/90 backdrop-blur-md border border-[#232e42] shadow-lg">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-[#272a30] text-[#00d2ff] shadow-xs shrink-0">
              <span className="material-symbols-outlined text-[14px]">music_note</span>
            </span>
            <div className="flex flex-col min-w-0">
              <span className="font-telemetry text-[11px] font-bold text-[#e1e2ea] truncate">
                {currentSong.title}
              </span>
              <div className="flex items-center gap-1.5 text-[#bbc9cf] font-telemetry text-[10px]">
                <span className="text-[#00d2ff] font-semibold">Bar {currentBar}</span>
                <span>of {currentSong.totalBars}</span>
              </div>
            </div>
          </div>

          {/* Section Loop Selector */}
          <div className="relative">
            <button
              onClick={() => setIsLoopMenuOpen(!isLoopMenuOpen)}
              className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#272a30] hover:bg-[#32353b] text-[#e1e2ea] font-telemetry text-[10px] font-bold cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[12px] text-[#00d2ff]">repeat</span>
              <span>{loopSection === 'all' ? 'Loop: All' : `Bars ${loopSection}`}</span>
            </button>

            {isLoopMenuOpen && (
              <div className="absolute bottom-8 right-0 z-50 bg-[#1d2025] border border-[#232e42] rounded-xl shadow-2xl p-1 min-w-[120px] space-y-0.5">
                {[
                  { id: 'all', label: 'Full Song' },
                  { id: '1-4', label: 'Bars 1 – 4' },
                  { id: '5-8', label: 'Bars 5 – 8' },
                  { id: '9-12', label: 'Bars 9 – 12' },
                  { id: '13-16', label: 'Bars 13 – 16' },
                ].map((sec) => (
                  <button
                    key={sec.id}
                    onClick={() => {
                      setLoopSection(sec.id as any);
                      setIsLoopMenuOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1 rounded-lg text-[10px] font-telemetry flex items-center justify-between cursor-pointer ${
                      loopSection === sec.id ? 'bg-[#00d2ff]/20 text-[#00d2ff] font-bold' : 'text-[#e1e2ea] hover:bg-[#272a30]'
                    }`}
                    type="button"
                  >
                    <span>{sec.label}</span>
                    {loopSection === sec.id && <span className="material-symbols-outlined text-[12px]">check</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Practice Modifiers (Hands + Speed) */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* L / R Hand Separation Buttons */}
            <div className="flex items-center rounded-lg bg-[#32353b] p-0.5">
              <button
                onClick={() => setHandFilter((f) => (f === 'L' ? 'both' : 'L'))}
                className={`px-2 py-0.5 rounded-md font-telemetry text-[11px] font-bold cursor-pointer transition-colors ${
                  handFilter === 'L' || handFilter === 'both'
                    ? 'bg-[#ea9f00]/30 text-[#ffbd58]'
                    : 'text-[#859399]'
                }`}
                type="button"
              >
                L
              </button>
              <button
                onClick={() => setHandFilter((f) => (f === 'R' ? 'both' : 'R'))}
                className={`px-2 py-0.5 rounded-md font-telemetry text-[11px] font-bold cursor-pointer transition-colors ${
                  handFilter === 'R' || handFilter === 'both'
                    ? 'bg-[#00d2ff]/30 text-[#00d2ff]'
                    : 'text-[#859399]'
                }`}
                type="button"
              >
                R
              </button>
            </div>

            {/* Tempo stretch */}
            <button
              onClick={() => {
                const speeds = [0.5, 0.75, 1.0, 1.25];
                const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
                setPlaybackSpeed(speeds[nextIdx]);
              }}
              className="px-2 py-1 rounded-lg bg-[#272a30] hover:bg-[#32353b] text-[#e1e2ea] font-telemetry text-[11px] font-semibold active:scale-95 transition-transform cursor-pointer"
              type="button"
            >
              {playbackSpeed}x
            </button>
          </div>
        </div>
      </div>

      {/* Real-time Live Chord Recognition HUD Banner */}
      {detectedChord && (
        <div className="w-full px-3 py-1.5 bg-gradient-to-r from-[#00d2ff]/20 via-[#1d2025] to-[#ffbd58]/20 border-b border-[#232e42] flex items-center justify-between text-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded-md bg-[#00d2ff] text-[#001f28] font-telemetry text-[10px] font-black uppercase">
              CHORD
            </span>
            <span className="font-headline text-[13px] font-bold text-[#e1e2ea]">
              {detectedChord.name}
            </span>
            <span className="font-telemetry text-[10px] text-[#bbc9cf] hidden sm:inline">
              ({detectedChord.type})
            </span>
          </div>
          <div className="flex items-center gap-1 font-telemetry text-[10px] text-[#859399]">
            <span>Intervals:</span>
            <span className="text-[#00d2ff] font-semibold">
              {detectedChord.intervals.join(' • ')}
            </span>
          </div>
        </div>
      )}

      {/* Octave Shifter & Keybed Shelf Chrome */}
      <div className="w-full px-3 py-2 flex items-center justify-between bg-[#191c21] border-b border-[#232e42] shadow-sm">
        <button
          onClick={() => setBaseOctave((o) => Math.max(1, o - 1))}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1d2025] hover:bg-[#272a30] text-[#e1e2ea] border border-[#232e42] active:scale-95 transition-all shadow-xs cursor-pointer"
          type="button"
        >
          <span className="material-symbols-outlined text-[14px]">chevron_left</span>
          <span className="font-telemetry text-[11px] font-semibold tracking-tight uppercase">
            Octave {baseOctave - 1}
          </span>
        </button>

        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#0b0e13]/80 border border-[#232e42] shadow-inner">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00d2ff] shadow-[0_0_6px_#00d2ff]" />
          <span className="font-telemetry text-[13px] font-bold tracking-wider text-[#e1e2ea]">
            C{baseOctave} — C{baseOctave + 2}
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#ffbd58] shadow-[0_0_6px_#ffbd58]" />
        </div>

        <button
          onClick={() => setBaseOctave((o) => Math.min(5, o + 1))}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1d2025] hover:bg-[#272a30] text-[#e1e2ea] border border-[#232e42] active:scale-95 transition-all shadow-xs cursor-pointer"
          type="button"
        >
          <span className="font-telemetry text-[11px] font-semibold tracking-tight uppercase">
            Octave {baseOctave + 2}
          </span>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
        </button>
      </div>

      {/* Interactive Piano Keybed Chassis (Edge-to-Edge Acoustic Bed) */}
      <div className="relative w-full bg-[#0b0e13] px-1 py-1.5 shadow-2xl overflow-x-auto no-scrollbar">
        <div className="relative flex h-52 min-w-[680px] sm:min-w-full select-none rounded-b-xl overflow-hidden bg-[#0b0e13] p-1 shadow-inner border border-[#232e42]">
          {/* WHITE KEYS LAYER */}
          {whiteKeys.map((note, idx) => {
            const isDepressed = activeNotes.has(note);
            const inScale = isNoteInScale(note);
            const isWaitTarget = practiceMode === 'wait' && isWaitingForNote && note === currentTargetNote;
            const label = getKeyLabel(note, true, idx);

            return (
              <div
                key={note}
                data-note={note}
                onPointerDown={(e) => {
                  e.preventDefault();
                  handleNoteDown(note);
                }}
                onPointerUp={() => handleNoteUp(note)}
                onPointerLeave={() => handleNoteUp(note)}
                className={`relative flex-1 h-full rounded-b-md shadow-md flex flex-col justify-end items-center pb-3 cursor-pointer mr-0.5 select-none transition-all ${
                  isDepressed
                    ? 'bg-gradient-to-b from-[#e0f7ff] to-[#00d2ff]/40 shadow-[0_6px_28px_rgba(0,210,255,0.7)] translate-y-1.5'
                    : isWaitTarget
                    ? 'bg-[#ea9f00]/30 border-2 border-[#ea9f00] shadow-[0_0_20px_rgba(255,189,88,0.8)] animate-pulse'
                    : 'bg-gradient-to-b from-[#f8fafc] via-[#edf2f7] to-[#e2e8f0] hover:brightness-105 active:translate-y-1'
                }`}
              >
                {/* Scale Guide Glowing Dot */}
                {inScale && !isDepressed && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00d2ff] shadow-[0_0_6px_#00d2ff] mb-1.5 animate-pulse" />
                )}

                <span
                  className={`font-telemetry text-[11px] pointer-events-none select-none font-bold ${
                    isDepressed ? 'text-[#001f28] font-black' : isWaitTarget ? 'text-[#ffbd58] font-black' : 'text-[#859399]'
                  }`}
                >
                  {label}
                </span>

                {isDepressed && (
                  <span className="absolute bottom-1 w-6 h-1 rounded-full bg-[#00d2ff] shadow-[0_0_8px_#00d2ff]" />
                )}
              </div>
            );
          })}

          {/* BLACK KEYS LAYER */}
          {blackKeys.map(({ note, leftPercent }) => {
            const isDepressed = activeNotes.has(note);
            const inScale = isNoteInScale(note);
            const isWaitTarget = practiceMode === 'wait' && isWaitingForNote && note === currentTargetNote;
            const label = getKeyLabel(note, false, 0);

            return (
              <div
                key={note}
                data-note={note}
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleNoteDown(note);
                }}
                onPointerUp={(e) => {
                  e.stopPropagation();
                  handleNoteUp(note);
                }}
                onPointerLeave={() => handleNoteUp(note)}
                style={{ left: `${leftPercent}%` }}
                className={`absolute top-0 w-[4.4%] h-[60%] rounded-b-sm shadow-[0_8px_16px_rgba(0,0,0,0.85)] z-20 cursor-pointer flex flex-col justify-end items-center pb-2 select-none transition-all ${
                  isDepressed
                    ? 'bg-gradient-to-t from-[#00d2ff] via-[#00566a] to-[#0d1219] shadow-[0_0_24px_rgba(0,210,255,0.85)] translate-y-1'
                    : isWaitTarget
                    ? 'bg-[#ea9f00] border border-white shadow-[0_0_20px_rgba(255,189,88,0.9)] animate-pulse'
                    : 'bg-gradient-to-b from-[#1c222e] via-[#0d1219] to-[#06080d] hover:brightness-125 active:translate-y-1'
                }`}
              >
                {inScale && !isDepressed && (
                  <span className="w-1 h-1 rounded-full bg-[#ffbd58] shadow-[0_0_4px_#ffbd58] mb-1" />
                )}

                <span
                  className={`font-telemetry text-[9px] pointer-events-none select-none font-bold ${
                    isDepressed ? 'text-[#b6ebff] font-black' : isWaitTarget ? 'text-[#001f28] font-black' : 'text-[#bbc9cf]/70'
                  }`}
                >
                  {label}
                </span>

                {isDepressed && (
                  <span className="w-2 h-1 rounded-full bg-[#a5e7ff] shadow-[0_0_6px_#ffffff]" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Practice Transport & Tactile Performance Controls */}
      <div className="px-3 pt-3 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-4 bg-[#1d2025] border border-[#232e42] rounded-2xl p-2.5 shadow-md">
          {/* Playback Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentBar((b) => Math.max(1, b - 4))}
              className="w-10 h-10 rounded-full bg-[#272a30] hover:bg-[#32353b] text-[#e1e2ea] flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
              type="button"
              aria-label="Rewind 4 bars"
            >
              <span className="material-symbols-outlined text-[20px]">fast_rewind</span>
            </button>

            <button
              onClick={() => setIsPlayingWaterfall(!isPlayingWaterfall)}
              className="w-12 h-12 rounded-full bg-[#00d2ff] hover:bg-[#45d1f6] text-[#001f28] flex items-center justify-center shadow-[0_0_18px_rgba(0,210,255,0.5)] active:scale-95 transition-transform cursor-pointer"
              type="button"
              aria-label={isPlayingWaterfall ? 'Pause' : 'Play'}
            >
              <span className="material-symbols-outlined text-[26px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                {isPlayingWaterfall ? 'pause' : 'play_arrow'}
              </span>
            </button>

            <button
              onClick={() => setCurrentBar((b) => Math.min(currentSong.totalBars, b + 4))}
              className="w-10 h-10 rounded-full bg-[#272a30] hover:bg-[#32353b] text-[#e1e2ea] flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
              type="button"
              aria-label="Forward 4 bars"
            >
              <span className="material-symbols-outlined text-[20px]">skip_next</span>
            </button>
          </div>

          {/* Live Velocity / Dynamic Response Telemetry */}
          <div className="flex flex-col items-end min-w-0 pr-1">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[#45d1f6] text-[16px]">speed</span>
              <span className="font-telemetry text-[11px] uppercase tracking-wider text-[#bbc9cf]">
                VELOCITY
              </span>
              <span className="font-telemetry text-[14px] font-bold text-[#e1e2ea]">
                {liveVelocity}
              </span>
            </div>
            <div className="w-28 h-1.5 rounded-full bg-[#0b0e13] mt-1.5 overflow-hidden flex border border-[#232e42]">
              <div
                className="h-full bg-gradient-to-r from-[#00d2ff] to-[#ffbd58] rounded-full transition-all duration-150"
                style={{ width: `${Math.min(100, (liveVelocity / 127) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Keyboard and MIDI hints */}
        <p className="text-center font-telemetry text-[10px] text-[#859399]">
          Hardware MIDI Keyboard &amp; QWERTY keys [A S D F G H J K L ; &apos;] / [W E T Y U O P] active
        </p>
      </div>

      {/* Customizable Metronome Modal */}
      <MetronomeModal
        isOpen={isMetronomeModalOpen}
        onClose={() => setIsMetronomeModalOpen(false)}
        bpm={bpm}
        onBpmChange={(newBpm) => setBpm(newBpm)}
        timeSignature={timeSignature}
        onTimeSignatureChange={handleTimeSignatureChange}
        accentBeats={accentBeats}
        onToggleAccentBeat={handleToggleAccentBeat}
        isAccentEnabled={isAccentEnabled}
        onToggleMasterAccent={handleToggleMasterAccent}
        isAudible={isMetronomeAudible}
        onToggleAudible={() => setIsMetronomeAudible(!isMetronomeAudible)}
        volume={metronomeVolume}
        onVolumeChange={(v) => setMetronomeVolume(v)}
        timbre={metronomeTimbre}
        onTimbreChange={(t) => setMetronomeTimbre(t)}
        currentBeat={metronomeBeat}
      />

      {/* Save Recording Performance Modal */}
      <SaveRecordingModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        onSave={handleSaveRecordingCommit}
        recordedNotes={savedTakeNotes}
        durationSec={savedTakeDuration}
        bpm={bpm}
        keyName={`${currentSong.key || 'C'}${transpose !== 0 ? ` (${transpose > 0 ? `+${transpose}` : transpose})` : ''}`}
        patch={selectedPatch}
        songTitle={currentSong.title}
        onViewInLibrary={onNavigateToLibrary}
        onViewPartitura={onViewPartitura}
      />

      {/* Studio Acoustics & Audio FX Modal */}
      <AudioSettingsModal
        isOpen={isAudioSettingsOpen}
        onClose={() => setIsAudioSettingsOpen(false)}
      />
    </div>
  );
};
