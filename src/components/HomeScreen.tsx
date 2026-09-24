import React, { useState } from 'react';
import { Song } from '../types';
import { USER_PROFILE, REPERTOIRE_SONGS, MILESTONE_PIECE } from '../data/mockData';

interface HomeScreenProps {
  onStartSong: (song: Song) => void;
  onNavigateToTab: (tab: 'play' | 'library' | 'stats') => void;
  measuredLatency?: number;
  measuredJitter?: number;
  onOpenProfile?: () => void;
  onOpenStudioDrawer?: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onStartSong,
  onNavigateToTab,
  measuredLatency = 4.2,
  measuredJitter = 0.1,
  onOpenProfile,
  onOpenStudioDrawer,
}) => {
  const currentSong = REPERTOIRE_SONGS[0] || {
    id: 'free-atelier',
    title: 'Free Atelier Mode',
    composer: 'AriaKeys Studio',
    collection: 'Live Improvisation',
    key: 'C Maj',
    bpm: 120,
    duration: '0:00',
    difficulty: 'Beginner',
    genre: 'Free Play',
    artworkUrl: 'https://images.unsplash.com/photo-1520523839896-5aa428257cc2?q=80&w=300&auto=format&fit=crop',
    altText: 'Piano studio free play',
    totalBars: 32,
    currentBar: 1,
    masteryPct: 0,
    pitchPrecision: 100,
    tempoStability: 100,
    notesSequence: []
  };
  const [activeModal, setActiveModal] = useState<'harmonic' | 'acoustic' | 'moreOptions' | null>(null);
  const [calibrating, setCalibrating] = useState(false);
  const [detectedPitch, setDetectedPitch] = useState<string | null>(null);

  const handleStartAcousticCalibration = () => {
    setCalibrating(true);
    setDetectedPitch('Listening...');
    setTimeout(() => {
      setDetectedPitch('A4 (440.1 Hz) • -2 cents');
      setCalibrating(false);
    }, 1800);
  };

  return (
    <div className="flex flex-col w-full max-w-xl mx-auto px-4 space-y-5 pb-28 pt-2">
      {/* Top Greeting & Studio Readiness HUD */}
      <section className="flex flex-col space-y-2 pt-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col min-w-0">
            <h1 className="font-headline text-[26px] font-extrabold tracking-tight text-[#e1e2ea] truncate">
              Good evening, {USER_PROFILE.name}
            </h1>
            <p className="font-sans text-[14px] text-[#bbc9cf] flex items-center gap-1.5 mt-0.5">
              <span className="inline-block w-2 h-2 rounded-full bg-[#00d2ff] shadow-[0_0_8px_rgba(0,210,255,0.9)] animate-pulse" />
              Ready for your daily atelier session?
            </p>
          </div>

          {/* Live XP Counter Pill */}
          <div className="shrink-0 flex items-center gap-1.5 bg-[#272a30] px-3 py-1.5 rounded-full border border-[#3c494e]/50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)]">
            <span className="material-symbols-outlined text-[#ffbd58] text-[18px] leading-none" style={{ fontVariationSettings: "'FILL' 1" }}>
              bolt
            </span>
            <span className="font-telemetry text-[12px] text-[#ffbd58] font-bold tracking-tight">
              +{USER_PROFILE.xpCount} XP
            </span>
          </div>
        </div>

        {/* Quick Audio Engine Diagnostic Ticker */}
        <div
          onClick={onOpenProfile}
          role="button"
          tabIndex={0}
          title="Click to run MIDI Latency Test in Profile"
          className="flex items-center justify-between bg-[#191c21] hover:bg-[#20242b] border border-[#232e42]/60 hover:border-[#00d2ff]/40 px-3.5 py-2 rounded-xl shadow-sm transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00d2ff] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00d2ff]" />
            </span>
            <span className="font-telemetry text-[11px] text-[#bbc9cf] group-hover:text-[#e1e2ea] uppercase tracking-wider truncate">
              CoreAudio Driver • MIDI Benchmark
            </span>
          </div>
          <div className="flex items-center gap-1.5 bg-[#1d2025] px-2 py-0.5 rounded-full border border-[#272a30] group-hover:border-[#00d2ff]/50">
            <span className="font-telemetry text-[11px] text-[#00d2ff] font-bold">{measuredLatency.toFixed(1)} ms</span>
            <span className="font-telemetry text-[11px] text-[#859399]">±{measuredJitter.toFixed(1)}ms</span>
            <span className="material-symbols-outlined text-[14px] text-[#00d2ff] ml-0.5">
              tune
            </span>
          </div>
        </div>

        {/* Quick Studio Sound Styles & Bluetooth Latency Launcher Banner */}
        {onOpenStudioDrawer && (
          <div
            onClick={onOpenStudioDrawer}
            role="button"
            tabIndex={0}
            className="p-3 rounded-2xl bg-gradient-to-r from-[#00d2ff]/10 via-[#181c24] to-[#ea9f00]/10 border border-[#00d2ff]/30 hover:border-[#00d2ff]/60 shadow-lg flex items-center justify-between transition-all cursor-pointer group active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#00d2ff]/20 text-[#00d2ff] border border-[#00d2ff]/40 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(0,210,255,0.3)] group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-[20px]">tune</span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-headline text-[13px] font-bold text-[#e1e2ea] group-hover:text-[#00d2ff] transition-colors">
                    18 Estilos de Sonido & Auriculares Bluetooth
                  </span>
                  <span className="px-1.5 py-0.2 rounded-full bg-[#ffbd58]/20 text-[#ffbd58] font-telemetry text-[9px] font-bold">
                    Anti-Lag
                  </span>
                </div>
                <span className="font-telemetry text-[11px] text-[#bbc9cf]">
                  Pianos clásicos, DX7, Rhodes, órganos y compensación cero latencia inalámbrica
                </span>
              </div>
            </div>
            <span className="material-symbols-outlined text-[20px] text-[#859399] group-hover:text-[#00d2ff] group-hover:translate-x-0.5 transition-all">
              chevron_right
            </span>
          </div>
        )}
      </section>

      {/* Hero Feature Card: Continue Learning */}
      <section className="relative group rounded-2xl overflow-hidden bg-[#1d2025] border border-[#232e42] p-4 shadow-xl transition-all duration-300">
        {/* Ambient Emissive Backdrop Glow */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-[#00d2ff]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-[#ffbd58]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col space-y-3.5">
          {/* Card Sub-header & Status Tag */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#00d2ff]/15 border border-[#00d2ff]/30 text-[#00d2ff] font-telemetry text-[11px] uppercase tracking-wider font-bold">
                Current Score
              </span>
              <span className="font-sans text-[12px] text-[#bbc9cf]">Last played 2h ago</span>
            </div>
            <button
              onClick={() => setActiveModal('moreOptions')}
              aria-label="Song settings"
              className="w-8 h-8 rounded-full bg-[#272a30] flex items-center justify-center text-[#bbc9cf] hover:text-[#e1e2ea] hover:bg-[#32353b] transition-colors"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">more_horiz</span>
            </button>
          </div>

          {/* Song Visualizer Header & Meta */}
          <div className="flex gap-3.5 items-center">
            <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 shadow-md border border-[#272a30]">
              <img
                className="w-full h-full object-cover"
                alt={currentSong.altText}
                src={currentSong.artworkUrl}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0b0e13]/80 via-transparent to-transparent flex items-end justify-center pb-1">
                <span className="material-symbols-outlined text-[#00d2ff] text-[18px]">music_note</span>
              </div>
            </div>

            <div className="flex flex-col min-w-0 flex-1">
              <h2 className="font-headline text-[20px] font-bold text-[#e1e2ea] tracking-tight truncate">
                {currentSong.title}
              </h2>
              <span className="font-sans text-[13px] text-[#bbc9cf] truncate">
                {currentSong.composer} • {currentSong.collection}
              </span>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="font-telemetry text-[11px] px-2 py-0.5 rounded bg-[#32353b] text-[#e1e2ea] font-medium">
                  Key: {currentSong.key}
                </span>
                <span className="font-telemetry text-[11px] px-2 py-0.5 rounded bg-[#32353b] text-[#e1e2ea] font-medium">
                  {currentSong.bpm} BPM
                </span>
                <span className="font-telemetry text-[11px] px-2 py-0.5 rounded bg-[#32353b] text-[#00d2ff] font-bold">
                  Bar {currentSong.currentBar}/{currentSong.totalBars}
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Progress Visualizer */}
          <div className="flex flex-col space-y-2 bg-[#0b0e13]/70 p-3 rounded-xl border border-[#232e42]/60">
            <div className="flex justify-between items-baseline">
              <span className="font-sans text-[12px] text-[#bbc9cf] flex items-center gap-1.5 font-medium">
                <span className="material-symbols-outlined text-[#00d2ff] text-[16px]">verified</span>
                Overall Repertoire Mastery
              </span>
              <span className="font-telemetry text-[14px] font-bold text-[#00d2ff]">
                {currentSong.masteryPct}%
              </span>
            </div>

            {/* Glowing Segmented Bar */}
            <div className="relative w-full h-2.5 rounded-full bg-[#32353b] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#00d2ff] to-[#45d1f6] rounded-full shadow-[0_0_12px_rgba(0,210,255,0.85)] transition-all duration-500"
                style={{ width: `${currentSong.masteryPct}%` }}
              />
            </div>

            {/* Telemetry Accuracies */}
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#191c21] border border-[#272a30]">
                <span className="font-telemetry text-[11px] text-[#bbc9cf]">Pitch Precision</span>
                <span className="font-telemetry text-[12px] font-bold text-[#e1e2ea]">
                  {currentSong.pitchPrecision}%
                </span>
              </div>
              <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#191c21] border border-[#272a30]">
                <span className="font-telemetry text-[11px] text-[#bbc9cf]">Tempo Stability</span>
                <span className="font-telemetry text-[12px] font-bold text-[#ffbd58]">
                  {currentSong.tempoStability}%
                </span>
              </div>
            </div>
          </div>

          {/* Action Panel Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <button
              onClick={() => onStartSong(currentSong)}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#00d2ff] hover:bg-[#45d1f6] text-[#001f28] font-headline text-[15px] font-extrabold shadow-[0_0_24px_rgba(0,210,255,0.5)] active:scale-[0.98] transition-all cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                play_arrow
              </span>
              Resume Practice
            </button>

            <button
              onClick={() => onStartSong(currentSong)}
              className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#272a30] hover:bg-[#32353b] text-[#e1e2ea] border border-[#3c494e]/60 font-sans text-[13px] font-medium active:scale-[0.98] transition-all cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px] text-[#ffbd58]">repeat</span>
              <span className="truncate">Loop Bars 14–22</span>
            </button>
          </div>
        </div>
      </section>

      {/* Daily Practice Objective Ring Widget */}
      <section className="bg-[#191c21] border border-[#232e42] rounded-2xl p-4 shadow-md flex items-center justify-between gap-4">
        <div className="flex flex-col min-w-0 space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[#ffbd58] text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              timer
            </span>
            <span className="font-telemetry text-[11px] uppercase tracking-wider text-[#ffbd58] font-bold">
              Daily Objective
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-telemetry text-[22px] font-extrabold text-[#e1e2ea]">20</span>
            <span className="font-sans text-[14px] text-[#bbc9cf]">/ 30 mins</span>
          </div>
          <p className="font-telemetry text-[11px] text-[#bbc9cf] truncate">
            10 mins remaining to extend your 14-day streak
          </p>
        </div>

        {/* Circular Progress Gauge Component */}
        <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 48 48">
            <circle
              className="stroke-[#32353b]"
              cx="24"
              cy="24"
              fill="none"
              r="20"
              strokeWidth="4.5"
            />
            <circle
              className="stroke-[#ffbd58]"
              cx="24"
              cy="24"
              fill="none"
              r="20"
              strokeDasharray="125.6"
              strokeDashoffset="41.8"
              strokeLinecap="round"
              strokeWidth="4.5"
              style={{ filter: 'drop-shadow(0 0 6px rgba(255, 189, 88, 0.5))' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-telemetry text-[12px] font-bold text-[#e1e2ea]">66%</span>
          </div>
        </div>
      </section>

      {/* Practice Modes Showcase (2x2 Bento) */}
      <section className="flex flex-col space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#00d2ff] text-[20px]">tune</span>
            <h3 className="font-headline text-[18px] font-bold text-[#e1e2ea] tracking-tight">
              Studio Modes
            </h3>
          </div>
          <button
            onClick={() => onNavigateToTab('library')}
            className="font-sans text-[12px] text-[#00d2ff] font-semibold flex items-center gap-0.5 hover:underline cursor-pointer"
            type="button"
          >
            All Modules
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Mode 1: Free Play */}
          <div
            onClick={() => onNavigateToTab('play')}
            className="relative bg-[#1d2025] border border-[#232e42] rounded-2xl p-4 shadow-md flex flex-col justify-between overflow-hidden group hover:border-[#00d2ff]/60 hover:bg-[#272a30] transition-all cursor-pointer"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#00d2ff]/5 rounded-full blur-xl pointer-events-none" />
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-[#0b0e13] flex items-center justify-center text-[#00d2ff] shadow-inner border border-[#232e42]">
                  <span className="material-symbols-outlined text-[24px]">piano</span>
                </div>
                <span className="font-telemetry text-[10px] px-2 py-0.5 rounded-full bg-[#272a30] border border-[#3c494e]/50 text-[#00d2ff] font-bold">
                  MIDI Ready
                </span>
              </div>
              <div className="flex flex-col">
                <h4 className="font-headline text-[16px] font-bold text-[#e1e2ea]">Free Play</h4>
                <p className="font-sans text-[12px] text-[#bbc9cf] line-clamp-2 mt-0.5 leading-snug">
                  Concert Grand D-274 & Rhodes Mk8 modeling. 88-key velocity sensitive response with direct WAV export.
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 flex items-center justify-between border-t border-[#232e42]/50">
              <div className="flex gap-1 items-end h-5">
                <div className="w-1.5 h-3 bg-[#bbc9cf]/40 rounded-full" />
                <div className="w-1.5 h-5 bg-[#00d2ff] rounded-full shadow-[0_0_8px_rgba(0,210,255,0.7)] animate-pulse" />
                <div className="w-1.5 h-2 bg-[#bbc9cf]/40 rounded-full" />
                <div className="w-1.5 h-4 bg-[#00d2ff] rounded-full shadow-[0_0_8px_rgba(0,210,255,0.7)]" />
                <div className="w-1.5 h-3 bg-[#bbc9cf]/40 rounded-full" />
              </div>
              <span className="font-sans text-[12px] text-[#00d2ff] font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Enter Keybed <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </span>
            </div>
          </div>

          {/* Mode 2: Guided Waterfall */}
          <div
            onClick={() => onNavigateToTab('library')}
            className="relative bg-[#1d2025] border border-[#232e42] rounded-2xl p-4 shadow-md flex flex-col justify-between overflow-hidden group hover:border-[#ffbd58]/60 hover:bg-[#272a30] transition-all cursor-pointer"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#ffbd58]/5 rounded-full blur-xl pointer-events-none" />
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-[#0b0e13] flex items-center justify-center text-[#ffbd58] shadow-inner border border-[#232e42]">
                  <span className="material-symbols-outlined text-[24px]">waterfall_chart</span>
                </div>
                <span className="font-telemetry text-[10px] px-2 py-0.5 rounded-full bg-[#ea9f00]/20 border border-[#ea9f00]/30 text-[#ffbd58] font-bold">
                  350+ Scores
                </span>
              </div>
              <div className="flex flex-col">
                <h4 className="font-headline text-[16px] font-bold text-[#e1e2ea]">Guided Waterfall</h4>
                <p className="font-sans text-[12px] text-[#bbc9cf] line-clamp-2 mt-0.5 leading-snug">
                  Interactive descending telemetry. Left & right hand separation with tempo stretch down to 25%.
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 flex items-center justify-between border-t border-[#232e42]/50">
              <span className="font-telemetry text-[11px] text-[#bbc9cf]">Classics & Neo-Soul</span>
              <span className="font-sans text-[12px] text-[#ffbd58] font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Browse Sheet <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </span>
            </div>
          </div>

          {/* Mode 3: Chord Ear Drills */}
          <div
            onClick={() => setActiveModal('harmonic')}
            className="relative bg-[#1d2025] border border-[#232e42] rounded-2xl p-4 shadow-md flex flex-col justify-between overflow-hidden group hover:border-[#45d1f6]/60 hover:bg-[#272a30] transition-all cursor-pointer"
          >
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-[#0b0e13] flex items-center justify-center text-[#45d1f6] shadow-inner border border-[#232e42]">
                  <span className="material-symbols-outlined text-[24px]">graphic_eq</span>
                </div>
                <span className="font-telemetry text-[10px] px-2 py-0.5 rounded-full bg-[#32353b] border border-[#3c494e]/50 text-[#45d1f6] font-bold">
                  Daily Drill
                </span>
              </div>
              <div className="flex flex-col">
                <h4 className="font-headline text-[16px] font-bold text-[#e1e2ea]">Harmonic Training</h4>
                <p className="font-sans text-[12px] text-[#bbc9cf] line-clamp-2 mt-0.5 leading-snug">
                  Master 7th chords, extended voicings, and rootless inversions with instant audio-visual chord recognition.
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 flex items-center justify-between border-t border-[#232e42]/50">
              <span className="font-telemetry text-[11px] text-[#bbc9cf]">Level IV • Jazz Voicing</span>
              <span className="font-sans text-[12px] text-[#45d1f6] font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Train Ears <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </span>
            </div>
          </div>

          {/* Mode 4: Acoustic Listener Engine */}
          <div
            onClick={() => setActiveModal('acoustic')}
            className="relative bg-[#1d2025] border border-[#232e42] rounded-2xl p-4 shadow-md flex flex-col justify-between overflow-hidden group hover:border-[#00d2ff]/60 hover:bg-[#272a30] transition-all cursor-pointer"
          >
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-[#0b0e13] flex items-center justify-center text-[#00d2ff] shadow-inner border border-[#232e42]">
                  <span className="material-symbols-outlined text-[24px]">mic</span>
                </div>
                <span className="font-telemetry text-[10px] px-2 py-0.5 rounded-full bg-[#00d2ff]/15 border border-[#00d2ff]/30 text-[#00d2ff] font-bold">
                  Acoustic Mic
                </span>
              </div>
              <div className="flex flex-col">
                <h4 className="font-headline text-[16px] font-bold text-[#e1e2ea]">Acoustic Tracking</h4>
                <p className="font-sans text-[12px] text-[#bbc9cf] line-clamp-2 mt-0.5 leading-snug">
                  Place phone on upright or grand piano. Machine listening tracks polyphonic frequencies in real time.
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 flex items-center justify-between border-t border-[#232e42]/50">
              <span className="font-telemetry text-[11px] text-[#bbc9cf]">Polyphonic FFT</span>
              <span className="font-sans text-[12px] text-[#00d2ff] font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Calibrate <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Studio Live Master Feed Widget */}
      <section className="bg-[#1d2025] border border-[#232e42] rounded-2xl p-4 shadow-md flex flex-col space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#ffbd58] text-[20px]">workspace_premium</span>
            <h3 className="font-headline text-[16px] font-bold text-[#e1e2ea]">
              Mastery Milestone
            </h3>
          </div>
          <span className="font-telemetry text-[11px] text-[#ffbd58] font-bold px-2 py-0.5 rounded bg-[#ea9f00]/15 border border-[#ea9f00]/30">
            {MILESTONE_PIECE.grade}
          </span>
        </div>

        <div className="flex items-center gap-3.5 bg-[#191c21] border border-[#232e42]/60 p-3 rounded-xl">
          <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-[#272a30]">
            <img
              className="w-full h-full object-cover"
              alt={MILESTONE_PIECE.altText}
              src={MILESTONE_PIECE.artworkUrl}
            />
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="font-headline text-[14px] font-bold text-[#e1e2ea] truncate">
              {MILESTONE_PIECE.title}
            </span>
            <span className="font-telemetry text-[11px] text-[#bbc9cf] truncate">
              {MILESTONE_PIECE.subtitle}
            </span>
          </div>
          <button
            onClick={() => onStartSong(REPERTOIRE_SONGS[2])} // Für Elise / Classical
            className="ml-auto w-10 h-10 rounded-full bg-[#1d2025] hover:bg-[#00d2ff] hover:text-[#001f28] text-[#00d2ff] flex items-center justify-center border border-[#272a30] transition-colors cursor-pointer"
            type="button"
            aria-label="Play milestone piece"
          >
            <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              play_arrow
            </span>
          </button>
        </div>
      </section>

      {/* Modal: Harmonic Training Ear Drill */}
      {activeModal === 'harmonic' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="bg-[#1d2025] border border-[#232e42] rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#45d1f6] text-[22px]">graphic_eq</span>
                <h3 className="font-headline text-[18px] font-bold text-[#e1e2ea]">Harmonic Ear Training</h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="text-[#bbc9cf] hover:text-[#e1e2ea]"
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <p className="font-sans text-[13px] text-[#bbc9cf] leading-relaxed">
              Listen to the played chord cluster and identify the extension:
            </p>
            <div className="p-3 bg-[#0b0e13] rounded-xl border border-[#232e42] flex flex-col items-center gap-2">
              <span className="font-telemetry text-[12px] text-[#ffbd58]">C Maj9 (add 13)</span>
              <div className="flex gap-2">
                <span className="px-2 py-1 bg-[#191c21] rounded text-[#00d2ff] font-telemetry text-[11px]">C3</span>
                <span className="px-2 py-1 bg-[#191c21] rounded text-[#00d2ff] font-telemetry text-[11px]">E3</span>
                <span className="px-2 py-1 bg-[#191c21] rounded text-[#00d2ff] font-telemetry text-[11px]">B3</span>
                <span className="px-2 py-1 bg-[#191c21] rounded text-[#00d2ff] font-telemetry text-[11px]">D4</span>
                <span className="px-2 py-1 bg-[#191c21] rounded text-[#00d2ff] font-telemetry text-[11px]">A4</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => setActiveModal(null)}
                className="py-2.5 px-3 bg-[#272a30] hover:bg-[#00d2ff] hover:text-[#001f28] rounded-xl font-headline text-[13px] font-bold text-[#e1e2ea] transition-all"
                type="button"
              >
                Major 9th (Correct)
              </button>
              <button
                onClick={() => setActiveModal(null)}
                className="py-2.5 px-3 bg-[#272a30] hover:bg-[#32353b] rounded-xl font-headline text-[13px] font-bold text-[#bbc9cf] transition-all"
                type="button"
              >
                Dominant 7#9
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Acoustic Tracking Calibration */}
      {activeModal === 'acoustic' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="bg-[#1d2025] border border-[#232e42] rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#00d2ff] text-[22px]">mic</span>
                <h3 className="font-headline text-[18px] font-bold text-[#e1e2ea]">Acoustic Tracking Engine</h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="text-[#bbc9cf] hover:text-[#e1e2ea]"
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <p className="font-sans text-[13px] text-[#bbc9cf] leading-relaxed">
              Place your device near your piano. Play middle C (C4) to calibrate the polyphonic FFT listening engine.
            </p>
            <div className="p-4 bg-[#0b0e13] rounded-xl border border-[#232e42] flex flex-col items-center justify-center gap-2 min-h-[90px]">
              {calibrating ? (
                <div className="flex items-center gap-2 text-[#00d2ff]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#00d2ff] animate-ping" />
                  <span className="font-telemetry text-[13px] font-bold">Analyzing Polyphonic FFT...</span>
                </div>
              ) : detectedPitch ? (
                <div className="flex flex-col items-center">
                  <span className="font-telemetry text-[14px] font-bold text-[#00d2ff]">{detectedPitch}</span>
                  <span className="font-sans text-[11px] text-[#10b981] font-semibold mt-1">Calibrated & Ready</span>
                </div>
              ) : (
                <span className="font-telemetry text-[12px] text-[#859399]">Microphone listening idle</span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleStartAcousticCalibration}
                className="flex-1 py-2.5 px-4 bg-[#00d2ff] hover:bg-[#45d1f6] text-[#001f28] rounded-xl font-headline text-[13px] font-bold transition-all shadow-[0_0_16px_rgba(0,210,255,0.4)]"
                type="button"
              >
                {calibrating ? 'Calibrating...' : 'Start Calibration'}
              </button>
              <button
                onClick={() => setActiveModal(null)}
                className="py-2.5 px-4 bg-[#272a30] text-[#e1e2ea] rounded-xl font-headline text-[13px] font-medium"
                type="button"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: More Options */}
      {activeModal === 'moreOptions' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="bg-[#1d2025] border border-[#232e42] rounded-2xl p-4 max-w-xs w-full space-y-3 shadow-2xl">
            <h4 className="font-headline text-[15px] font-bold text-[#e1e2ea]">Clair de Lune Settings</h4>
            <div className="flex flex-col space-y-1">
              <button
                onClick={() => { setActiveModal(null); onStartSong(currentSong); }}
                className="w-full text-left py-2 px-3 rounded-lg hover:bg-[#272a30] text-[13px] font-sans text-[#e1e2ea]"
                type="button"
              >
                Start from Bar 1
              </button>
              <button
                onClick={() => { setActiveModal(null); onStartSong(currentSong); }}
                className="w-full text-left py-2 px-3 rounded-lg hover:bg-[#272a30] text-[13px] font-sans text-[#e1e2ea]"
                type="button"
              >
                Practice Left Hand Solo
              </button>
              <button
                onClick={() => { setActiveModal(null); onStartSong(currentSong); }}
                className="w-full text-left py-2 px-3 rounded-lg hover:bg-[#272a30] text-[13px] font-sans text-[#e1e2ea]"
                type="button"
              >
                Practice Right Hand Solo
              </button>
              <button
                onClick={() => setActiveModal(null)}
                className="w-full text-center py-2 mt-2 bg-[#272a30] rounded-lg text-[13px] font-medium text-[#bbc9cf]"
                type="button"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
