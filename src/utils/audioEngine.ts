import { InstrumentPatch, ReverbSpace, BluetoothLatencyConfig } from '../types';

// Standard note frequencies calculation
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function noteToFrequency(noteName: string, transposeSemitones: number = 0): number {
  const match = noteName.match(/^([A-G]#?)([0-8])$/);
  if (!match) return 440;
  const name = match[1];
  const octave = parseInt(match[2], 10);
  const noteIndex = NOTE_NAMES.indexOf(name);
  if (noteIndex === -1) return 440;

  // MIDI note number: C4 = 60
  const midi = (octave + 1) * 12 + noteIndex + transposeSemitones;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function midiNumberToNote(midiNumber: number): string {
  const octave = Math.floor(midiNumber / 12) - 1;
  const noteIndex = midiNumber % 12;
  return `${NOTE_NAMES[noteIndex]}${octave}`;
}

export const BLUETOOTH_PRESET_DELAYS: Record<
  BluetoothLatencyConfig['profile'],
  { label: string; delayMs: number; description: string }
> = {
  airpods: {
    label: 'Apple AirPods / AAC',
    delayMs: 115,
    description: 'Compensación estándar para AirPods, Beats y códec AAC de Apple',
  },
  aptx: {
    label: 'Qualcomm aptX Low-Latency',
    delayMs: 42,
    description: 'Auriculares de baja latencia aptX / aptX Adaptive',
  },
  ldac: {
    label: 'Sony / Android LDAC',
    delayMs: 88,
    description: 'Auriculares Sony WH/WF y dispositivos de alta fidelidad',
  },
  sbc: {
    label: 'Bluetooth Estándar SBC',
    delayMs: 175,
    description: 'La mayoría de auriculares genéricos y altavoces Bluetooth',
  },
  lowlatency_tws: {
    label: 'Gaming TWS Mode',
    delayMs: 58,
    description: 'Modo Gaming de auriculares True Wireless (TWS)',
  },
  wired: {
    label: 'Cable / Altavoces Directos',
    delayMs: 0,
    description: 'Cero retardo para conexión analógica por cable o altavoces integrados',
  },
  custom: {
    label: 'Calibración Personalizada',
    delayMs: 110,
    description: 'Ajuste fino manual o calibrado con el test de sincronización',
  },
};

class AudioEngine {
  private ctx: AudioContext | null = null;
  private activeVoices: Map<string, { stop: () => void }> = new Map();
  private isSustain: boolean = true;
  private currentPatch: InstrumentPatch = 'Concert Grand V2';
  private masterGain: GainNode | null = null;
  private dryGain: GainNode | null = null;
  private wetGain: GainNode | null = null;
  private convolver: ConvolverNode | null = null;
  private analyser: AnalyserNode | null = null;
  private currentReverb: ReverbSpace = 'Concert Hall';
  private reverbMix: number = 0.35;
  private masterVolume: number = 0.85;
  private velocityCurve: 'soft' | 'medium' | 'hard' = 'medium';

  // Bluetooth zero-latency compensation engine
  private bluetoothConfig: BluetoothLatencyConfig = {
    isEnabled: false,
    compensationMs: 115,
    profile: 'airpods',
    fastPathAudio: true,
    autoDetected: false,
  };

  constructor() {
    // Attempt to load saved bluetooth latency preference from localStorage
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('ariakeys_bluetooth_config');
        if (saved) {
          const parsed = JSON.parse(saved);
          this.bluetoothConfig = { ...this.bluetoothConfig, ...parsed };
        }
      } catch {
        // ignore storage errors
      }
    }
  }

  public init() {
    if (!this.ctx) {
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

        if (AudioCtx) {
          // Request interactive low-latency audio processing mode
          this.ctx = new AudioCtx({ latencyHint: 'interactive' });

          // Master output chain
          this.masterGain = this.ctx.createGain();
          this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);

          this.analyser = this.ctx.createAnalyser();
          this.analyser.fftSize = 64;

          this.dryGain = this.ctx.createGain();
          this.dryGain.gain.setValueAtTime(1 - this.reverbMix * 0.5, this.ctx.currentTime);

          this.wetGain = this.ctx.createGain();
          this.wetGain.gain.setValueAtTime(this.reverbMix, this.ctx.currentTime);

          this.convolver = this.ctx.createConvolver();
          this.updateReverbImpulse(this.currentReverb);

          // Connect: Dry -> Master, Wet -> Convolver -> Master, Master -> Analyser -> Destination
          this.dryGain.connect(this.masterGain);
          this.convolver.connect(this.wetGain);
          this.wetGain.connect(this.masterGain);

          this.masterGain.connect(this.analyser);
          this.analyser.connect(this.ctx.destination);
        }
      } catch (err) {
        // AudioContext may require user gesture in restricted browser policies
        console.warn('AudioContext init deferred until user interaction:', err);
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  // Bluetooth Configuration
  public setBluetoothConfig(config: Partial<BluetoothLatencyConfig>) {
    this.bluetoothConfig = { ...this.bluetoothConfig, ...config };
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('ariakeys_bluetooth_config', JSON.stringify(this.bluetoothConfig));
      } catch {
        // ignore storage errors
      }
    }
  }

  public getBluetoothConfig(): BluetoothLatencyConfig {
    return { ...this.bluetoothConfig };
  }

  // Probe available audio output devices for Bluetooth hints
  public async probeBluetoothDevices(): Promise<{ hasBluetooth: boolean; label?: string }> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
      return { hasBluetooth: false };
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
      if (!Array.isArray(devices)) return { hasBluetooth: false };
      const audioOutputs = devices.filter((d) => d.kind === 'audiooutput' || d.kind === 'audioinput');
      const btKeywords = ['bluetooth', 'airpod', 'buds', 'wireless', 'wh-', 'wf-', 'headset', 'bt-'];
      for (const dev of audioOutputs) {
        const lower = (dev.label || '').toLowerCase();
        if (btKeywords.some((kw) => lower.includes(kw))) {
          return { hasBluetooth: true, label: dev.label };
        }
      }
      return { hasBluetooth: false };
    } catch {
      return { hasBluetooth: false };
    }
  }

  // Generate synthetic acoustic impulse response for reverb room spaces
  private updateReverbImpulse(space: ReverbSpace) {
    if (!this.ctx || !this.convolver) return;
    if (space === 'Dry') {
      if (this.wetGain) this.wetGain.gain.setValueAtTime(0, this.ctx.currentTime);
      return;
    }

    const rate = this.ctx.sampleRate;
    let duration = 2.0;
    let decay = 2.0;

    switch (space) {
      case 'Intimate Studio':
        duration = 0.85;
        decay = 3.5;
        break;
      case 'Concert Hall':
        duration = 2.4;
        decay = 2.0;
        break;
      case 'Cathedral':
        duration = 4.8;
        decay = 1.3;
        break;
    }

    const length = Math.floor(rate * duration);
    const impulse = this.ctx.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const n = i / length;
      const env = Math.pow(1 - n, decay);
      left[i] = (Math.random() * 2 - 1) * env * Math.exp(-i / (rate * 0.5));
      right[i] = (Math.random() * 2 - 1) * env * Math.exp(-i / (rate * 0.5));
    }

    this.convolver.buffer = impulse;
    if (this.wetGain) {
      this.wetGain.gain.setValueAtTime(this.reverbMix, this.ctx.currentTime);
    }
  }

  public setSustain(on: boolean) {
    this.isSustain = on;
  }

  public setPatch(patch: InstrumentPatch) {
    this.currentPatch = patch;
  }

  public getPatch(): InstrumentPatch {
    return this.currentPatch;
  }

  public setReverbSpace(space: ReverbSpace) {
    this.currentReverb = space;
    this.updateReverbImpulse(space);
  }

  public getReverbSpace(): ReverbSpace {
    return this.currentReverb;
  }

  public setReverbMix(mix: number) {
    this.reverbMix = Math.max(0, Math.min(1, mix));
    if (this.ctx && this.wetGain && this.dryGain) {
      const now = this.ctx.currentTime;
      this.wetGain.gain.setValueAtTime(this.reverbMix, now);
      this.dryGain.gain.setValueAtTime(1 - this.reverbMix * 0.4, now);
    }
  }

  public getReverbMix(): number {
    return this.reverbMix;
  }

  public setMasterVolume(vol: number) {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
    }
  }

  public getMasterVolume(): number {
    return this.masterVolume;
  }

  public setVelocityCurve(curve: 'soft' | 'medium' | 'hard') {
    this.velocityCurve = curve;
  }

  // Get current peak decibel level for live VU meter
  public getPeakLevel(): number {
    if (!this.analyser) return 0;
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteTimeDomainData(data);
    let max = 0;
    for (let i = 0; i < data.length; i++) {
      const val = Math.abs(data[i] - 128);
      if (val > max) max = val;
    }
    return max / 128;
  }

  // Emit a crisp sample-accurate calibration click for Bluetooth sync tests
  public playCalibrationClick(): void {
    try {
      this.init();
      if (!this.ctx || !this.dryGain) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1500, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.02);

      gain.gain.setValueAtTime(0.7, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.03);

      osc.connect(gain);
      gain.connect(this.dryGain);

      osc.start(now);
      osc.stop(now + 0.04);
    } catch {
      // ignore
    }
  }

  public playNote(note: string, velocity: number = 100, transpose: number = 0): () => void {
    this.init();
    if (!this.ctx || !this.dryGain || !this.convolver) return () => {};

    const freq = noteToFrequency(note, transpose);
    const now = this.ctx.currentTime;

    // Apply velocity curves
    let rawNorm = Math.min(1, Math.max(0.1, velocity / 127));
    let normVel = rawNorm;
    if (this.velocityCurve === 'soft') {
      normVel = Math.pow(rawNorm, 0.7);
    } else if (this.velocityCurve === 'hard') {
      normVel = Math.pow(rawNorm, 1.4);
    }

    // Cancel any current voice on this note
    if (this.activeVoices.has(note)) {
      this.activeVoices.get(note)?.stop();
      this.activeVoices.delete(note);
    }

    const isFastPath = this.bluetoothConfig.isEnabled && this.bluetoothConfig.fastPathAudio;
    const noteGain = this.ctx.createGain();

    // Connect to dry bus; if fastPath is on, bypass the convolver reverb delay for zero audio latency
    noteGain.connect(this.dryGain);
    if (!isFastPath && this.reverbMix > 0.02) {
      noteGain.connect(this.convolver);
    }

    const oscillators: OscillatorNode[] = [];
    const attackTime = isFastPath ? 0.0015 : 0.004;

    // ==========================================
    // SYNTHESIS ENGINES FOR 18 DIVERSE PATCHES
    // ==========================================

    if (this.currentPatch === 'Intimate Felt Upright') {
      // Warm, muted felt piano with lowpass filter, woody thump
      const osc1 = this.ctx.createOscillator();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(freq, now);

      const osc2 = this.ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(freq * 2, now);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1250, now);
      filter.Q.setValueAtTime(1.0, now);

      const g2 = this.ctx.createGain();
      g2.gain.setValueAtTime(0.22 * normVel, now);
      osc2.connect(g2);
      g2.connect(filter);
      osc1.connect(filter);
      filter.connect(noteGain);
      oscillators.push(osc1, osc2);

      noteGain.gain.setValueAtTime(0.0001, now);
      noteGain.gain.linearRampToValueAtTime(0.8 * normVel, now + attackTime);
      noteGain.gain.exponentialRampToValueAtTime(0.28 * normVel, now + 0.3);
      noteGain.gain.exponentialRampToValueAtTime(0.001, now + (this.isSustain ? 3.4 : 1.2));
    } else if (this.currentPatch === 'Bright Pop Yamaha C7') {
      // Crisp, punchy studio grand cutting through modern pop/rock mixes
      const osc1 = this.ctx.createOscillator();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(freq, now);

      const osc2 = this.ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(freq * 2, now);

      const osc3 = this.ctx.createOscillator();
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(freq * 4, now);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highshelf';
      filter.frequency.setValueAtTime(2800, now);
      filter.gain.setValueAtTime(4.5, now);

      const g2 = this.ctx.createGain();
      g2.gain.setValueAtTime(0.45 * normVel, now);
      osc2.connect(g2);
      g2.connect(filter);

      const g3 = this.ctx.createGain();
      g3.gain.setValueAtTime(0.22 * normVel, now);
      osc3.connect(g3);
      g3.connect(filter);

      osc1.connect(filter);
      filter.connect(noteGain);
      oscillators.push(osc1, osc2, osc3);

      noteGain.gain.setValueAtTime(0.0001, now);
      noteGain.gain.linearRampToValueAtTime(0.95 * normVel, now + attackTime);
      noteGain.gain.exponentialRampToValueAtTime(0.4 * normVel, now + 0.32);
      noteGain.gain.exponentialRampToValueAtTime(0.001, now + (this.isSustain ? 4.5 : 1.6));
    } else if (this.currentPatch === 'Honky-Tonk Saloon') {
      // Vintage ragtime detuned twin strings with metallic tack attack
      const osc1 = this.ctx.createOscillator();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(freq * 0.996, now);

      const osc2 = this.ctx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(freq * 1.004, now);

      const osc3 = this.ctx.createOscillator();
      osc3.type = 'sawtooth';
      osc3.frequency.setValueAtTime(freq * 2.008, now);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(freq * 2.2, now);
      filter.Q.setValueAtTime(1.8, now);

      const g3 = this.ctx.createGain();
      g3.gain.setValueAtTime(0.25 * normVel, now);
      osc3.connect(filter);
      filter.connect(g3);
      g3.connect(noteGain);

      osc1.connect(noteGain);
      osc2.connect(noteGain);
      oscillators.push(osc1, osc2, osc3);

      noteGain.gain.setValueAtTime(0.0001, now);
      noteGain.gain.linearRampToValueAtTime(0.85 * normVel, now + attackTime);
      noteGain.gain.exponentialRampToValueAtTime(0.3 * normVel, now + 0.25);
      noteGain.gain.exponentialRampToValueAtTime(0.001, now + (this.isSustain ? 3.0 : 1.1));
    } else if (this.currentPatch === 'Wurlitzer 200A') {
      // Vintage reed electric piano with rich harmonics and reed tremolo
      const osc1 = this.ctx.createOscillator();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(freq, now);

      const osc2 = this.ctx.createOscillator();
      osc2.type = 'square';
      osc2.frequency.setValueAtTime(freq * 2, now);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2600, now);

      // Tremolo LFO (5.5 Hz)
      const lfo = this.ctx.createOscillator();
      lfo.frequency.setValueAtTime(5.5, now);
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.setValueAtTime(0.18, now);
      lfo.connect(lfoGain.gain);
      lfo.start(now);
      oscillators.push(lfo);

      const g2 = this.ctx.createGain();
      g2.gain.setValueAtTime(0.32 * normVel, now);
      osc2.connect(g2);
      g2.connect(filter);
      osc1.connect(filter);
      filter.connect(noteGain);
      oscillators.push(osc1, osc2);

      noteGain.gain.setValueAtTime(0.0001, now);
      noteGain.gain.linearRampToValueAtTime(0.85 * normVel, now + attackTime);
      noteGain.gain.exponentialRampToValueAtTime(0.3 * normVel, now + 0.8);
      noteGain.gain.exponentialRampToValueAtTime(0.001, now + (this.isSustain ? 3.2 : 0.8));
    } else if (this.currentPatch === 'Clavinet D6 Funk') {
      // Snappy percussive plucked string with auto-wah bite
      const osc1 = this.ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(freq, now);

      const osc2 = this.ctx.createOscillator();
      osc2.type = 'square';
      osc2.frequency.setValueAtTime(freq, now);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2800, now);
      filter.frequency.exponentialRampToValueAtTime(800, now + 0.15);
      filter.Q.setValueAtTime(3.5, now);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(noteGain);
      oscillators.push(osc1, osc2);

      noteGain.gain.setValueAtTime(0.0001, now);
      noteGain.gain.linearRampToValueAtTime(0.9 * normVel, now + attackTime);
      noteGain.gain.exponentialRampToValueAtTime(0.1 * normVel, now + 0.12);
      noteGain.gain.exponentialRampToValueAtTime(0.001, now + (this.isSustain ? 1.5 : 0.45));
    } else if (this.currentPatch === 'Yamaha DX7 FM Ballad') {
      // Glistening 80s 6-operator digital FM piano with crystal chime
      const carrier = this.ctx.createOscillator();
      carrier.type = 'sine';
      carrier.frequency.setValueAtTime(freq, now);

      const mod = this.ctx.createOscillator();
      mod.type = 'sine';
      mod.frequency.setValueAtTime(freq * 3, now);

      const modGain = this.ctx.createGain();
      modGain.gain.setValueAtTime(freq * 2.8 * normVel, now);
      modGain.gain.exponentialRampToValueAtTime(freq * 0.4, now + 0.4);

      mod.connect(modGain);
      modGain.connect(carrier.frequency);

      const chime = this.ctx.createOscillator();
      chime.type = 'sine';
      chime.frequency.setValueAtTime(freq * 7, now);
      const chimeGain = this.ctx.createGain();
      chimeGain.gain.setValueAtTime(0.08 * normVel, now);
      chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      chime.connect(chimeGain);
      chimeGain.connect(noteGain);

      carrier.connect(noteGain);
      oscillators.push(carrier, mod, chime);

      noteGain.gain.setValueAtTime(0.0001, now);
      noteGain.gain.linearRampToValueAtTime(0.85 * normVel, now + attackTime);
      noteGain.gain.exponentialRampToValueAtTime(0.28 * normVel, now + 1.2);
      noteGain.gain.exponentialRampToValueAtTime(0.001, now + (this.isSustain ? 3.6 : 1.2));
    } else if (this.currentPatch === 'Cathedral Pipe Organ') {
      // Massive cathedral organ: 16ft, 8ft, 4ft, 2ft mixtures
      const osc16 = this.ctx.createOscillator();
      osc16.type = 'sine';
      osc16.frequency.setValueAtTime(freq * 0.5, now);

      const osc8 = this.ctx.createOscillator();
      osc8.type = 'triangle';
      osc8.frequency.setValueAtTime(freq, now);

      const osc4 = this.ctx.createOscillator();
      osc4.type = 'sine';
      osc4.frequency.setValueAtTime(freq * 2, now);

      const oscMix = this.ctx.createOscillator();
      oscMix.type = 'sawtooth';
      oscMix.frequency.setValueAtTime(freq * 3, now);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(3200, now);

      const g16 = this.ctx.createGain();
      g16.gain.setValueAtTime(0.4, now);
      osc16.connect(g16);
      g16.connect(filter);

      const g4 = this.ctx.createGain();
      g4.gain.setValueAtTime(0.25, now);
      osc4.connect(g4);
      g4.connect(filter);

      const gMix = this.ctx.createGain();
      gMix.gain.setValueAtTime(0.12, now);
      oscMix.connect(gMix);
      gMix.connect(filter);

      osc8.connect(filter);
      filter.connect(noteGain);
      oscillators.push(osc16, osc8, osc4, oscMix);

      // Continuous organ sustain envelope
      noteGain.gain.setValueAtTime(0.0001, now);
      noteGain.gain.linearRampToValueAtTime(0.75 * normVel, now + 0.04);
    } else if (this.currentPatch === 'Hammond B3 Tonewheel') {
      // Classic jazz/rock tonewheel drawbars with key click and rotary warmth
      const osc1 = this.ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(freq, now);

      const osc2 = this.ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(freq * 2, now);

      const osc3 = this.ctx.createOscillator();
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(freq * 3, now);

      // Harmonic percussion click (9th harmonic 10ms transient)
      const perc = this.ctx.createOscillator();
      perc.type = 'sine';
      perc.frequency.setValueAtTime(freq * 6, now);
      const percGain = this.ctx.createGain();
      percGain.gain.setValueAtTime(0.35 * normVel, now);
      percGain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);
      perc.connect(percGain);
      percGain.connect(noteGain);

      const g2 = this.ctx.createGain();
      g2.gain.setValueAtTime(0.3, now);
      osc2.connect(g2);
      g2.connect(noteGain);

      const g3 = this.ctx.createGain();
      g3.gain.setValueAtTime(0.18, now);
      osc3.connect(g3);
      g3.connect(noteGain);

      osc1.connect(noteGain);
      oscillators.push(osc1, osc2, osc3, perc);

      noteGain.gain.setValueAtTime(0.0001, now);
      noteGain.gain.linearRampToValueAtTime(0.8 * normVel, now + 0.005);
    } else if (this.currentPatch === 'Blade Runner CS-80') {
      // Vangelis cinematic brass lead with slow opening resonant filter
      const osc1 = this.ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(freq, now);

      const osc2 = this.ctx.createOscillator();
      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(freq * 1.006, now);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600, now);
      filter.frequency.exponentialRampToValueAtTime(3200, now + 0.5);
      filter.Q.setValueAtTime(4.5, now);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(noteGain);
      oscillators.push(osc1, osc2);

      noteGain.gain.setValueAtTime(0.0001, now);
      noteGain.gain.linearRampToValueAtTime(0.85 * normVel, now + 0.08);
      noteGain.gain.exponentialRampToValueAtTime(0.55 * normVel, now + 1.2);
    } else if (this.currentPatch === 'Celesta & Music Box') {
      // Enchanted glass tines and music box bells
      const osc1 = this.ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(freq * 2, now);

      const osc2 = this.ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(freq * 5.4, now);

      const g2 = this.ctx.createGain();
      g2.gain.setValueAtTime(0.25 * normVel, now);
      osc2.connect(g2);
      g2.connect(noteGain);

      osc1.connect(noteGain);
      oscillators.push(osc1, osc2);

      noteGain.gain.setValueAtTime(0.0001, now);
      noteGain.gain.linearRampToValueAtTime(0.8 * normVel, now + attackTime);
      noteGain.gain.exponentialRampToValueAtTime(0.001, now + (this.isSustain ? 3.0 : 1.2));
    } else if (this.currentPatch === 'Lo-Fi Vinyl Tape') {
      // Nostalgic detuned tape flutter piano with warm saturation
      const osc1 = this.ctx.createOscillator();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(freq, now);

      // Tape wow LFO (0.8Hz subtle pitch drift)
      const lfo = this.ctx.createOscillator();
      lfo.frequency.setValueAtTime(0.85, now);
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.setValueAtTime(freq * 0.007, now);
      lfo.connect(lfoGain);
      lfoGain.connect(osc1.frequency);
      lfo.start(now);
      oscillators.push(lfo);

      const osc2 = this.ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(freq * 2, now);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1800, now);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(noteGain);
      oscillators.push(osc1, osc2);

      noteGain.gain.setValueAtTime(0.0001, now);
      noteGain.gain.linearRampToValueAtTime(0.8 * normVel, now + attackTime);
      noteGain.gain.exponentialRampToValueAtTime(0.3 * normVel, now + 0.35);
      noteGain.gain.exponentialRampToValueAtTime(0.001, now + (this.isSustain ? 3.5 : 1.2));
    } else if (this.currentPatch === 'Jazz Vibraphone') {
      // Metal bar vibraphone with rotating fan motor tremolo
      const osc1 = this.ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(freq, now);

      const osc2 = this.ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(freq * 4, now);

      const tremolo = this.ctx.createOscillator();
      tremolo.frequency.setValueAtTime(4.2, now);
      const tremoloGain = this.ctx.createGain();
      tremoloGain.gain.setValueAtTime(0.2, now);
      tremolo.connect(tremoloGain.gain);
      tremolo.start(now);
      oscillators.push(tremolo);

      const g2 = this.ctx.createGain();
      g2.gain.setValueAtTime(0.18 * normVel, now);
      osc2.connect(g2);
      g2.connect(noteGain);

      osc1.connect(noteGain);
      oscillators.push(osc1, osc2);

      noteGain.gain.setValueAtTime(0.0001, now);
      noteGain.gain.linearRampToValueAtTime(0.9 * normVel, now + attackTime);
      noteGain.gain.exponentialRampToValueAtTime(0.2 * normVel, now + 1.2);
      noteGain.gain.exponentialRampToValueAtTime(0.001, now + (this.isSustain ? 4.0 : 1.4));
    } else if (this.currentPatch === 'Rhodes Mk8') {
      // Warm FM Electric bell piano sound with bell tine chime
      const osc1 = this.ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(freq, now);

      const osc2 = this.ctx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(freq * 2, now);

      const osc3 = this.ctx.createOscillator();
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(freq * 3, now);

      const g2 = this.ctx.createGain();
      g2.gain.setValueAtTime(0.28 * normVel, now);
      osc2.connect(g2);
      g2.connect(noteGain);

      const g3 = this.ctx.createGain();
      g3.gain.setValueAtTime(0.15 * normVel, now);
      osc3.connect(g3);
      g3.connect(noteGain);

      osc1.connect(noteGain);
      oscillators.push(osc1, osc2, osc3);

      noteGain.gain.setValueAtTime(0.0001, now);
      noteGain.gain.linearRampToValueAtTime(0.85 * normVel, now + attackTime);
      noteGain.gain.exponentialRampToValueAtTime(0.25 * normVel, now + 1.2);
    } else if (this.currentPatch === 'Celestial Synth') {
      // Shimmering atmospheric pad piano with wide detune
      const osc1 = this.ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(freq, now);

      const osc2 = this.ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(freq * 1.003, now);

      const osc3 = this.ctx.createOscillator();
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(freq * 0.997, now);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1600, now);
      filter.Q.setValueAtTime(2.5, now);

      osc1.connect(filter);
      osc2.connect(filter);
      osc3.connect(filter);
      filter.connect(noteGain);
      oscillators.push(osc1, osc2, osc3);

      noteGain.gain.setValueAtTime(0.0001, now);
      noteGain.gain.linearRampToValueAtTime(0.55 * normVel, now + 0.04);
      noteGain.gain.exponentialRampToValueAtTime(0.25 * normVel, now + 2.5);
    } else if (this.currentPatch === 'Upright Studio') {
      // Intimate felt upright piano with woody hammer click & tight decay
      const osc1 = this.ctx.createOscillator();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(freq, now);

      const osc2 = this.ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(freq * 2, now);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2200, now);

      const g2 = this.ctx.createGain();
      g2.gain.setValueAtTime(0.3 * normVel, now);
      osc2.connect(g2);
      g2.connect(filter);
      osc1.connect(filter);
      filter.connect(noteGain);
      oscillators.push(osc1, osc2);

      noteGain.gain.setValueAtTime(0.0001, now);
      noteGain.gain.linearRampToValueAtTime(0.85 * normVel, now + attackTime);
      noteGain.gain.exponentialRampToValueAtTime(0.25 * normVel, now + 0.28);
      noteGain.gain.exponentialRampToValueAtTime(0.001, now + (this.isSustain ? 3.0 : 1.2));
    } else if (this.currentPatch === 'Harpsichord Baroque') {
      // Bright crisp plucked quill register with authentic harmonic buzz
      const osc1 = this.ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(freq, now);

      const osc2 = this.ctx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(freq * 2.001, now);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(freq * 2.5, now);
      filter.Q.setValueAtTime(1.2, now);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(noteGain);
      oscillators.push(osc1, osc2);

      noteGain.gain.setValueAtTime(0.0001, now);
      noteGain.gain.linearRampToValueAtTime(0.75 * normVel, now + attackTime);
      noteGain.gain.exponentialRampToValueAtTime(0.12 * normVel, now + 0.18);
      noteGain.gain.exponentialRampToValueAtTime(0.001, now + (this.isSustain ? 1.6 : 0.6));
    } else if (this.currentPatch === '80s Synthwave DX') {
      // Classic 80s Polyphonic FM brass / lead with resonant filter sweep
      const osc1 = this.ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(freq, now);

      const osc2 = this.ctx.createOscillator();
      osc2.type = 'square';
      osc2.frequency.setValueAtTime(freq * 1.004, now);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(3500, now);
      filter.frequency.exponentialRampToValueAtTime(800, now + 0.6);
      filter.Q.setValueAtTime(4.0, now);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(noteGain);
      oscillators.push(osc1, osc2);

      noteGain.gain.setValueAtTime(0.0001, now);
      noteGain.gain.linearRampToValueAtTime(0.7 * normVel, now + 0.012);
      noteGain.gain.exponentialRampToValueAtTime(0.25 * normVel, now + 1.4);
    } else {
      // Concert Grand V2: Acoustic 9ft Steinway Multi-Harmonic Modeling
      const osc1 = this.ctx.createOscillator();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(freq, now);

      const osc2 = this.ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(freq * 2, now);

      const osc3 = this.ctx.createOscillator();
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(freq * 3, now);

      const osc4 = this.ctx.createOscillator();
      osc4.type = 'sine';
      osc4.frequency.setValueAtTime(freq * 4, now);

      const g2 = this.ctx.createGain();
      g2.gain.setValueAtTime(0.42 * normVel, now);
      osc2.connect(g2);
      g2.connect(noteGain);

      const g3 = this.ctx.createGain();
      g3.gain.setValueAtTime(0.2 * normVel, now);
      osc3.connect(g3);
      g3.connect(noteGain);

      const g4 = this.ctx.createGain();
      g4.gain.setValueAtTime(0.09 * normVel, now);
      osc4.connect(g4);
      g4.connect(noteGain);

      osc1.connect(noteGain);
      oscillators.push(osc1, osc2, osc3, osc4);

      noteGain.gain.setValueAtTime(0.0001, now);
      noteGain.gain.linearRampToValueAtTime(0.92 * normVel, now + attackTime);
      noteGain.gain.exponentialRampToValueAtTime(0.38 * normVel, now + 0.35);
      noteGain.gain.exponentialRampToValueAtTime(0.001, now + (this.isSustain ? 4.8 : 1.8));
    }

    oscillators.forEach((osc) => {
      osc.start(now);
    });

    const isOrgan = this.currentPatch === 'Cathedral Pipe Organ' || this.currentPatch === 'Hammond B3 Tonewheel';

    const stopFn = () => {
      if (!this.ctx) return;
      const releaseTime = isOrgan ? 0.08 : this.isSustain ? 1.8 : 0.15;
      const stopNow = this.ctx.currentTime;
      try {
        const currentGain = Math.max(0.0001, noteGain.gain.value || 0.0001);
        noteGain.gain.cancelScheduledValues(stopNow);
        noteGain.gain.setValueAtTime(currentGain, stopNow);
        noteGain.gain.linearRampToValueAtTime(0.0001, stopNow + releaseTime);
      } catch {
        // ignore audio param automation conflicts
      }

      oscillators.forEach((osc) => {
        try {
          osc.stop(stopNow + releaseTime + 0.05);
        } catch {
          // already stopped
        }
      });
    };

    this.activeVoices.set(note, { stop: stopFn });
    return stopFn;
  }

  public stopNote(note: string) {
    if (this.activeVoices.has(note)) {
      this.activeVoices.get(note)?.stop();
      this.activeVoices.delete(note);
    }
  }

  public playMetronomeTick(
    isAccent: boolean = false,
    volume: number = 0.4,
    timbre: 'acoustic' | 'digital' | 'bell' = 'acoustic'
  ) {
    this.init();
    if (!this.ctx || !this.dryGain || volume <= 0) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    if (timbre === 'bell') {
      osc.type = isAccent ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(isAccent ? 2093 : 880, now);
      gain.gain.setValueAtTime(volume * (isAccent ? 0.6 : 0.35), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (isAccent ? 0.12 : 0.04));
    } else if (timbre === 'digital') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(isAccent ? 1760 : 1000, now);
      gain.gain.setValueAtTime(volume * 0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);
    } else {
      osc.type = 'sine';
      const baseFreq = isAccent ? 1600 : 900;
      osc.frequency.setValueAtTime(baseFreq * 1.5, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq, now + 0.008);
      gain.gain.setValueAtTime(volume * (isAccent ? 0.7 : 0.4), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (isAccent ? 0.045 : 0.03));
    }

    osc.connect(gain);
    gain.connect(this.dryGain);
    osc.start(now);
    osc.stop(now + 0.15);
  }
}

export const audioEngine = new AudioEngine();
