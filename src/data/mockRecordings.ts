import { RecordedPerformance, Song, WaterfallNote } from '../types';

export const INITIAL_RECORDINGS: RecordedPerformance[] = [
  {
    id: 'rec-clair-de-lune-take-1',
    title: 'Clair de Lune (Nocturnal Prelude)',
    date: 'Sep 22, 2026 • 11:42 AM',
    durationSec: 18,
    bpm: 76,
    key: 'Db Major',
    patch: 'Concert Grand V2',
    songRefTitle: 'Clair de Lune',
    totalNotes: 22,
    notes: [
      { note: 'F4', timestamp: 400, duration: 800, velocity: 95 },
      { note: 'Eb4', timestamp: 1250, duration: 750, velocity: 88 },
      { note: 'Db4', timestamp: 2050, duration: 1100, velocity: 102 },
      { note: 'C4', timestamp: 3200, duration: 850, velocity: 92 },
      { note: 'Bb3', timestamp: 4100, duration: 950, velocity: 85 },
      { note: 'Ab3', timestamp: 5100, duration: 1400, velocity: 98 },
      { note: 'Db4', timestamp: 6600, duration: 600, velocity: 94 },
      { note: 'F4', timestamp: 7250, duration: 750, velocity: 100 },
      { note: 'Ab4', timestamp: 8050, duration: 1200, velocity: 108 },
      { note: 'C5', timestamp: 9300, duration: 900, velocity: 112 },
      { note: 'Bb4', timestamp: 10250, duration: 850, velocity: 98 },
      { note: 'Ab4', timestamp: 11150, duration: 1300, velocity: 104 },
      { note: 'F4', timestamp: 12500, duration: 700, velocity: 90 },
      { note: 'Eb4', timestamp: 13250, duration: 800, velocity: 88 },
      { note: 'Db4', timestamp: 14100, duration: 1400, velocity: 96 },
      { note: 'Ab3', timestamp: 15600, duration: 1600, velocity: 85 },
    ],
  },
  {
    id: 'rec-jazz-improvisation',
    title: 'Autumn Velvet Improvisation',
    date: 'Sep 21, 2026 • 9:15 PM',
    durationSec: 14,
    bpm: 96,
    key: 'D Minor',
    patch: 'Rhodes Mk8',
    songRefTitle: 'Freestyle Studio Session',
    totalNotes: 18,
    notes: [
      { note: 'D4', timestamp: 300, duration: 600, velocity: 102 },
      { note: 'F4', timestamp: 950, duration: 650, velocity: 98 },
      { note: 'A4', timestamp: 1650, duration: 800, velocity: 110 },
      { note: 'C5', timestamp: 2500, duration: 900, velocity: 105 },
      { note: 'B4', timestamp: 3450, duration: 550, velocity: 96 },
      { note: 'G4', timestamp: 4050, duration: 700, velocity: 100 },
      { note: 'E4', timestamp: 4800, duration: 850, velocity: 92 },
      { note: 'A4', timestamp: 5700, duration: 1100, velocity: 115 },
      { note: 'D4', timestamp: 6900, duration: 1400, velocity: 98 },
      { note: 'F4', timestamp: 8400, duration: 750, velocity: 104 },
      { note: 'E4', timestamp: 9200, duration: 800, velocity: 90 },
      { note: 'D4', timestamp: 10050, duration: 1500, velocity: 108 },
    ],
  },
];

const STORAGE_KEY = 'atelier_user_recordings_v1';

export function loadSavedRecordings(): RecordedPerformance[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_RECORDINGS));
      return INITIAL_RECORDINGS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_RECORDINGS;
  } catch {
    return INITIAL_RECORDINGS;
  }
}

export function persistRecordings(recordings: RecordedPerformance[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recordings));
  } catch (e) {
    console.error('Failed to persist recordings to localStorage', e);
  }
}

// Convert a recorded performance to a playable Song for the PlayScreen
export function performanceToSong(rec: RecordedPerformance): Song {
  const notesSequence: WaterfallNote[] = rec.notes.map((n, idx) => ({
    id: `wf-${rec.id}-${idx}`,
    note: n.note,
    hand: idx % 2 === 0 ? 'R' : 'L',
    startBar: Math.floor(n.timestamp / 2000) + 1,
    timeOffset: n.timestamp / 1000,
    duration: n.duration / 1000,
    velocity: n.velocity,
  }));

  const mins = Math.floor(rec.durationSec / 60);
  const secs = rec.durationSec % 60;
  const durationStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  return {
    id: `rec-song-${rec.id}`,
    title: rec.title,
    composer: 'My Atelier Performance',
    collection: 'User Studio Recordings',
    key: rec.key,
    bpm: rec.bpm,
    duration: durationStr,
    difficulty: 'Intermediate',
    genre: 'Classical',
    artworkUrl:
      'https://images.unsplash.com/photo-1520523839898-50712825e3a7?auto=format&fit=crop&w=400&q=80',
    altText: rec.title,
    totalBars: Math.max(16, Math.ceil(rec.durationSec / 2)),
    currentBar: 1,
    masteryPct: 100,
    pitchPrecision: 98,
    tempoStability: 96,
    notesSequence,
  };
}
