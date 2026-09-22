// Real-time Musical Chord Detection Engine for AriaKeys
// Identifies root, chord type, intervals, and inversions from active note arrays

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export interface DetectedChord {
  name: string;
  root: string;
  type: string;
  intervals: string[];
  bass: string;
}

const CHORD_DEFINITIONS: { name: string; intervals: number[]; label: string }[] = [
  // Triads
  { name: 'Major', intervals: [0, 4, 7], label: 'Major Triad' },
  { name: 'Minor', intervals: [0, 3, 7], label: 'Minor Triad' },
  { name: 'Diminished', intervals: [0, 3, 6], label: 'Diminished' },
  { name: 'Augmented', intervals: [0, 4, 8], label: 'Augmented' },
  { name: 'Sus4', intervals: [0, 5, 7], label: 'Suspended 4th' },
  { name: 'Sus2', intervals: [0, 2, 7], label: 'Suspended 2nd' },

  // 7th Chords
  { name: 'Maj7', intervals: [0, 4, 7, 11], label: 'Major 7th' },
  { name: 'm7', intervals: [0, 3, 7, 10], label: 'Minor 7th' },
  { name: '7', intervals: [0, 4, 7, 10], label: 'Dominant 7th' },
  { name: 'dim7', intervals: [0, 3, 6, 9], label: 'Diminished 7th' },
  { name: 'm7b5', intervals: [0, 3, 6, 10], label: 'Half-Diminished' },
  { name: 'add9', intervals: [0, 4, 7, 14], label: 'Add 9' },
  { name: '6', intervals: [0, 4, 7, 9], label: 'Major 6th' },
  { name: 'm6', intervals: [0, 3, 7, 9], label: 'Minor 6th' },

  // Dyads / 5th
  { name: '5', intervals: [0, 7], label: 'Power Chord (5th)' },
];

const INTERVAL_LABELS: Record<number, string> = {
  0: 'Root',
  1: 'Min 2nd',
  2: 'Maj 2nd',
  3: 'Min 3rd',
  4: 'Maj 3rd',
  5: 'Perf 4th',
  6: 'Dim 5th',
  7: 'Perf 5th',
  8: 'Min 6th',
  9: 'Maj 6th',
  10: 'Min 7th',
  11: 'Maj 7th',
  12: 'Octave',
  14: '9th',
};

function noteToPitchClass(noteName: string): number {
  const match = noteName.match(/^([A-G]#?)([0-8])$/);
  if (!match) return 0;
  return NOTE_NAMES.indexOf(match[1]);
}

function noteToMidi(noteName: string): number {
  const match = noteName.match(/^([A-G]#?)([0-8])$/);
  if (!match) return 60;
  const name = match[1];
  const oct = parseInt(match[2], 10);
  return (oct + 1) * 12 + NOTE_NAMES.indexOf(name);
}

export function detectChord(notes: string[]): DetectedChord | null {
  if (!notes || notes.length < 2) return null;

  // Sort notes by pitch to find the lowest note (bass)
  const sortedNotes = [...notes].sort((a, b) => noteToMidi(a) - noteToMidi(b));
  const bassNote = sortedNotes[0].replace(/[0-8]/, '');

  // Extract unique pitch classes (0 - 11)
  const pitchClasses = Array.from(new Set(notes.map(noteToPitchClass)));

  if (pitchClasses.length < 2) return null;

  // Try each pitch class as potential root
  for (const rootPitch of pitchClasses) {
    const rootName = NOTE_NAMES[rootPitch];

    // Compute intervals relative to root
    const intervalsFromRoot = pitchClasses
      .map((p) => (p - rootPitch + 12) % 12)
      .sort((a, b) => a - b);

    for (const def of CHORD_DEFINITIONS) {
      if (def.intervals.length === intervalsFromRoot.length) {
        const matches = def.intervals.every((val, i) => val % 12 === intervalsFromRoot[i]);
        if (matches) {
          const chordName = `${rootName}${def.name === 'Major' ? '' : def.name}`;
          const isSlashChord = bassNote !== rootName;
          const fullName = isSlashChord ? `${chordName}/${bassNote}` : chordName;

          const intervalNames = def.intervals.map((i) => INTERVAL_LABELS[i] || `+${i}`);

          return {
            name: fullName,
            root: rootName,
            type: def.label,
            intervals: intervalNames,
            bass: bassNote,
          };
        }
      }
    }
  }

  // Fallback for dyad or single root identification
  const rootName = NOTE_NAMES[pitchClasses[0]];
  return {
    name: `${rootName} (Incomplete)`,
    root: rootName,
    type: 'Harmonic cluster',
    intervals: pitchClasses.map((p) => INTERVAL_LABELS[(p - pitchClasses[0] + 12) % 12] || 'Tone'),
    bass: bassNote,
  };
}
