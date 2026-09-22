import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Song, DifficultyLevel, RecordedPerformance } from '../types';
import { REPERTOIRE_SONGS } from '../data/mockData';
import { audioEngine } from '../utils/audioEngine';
import { performanceToSong } from '../data/mockRecordings';
import { downloadMidiFile } from '../utils/midiExport';

interface LibraryScreenProps {
  onSelectSong: (song: Song) => void;
  recordings?: RecordedPerformance[];
  onDeleteRecording?: (id: string) => void;
  onPlayRecordingInStudio?: (recording: RecordedPerformance) => void;
  onNavigateToPlay?: () => void;
}

export const LibraryScreen: React.FC<LibraryScreenProps> = ({
  onSelectSong,
  recordings = [],
  onDeleteRecording,
  onPlayRecordingInStudio,
  onNavigateToPlay,
}) => {
  const [activeView, setActiveView] = useState<'repertoire' | 'recordings'>('repertoire');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('All Genres');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');
  const [songs, setSongs] = useState<Song[]>(REPERTOIRE_SONGS);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importNotification, setImportNotification] = useState<string | null>(null);

  // In-Library Audio Playback for User Recordings
  const [playingRecordingId, setPlayingRecordingId] = useState<string | null>(null);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const playbackTimeoutsRef = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      stopAudioPlayback();
    };
  }, []);

  const stopAudioPlayback = () => {
    playbackTimeoutsRef.current.forEach((t) => window.clearTimeout(t));
    playbackTimeoutsRef.current = [];
    setPlayingRecordingId(null);
    setPlaybackProgress(0);
  };

  const handleTogglePlayRecording = (rec: RecordedPerformance) => {
    if (playingRecordingId === rec.id) {
      stopAudioPlayback();
      return;
    }

    stopAudioPlayback();
    audioEngine.init();
    audioEngine.setPatch(rec.patch);
    setPlayingRecordingId(rec.id);

    const totalMs = Math.max(
      rec.durationSec * 1000,
      rec.notes.reduce((max, n) => Math.max(max, n.timestamp + n.duration), 0)
    );

    const start = performance.now();
    const interval = window.setInterval(() => {
      const elapsed = performance.now() - start;
      const pct = Math.min(100, (elapsed / totalMs) * 100);
      setPlaybackProgress(pct);
      if (elapsed >= totalMs) {
        clearInterval(interval);
        setPlayingRecordingId(null);
        setPlaybackProgress(0);
      }
    }, 50);
    playbackTimeoutsRef.current.push(interval);

    rec.notes.forEach((n) => {
      const noteTimeout = window.setTimeout(() => {
        const stopFn = audioEngine.playNote(n.note, n.velocity, n.transpose || 0);
        const releaseTimeout = window.setTimeout(() => {
          stopFn();
        }, n.duration);
        playbackTimeoutsRef.current.push(releaseTimeout);
      }, n.timestamp);
      playbackTimeoutsRef.current.push(noteTimeout);
    });
  };

  const genres = [
    'All Genres',
    'My Recordings',
    'Classical',
    'Jazz & Blues',
    'Pop & Rock',
    'Movie Soundtracks',
    'Anime & Game',
  ];

  const difficulties = ['All', 'Beginner', 'Intermediate', 'Expert'];

  const toggleBookmark = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSongs((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isBookmarked: !s.isBookmarked } : s))
    );
  };

  const filteredSongs = useMemo(() => {
    return songs.filter((s) => {
      const matchSearch =
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.composer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.genre.toLowerCase().includes(searchQuery.toLowerCase());

      const matchGenre =
        selectedGenre === 'All Genres' ||
        selectedGenre === 'My Recordings' ||
        s.genre.toLowerCase() === selectedGenre.toLowerCase();

      const matchDiff =
        selectedDifficulty === 'All' ||
        s.difficulty.toLowerCase() === selectedDifficulty.toLowerCase();

      return matchSearch && matchGenre && matchDiff;
    });
  }, [songs, searchQuery, selectedGenre, selectedDifficulty]);

  const filteredRecordings = useMemo(() => {
    if (!recordings) return [];
    return recordings.filter((r) => {
      const q = searchQuery.toLowerCase();
      return (
        r.title.toLowerCase().includes(q) ||
        r.patch.toLowerCase().includes(q) ||
        r.key.toLowerCase().includes(q) ||
        (r.songRefTitle && r.songRefTitle.toLowerCase().includes(q))
      );
    });
  }, [recordings, searchQuery]);

  const handleSimulatedImport = (songName: string) => {
    setImportNotification(`Successfully imported "${songName}"! Opening lesson...`);
    setTimeout(() => {
      setIsImportModalOpen(false);
      setImportNotification(null);
      const target = songs.find((s) => s.title.includes('Interstellar')) || songs[0];
      onSelectSong(target);
    }, 1200);
  };

  const handleGenreClick = (genre: string) => {
    setSelectedGenre(genre);
    if (genre === 'My Recordings') {
      setActiveView('recordings');
    } else if (activeView === 'recordings') {
      setActiveView('repertoire');
    }
  };

  const formatSec = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const editorsPick = songs.find((s) => s.isEditorPick) || songs[1];

  return (
    <div className="flex flex-col w-full max-w-xl mx-auto pb-28 pt-1">
      {/* Sticky Search & Filter Header */}
      <section className="sticky top-16 z-30 bg-[#111319]/95 backdrop-blur-md px-4 py-2 border-b border-[#232e42]/60 shadow-md">
        {/* Search Bar */}
        <div className="flex items-center gap-2 bg-[#272a30] rounded-full px-3.5 py-1.5 border border-[#3c494e]/40 shadow-inner">
          <span className="material-symbols-outlined text-[#00d2ff] text-[20px] select-none">
            search
          </span>
          <input
            className="w-full bg-transparent text-[#e1e2ea] placeholder:text-[#bbc9cf]/60 font-sans text-[14px] focus:outline-none"
            id="song-search-input"
            placeholder={
              activeView === 'recordings'
                ? 'Search your performance takes by title, key, or patch...'
                : 'Search 500+ songs, artists, or genres...'
            }
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery('')}
              className="text-[#bbc9cf] hover:text-[#e1e2ea]"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          ) : (
            <button
              aria-label="Audio voice search"
              onClick={() => setSearchQuery('Beethoven')}
              className="flex items-center justify-center p-1 rounded-full text-[#bbc9cf] hover:text-[#00d2ff] transition-colors cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">mic</span>
            </button>
          )}
        </div>

        {/* Primary Library Segmented Switcher: Curated Repertoire vs My Recordings */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#1d2025] rounded-xl border border-[#232e42] mt-2 shadow-inner">
          <button
            onClick={() => {
              setActiveView('repertoire');
              if (selectedGenre === 'My Recordings') setSelectedGenre('All Genres');
            }}
            className={`flex items-center justify-center gap-2 py-1.5 rounded-lg font-headline text-[13px] font-bold transition-all cursor-pointer ${
              activeView === 'repertoire'
                ? 'bg-[#00d2ff] text-[#001f28] shadow-[0_0_12px_rgba(0,210,255,0.35)]'
                : 'text-[#bbc9cf] hover:text-[#e1e2ea]'
            }`}
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">library_music</span>
            <span>Curated Repertoire</span>
          </button>

          <button
            onClick={() => {
              setActiveView('recordings');
              setSelectedGenre('My Recordings');
            }}
            className={`flex items-center justify-center gap-2 py-1.5 rounded-lg font-headline text-[13px] font-bold transition-all cursor-pointer ${
              activeView === 'recordings'
                ? 'bg-[#ffbd58] text-[#001f28] shadow-[0_0_12px_rgba(255,189,88,0.4)]'
                : 'text-[#bbc9cf] hover:text-[#e1e2ea]'
            }`}
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">fiber_manual_record</span>
            <span>My Recordings</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-telemetry font-bold ${
                activeView === 'recordings'
                  ? 'bg-[#001f28]/25 text-[#001f28]'
                  : 'bg-[#ffbd58]/20 text-[#ffbd58]'
              }`}
            >
              {recordings.length}
            </span>
          </button>
        </div>

        {/* Horizontal Genre Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2 mt-1">
          {genres.map((genre) => {
            const isActive = selectedGenre === genre;
            return (
              <button
                key={genre}
                onClick={() => handleGenreClick(genre)}
                className={`genre-pill shrink-0 px-3 py-1 rounded-full font-sans text-[12px] transition-all cursor-pointer flex items-center gap-1 ${
                  isActive
                    ? genre === 'My Recordings'
                      ? 'bg-[#ffbd58] text-[#001f28] font-bold shadow-[0_0_12px_rgba(255,189,88,0.4)]'
                      : 'bg-[#00d2ff] text-[#001f28] font-bold shadow-[0_0_12px_rgba(0,210,255,0.4)]'
                    : 'bg-[#272a30] hover:bg-[#32353b] text-[#bbc9cf] border border-[#3c494e]/40'
                }`}
                type="button"
              >
                {genre === 'My Recordings' && (
                  <span className="material-symbols-outlined text-[13px]">radio_button_checked</span>
                )}
                <span>{genre}</span>
              </button>
            );
          })}
        </div>

        {/* Difficulty Filter Selector (Only for Repertoire view) */}
        {activeView === 'repertoire' && (
          <div className="flex items-center justify-between mt-0.5 bg-[#0b0e13]/80 border border-[#232e42] rounded-xl p-1">
            {difficulties.map((diff) => {
              const isActive = selectedDifficulty === diff;
              return (
                <button
                  key={diff}
                  onClick={() => setSelectedDifficulty(diff)}
                  className={`diff-btn flex-1 py-1 rounded-lg font-telemetry text-[11px] uppercase tracking-wider text-center transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#32353b] text-[#00d2ff] font-bold shadow-xs'
                      : 'text-[#bbc9cf] hover:text-[#e1e2ea]'
                  }`}
                  type="button"
                >
                  {diff}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* ========================================================== */}
      {/* VIEW 1: MY RECORDINGS SECTION                              */}
      {/* ========================================================== */}
      {activeView === 'recordings' && (
        <section className="px-4 mt-3 space-y-3">
          {/* Section Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <h3 className="font-headline text-[18px] font-bold text-[#e1e2ea]">
                My Studio Takes
              </h3>
              <span className="font-telemetry text-[11px] text-[#ffbd58] font-semibold">
                {filteredRecordings.length} {filteredRecordings.length === 1 ? 'Take' : 'Takes'}
              </span>
            </div>

            {onNavigateToPlay && (
              <button
                onClick={onNavigateToPlay}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ffbd58] hover:bg-[#ffa726] text-[#001f28] font-headline text-[11px] font-extrabold shadow-sm active:scale-95 transition-all cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[14px]">fiber_manual_record</span>
                <span>New Take in Studio</span>
              </button>
            )}
          </div>

          {/* Empty State */}
          {filteredRecordings.length === 0 ? (
            <div className="p-8 rounded-2xl bg-[#1d2025] border border-[#232e42] flex flex-col items-center justify-center text-center space-y-3 shadow-md mt-4">
              <span className="w-16 h-16 rounded-full bg-[#ffbd58]/15 text-[#ffbd58] flex items-center justify-center border border-[#ffbd58]/30">
                <span className="material-symbols-outlined text-[32px]">album</span>
              </span>
              <h4 className="font-headline text-[17px] font-bold text-[#e1e2ea]">
                {searchQuery ? 'No Matching Takes Found' : 'No Performances Recorded Yet'}
              </h4>
              <p className="font-sans text-[13px] text-[#bbc9cf] max-w-xs">
                {searchQuery
                  ? 'Try searching with another title or patch keyword.'
                  : 'Head to the Play Studio and press REC to record your keyboard performance with precision velocity & timing.'}
              </p>
              {onNavigateToPlay && (
                <button
                  onClick={onNavigateToPlay}
                  className="mt-2 px-5 py-2.5 rounded-full bg-[#00d2ff] hover:bg-[#45d1f6] text-[#001f28] font-headline text-[13px] font-extrabold shadow-[0_0_16px_rgba(0,210,255,0.4)] active:scale-95 transition-all cursor-pointer flex items-center gap-2"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">piano</span>
                  <span>Open Play Studio</span>
                </button>
              )}
            </div>
          ) : (
            /* Recordings List */
            <div className="space-y-3">
              {filteredRecordings.map((rec) => {
                const isPlaying = playingRecordingId === rec.id;
                return (
                  <div
                    key={rec.id}
                    className="p-4 rounded-2xl bg-[#1d2025] border border-[#232e42] hover:border-[#ffbd58]/40 transition-all shadow-md space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Recording Vinyl / Icon Badge */}
                        <div
                          onClick={() => handleTogglePlayRecording(rec)}
                          className={`relative shrink-0 w-12 h-12 rounded-xl flex items-center justify-center cursor-pointer transition-all border ${
                            isPlaying
                              ? 'bg-[#ffbd58] text-[#001f28] shadow-[0_0_16px_rgba(255,189,88,0.5)] border-white/50'
                              : 'bg-[#0b0e13] text-[#ffbd58] border-[#272a30] hover:border-[#ffbd58]'
                          }`}
                          title={isPlaying ? 'Stop Playback' : 'Listen to Recording'}
                        >
                          <span className="material-symbols-outlined text-[24px]">
                            {isPlaying ? 'pause' : 'play_arrow'}
                          </span>
                        </div>

                        {/* Title & Metadata */}
                        <div className="flex flex-col min-w-0">
                          <h4 className="font-headline text-[15px] font-bold text-[#e1e2ea] truncate">
                            {rec.title}
                          </h4>
                          <span className="font-sans text-[12px] text-[#bbc9cf] truncate">
                            {rec.songRefTitle ? `Practicing "${rec.songRefTitle}"` : 'Studio Take'}
                          </span>
                          <span className="font-telemetry text-[11px] text-[#859399] mt-0.5">
                            {rec.date}
                          </span>
                        </div>
                      </div>

                      {/* Delete Action */}
                      {onDeleteRecording && (
                        <button
                          onClick={() => {
                            if (isPlaying) stopAudioPlayback();
                            onDeleteRecording(rec.id);
                          }}
                          className="p-1.5 rounded-lg text-[#859399] hover:text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors cursor-pointer"
                          title="Delete Recording"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      )}
                    </div>

                    {/* Telemetry Pills */}
                    <div className="flex items-center gap-1.5 flex-wrap font-telemetry text-[11px]">
                      <span className="px-2 py-0.5 rounded-md bg-[#ffbd58]/15 text-[#ffbd58] font-bold flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">music_note</span>
                        {rec.totalNotes} notes
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-[#272a30] text-[#bbc9cf] flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">schedule</span>
                        {formatSec(rec.durationSec)}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-[#272a30] text-[#00d2ff]">
                        {rec.patch}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-[#272a30] text-[#bbc9cf]">
                        {rec.bpm} BPM • {rec.key}
                      </span>
                    </div>

                    {/* Mini Piano Roll Ribbon Visualization */}
                    <div className="relative w-full h-8 bg-[#0b0e13] rounded-lg border border-[#232e42]/60 overflow-hidden flex items-center px-1">
                      {rec.notes.slice(0, 40).map((n, i) => {
                        const leftPct = Math.min(95, (n.timestamp / Math.max(1, rec.durationSec * 1000)) * 100);
                        const match = n.note.match(/([0-8])/);
                        const oct = match ? parseInt(match[1], 10) : 4;
                        const topPct = Math.max(5, Math.min(85, 100 - ((oct - 2) * 20 + 20)));
                        return (
                          <div
                            key={i}
                            className="absolute h-1.5 rounded-full bg-gradient-to-r from-[#00d2ff] to-[#ffbd58] opacity-80"
                            style={{
                              left: `${leftPct}%`,
                              top: `${topPct}%`,
                              width: `${Math.max(4, Math.min(30, (n.duration / (rec.durationSec * 1000)) * 200))}px`,
                            }}
                          />
                        );
                      })}
                    </div>

                    {/* In-Card Audition Progress Bar */}
                    <div className="bg-[#0b0e13] p-2.5 rounded-xl border border-[#232e42]/60 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-telemetry">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isPlaying ? 'bg-[#ffbd58] animate-ping' : 'bg-[#859399]'
                            }`}
                          />
                          <span className="text-[#bbc9cf]">
                            {isPlaying ? 'Auditioning Performance...' : 'Studio Audio Take'}
                          </span>
                        </div>
                        <span className="text-[#859399]">
                          {formatSec(rec.durationSec)}
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[#1d2025] overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#ffbd58] to-[#00d2ff] transition-all duration-75"
                          style={{ width: `${isPlaying ? playbackProgress : 0}%` }}
                        />
                      </div>
                    </div>

                    {/* Bottom Actions: Audition, MIDI Download & Open in Studio */}
                    <div className="flex items-center gap-2 pt-1 flex-wrap sm:flex-nowrap">
                      <button
                        onClick={() => handleTogglePlayRecording(rec)}
                        className={`flex-1 py-1.5 px-2.5 rounded-xl font-headline text-[12px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          isPlaying
                            ? 'bg-[#ffbd58] text-[#001f28]'
                            : 'bg-[#272a30] hover:bg-[#32353b] text-[#ffbd58] border border-[#ffbd58]/30'
                        }`}
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {isPlaying ? 'stop' : 'play_arrow'}
                        </span>
                        <span>{isPlaying ? 'Stop' : 'Audition'}</span>
                      </button>

                      {/* MIDI File (.mid) Direct Export */}
                      <button
                        onClick={() => downloadMidiFile(rec)}
                        className="py-1.5 px-3 rounded-xl bg-[#272a30] hover:bg-[#32353b] text-[#00d2ff] border border-[#00d2ff]/30 font-headline text-[12px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        type="button"
                        title="Download standard .mid file to your computer"
                      >
                        <span className="material-symbols-outlined text-[16px]">download</span>
                        <span>MIDI</span>
                      </button>

                      <button
                        onClick={() => {
                          stopAudioPlayback();
                          if (onPlayRecordingInStudio) {
                            onPlayRecordingInStudio(rec);
                          } else {
                            onSelectSong(performanceToSong(rec));
                          }
                        }}
                        className="flex-1 py-1.5 px-2.5 rounded-xl bg-[#00d2ff] hover:bg-[#45d1f6] text-[#001f28] font-headline text-[12px] font-extrabold flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(0,210,255,0.3)] transition-all cursor-pointer"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[16px]">piano</span>
                        <span>Open in Studio</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ========================================================== */}
      {/* VIEW 2: CURATED REPERTOIRE VIEW                            */}
      {/* ========================================================== */}
      {activeView === 'repertoire' && (
        <>
          {/* Curated / Trending Banner (Editor's Pick) */}
          {selectedGenre === 'All Genres' && !searchQuery && (
            <section className="px-4 mt-4">
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#272a30] via-[#1d2025] to-[#0b0e13] border border-[#232e42] p-4 shadow-xl">
                <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-[#00d2ff]/10 blur-3xl pointer-events-none" />

                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#ea9f00]/20 border border-[#ea9f00]/30 text-[#ffbd58]">
                    <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                      auto_awesome
                    </span>
                    <span className="font-telemetry text-[10px] font-bold tracking-wider uppercase">
                      Editor's Pick
                    </span>
                  </div>
                  <span className="font-telemetry text-[11px] text-[#bbc9cf]">This Week</span>
                </div>

                <div className="flex gap-3.5 items-center mt-2">
                  <div className="relative shrink-0 w-20 h-20 rounded-xl overflow-hidden shadow-lg bg-[#0b0e13] border border-[#272a30]">
                    <img
                      className="w-full h-full object-cover"
                      alt={editorsPick.altText}
                      src={editorsPick.artworkUrl}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <span className="material-symbols-outlined text-[#47d6ff] absolute bottom-1 right-1 text-[16px]">
                      graphic_eq
                    </span>
                  </div>

                  <div className="flex flex-col min-w-0 flex-1">
                    <h2 className="font-headline text-[18px] font-bold text-[#e1e2ea] truncate">
                      {editorsPick.title}
                    </h2>
                    <p className="font-sans text-[13px] text-[#bbc9cf] truncate">
                      {editorsPick.composer}
                    </p>
                    <div className="flex items-center gap-2 mt-1 font-telemetry text-[11px] text-[#bbc9cf] flex-wrap">
                      <span className="px-1.5 py-0.5 rounded bg-[#45d1f6]/20 text-[#45d1f6] font-medium">
                        {editorsPick.difficulty}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-0.5">
                        <span className="material-symbols-outlined text-[13px]">schedule</span>{' '}
                        {editorsPick.duration}
                      </span>
                      <span>•</span>
                      <span>{editorsPick.bpm} BPM</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-1.5 overflow-hidden">
                      <div className="inline-block h-6 w-6 rounded-full ring-2 ring-[#1d2025] bg-[#00d2ff]/30 flex items-center justify-center text-[10px] text-[#00d2ff] font-bold">
                        8k
                      </div>
                    </div>
                    <span className="font-sans text-[12px] text-[#bbc9cf]">practicing now</span>
                  </div>

                  <button
                    onClick={() => onSelectSong(editorsPick)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#00d2ff] hover:bg-[#45d1f6] text-[#001f28] font-headline text-[13px] font-extrabold shadow-[0_0_16px_rgba(0,210,255,0.4)] active:scale-95 transition-all cursor-pointer"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                      play_arrow
                    </span>
                    Start Lesson
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Categorized Song Catalog Header */}
          <div className="flex items-center justify-between px-4 mt-5 mb-2">
            <div className="flex items-baseline gap-2">
              <h3 className="font-headline text-[17px] font-bold text-[#e1e2ea]">Curated Repertoire</h3>
              <span className="font-telemetry text-[11px] text-[#00d2ff] font-medium">
                {filteredSongs.length} Available
              </span>
            </div>
            <div className="flex items-center gap-1 text-[#bbc9cf]">
              <span className="material-symbols-outlined text-[16px]">tune</span>
              <span className="font-sans text-[12px]">Sort by Popularity</span>
            </div>
          </div>

          {/* Song Cards List */}
          <section className="flex flex-col gap-2.5 px-4">
            {filteredSongs.map((song) => {
              return (
                <div
                  key={song.id}
                  onClick={() => onSelectSong(song)}
                  className="song-card group relative flex items-center justify-between p-3 rounded-2xl bg-[#1d2025] hover:bg-[#272a30] border border-[#232e42] transition-colors shadow-sm cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Artwork with circular mastery progress */}
                    <div className="relative shrink-0 w-12 h-12 rounded-xl overflow-hidden bg-[#0b0e13] flex items-center justify-center border border-[#272a30]">
                      <img
                        className="w-full h-full object-cover opacity-85"
                        alt={song.altText}
                        src={song.artworkUrl}
                      />
                      <div className="absolute inset-0 bg-[#00d2ff]/10" />

                      {/* Circular progress ring */}
                      <svg className="absolute inset-0 w-full h-full -rotate-90 p-0.5" viewBox="0 0 36 36">
                        <path
                          className="text-[#32353b] stroke-current"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          strokeWidth="2.5"
                        />
                        <path
                          className="text-[#00d2ff] stroke-current"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          strokeDasharray={`${song.masteryPct}, 100`}
                          strokeLinecap="round"
                          strokeWidth="2.5"
                        />
                      </svg>
                    </div>

                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-headline text-[15px] font-bold text-[#e1e2ea] truncate">
                          {song.title}
                        </span>
                      </div>
                      <span className="font-sans text-[12px] text-[#bbc9cf] truncate">
                        {song.composer}
                      </span>
                      <div className="flex items-center gap-1.5 mt-1 font-telemetry text-[11px]">
                        <span
                          className={`px-1.5 py-0.2 rounded font-medium ${
                            song.difficulty === 'Beginner'
                              ? 'bg-[#45d1f6]/15 text-[#45d1f6]'
                              : song.difficulty === 'Intermediate'
                              ? 'bg-[#00d2ff]/15 text-[#00d2ff]'
                              : 'bg-[#ea9f00]/20 text-[#ffbd58]'
                          }`}
                        >
                          {song.difficulty}
                        </span>
                        <span className="text-[#859399]">•</span>
                        <span className="text-[#bbc9cf]">{song.duration}</span>
                        <span className="text-[#859399]">•</span>
                        <span className="text-[#ffbd58] font-mono">{song.key}</span>
                      </div>
                    </div>
                  </div>

                  {/* Star Bookmark & Practice Action */}
                  <div className="flex items-center gap-1.5 ml-2 shrink-0">
                    <button
                      aria-label="Bookmark"
                      onClick={(e) => toggleBookmark(song.id, e)}
                      className={`p-1.5 transition-colors cursor-pointer ${
                        song.isBookmarked
                          ? 'text-[#ffbd58]'
                          : 'text-[#859399] hover:text-[#ffbd58]'
                      }`}
                      type="button"
                    >
                      <span
                        className="material-symbols-outlined text-[20px]"
                        style={{ fontVariationSettings: song.isBookmarked ? "'FILL' 1" : "'FILL' 0" }}
                      >
                        star
                      </span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectSong(song);
                      }}
                      className={`px-3 py-1.5 rounded-full font-headline text-[12px] font-bold transition-all cursor-pointer ${
                        song.difficulty === 'Expert' && song.id === 'rhapsody-in-blue'
                          ? 'bg-[#00d2ff] text-[#001f28] shadow-[0_0_12px_rgba(0,210,255,0.4)]'
                          : 'bg-[#32353b] hover:bg-[#00d2ff] hover:text-[#001f28] text-[#00d2ff]'
                      }`}
                      type="button"
                    >
                      {song.id === 'rhapsody-in-blue' ? 'Start' : 'Practice'}
                    </button>
                  </div>
                </div>
              );
            })}
          </section>
        </>
      )}

      {/* Floating Action Button: Import MIDI / XML */}
      <div className="fixed bottom-24 right-4 z-40">
        <button
          onClick={() => setIsImportModalOpen(true)}
          className="flex items-center gap-2 px-4 py-3 rounded-full bg-gradient-to-r from-[#00d2ff] to-[#45d1f6] text-[#001f28] font-headline text-[13px] font-extrabold shadow-[0_4px_24px_rgba(0,210,255,0.5)] hover:scale-105 active:scale-95 transition-all select-none cursor-pointer"
          id="import-midi-btn"
          type="button"
        >
          <span className="material-symbols-outlined text-[20px]">upload_file</span>
          <span>Import MIDI / XML</span>
        </button>
      </div>

      {/* MIDI / MusicXML Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="bg-[#1d2025] border border-[#232e42] rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#00d2ff] text-[22px]">upload_file</span>
                <h3 className="font-headline text-[17px] font-bold text-[#e1e2ea]">
                  Import Custom Score
                </h3>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-[#bbc9cf] hover:text-[#e1e2ea]"
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {importNotification ? (
              <div className="p-4 bg-[#0b0e13] rounded-xl border border-[#00d2ff] flex items-center gap-2 text-[#00d2ff]">
                <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                <span className="font-sans text-[13px]">{importNotification}</span>
              </div>
            ) : (
              <>
                {/* Drag and drop zone */}
                <div
                  onClick={() => handleSimulatedImport('Custom_Chopin_Nocturne.mid')}
                  className="p-5 border-2 border-dashed border-[#3c494e] hover:border-[#00d2ff] rounded-xl bg-[#0b0e13]/60 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <span className="material-symbols-outlined text-[#00d2ff] text-[32px]">folder_zip</span>
                  <p className="font-headline text-[13px] font-bold text-[#e1e2ea] text-center">
                    Drop .mid, .midi, or .xml here
                  </p>
                  <span className="font-telemetry text-[11px] text-[#859399]">
                    Auto-aligns hands &amp; tempo markers
                  </span>
                </div>

                <div className="space-y-1.5">
                  <span className="font-telemetry text-[11px] text-[#bbc9cf] uppercase tracking-wider">
                    Or select preloaded piece:
                  </span>
                  <div className="grid grid-cols-1 gap-1.5">
                    <button
                      onClick={() => handleSimulatedImport('Chopin - Nocturne Op. 9 No. 2')}
                      className="text-left px-3 py-2 bg-[#272a30] hover:bg-[#32353b] rounded-lg text-[12px] font-headline font-semibold text-[#e1e2ea] flex justify-between items-center"
                      type="button"
                    >
                      <span>Chopin: Nocturne Op. 9 No. 2</span>
                      <span className="text-[#00d2ff] font-telemetry text-[11px]">.mid</span>
                    </button>
                    <button
                      onClick={() => handleSimulatedImport('Liszt - Liebestraum No. 3')}
                      className="text-left px-3 py-2 bg-[#272a30] hover:bg-[#32353b] rounded-lg text-[12px] font-headline font-semibold text-[#e1e2ea] flex justify-between items-center"
                      type="button"
                    >
                      <span>Liszt: Liebestraum No. 3</span>
                      <span className="text-[#00d2ff] font-telemetry text-[11px]">.musicxml</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
