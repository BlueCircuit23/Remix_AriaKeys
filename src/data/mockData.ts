import { Song, PracticeSessionStats } from '../types';

export const USER_PROFILE = {
  name: 'Pianista',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=250&auto=format&fit=crop',
  streakDays: 14,
  xpCount: 120,
};

export const INITIAL_STATS: PracticeSessionStats = {
  streakDays: 14,
  todayMinutes: 20,
  dailyTargetMinutes: 30,
  totalHours: 48.5,
  masteredCount: 18,
  currentGrade: 'Grade 5 Cert',
  audioLatencyMs: 4.2,
  jitterMs: 0.1,
  pitchPrecisionPct: 94.2,
  tempoStabilityPct: 88.5,
  expressionScorePct: 91.0,
  weeklyMinutes: [
    { day: 'Mon', minutes: 35, target: 30 },
    { day: 'Tue', minutes: 40, target: 30 },
    { day: 'Wed', minutes: 25, target: 30 },
    { day: 'Thu', minutes: 45, target: 30 },
    { day: 'Fri', minutes: 30, target: 30 },
    { day: 'Sat', minutes: 50, target: 30 },
    { day: 'Sun', minutes: 20, target: 30 },
  ],
};

export const REPERTOIRE_SONGS: Song[] = [];

export const MILESTONE_PIECE = {
  title: 'Bach: Well-Tempered Clavier',
  subtitle: 'Prelude No. 1 in C Major (BWV 846)',
  grade: 'Grade 5 Cert',
  artworkUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAqXaujFCfioXQiMSFxCGecS5eC_vh74pjSbDbR3jnFS6uTok1dmjAK1yMRJXEky7-ZTo3uY5y8Tsiev4G1SrNPiNdXUCiHauWkddpd7i6ruD5Hnjxc66PKa5nKMQhzGuaMEaGViCnwCLHjwUHV8ryuHWCwgBz0tEil00Piy2IosR6SOizyohhikOEowUUgHZxZ0nVk1M9Vvx2iWmj3sM6xXke6R_SPLdanYMR_l-TKaypy7eQ062A91A',
  altText: 'Close-up macro shot of polished ebony and ivory piano keys under dramatic moody studio spotlight with warm golden ambient dust particles',
};
