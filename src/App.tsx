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
import { audioEngine } from './utils/audioEngine';

export default function App() {
  const [currentTab, setCurrentTab] = useState<TabType>('home');
  const [currentSong, setCurrentSong] = useState<Song>(REPERTOIRE_SONGS[0]);
  const [recordings, setRecordings] = useState<RecordedPerformance[]>(loadSavedRecordings);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isStudioDrawerOpen, setIsStudioDrawerOpen] = useState(false);
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
          <HomeScreen
            onStartSong={handleStartSong}
            onNavigateToTab={handleTabChange}
            measuredLatency={measuredLatency}
            measuredJitter={measuredJitter}
            onOpenProfile={() => setIsProfileOpen(true)}
            onOpenStudioDrawer={() => setIsStudioDrawerOpen(true)}
          />
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
          />
        )}

        {currentTab === 'library' && (
          <LibraryScreen
            onSelectSong={handleStartSong}
            recordings={recordings}
            onDeleteRecording={handleDeleteRecording}
            onPlayRecordingInStudio={handlePlayRecordingInStudio}
            onNavigateToPlay={() => handleTabChange('play')}
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
    </div>
  );
}
