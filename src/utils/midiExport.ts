// Standard MIDI File (SMF Type 0) Binary Generator for AriaKeys
// Serializes recorded notes into a downloadable .mid file without external dependencies

import { RecordedPerformance } from '../types';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function noteToMidiNumber(note: string): number {
  const match = note.match(/^([A-G]#?)([0-8])$/);
  if (!match) return 60;
  const name = match[1];
  const octave = parseInt(match[2], 10);
  const noteIndex = NOTE_NAMES.indexOf(name);
  if (noteIndex === -1) return 60;
  return (octave + 1) * 12 + noteIndex;
}

// Write Variable-Length Quantity (VLQ) for MIDI deltas
function writeVarLength(value: number): number[] {
  let buffer = value & 0x7f;
  const bytes: number[] = [];

  while ((value >>= 7) > 0) {
    buffer <<= 8;
    buffer |= 0x80;
    buffer += value & 0x7f;
  }

  while (true) {
    bytes.push(buffer & 0xff);
    if (buffer & 0x80) {
      buffer >>= 8;
    } else {
      break;
    }
  }

  return bytes;
}

export function exportPerformanceToMidi(performance: RecordedPerformance): Blob {
  const ticksPerQuarter = 480;
  const bpm = performance.bpm || 120;
  // ms per quarter = 60000 / bpm; ticks per ms = ticksPerQuarter / (60000 / bpm)
  const ticksPerMs = (ticksPerQuarter * bpm) / 60000;

  interface MidiEvent {
    tick: number;
    type: 'on' | 'off';
    note: number;
    velocity: number;
  }

  const events: MidiEvent[] = [];

  performance.notes.forEach((n) => {
    const midiPitch = noteToMidiNumber(n.note) + (n.transpose || 0);
    const onTick = Math.max(0, Math.round(n.timestamp * ticksPerMs));
    const offTick = Math.max(onTick + 1, Math.round((n.timestamp + n.duration) * ticksPerMs));

    events.push({
      tick: onTick,
      type: 'on',
      note: midiPitch,
      velocity: Math.min(127, Math.max(1, n.velocity)),
    });

    events.push({
      tick: offTick,
      type: 'off',
      note: midiPitch,
      velocity: 0,
    });
  });

  // Sort events by tick time (note-offs before note-ons at same tick)
  events.sort((a, b) => {
    if (a.tick !== b.tick) return a.tick - b.tick;
    if (a.type === 'off' && b.type === 'on') return -1;
    if (a.type === 'on' && b.type === 'off') return 1;
    return 0;
  });

  // Build Track Chunk Data
  const trackBytes: number[] = [];

  // Track Name Meta Event (FF 03 len text)
  const trackName = performance.title || 'AriaKeys Take';
  const nameBytes = Array.from(new TextEncoder().encode(trackName));
  trackBytes.push(0x00, 0xff, 0x03, nameBytes.length, ...nameBytes);

  // Set Tempo Meta Event (FF 51 03 tttttt)
  // Microseconds per quarter note = 60,000,000 / bpm
  const mpqn = Math.round(60000000 / bpm);
  trackBytes.push(
    0x00,
    0xff,
    0x51,
    0x03,
    (mpqn >> 16) & 0xff,
    (mpqn >> 8) & 0xff,
    mpqn & 0xff
  );

  let lastTick = 0;
  for (const ev of events) {
    const deltaTicks = Math.max(0, ev.tick - lastTick);
    lastTick = ev.tick;

    const vlq = writeVarLength(deltaTicks);
    trackBytes.push(...vlq);

    if (ev.type === 'on') {
      trackBytes.push(0x90, ev.note, ev.velocity);
    } else {
      trackBytes.push(0x80, ev.note, 0x00);
    }
  }

  // End of Track Meta Event (00 FF 2F 00)
  trackBytes.push(0x00, 0xff, 0x2f, 0x00);

  // Header Chunk (MThd, len 6, format 0, 1 track, ticksPerQuarter)
  const header = [
    0x4d, 0x54, 0x68, 0x64, // 'MThd'
    0x00, 0x00, 0x00, 0x06, // length 6
    0x00, 0x00,             // format 0 (single track)
    0x00, 0x01,             // 1 track
    (ticksPerQuarter >> 8) & 0xff,
    ticksPerQuarter & 0xff,
  ];

  // Track Header (MTrk + 4-byte length)
  const trackLen = trackBytes.length;
  const trackHeader = [
    0x4d, 0x54, 0x72, 0x6b, // 'MTrk'
    (trackLen >> 24) & 0xff,
    (trackLen >> 16) & 0xff,
    (trackLen >> 8) & 0xff,
    trackLen & 0xff,
  ];

  const fullBytes = new Uint8Array([...header, ...trackHeader, ...trackBytes]);
  return new Blob([fullBytes], { type: 'audio/midi' });
}

export function downloadMidiFile(performance: RecordedPerformance) {
  const blob = exportPerformanceToMidi(performance);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const cleanTitle = performance.title.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  a.download = `${cleanTitle}.mid`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
