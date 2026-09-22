import React, { useState, useEffect } from 'react';
import { audioEngine } from '../utils/audioEngine';
import { ReverbSpace } from '../types';

interface AudioSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AudioSettingsModal: React.FC<AudioSettingsModalProps> = ({ isOpen, onClose }) => {
  const [reverbSpace, setReverbSpaceState] = useState<ReverbSpace>(audioEngine.getReverbSpace());
  const [reverbMix, setReverbMixState] = useState<number>(Math.round(audioEngine.getReverbMix() * 100));
  const [masterVolume, setMasterVolumeState] = useState<number>(Math.round(audioEngine.getMasterVolume() * 100));
  const [touchCurve, setTouchCurve] = useState<'soft' | 'medium' | 'hard'>('medium');
  const [vuLevel, setVuLevel] = useState<number>(0);
  const [midiDevices, setMidiDevices] = useState<string[]>([]);
  const [isScanningMidi, setIsScanningMidi] = useState<boolean>(false);

  // Live VU meter tick
  useEffect(() => {
    if (!isOpen) return;
    let animId: number;

    const updateVu = () => {
      const peak = audioEngine.getPeakLevel();
      setVuLevel(peak);
      animId = requestAnimationFrame(updateVu);
    };

    animId = requestAnimationFrame(updateVu);
    return () => cancelAnimationFrame(animId);
  }, [isOpen]);

  // Scan Web MIDI hardware
  const scanMidiDevices = async () => {
    setIsScanningMidi(true);
    if (typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator) {
      try {
        const access = await (navigator as unknown as { requestMIDIAccess: () => Promise<{ inputs: { values: () => Iterable<{ name?: string }> } }> }).requestMIDIAccess();
        const detected: string[] = [];
        for (const input of access.inputs.values()) {
          if (input.name) detected.push(input.name);
        }
        setMidiDevices(detected.length > 0 ? detected : ['No hardware MIDI port detected (Driver ready)']);
      } catch {
        setMidiDevices(['MIDI access denied or unsupported']);
      }
    } else {
      setMidiDevices(['Web MIDI API not supported in this browser']);
    }
    setIsScanningMidi(false);
  };

  useEffect(() => {
    if (isOpen) {
      scanMidiDevices();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleReverbChange = (space: ReverbSpace) => {
    setReverbSpaceState(space);
    audioEngine.setReverbSpace(space);
  };

  const handleMixChange = (mixVal: number) => {
    setReverbMixState(mixVal);
    audioEngine.setReverbMix(mixVal / 100);
  };

  const handleVolumeChange = (volVal: number) => {
    setMasterVolumeState(volVal);
    audioEngine.setMasterVolume(volVal / 100);
  };

  const handleTouchCurveChange = (curve: 'soft' | 'medium' | 'hard') => {
    setTouchCurve(curve);
    audioEngine.setVelocityCurve(curve);
  };

  const handleAuditionTestChord = () => {
    audioEngine.init();
    audioEngine.playNote('C4', 110);
    setTimeout(() => audioEngine.playNote('E4', 105), 80);
    setTimeout(() => audioEngine.playNote('G4', 108), 160);
    setTimeout(() => audioEngine.playNote('B4', 112), 240);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#14171d] border border-[#232e42] rounded-3xl max-w-lg w-full p-6 space-y-6 shadow-[0_20px_50px_rgba(0,0,0,0.8)] max-h-[90vh] overflow-y-auto no-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#232e42] pb-4">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-2xl bg-[#00d2ff]/10 text-[#00d2ff] border border-[#00d2ff]/30 shadow-[0_0_12px_rgba(0,210,255,0.2)]">
              <span className="material-symbols-outlined text-[24px]">tune</span>
            </span>
            <div>
              <h2 className="font-headline text-[18px] font-bold text-[#e1e2ea]">
                Acoustic Studio &amp; Audio FX
              </h2>
              <p className="font-telemetry text-[11px] text-[#bbc9cf]">
                Convolution Reverb, Master Bus &amp; Touch Dynamics
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[#272a30] text-[#bbc9cf] hover:text-[#e1e2ea] transition-colors cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Master Output & Peak VU Meter */}
        <div className="p-4 rounded-2xl bg-[#0b0e13] border border-[#232e42] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#00d2ff] text-[18px]">volume_up</span>
              <span className="font-headline text-[13px] font-bold text-[#e1e2ea]">
                Master Output Volume
              </span>
            </div>
            <span className="font-telemetry text-[13px] font-bold text-[#00d2ff]">
              {masterVolume}%
            </span>
          </div>

          <input
            type="range"
            min={0}
            max={100}
            value={masterVolume}
            onChange={(e) => handleVolumeChange(parseInt(e.target.value, 10))}
            className="w-full h-2 bg-[#1d2025] rounded-lg appearance-none cursor-pointer accent-[#00d2ff]"
          />

          {/* Dynamic Stereo VU Meter Display */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] font-telemetry text-[#859399]">
              <span>SIGNAL VU PEAK</span>
              <span className={vuLevel > 0.7 ? 'text-[#ffbd58] font-bold' : ''}>
                {vuLevel > 0.02 ? `${Math.round(vuLevel * 100)}%` : 'IDLE'}
              </span>
            </div>
            <div className="h-2 w-full bg-[#1d2025] rounded-full overflow-hidden p-0.5 border border-[#272a30]">
              <div
                className="h-full rounded-full transition-all duration-75 bg-gradient-to-r from-[#00d2ff] via-[#45d1f6] to-[#ffbd58]"
                style={{ width: `${Math.min(100, Math.round(vuLevel * 140))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Reverb Space Selection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#ffbd58] text-[18px]">surround_sound</span>
              <span className="font-headline text-[13px] font-bold text-[#e1e2ea]">
                Acoustic Space (Convolution Reverb)
              </span>
            </div>
            <span className="font-telemetry text-[11px] text-[#859399]">Wet: {reverbMix}%</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(['Dry', 'Intimate Studio', 'Concert Hall', 'Cathedral'] as ReverbSpace[]).map((space) => {
              const isSelected = reverbSpace === space;
              return (
                <button
                  key={space}
                  onClick={() => handleReverbChange(space)}
                  className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#00d2ff]/15 border-[#00d2ff] text-[#00d2ff] shadow-[0_0_12px_rgba(0,210,255,0.3)]'
                      : 'bg-[#191c21] border-[#232e42] text-[#bbc9cf] hover:border-[#32353b]'
                  }`}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {space === 'Dry' ? 'volume_off' : space === 'Intimate Studio' ? 'room' : space === 'Concert Hall' ? 'theater_comedy' : 'church'}
                  </span>
                  <span className="font-headline text-[11px] font-bold text-center leading-tight">
                    {space}
                  </span>
                </button>
              );
            })}
          </div>

          {reverbSpace !== 'Dry' && (
            <div className="p-3 bg-[#0b0e13]/60 rounded-xl border border-[#232e42] space-y-1.5">
              <div className="flex justify-between text-[11px] font-telemetry text-[#bbc9cf]">
                <span>Reverb Wet / Dry Blend</span>
                <span className="text-[#ffbd58] font-bold">{reverbMix}%</span>
              </div>
              <input
                type="range"
                min={5}
                max={95}
                value={reverbMix}
                onChange={(e) => handleMixChange(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-[#1d2025] rounded-lg appearance-none cursor-pointer accent-[#ffbd58]"
              />
            </div>
          )}
        </div>

        {/* Key Touch Velocity Curve */}
        <div className="space-y-2">
          <span className="font-headline text-[13px] font-bold text-[#e1e2ea] flex items-center gap-2">
            <span className="material-symbols-outlined text-[#00d2ff] text-[18px]">touch_app</span>
            Key Touch Sensitivity Response
          </span>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'soft', label: 'Soft / Light', desc: 'Easier Forte dynamics' },
              { id: 'medium', label: 'Medium', desc: 'Linear acoustic curve' },
              { id: 'hard', label: 'Heavy / Firm', desc: 'Deep expression control' },
            ].map((curve) => {
              const isSelected = touchCurve === curve.id;
              return (
                <button
                  key={curve.id}
                  onClick={() => handleTouchCurveChange(curve.id as 'soft' | 'medium' | 'hard')}
                  className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#00d2ff]/15 border-[#00d2ff] text-[#00d2ff]'
                      : 'bg-[#191c21] border-[#232e42] text-[#bbc9cf] hover:border-[#32353b]'
                  }`}
                  type="button"
                >
                  <div className="font-headline text-[12px] font-bold">{curve.label}</div>
                  <div className="font-telemetry text-[9px] text-[#859399] mt-0.5">{curve.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Hardware MIDI Status */}
        <div className="p-3.5 rounded-2xl bg-[#0b0e13] border border-[#232e42] space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#e1e2ea]">
              <span className="material-symbols-outlined text-[#00d2ff] text-[18px]">piano</span>
              <span className="font-headline text-[12px] font-bold">Hardware USB / MIDI Controller</span>
            </div>
            <button
              onClick={scanMidiDevices}
              disabled={isScanningMidi}
              className="text-[#00d2ff] text-[11px] font-telemetry font-bold hover:underline cursor-pointer flex items-center gap-1"
              type="button"
            >
              <span className={`material-symbols-outlined text-[14px] ${isScanningMidi ? 'animate-spin' : ''}`}>
                sync
              </span>
              Rescan
            </button>
          </div>
          <div className="space-y-1">
            {midiDevices.map((dev, idx) => (
              <div key={idx} className="flex items-center gap-2 text-[11px] font-telemetry text-[#859399]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00d2ff] animate-pulse" />
                <span className="truncate">{dev}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Audition & Close */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={handleAuditionTestChord}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#272a30] hover:bg-[#32353b] text-[#00d2ff] font-headline text-[12px] font-bold active:scale-95 transition-all cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">play_circle</span>
            Audition Test Chord
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#00d2ff] to-[#45d1f6] text-[#001f28] font-headline text-[13px] font-bold shadow-[0_4px_16px_rgba(0,210,255,0.4)] hover:brightness-110 active:scale-95 transition-all cursor-pointer"
            type="button"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
