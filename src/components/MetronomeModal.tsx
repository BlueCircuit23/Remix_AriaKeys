import React, { useState, useRef } from 'react';
import { audioEngine } from '../utils/audioEngine';

export type TimeSignature = '2/4' | '3/4' | '4/4' | '6/8';
export type MetronomeTimbre = 'acoustic' | 'digital' | 'bell';

interface MetronomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  bpm: number;
  onBpmChange: (bpm: number) => void;
  timeSignature: TimeSignature;
  onTimeSignatureChange: (sig: TimeSignature) => void;
  accentBeats: boolean[];
  onToggleAccentBeat: (index: number) => void;
  isAccentEnabled: boolean;
  onToggleMasterAccent: () => void;
  isAudible: boolean;
  onToggleAudible: () => void;
  volume: number;
  onVolumeChange: (vol: number) => void;
  timbre: MetronomeTimbre;
  onTimbreChange: (timbre: MetronomeTimbre) => void;
  currentBeat: number;
}

const TEMPO_PRESETS = [
  { name: 'Largo', bpm: 52 },
  { name: 'Adagio', bpm: 66 },
  { name: 'Andante', bpm: 76 },
  { name: 'Moderato', bpm: 108 },
  { name: 'Allegro', bpm: 132 },
  { name: 'Presto', bpm: 168 },
];

export function getTempoName(bpm: number): string {
  if (bpm < 60) return 'Largo';
  if (bpm < 76) return 'Adagio';
  if (bpm < 108) return 'Andante';
  if (bpm < 120) return 'Moderato';
  if (bpm < 156) return 'Allegro';
  if (bpm < 190) return 'Vivace';
  return 'Presto';
}

export const MetronomeModal: React.FC<MetronomeModalProps> = ({
  isOpen,
  onClose,
  bpm,
  onBpmChange,
  timeSignature,
  onTimeSignatureChange,
  accentBeats,
  onToggleAccentBeat,
  isAccentEnabled,
  onToggleMasterAccent,
  isAudible,
  onToggleAudible,
  volume,
  onVolumeChange,
  timbre,
  onTimbreChange,
  currentBeat,
}) => {
  const tapTimesRef = useRef<number[]>([]);
  const [tapActive, setTapActive] = useState(false);

  if (!isOpen) return null;

  const handleTapTempo = () => {
    const now = performance.now();
    setTapActive(true);
    setTimeout(() => setTapActive(false), 120);

    // Audio click feedback on tap
    audioEngine.playMetronomeTick(true, volume, timbre);

    const recentTaps = tapTimesRef.current.filter((t) => now - t < 2500);
    recentTaps.push(now);
    tapTimesRef.current = recentTaps;

    if (recentTaps.length >= 2) {
      const deltas: number[] = [];
      for (let i = 1; i < recentTaps.length; i++) {
        deltas.push(recentTaps[i] - recentTaps[i - 1]);
      }
      const avgDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length;
      if (avgDelta > 180 && avgDelta < 2200) {
        const calculatedBpm = Math.min(260, Math.max(30, Math.round(60000 / avgDelta)));
        onBpmChange(calculatedBpm);
      }
    }
  };

  const timeSignatureOptions: TimeSignature[] = ['2/4', '3/4', '4/4', '6/8'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#1d2025] border border-[#232e42] rounded-3xl p-5 sm:p-6 max-w-md w-full space-y-4 shadow-2xl my-auto text-[#e1e2ea]">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#00d2ff] text-[22px]">
              metronome
            </span>
            <div>
              <h3 className="font-headline text-[18px] font-bold text-[#e1e2ea]">
                Atelier Metronome
              </h3>
              <p className="font-sans text-[11px] text-[#bbc9cf]">
                Precision tempo synchronization &amp; rhythmic accent engine
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#272a30] hover:bg-[#32353b] text-[#bbc9cf] hover:text-[#e1e2ea] flex items-center justify-center transition-colors cursor-pointer"
            type="button"
            aria-label="Close Metronome Settings"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Live Tempo Display Card */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#0b0e13] via-[#14171d] to-[#0b0e13] p-4 rounded-2xl border border-[#232e42] flex flex-col items-center justify-center space-y-2 shadow-inner">
          <div className="flex items-center gap-2">
            <span className="font-telemetry text-[11px] uppercase tracking-widest text-[#bbc9cf]">
              TEMPO MARKING
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#00d2ff]/15 text-[#00d2ff] font-telemetry text-[11px] font-bold">
              {getTempoName(bpm)}
            </span>
          </div>

          {/* Large BPM number */}
          <div className="flex items-baseline gap-1.5 my-1">
            <span className="font-headline text-[48px] font-black text-[#e1e2ea] tracking-tight leading-none">
              {bpm}
            </span>
            <span className="font-telemetry text-[16px] text-[#00d2ff] font-bold">BPM</span>
          </div>

          {/* Dynamic Beat Accent Nodes Visualizer in Modal */}
          <div className="flex items-center gap-3 pt-1">
            {accentBeats.map((isAccented, idx) => {
              const isCurrent = currentBeat === idx;
              const hasAccent = isAccented && isAccentEnabled;
              return (
                <div
                  key={idx}
                  className="flex flex-col items-center gap-1"
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-150 ${
                      isCurrent
                        ? hasAccent
                          ? 'bg-[#ffbd58] text-[#442b00] scale-125 shadow-[0_0_16px_#ffbd58]'
                          : 'bg-[#00d2ff] text-[#001f28] scale-125 shadow-[0_0_14px_#00d2ff]'
                        : hasAccent
                        ? 'bg-[#ffbd58]/20 border border-[#ffbd58]/60 text-[#ffbd58]'
                        : 'bg-[#1d2025] border border-[#2d3748] text-[#859399]'
                    }`}
                  >
                    <span className="font-telemetry text-[11px] font-bold">
                      {idx + 1}
                    </span>
                  </div>
                  {hasAccent && (
                    <span className="material-symbols-outlined text-[12px] text-[#ffbd58]">
                      arrow_drop_up
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* BPM Quick Adjustment Steppers & Slider */}
        <div className="space-y-3 bg-[#191c21] p-3.5 rounded-2xl border border-[#232e42]">
          <div className="flex items-center justify-between">
            <span className="font-telemetry text-[11px] uppercase tracking-wider text-[#bbc9cf]">
              Adjust BPM (30 — 260)
            </span>
            <button
              onClick={handleTapTempo}
              className={`px-3 py-1 rounded-full font-headline text-[11px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                tapActive
                  ? 'bg-[#00d2ff] text-[#001f28] scale-95 shadow-[0_0_12px_#00d2ff]'
                  : 'bg-[#272a30] hover:bg-[#32353b] text-[#00d2ff] border border-[#00d2ff]/40'
              }`}
              type="button"
            >
              👆 Tap Tempo
            </button>
          </div>

          {/* Steppers & Slider */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onBpmChange(Math.max(30, bpm - 5))}
              className="px-2 py-1.5 rounded-lg bg-[#272a30] hover:bg-[#32353b] text-[#e1e2ea] font-telemetry text-[11px] font-bold active:scale-90 transition-transform cursor-pointer"
              title="Decrease 5 BPM"
              type="button"
            >
              -5
            </button>
            <button
              onClick={() => onBpmChange(Math.max(30, bpm - 1))}
              className="w-8 h-8 rounded-lg bg-[#272a30] hover:bg-[#32353b] text-[#e1e2ea] flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
              title="Decrease 1 BPM"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">remove</span>
            </button>

            <input
              type="range"
              min="30"
              max="260"
              value={bpm}
              onChange={(e) => onBpmChange(Number(e.target.value))}
              className="flex-1 accent-[#00d2ff] h-1.5 bg-[#0b0e13] rounded-lg cursor-pointer"
            />

            <button
              onClick={() => onBpmChange(Math.min(260, bpm + 1))}
              className="w-8 h-8 rounded-lg bg-[#272a30] hover:bg-[#32353b] text-[#e1e2ea] flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
              title="Increase 1 BPM"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
            </button>
            <button
              onClick={() => onBpmChange(Math.min(260, bpm + 5))}
              className="px-2 py-1.5 rounded-lg bg-[#272a30] hover:bg-[#32353b] text-[#e1e2ea] font-telemetry text-[11px] font-bold active:scale-90 transition-transform cursor-pointer"
              title="Increase 5 BPM"
              type="button"
            >
              +5
            </button>
          </div>

          {/* Quick Tempo Presets */}
          <div className="grid grid-cols-6 gap-1 pt-1">
            {TEMPO_PRESETS.map((preset) => {
              const isActive = bpm === preset.bpm;
              return (
                <button
                  key={preset.name}
                  onClick={() => onBpmChange(preset.bpm)}
                  className={`py-1 rounded-lg text-center font-telemetry transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#00d2ff] text-[#001f28] font-bold shadow-xs'
                      : 'bg-[#272a30] hover:bg-[#32353b] text-[#bbc9cf]'
                  }`}
                  type="button"
                >
                  <div className="text-[10px] leading-tight font-medium">{preset.name}</div>
                  <div className="text-[9px] opacity-80">{preset.bpm}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* BEAT ACCENTS & TIME SIGNATURE SECTION */}
        <div className="space-y-3 bg-[#191c21] p-3.5 rounded-2xl border border-[#232e42]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[#ffbd58] text-[18px]">
                auto_awesome
              </span>
              <h4 className="font-headline text-[13px] font-bold text-[#e1e2ea]">
                Beat Accents &amp; Time Signature
              </h4>
            </div>

            {/* Master Accent Toggle */}
            <button
              onClick={onToggleMasterAccent}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full font-telemetry text-[10px] font-bold transition-all cursor-pointer border ${
                isAccentEnabled
                  ? 'bg-[#ffbd58]/20 border-[#ffbd58]/50 text-[#ffbd58] shadow-[0_0_10px_rgba(255,189,88,0.3)]'
                  : 'bg-[#272a30] border-[#3c494e] text-[#859399]'
              }`}
              type="button"
            >
              <span className="material-symbols-outlined text-[12px]">
                {isAccentEnabled ? 'check_circle' : 'do_not_disturb_on'}
              </span>
              {isAccentEnabled ? 'Accents Active' : 'Accents Muted'}
            </button>
          </div>

          {/* Time Signature Selector */}
          <div className="flex items-center justify-between gap-1.5 bg-[#0b0e13] p-1 rounded-xl border border-[#232e42]">
            {timeSignatureOptions.map((sig) => {
              const isSelected = timeSignature === sig;
              return (
                <button
                  key={sig}
                  onClick={() => onTimeSignatureChange(sig)}
                  className={`flex-1 py-1 rounded-lg font-telemetry text-[12px] font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#00d2ff] text-[#001f28] shadow-[0_0_10px_rgba(0,210,255,0.4)]'
                      : 'text-[#bbc9cf] hover:text-[#e1e2ea]'
                  }`}
                  type="button"
                >
                  {sig}
                </button>
              );
            })}
          </div>

          {/* Interactive Beat Accent Cells: Click to Toggle Accent on ANY beat! */}
          <div className="space-y-1.5">
            <span className="font-telemetry text-[10px] uppercase tracking-wider text-[#859399] block">
              Tap individual beats to toggle accent stress:
            </span>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {accentBeats.map((isAccented, index) => {
                const hasAccent = isAccented && isAccentEnabled;
                const isCurrent = currentBeat === index;
                return (
                  <button
                    key={index}
                    onClick={() => onToggleAccentBeat(index)}
                    className={`relative p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      hasAccent
                        ? 'bg-[#ffbd58]/15 border-[#ffbd58] text-[#ffbd58] shadow-[0_0_12px_rgba(255,189,88,0.25)]'
                        : 'bg-[#0b0e13] hover:bg-[#1d2025] border-[#272a30] text-[#bbc9cf]'
                    } ${isCurrent ? 'ring-2 ring-[#00d2ff]' : ''}`}
                    type="button"
                  >
                    <span className="font-telemetry text-[14px] font-extrabold">
                      Beat {index + 1}
                    </span>
                    <span
                      className={`text-[9px] font-telemetry uppercase font-bold px-1.5 py-0.2 rounded-full ${
                        hasAccent
                          ? 'bg-[#ffbd58] text-[#001f28]'
                          : 'bg-[#272a30] text-[#859399]'
                      }`}
                    >
                      {hasAccent ? 'ACCENT' : 'NORMAL'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* AUDIO & CLICK TIMBRE SETTINGS */}
        <div className="space-y-2 bg-[#191c21] p-3 rounded-2xl border border-[#232e42]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[#00d2ff] text-[18px]">
                volume_up
              </span>
              <span className="font-headline text-[13px] font-bold text-[#e1e2ea]">
                Audible Click &amp; Sound
              </span>
            </div>

            <button
              onClick={onToggleAudible}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-telemetry text-[10px] font-bold transition-all cursor-pointer ${
                isAudible
                  ? 'bg-[#00d2ff]/20 text-[#00d2ff] border border-[#00d2ff]/40'
                  : 'bg-[#272a30] text-[#859399]'
              }`}
              type="button"
            >
              <span className="material-symbols-outlined text-[13px]">
                {isAudible ? 'volume_up' : 'volume_off'}
              </span>
              {isAudible ? 'Audible Click ON' : 'Muted'}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1.5 pt-1">
            {(['acoustic', 'digital', 'bell'] as MetronomeTimbre[]).map((t) => (
              <button
                key={t}
                onClick={() => {
                  onTimbreChange(t);
                  audioEngine.playMetronomeTick(true, volume, t);
                }}
                className={`py-1.5 px-2 rounded-lg font-telemetry text-[11px] capitalize transition-all cursor-pointer ${
                  timbre === t
                    ? 'bg-[#272a30] border border-[#00d2ff] text-[#00d2ff] font-bold'
                    : 'bg-[#0b0e13] hover:bg-[#1d2025] text-[#bbc9cf]'
                }`}
                type="button"
              >
                {t === 'acoustic' ? '🪵 Woodblock' : t === 'digital' ? '⚡ Synth Tick' : '🔔 Bell / Chime'}
              </button>
            ))}
          </div>

          {/* Volume Slider */}
          {isAudible && (
            <div className="flex items-center gap-2 pt-1">
              <span className="font-telemetry text-[10px] text-[#859399]">Volume</span>
              <input
                type="range"
                min="0.05"
                max="1"
                step="0.05"
                value={volume}
                onChange={(e) => onVolumeChange(Number(e.target.value))}
                className="flex-1 accent-[#00d2ff] h-1.5 bg-[#0b0e13] rounded-lg cursor-pointer"
              />
              <span className="font-telemetry text-[10px] text-[#00d2ff] font-bold w-7 text-right">
                {Math.round(volume * 100)}%
              </span>
            </div>
          )}
        </div>

        {/* Save & Close Button */}
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-[#00d2ff] hover:bg-[#45d1f6] text-[#001f28] font-headline text-[14px] font-bold transition-all shadow-[0_0_16px_rgba(0,210,255,0.4)] active:scale-[0.98] cursor-pointer"
          type="button"
        >
          Done
        </button>
      </div>
    </div>
  );
};
