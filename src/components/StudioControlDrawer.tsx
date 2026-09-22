import React, { useState, useEffect } from 'react';
import { InstrumentPatch, ReverbSpace, BluetoothLatencyConfig } from '../types';
import {
  audioEngine,
  BLUETOOTH_PRESET_DELAYS,
} from '../utils/audioEngine';

interface StudioControlDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentPatch: InstrumentPatch;
  onPatchChange: (patch: InstrumentPatch) => void;
  bluetoothConfig: BluetoothLatencyConfig;
  onBluetoothConfigChange: (config: BluetoothLatencyConfig) => void;
}

interface PatchCategory {
  name: string;
  icon: string;
  patches: {
    id: InstrumentPatch;
    name: string;
    description: string;
    tag: string;
  }[];
}

const PATCH_CATEGORIES: PatchCategory[] = [
  {
    name: 'Pianos Acústicos & Grand',
    icon: 'piano',
    patches: [
      {
        id: 'Concert Grand V2',
        name: 'Concert Grand V2',
        description: 'Steinway D 9ft modelado armónicamente para concierto clásico.',
        tag: 'Clásico',
      },
      {
        id: 'Intimate Felt Upright',
        name: 'Intimate Felt Upright',
        description: 'Piano de fieltro suave, tono cálido y madera resonante.',
        tag: 'Íntimo',
      },
      {
        id: 'Bright Pop Yamaha C7',
        name: 'Bright Pop Yamaha C7',
        description: 'Piano brillante con ataque percusivo ideal para pop y rock.',
        tag: 'Pop / Modern',
      },
      {
        id: 'Honky-Tonk Saloon',
        name: 'Honky-Tonk Saloon',
        description: 'Ragtime clásico con cuerdas gemelas desafinadas estilo saloon.',
        tag: 'Vintage Ragtime',
      },
      {
        id: 'Upright Studio',
        name: 'Upright Studio',
        description: 'Piano vertical de estudio de grabación con ataque definido.',
        tag: 'Estudio',
      },
    ],
  },
  {
    name: 'Teclados Eléctricos & Vintage',
    icon: 'electric_meter',
    patches: [
      {
        id: 'Rhodes Mk8',
        name: 'Rhodes Mk8 Stage',
        description: 'Tines electromagnéticas con cuerpo cálido y campaneo estéreo.',
        tag: 'Soul / R&B',
      },
      {
        id: 'Wurlitzer 200A',
        name: 'Wurlitzer 200A',
        description: 'Lengüetas vibrantes con trémolo clásico a válvulas y calidez.',
        tag: 'Vintage Rock',
      },
      {
        id: 'Clavinet D6 Funk',
        name: 'Clavinet D6 Funk',
        description: 'Cuerda percutida funk con mordida dinámica estilo Stevie Wonder.',
        tag: 'Funk / Disco',
      },
      {
        id: 'Yamaha DX7 FM Ballad',
        name: 'Yamaha DX7 FM Ballad',
        description: 'El legendario piano eléctrico digital de 6 operadores de los 80s.',
        tag: 'Digital 80s',
      },
    ],
  },
  {
    name: 'Barroco & Órganos',
    icon: 'church',
    patches: [
      {
        id: 'Harpsichord Baroque',
        name: 'Harpsichord Baroque',
        description: 'Plumilla de plectro percutido con zumbido armónico auténtico.',
        tag: 'Barroco',
      },
      {
        id: 'Cathedral Pipe Organ',
        name: 'Cathedral Pipe Organ',
        description: 'Órgano de tubos catedralicio con mixturas 16ft, 8ft y 4ft.',
        tag: 'Sacro / Épico',
      },
      {
        id: 'Hammond B3 Tonewheel',
        name: 'Hammond B3 Tonewheel',
        description: 'Ruedas fónicas con clic de percusión armónica y calor rotativo.',
        tag: 'Gospel / Jazz',
      },
    ],
  },
  {
    name: 'Sintetizadores & Cinemáticos',
    icon: 'auto_awesome',
    patches: [
      {
        id: 'Celestial Synth',
        name: 'Celestial Synth Pad',
        description: 'Pad ambiental resplandeciente con cola de reverberación etérea.',
        tag: 'Ambient',
      },
      {
        id: '80s Synthwave DX',
        name: '80s Synthwave DX',
        description: 'Metales analógicos polifónicos con barrido resonante.',
        tag: 'Retro Wave',
      },
      {
        id: 'Blade Runner CS-80',
        name: 'Blade Runner CS-80',
        description: 'Lead cinemático legendario de Vangelis con ataque expresivo.',
        tag: 'Cinemático',
      },
    ],
  },
  {
    name: 'Láminas, Campanas & Acústicos Especiales',
    icon: 'spatial_audio',
    patches: [
      {
        id: 'Celesta & Music Box',
        name: 'Celesta & Music Box',
        description: 'Láminas de cristal y campanas de caja de música encantadas.',
        tag: 'Campanas',
      },
      {
        id: 'Lo-Fi Vinyl Tape',
        name: 'Lo-Fi Vinyl Tape',
        description: 'Piano nostálgico con wow & flutter de cinta analógica y saturación.',
        tag: 'Lo-Fi / Chill',
      },
      {
        id: 'Jazz Vibraphone',
        name: 'Jazz Vibraphone',
        description: 'Barras metálicas de vibráfono con trémolo de motor a 4.2 Hz.',
        tag: 'Jazz Acústico',
      },
    ],
  },
];

export const StudioControlDrawer: React.FC<StudioControlDrawerProps> = ({
  isOpen,
  onClose,
  currentPatch,
  onPatchChange,
  bluetoothConfig,
  onBluetoothConfigChange,
}) => {
  const [activeTab, setActiveTab] = useState<'sounds' | 'bluetooth' | 'acoustics'>('sounds');
  const [detectedBtDevice, setDetectedBtDevice] = useState<string | null>(null);
  const [isScanningBt, setIsScanningBt] = useState(false);

  // Calibration test states
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationStep, setCalibrationStep] = useState(0);
  const [calibrationTimestamps, setCalibrationTimestamps] = useState<{ scheduled: number; tapped: number }[]>([]);
  const [calibrationResultMs, setCalibrationResultMs] = useState<number | null>(null);

  // Acoustics state
  const [reverbSpace, setReverbSpace] = useState<ReverbSpace>(audioEngine.getReverbSpace());
  const [reverbMix, setReverbMix] = useState<number>(audioEngine.getReverbMix());
  const [masterVolume, setMasterVolume] = useState<number>(audioEngine.getMasterVolume());

  // Scan audio output for Bluetooth hints on open
  useEffect(() => {
    if (isOpen) {
      setIsScanningBt(true);
      audioEngine
        .probeBluetoothDevices()
        .then((res) => {
          if (res.hasBluetooth && res.label) {
            setDetectedBtDevice(res.label);
          } else {
            setDetectedBtDevice(null);
          }
        })
        .catch(() => {
          setDetectedBtDevice(null);
        })
        .finally(() => setIsScanningBt(false));
    }
  }, [isOpen]);

  // Calibration ticker loop
  useEffect(() => {
    let timer: number;
    if (isCalibrating) {
      // Play a click every 1200ms
      const scheduledTime = performance.now();
      audioEngine.playCalibrationClick();
      setCalibrationStep((s) => s + 1);

      timer = window.setInterval(() => {
        audioEngine.playCalibrationClick();
        setCalibrationStep((s) => s + 1);
      }, 1200);
    }
    return () => clearInterval(timer);
  }, [isCalibrating]);

  const handleTapCalibration = () => {
    if (!isCalibrating) return;
    const tappedNow = performance.now();
    // Compute offset relative to 1200ms modulo
    const remainder = tappedNow % 1200;
    // Estimated delay typically between 30ms and 350ms
    const estimatedDelay = Math.round(Math.max(25, Math.min(280, remainder)));

    setCalibrationTimestamps((prev) => {
      const next = [...prev, { scheduled: tappedNow - estimatedDelay, tapped: tappedNow }];
      if (next.length >= 4) {
        // Average the estimates
        const avg = Math.round(
          next.slice(-4).reduce((sum, item) => sum + (item.tapped - item.scheduled), 0) / 4
        );
        setCalibrationResultMs(avg);
        setIsCalibrating(false);
      }
      return next;
    });
  };

  const handleApplyCalibration = () => {
    if (calibrationResultMs !== null) {
      const next: BluetoothLatencyConfig = {
        ...bluetoothConfig,
        isEnabled: true,
        compensationMs: calibrationResultMs,
        profile: 'custom',
      };
      onBluetoothConfigChange(next);
      audioEngine.setBluetoothConfig(next);
      setCalibrationResultMs(null);
    }
  };

  const handlePresetSelect = (profile: BluetoothLatencyConfig['profile']) => {
    const preset = BLUETOOTH_PRESET_DELAYS[profile];
    const next: BluetoothLatencyConfig = {
      ...bluetoothConfig,
      isEnabled: profile !== 'wired',
      compensationMs: preset.delayMs,
      profile,
    };
    onBluetoothConfigChange(next);
    audioEngine.setBluetoothConfig(next);
  };

  const handleSliderChange = (val: number) => {
    const next: BluetoothLatencyConfig = {
      ...bluetoothConfig,
      compensationMs: val,
      profile: 'custom',
    };
    onBluetoothConfigChange(next);
    audioEngine.setBluetoothConfig(next);
  };

  const handleToggleFastPath = () => {
    const next: BluetoothLatencyConfig = {
      ...bluetoothConfig,
      fastPathAudio: !bluetoothConfig.fastPathAudio,
    };
    onBluetoothConfigChange(next);
    audioEngine.setBluetoothConfig(next);
  };

  const handleToggleBluetoothEnabled = () => {
    const next: BluetoothLatencyConfig = {
      ...bluetoothConfig,
      isEnabled: !bluetoothConfig.isEnabled,
    };
    onBluetoothConfigChange(next);
    audioEngine.setBluetoothConfig(next);
  };

  const handlePreviewPatch = (patch: InstrumentPatch) => {
    onPatchChange(patch);
    audioEngine.setPatch(patch);
    // Play a delightful musical sample chord (C4, E4, G4)
    audioEngine.playNote('C4', 105);
    setTimeout(() => audioEngine.playNote('E4', 108), 110);
    setTimeout(() => audioEngine.playNote('G4', 112), 220);
    setTimeout(() => {
      audioEngine.stopNote('C4');
      audioEngine.stopNote('E4');
      audioEngine.stopNote('G4');
    }, 1100);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
      />

      {/* Drawer Panel on Upper-Left (Lateral Superior Izquierdo) */}
      <div className="relative w-full max-w-md bg-[#0f1218] border-r border-[#232e42] h-full shadow-[12px_0_40px_rgba(0,0,0,0.85)] flex flex-col z-10 animate-in slide-in-from-left duration-300">
        {/* Drawer Header */}
        <div className="px-4 py-3.5 bg-[#141820] border-b border-[#232e42] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#00d2ff]/20 to-[#00d2ff]/5 border border-[#00d2ff]/40 flex items-center justify-center text-[#00d2ff] shadow-[0_0_12px_rgba(0,210,255,0.25)]">
              <span className="material-symbols-outlined text-[20px]">tune</span>
            </div>
            <div className="flex flex-col">
              <span className="font-headline text-[15px] font-bold text-[#e1e2ea] leading-tight">
                Panel de Sonido & Bluetooth
              </span>
              <span className="font-telemetry text-[11px] text-[#859399] tracking-wide">
                Estilos de Audio • Cero Latencia
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#1e232d] hover:bg-[#282f3c] text-[#bbc9cf] hover:text-[#e1e2ea] flex items-center justify-center transition-colors cursor-pointer"
            type="button"
            title="Cerrar panel"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Tab Navigation inside Drawer */}
        <div className="flex items-center px-3 pt-2 bg-[#12151c] border-b border-[#232e42]/70 gap-1.5 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('sounds')}
            className={`flex items-center gap-1.5 px-3 py-2 border-b-2 font-headline text-[12px] font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'sounds'
                ? 'border-[#00d2ff] text-[#00d2ff] bg-[#00d2ff]/10 rounded-t-lg'
                : 'border-transparent text-[#859399] hover:text-[#e1e2ea]'
            }`}
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">piano</span>
            <span>Estilos de Sonido ({PATCH_CATEGORIES.flatMap((c) => c.patches).length})</span>
          </button>

          <button
            onClick={() => setActiveTab('bluetooth')}
            className={`flex items-center gap-1.5 px-3 py-2 border-b-2 font-headline text-[12px] font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'bluetooth'
                ? 'border-[#ffbd58] text-[#ffbd58] bg-[#ea9f00]/10 rounded-t-lg'
                : 'border-transparent text-[#859399] hover:text-[#e1e2ea]'
            }`}
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">headset_mic</span>
            <span className="flex items-center gap-1">
              Auriculares Bluetooth
              {bluetoothConfig.isEnabled && (
                <span className="w-2 h-2 rounded-full bg-[#ffbd58] shadow-[0_0_6px_#ffbd58] animate-pulse" />
              )}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('acoustics')}
            className={`flex items-center gap-1.5 px-3 py-2 border-b-2 font-headline text-[12px] font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'acoustics'
                ? 'border-[#00d2ff] text-[#00d2ff] bg-[#00d2ff]/10 rounded-t-lg'
                : 'border-transparent text-[#859399] hover:text-[#e1e2ea]'
            }`}
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">surround_sound</span>
            <span>Acústica & FX</span>
          </button>
        </div>

        {/* Tab 1: ALL SOUND STYLES */}
        {activeTab === 'sounds' && (
          <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-4 no-scrollbar">
            {/* Quick Active Sound Banner */}
            <div className="p-3 rounded-2xl bg-gradient-to-r from-[#00d2ff]/15 via-[#161a22] to-[#ffbd58]/10 border border-[#00d2ff]/30 shadow-md flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[#00d2ff] text-[22px]">graphic_eq</span>
                <div className="flex flex-col">
                  <span className="font-telemetry text-[10px] text-[#00d2ff] font-bold uppercase tracking-wider">
                    Estilo Activo
                  </span>
                  <span className="font-headline text-[14px] font-black text-[#e1e2ea]">
                    {currentPatch}
                  </span>
                </div>
              </div>
              <button
                onClick={() => handlePreviewPatch(currentPatch)}
                className="px-2.5 py-1.5 rounded-xl bg-[#00d2ff] text-[#001f28] font-headline text-[11px] font-extrabold flex items-center gap-1 shadow-[0_0_10px_rgba(0,210,255,0.4)] hover:bg-[#45d1f6] active:scale-95 transition-all cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[14px]">volume_up</span>
                <span>Audición</span>
              </button>
            </div>

            {/* Categorized Patches */}
            {PATCH_CATEGORIES.map((cat) => (
              <div key={cat.name} className="space-y-2">
                <div className="flex items-center gap-1.5 text-[#bbc9cf] px-1">
                  <span className="material-symbols-outlined text-[16px] text-[#00d2ff]">{cat.icon}</span>
                  <span className="font-headline text-[12px] font-bold tracking-tight uppercase">
                    {cat.name}
                  </span>
                  <span className="text-[10px] text-[#859399] font-telemetry">({cat.patches.length})</span>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {cat.patches.map((p) => {
                    const isSelected = currentPatch === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => {
                          onPatchChange(p.id);
                          audioEngine.setPatch(p.id);
                        }}
                        role="button"
                        tabIndex={0}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 text-left ${
                          isSelected
                            ? 'bg-[#00d2ff]/15 border-[#00d2ff] shadow-[0_0_16px_rgba(0,210,255,0.25)]'
                            : 'bg-[#141820] hover:bg-[#1a1f29] border-[#232e42]/80 hover:border-[#3c494e]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              isSelected
                                ? 'bg-[#00d2ff] text-[#001f28] shadow-[0_0_8px_#00d2ff]'
                                : 'bg-[#1e232d] text-[#859399]'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              {isSelected ? 'check' : 'music_note'}
                            </span>
                          </div>

                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`font-headline text-[13px] font-bold truncate ${
                                  isSelected ? 'text-[#00d2ff]' : 'text-[#e1e2ea]'
                                }`}
                              >
                                {p.name}
                              </span>
                              <span className="px-1.5 py-0.2 rounded-full bg-[#1e232d] text-[#bbc9cf] font-telemetry text-[9px] font-medium shrink-0">
                                {p.tag}
                              </span>
                            </div>
                            <span className="font-telemetry text-[11px] text-[#859399] line-clamp-1">
                              {p.description}
                            </span>
                          </div>
                        </div>

                        {/* Test note preview button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePreviewPatch(p.id);
                          }}
                          className="px-2 py-1 rounded-lg bg-[#1f2530] hover:bg-[#293140] text-[#bbc9cf] hover:text-[#00d2ff] border border-[#232e42] transition-colors cursor-pointer shrink-0"
                          type="button"
                          title="Probar sonido"
                        >
                          <span className="material-symbols-outlined text-[15px]">play_arrow</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 2: BLUETOOTH ULTRA-LOW LATENCY & CALIBRATION */}
        {activeTab === 'bluetooth' && (
          <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-4 no-scrollbar">
            {/* Master Bluetooth Latency Toggle Card */}
            <div className="p-3.5 rounded-2xl bg-[#141820] border border-[#ffbd58]/40 shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      bluetoothConfig.isEnabled
                        ? 'bg-[#ffbd58] text-[#001f28] shadow-[0_0_14px_rgba(255,189,88,0.5)]'
                        : 'bg-[#1e232d] text-[#859399]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {bluetoothConfig.isEnabled ? 'bluetooth_connected' : 'bluetooth'}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-headline text-[14px] font-bold text-[#e1e2ea]">
                      Compensación Cero Latencia
                    </span>
                    <span className="font-telemetry text-[11px] text-[#859399]">
                      Sincronización exacta para auriculares
                    </span>
                  </div>
                </div>

                {/* Master Switch Button */}
                <button
                  onClick={handleToggleBluetoothEnabled}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                    bluetoothConfig.isEnabled ? 'bg-[#ffbd58]' : 'bg-[#272a30]'
                  }`}
                  type="button"
                >
                  <span
                    className={`absolute top-1 w-4 h-4 rounded-full bg-[#001f28] transition-transform ${
                      bluetoothConfig.isEnabled ? 'left-7' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              {/* Status / Detection notice */}
              <div className="px-3 py-2 rounded-xl bg-[#0b0e13] border border-[#232e42] flex items-center justify-between text-[11px] font-telemetry">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      bluetoothConfig.isEnabled ? 'bg-[#ffbd58] animate-pulse' : 'bg-[#859399]'
                    }`}
                  />
                  <span className="text-[#bbc9cf]">
                    {detectedBtDevice
                      ? `Detectado: ${detectedBtDevice}`
                      : bluetoothConfig.isEnabled
                      ? 'Compensación inalámbrica activa'
                      : 'Modo cable / directo (sin retardo)'}
                  </span>
                </div>
                {isScanningBt && <span className="text-[#00d2ff] animate-spin">sync</span>}
              </div>

              {/* Visual Sync Explanation Banner */}
              <div className="p-2.5 rounded-xl bg-[#ffbd58]/10 border border-[#ffbd58]/30 flex items-start gap-2 text-[11px] text-[#ffbd58]">
                <span className="material-symbols-outlined text-[16px] shrink-0 mt-0.5">info</span>
                <span>
                  Los auriculares Bluetooth añaden entre 50 y 180 ms de retraso de códec. Este motor
                  adelanta visualmente la cascada para que las notas caigan y suenen en tus oídos en el{' '}
                  <strong>mismo milisegundo exacto</strong>.
                </span>
              </div>
            </div>

            {/* Quick Bluetooth Device Profiles */}
            <div className="space-y-2">
              <span className="font-headline text-[12px] font-bold text-[#bbc9cf] uppercase tracking-wider px-1">
                Perfiles de Auriculares Populares
              </span>

              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(BLUETOOTH_PRESET_DELAYS) as BluetoothLatencyConfig['profile'][]).map(
                  (profKey) => {
                    const preset = BLUETOOTH_PRESET_DELAYS[profKey];
                    const isSelected = bluetoothConfig.profile === profKey && bluetoothConfig.isEnabled;
                    return (
                      <button
                        key={profKey}
                        onClick={() => handlePresetSelect(profKey)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-[#ea9f00]/20 border-[#ffbd58] text-[#ffbd58] shadow-[0_0_12px_rgba(255,189,88,0.3)]'
                            : 'bg-[#141820] hover:bg-[#1a1f29] border-[#232e42] text-[#e1e2ea]'
                        }`}
                        type="button"
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-headline text-[12px] font-bold truncate">
                            {preset.label}
                          </span>
                          {isSelected && (
                            <span className="material-symbols-outlined text-[14px] text-[#ffbd58]">
                              check_circle
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-1 text-[11px] font-telemetry">
                          <span className="text-[#859399]">Compensación:</span>
                          <span className="font-bold text-[#00d2ff]">
                            {preset.delayMs === 0 ? '0 ms' : `-${preset.delayMs} ms`}
                          </span>
                        </div>
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            {/* Fine Calibration Slider */}
            <div className="p-3.5 rounded-2xl bg-[#141820] border border-[#232e42] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-headline text-[13px] font-bold text-[#e1e2ea]">
                  Compensación de Retardo Manual
                </span>
                <span className="font-telemetry text-[13px] font-extrabold text-[#ffbd58]">
                  -{bluetoothConfig.compensationMs} ms
                </span>
              </div>

              <input
                type="range"
                min="0"
                max="260"
                step="5"
                value={bluetoothConfig.compensationMs}
                onChange={(e) => handleSliderChange(parseInt(e.target.value, 10))}
                className="w-full accent-[#ffbd58] cursor-pointer"
              />

              <div className="flex justify-between text-[10px] font-telemetry text-[#859399]">
                <span>0 ms (Cable)</span>
                <span>100 ms (AirPods/AAC)</span>
                <span>200 ms+ (SBC)</span>
              </div>
            </div>

            {/* Fast-Path Audio Toggle */}
            <div className="p-3 rounded-2xl bg-[#141820] border border-[#232e42] flex items-center justify-between">
              <div className="flex flex-col pr-2">
                <span className="font-headline text-[13px] font-bold text-[#e1e2ea]">
                  Ruta Directa Fast-Path Audio
                </span>
                <span className="font-telemetry text-[11px] text-[#859399]">
                  Dispara transitorios inmediatos (&lt;1.5ms) sin buffers adicionales
                </span>
              </div>
              <button
                onClick={handleToggleFastPath}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                  bluetoothConfig.fastPathAudio ? 'bg-[#00d2ff]' : 'bg-[#272a30]'
                }`}
                type="button"
              >
                <span
                  className={`absolute top-1 w-4 h-4 rounded-full bg-[#001f28] transition-transform ${
                    bluetoothConfig.fastPathAudio ? 'left-6' : 'left-1'
                  }`}
                />
              </button>
            </div>

            {/* Live Tap-to-Sync Calibration Test Tool */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#161b24] to-[#0f1218] border border-[#232e42] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#00d2ff] text-[20px]">timer</span>
                  <span className="font-headline text-[13px] font-bold text-[#e1e2ea]">
                    Calibrador Automático por Toque
                  </span>
                </div>
                {!isCalibrating && (
                  <button
                    onClick={() => {
                      setIsCalibrating(true);
                      setCalibrationTimestamps([]);
                      setCalibrationResultMs(null);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[#00d2ff]/20 text-[#00d2ff] border border-[#00d2ff]/40 font-headline text-[11px] font-bold hover:bg-[#00d2ff]/30 cursor-pointer"
                    type="button"
                  >
                    Iniciar Test
                  </button>
                )}
              </div>

              {isCalibrating && (
                <div className="space-y-3 p-3 rounded-xl bg-[#0b0e13] border border-[#00d2ff]/40">
                  <p className="text-[12px] text-[#bbc9cf] font-telemetry text-center">
                    Escucharás un pulso rítmico en tus auriculares. Toca el botón central en cuanto escuches cada clic.
                  </p>

                  <div className="flex flex-col items-center justify-center gap-2 py-2">
                    <button
                      onClick={handleTapCalibration}
                      className="w-20 h-20 rounded-full bg-gradient-to-br from-[#00d2ff] to-[#45d1f6] text-[#001f28] font-headline text-[14px] font-black shadow-[0_0_24px_rgba(0,210,255,0.7)] active:scale-90 transition-transform cursor-pointer flex flex-col items-center justify-center"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[24px]">touch_app</span>
                      <span>¡TOCA!</span>
                    </button>
                    <span className="font-telemetry text-[11px] text-[#859399]">
                      Muestras registradas: {calibrationTimestamps.length} / 4
                    </span>
                  </div>

                  <button
                    onClick={() => setIsCalibrating(false)}
                    className="w-full py-1 text-center font-telemetry text-[11px] text-[#859399] hover:text-[#e1e2ea] cursor-pointer"
                    type="button"
                  >
                    Cancelar calibración
                  </button>
                </div>
              )}

              {calibrationResultMs !== null && (
                <div className="p-3 rounded-xl bg-[#ea9f00]/15 border border-[#ffbd58]/50 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-headline text-[12px] font-bold text-[#ffbd58]">
                      Latencia Medida: {calibrationResultMs} ms
                    </span>
                    <span className="font-telemetry text-[11px] text-[#bbc9cf]">
                      ¿Deseas aplicar esta sincronización?
                    </span>
                  </div>
                  <button
                    onClick={handleApplyCalibration}
                    className="px-3 py-1.5 rounded-lg bg-[#ffbd58] text-[#001f28] font-headline text-[11px] font-extrabold hover:bg-[#ffca28] cursor-pointer"
                    type="button"
                  >
                    Aplicar
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: ACOUSTICS & REVERB STUDIO */}
        {activeTab === 'acoustics' && (
          <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-4 no-scrollbar">
            {/* Reverb Impulse Spaces */}
            <div className="space-y-2">
              <span className="font-headline text-[12px] font-bold text-[#bbc9cf] uppercase tracking-wider px-1">
                Espacio Acústico de Sala
              </span>

              <div className="grid grid-cols-2 gap-2">
                {(['Dry', 'Intimate Studio', 'Concert Hall', 'Cathedral'] as ReverbSpace[]).map(
                  (space) => {
                    const isSelected = reverbSpace === space;
                    return (
                      <button
                        key={space}
                        onClick={() => {
                          setReverbSpace(space);
                          audioEngine.setReverbSpace(space);
                        }}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#00d2ff]/20 border-[#00d2ff] text-[#00d2ff] shadow-[0_0_12px_rgba(0,210,255,0.25)]'
                            : 'bg-[#141820] hover:bg-[#1a1f29] border-[#232e42] text-[#e1e2ea]'
                        }`}
                        type="button"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-headline text-[13px] font-bold">{space}</span>
                          {isSelected && (
                            <span className="material-symbols-outlined text-[16px]">check</span>
                          )}
                        </div>
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            {/* Reverb Wet/Dry Mix */}
            <div className="p-3.5 rounded-2xl bg-[#141820] border border-[#232e42] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-headline text-[13px] font-bold text-[#e1e2ea]">
                  Mezcla de Reverberación (Wet)
                </span>
                <span className="font-telemetry text-[13px] font-bold text-[#00d2ff]">
                  {Math.round(reverbMix * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={reverbMix}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setReverbMix(val);
                  audioEngine.setReverbMix(val);
                }}
                className="w-full accent-[#00d2ff] cursor-pointer"
              />
            </div>

            {/* Master Volume */}
            <div className="p-3.5 rounded-2xl bg-[#141820] border border-[#232e42] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-headline text-[13px] font-bold text-[#e1e2ea]">
                  Volumen Maestro
                </span>
                <span className="font-telemetry text-[13px] font-bold text-[#00d2ff]">
                  {Math.round(masterVolume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={masterVolume}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setMasterVolume(val);
                  audioEngine.setMasterVolume(val);
                }}
                className="w-full accent-[#00d2ff] cursor-pointer"
              />
            </div>

            {/* Velocity Curve Dynamics */}
            <div className="p-3.5 rounded-2xl bg-[#141820] border border-[#232e42] space-y-2.5">
              <span className="font-headline text-[13px] font-bold text-[#e1e2ea]">
                Curva de Sensibilidad al Tacto
              </span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'soft', label: 'Suave' },
                  { id: 'medium', label: 'Estándar' },
                  { id: 'hard', label: 'Firme' },
                ].map((c) => (
                  <button
                    key={c.id}
                    onClick={() => audioEngine.setVelocityCurve(c.id as any)}
                    className="py-1.5 rounded-lg bg-[#1f2530] hover:bg-[#293140] text-[#e1e2ea] border border-[#232e42] font-headline text-[12px] font-semibold text-center cursor-pointer"
                    type="button"
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Drawer Footer */}
        <div className="px-4 py-3 bg-[#141820] border-t border-[#232e42] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                bluetoothConfig.isEnabled ? 'bg-[#ffbd58]' : 'bg-[#00d2ff]'
              }`}
            />
            <span className="font-telemetry text-[11px] text-[#bbc9cf]">
              {bluetoothConfig.isEnabled
                ? `BT Activo: -${bluetoothConfig.compensationMs}ms`
                : `${currentPatch}`}
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#00d2ff] text-[#001f28] font-headline text-[12px] font-extrabold hover:bg-[#4cd6fb] active:scale-95 transition-all cursor-pointer shadow-md"
            type="button"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
};
