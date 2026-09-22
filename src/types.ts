export type TabType = 'home' | 'play' | 'library' | 'stats';

export type InstrumentPatch =
  | 'Concert Grand V2'
  | 'Intimate Felt Upright'
  | 'Bright Pop Yamaha C7'
  | 'Honky-Tonk Saloon'
  | 'Rhodes Mk8'
  | 'Wurlitzer 200A'
  | 'Clavinet D6 Funk'
  | 'Yamaha DX7 FM Ballad'
  | 'Harpsichord Baroque'
  | 'Cathedral Pipe Organ'
  | 'Hammond B3 Tonewheel'
  | 'Celestial Synth'
  | '80s Synthwave DX'
  | 'Blade Runner CS-80'
  | 'Celesta & Music Box'
  | 'Lo-Fi Vinyl Tape'
  | 'Jazz Vibraphone'
  | 'Upright Studio';

export interface BluetoothLatencyConfig {
  isEnabled: boolean;
  compensationMs: number; // e.g. 110ms
  profile: 'custom' | 'airpods' | 'aptx' | 'ldac' | 'sbc' | 'lowlatency_tws' | 'wired';
  fastPathAudio: boolean; // bypass complex reverb pre-delay for instant transient
  autoDetected: boolean;
}

export type ReverbSpace = 'Dry' | 'Intimate Studio' | 'Concert Hall' | 'Cathedral';
export type KeyLabelMode = 'notes' | 'solfege' | 'shortcuts' | 'none';
export type PracticeMode = 'flow' | 'wait';
export type ScaleGuide = 'none' | 'C Major' | 'A Minor' | 'G Major' | 'Pentatonic' | 'Blues';

export type DifficultyLevel = 'Beginner' | 'Intermediate' | 'Expert';

export type GenreType = 'Classical' | 'Jazz & Blues' | 'Pop & Rock' | 'Movie Soundtracks' | 'Anime & Game';

export interface Song {
  id: string;
  title: string;
  composer: string;
  collection?: string;
  key: string;
  bpm: number;
  duration: string;
  difficulty: DifficultyLevel;
  genre: GenreType;
  artworkUrl: string;
  altText: string;
  totalBars: number;
  currentBar?: number;
  masteryPct: number;
  pitchPrecision: number;
  tempoStability: number;
  isBookmarked?: boolean;
  practicingNowCount?: string;
  isEditorPick?: boolean;
  notesSequence?: WaterfallNote[];
}

export interface WaterfallNote {
  id: string;
  note: string; // e.g. "C4", "E4", "G3"
  hand: 'L' | 'R';
  startBar: number;
  timeOffset: number; // in seconds from track start
  duration: number; // in seconds
  velocity: number;
}

export interface PracticeSessionStats {
  streakDays: number;
  todayMinutes: number;
  dailyTargetMinutes: number;
  totalHours: number;
  masteredCount: number;
  currentGrade: string;
  audioLatencyMs: number;
  jitterMs: number;
  pitchPrecisionPct: number;
  tempoStabilityPct: number;
  expressionScorePct: number;
  weeklyMinutes: { day: string; minutes: number; target: number }[];
}

export interface RecordedNote {
  note: string;
  timestamp: number; // offset in ms from recording start
  duration: number; // in ms
  velocity: number;
  transpose?: number;
}

export interface RecordedPerformance {
  id: string;
  title: string;
  date: string;
  durationSec: number;
  bpm: number;
  key: string;
  patch: InstrumentPatch;
  songRefTitle?: string;
  notes: RecordedNote[];
  totalNotes: number;
}
