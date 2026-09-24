import React, { useState } from 'react';
import { TabType, Song, RecordedPerformance, InstrumentPatch, BluetoothLatencyConfig } from './types';
import { REPERTOIRE_SONGS } from './data/mockData';
import { loadSavedRecordings, persistRecordings, performanceToSong } from './data/mockRecordings';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { HomeScreen } from './components/HomeScreen';
import { PlayScreen } from './components/PlayScreen';
import { LibraryScreen } from './components/LibraryScreen';
import { StatsScreen } from './components/StatsScreen';
import { ProfileModal } from './components/ProfileModal';
import { StudioControlDrawer } from './components/StudioControlDrawer';
import { MaestroChatModal } from './components/MaestroChatModal';
import { LyriaMusicGeneratorModal } from './components/LyriaMusicGeneratorModal';
import { PlayStoreExportModal } from './components/PlayStoreExportModal';
import { PartituraModal } from './components/PartituraModal';
import { audioEngine } from './utils/audioEngine';
import { Sparkles, Wand2, Smartphone } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<TabType>('home');
  const [currentSong, setCurrentSong] = useState<Song>(
    REPERTOIRE_SONGS[0] || {
      id: 'free-atelier',
      title: 'Free Atelier Play',
      composer: 'AriaKeys Studio',
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
    }
  );
  const [recordings, setRecordings] = useState<RecordedPerformance[]>(loadSavedRecordings);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isStudioDrawerOpen, setIsStudioDrawerOpen] = useState(false);
  const [isMaestroChatOpen, setIsMaestroChatOpen] = useState(false);
  const [isLyriaGeneratorOpen, setIsLyriaGeneratorOpen] = useState(false);
  const [isPlayStoreExportOpen, setIsPlayStoreExportOpen] = useState(false);
  const [activePartituraRec, setActivePartituraRec] = useState<RecordedPerformance | null>(null);

  const [currentPatch, setCurrentPatch] = useState<InstrumentPatch>(audioEngine.getPatch());
  const [bluetoothConfig, setBluetoothConfig] = useState<BluetoothLatencyConfig>(audioEngine.getBluetoothConfig());
  const [measuredLatency, setMeasuredLatency] = useState(4.2);
  const [measuredJitter, setMeasuredJitter] = useState(0.1);

  const handleStartSong = (song: Song) => {
    setCurrentSong(song);
    setCurrentTab('play');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTabChange = (tab: TabType) => {
    setCurrentTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveRecording = (newRec: RecordedPerformance) => {
    setRecordings((prev) => {
      const next = [newRec, ...prev];
      persistRecordings(next);
      return next;
    });
  };

  const handleDeleteRecording = (id: string) => {
    setRecordings((prev) => {
      const next = prev.filter((r) => r.id !== id);
      persistRecordings(next);
      return next;
    });
  };

  const handlePlayRecordingInStudio = (rec: RecordedPerformance) => {
    const song = performanceToSong(rec);
    setCurrentSong(song);
    setCurrentTab('play');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePatchChange = (patch: InstrumentPatch) => {
    setCurrentPatch(patch);
    audioEngine.setPatch(patch);
  };

  const handleBluetoothConfigChange = (cfg: BluetoothLatencyConfig) => {
    setBluetoothConfig(cfg);
    audioEngine.setBluetoothConfig(cfg);
  };

  return (
    <div className="bg-[#111319] min-h-screen text-[#e1e2ea] flex flex-col antialiased selection:bg-[#00d2ff]/20 selection:text-[#00d2ff]">
      {/* Top Header */}
      <Header
        currentTab={currentTab}
        onProfileClick={() => setIsProfileOpen(true)}
        onOpenStudioDrawer={() => setIsStudioDrawerOpen(true)}
        isBluetoothEnabled={bluetoothConfig.isEnabled}
        bluetoothCompensationMs={bluetoothConfig.compensationMs}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative w-full pt-16">
        {currentTab === 'home' && (
          <div className="flex flex-col w-full">
            {/* AI Power Tools Action Bar */}
            <div className="w-full max-w-xl mx-auto px-4 pt-4 pb-2 grid grid-cols-3 gap-2">
              <button
                onClick={() => setIsMaestroChatOpen(true)}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-gradient-to-br from-[#1d2025] to-[#181b24] border border-[#00d2ff]/30 hover:border-[#00d2ff] text-white shadow-lg transition-all group active:scale-95"
              >
                <div className="w-9 h-9 rounded-xl bg-[#00d2ff]/20 text-[#00d2ff] flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                  <Sparkles className="w-5 h-5" />
                </div>
                <span className="font-headline text-[12px] font-bold">Maestro AI</span>
                <span className="font-telemetry text-[9px] text-[#94a3b8]">Gemini + Search</span>
              </button>

              <button
                onClick={() => setIsLyriaGeneratorOpen(true)}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-gradient-to-br from-[#1d2025] to-[#181b24] border border-[#7928ca]/30 hover:border-[#7928ca] text-white shadow-lg transition-all group active:scale-95"
              >
                <div className="w-9 h-9 rounded-xl bg-[#7928ca]/20 text-[#7928ca] flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                  <Wand2 className="w-5 h-5" />
                </div>
                <span className="font-headline text-[12px] font-bold">Lyria-3 AI</span>
                <span className="font-telemetry text-[9px] text-[#94a3b8]">Music Generator</span>
              </button>

              <button
                onClick={() => setIsPlayStoreExportOpen(true)}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-gradient-to-br from-[#1d2025] to-[#181b24] border border-emerald-500/30 hover:border-emerald-500 text-white shadow-lg transition-all group active:scale-95"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                  <Smartphone className="w-5 h-5" />
                </div>
                <span className="font-headline text-[12px] font-bold">Play Store</span>
                <span className="font-telemetry text-[9px] text-[#94a3b8]">APK / PWA Export</span>
              </button>
            </div>

            <HomeScreen
              onStartSong={handleStartSong}
              onNavigateToTab={handleTabChange}
              measuredLatency={measuredLatency}
              measuredJitter={measuredJitter}
              onOpenProfile={() => setIsProfileOpen(true)}
              onOpenStudioDrawer={() => setIsStudioDrawerOpen(true)}
            />
          </div>
        )}

        {currentTab === 'play' && (
          <PlayScreen
            currentSong={currentSong}
            onSongChange={setCurrentSong}
            onSaveRecording={handleSaveRecording}
            onNavigateToLibrary={() => handleTabChange('library')}
            onOpenStudioDrawer={() => setIsStudioDrawerOpen(true)}
            selectedPatch={currentPatch}
            onPatchChange={handlePatchChange}
            bluetoothConfig={bluetoothConfig}
            onViewPartitura={setActivePartituraRec}
          />
        )}

        {currentTab === 'library' && (
          <LibraryScreen
            onSelectSong={handleStartSong}
            recordings={recordings}
            onDeleteRecording={handleDeleteRecording}
            onPlayRecordingInStudio={handlePlayRecordingInStudio}
            onNavigateToPlay={() => handleTabChange('play')}
            onViewPartitura={setActivePartituraRec}
          />
        )}

        {currentTab === 'stats' && (
          <StatsScreen
            onGoToPractice={() => handleTabChange('play')}
          />
        )}
      </main>

      {/* Fixed Bottom Tab Navigation */}
      <BottomNav
        currentTab={currentTab}
        onTabChange={handleTabChange}
      />

      {/* Panel Lateral Superior Izquierdo: Estilos de Sonido & Calibrador Bluetooth */}
      <StudioControlDrawer
        isOpen={isStudioDrawerOpen}
        onClose={() => setIsStudioDrawerOpen(false)}
        currentPatch={currentPatch}
        onPatchChange={handlePatchChange}
        bluetoothConfig={bluetoothConfig}
        onBluetoothConfigChange={handleBluetoothConfigChange}
      />

      {/* Profile & Atelier Hardware Diagnostic Modal (with MIDI Latency Test) */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        currentLatencyMs={measuredLatency}
        onLatencyUpdated={(latency, jitter) => {
          setMeasuredLatency(latency);
          setMeasuredJitter(jitter);
        }}
      />

      {/* Maestro AI Chatbot Modal */}
      <MaestroChatModal
        isOpen={isMaestroChatOpen}
        onClose={() => setIsMaestroChatOpen(false)}
      />

      {/* Lyria-3 AI Music Generator Modal */}
      <LyriaMusicGeneratorModal
        isOpen={isLyriaGeneratorOpen}
        onClose={() => setIsLyriaGeneratorOpen(false)}
        onLoadSong={(song) => {
          handleStartSong(song);
        }}
      />

      {/* Google Play Store Export & TWA Kit Modal */}
      <PlayStoreExportModal
        isOpen={isPlayStoreExportOpen}
        onClose={() => setIsPlayStoreExportOpen(false)}
      />

      {/* Partitura (Sheet Music Score) Modal */}
      <PartituraModal
        isOpen={!!activePartituraRec}
        onClose={() => setActivePartituraRec(null)}
        performance={activePartituraRec}
      />
    </div>
  );
}
