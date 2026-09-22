import React from 'react';
import { TabType } from '../types';
import { USER_PROFILE } from '../data/mockData';

interface HeaderProps {
  currentTab: TabType;
  onProfileClick: () => void;
  onOpenStudioDrawer?: () => void;
  isBluetoothEnabled?: boolean;
  bluetoothCompensationMs?: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onProfileClick,
  onOpenStudioDrawer,
  isBluetoothEnabled = false,
  bluetoothCompensationMs = 115,
}) => {
  const getSubTitle = () => {
    switch (currentTab) {
      case 'home':
        return 'Home';
      case 'play':
        return 'Piano Play';
      case 'library':
        return 'Song Library';
      case 'stats':
        return 'Mastery Stats';
      default:
        return 'Home';
    }
  };

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-[#0b0e13]/85 backdrop-blur-xl pt-safe border-b border-[#232e42]/60 shadow-[0_2px_12px_rgba(0,0,0,0.5)]">
      <div className="h-16 px-3 sm:px-4 max-w-5xl mx-auto flex items-center justify-between gap-2.5">
        {/* Top-Left: Studio & Bluetooth Drawer Button + Logo & Section Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Panel Lateral Superior Izquierdo Button */}
          {onOpenStudioDrawer && (
            <button
              onClick={onOpenStudioDrawer}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#191c21] hover:bg-[#232730] border border-[#232e42] hover:border-[#00d2ff]/50 text-[#e1e2ea] transition-all active:scale-95 cursor-pointer shadow-sm group shrink-0"
              title="Abrir panel lateral de estilos de sonido y Bluetooth sin latencia"
              type="button"
            >
              <span className="material-symbols-outlined text-[19px] text-[#00d2ff] group-hover:rotate-45 transition-transform duration-200">
                tune
              </span>
              <span className="hidden md:inline font-headline text-[12px] font-bold">
                Estilos & BT
              </span>
              {isBluetoothEnabled && (
                <span className="flex items-center gap-1 px-1.5 py-0.2 rounded-full bg-[#ea9f00]/25 border border-[#ffbd58]/50 text-[#ffbd58] font-telemetry text-[9px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ffbd58] animate-pulse" />
                  <span>-{bluetoothCompensationMs}ms</span>
                </span>
              )}
            </button>
          )}

          <img
            alt="AriaKeys Logo"
            className="h-7 sm:h-8 w-auto object-contain shrink-0 drop-shadow-[0_0_10px_rgba(0,210,255,0.4)]"
            src="https://lh3.googleusercontent.com/aida/AEtjO1WrKnxj0WqwXMQYYlS1qtgqP7dVtKNNNBX9J7CR7d7Nn4bUZfyKF0mvuArBJCC_SuuIp52eSpcEy-kgp1nupaIbeVHlLQqK2kuEBfHTdCNy_gj6JnP1z5FNWaiZWdBpvJjSurr_d-Y99KO0EyuLH6bpEfUFDwfvLDymu5rZNf8fMfw7sK6FD5Ur4ChvOeVLAi67-Cd18kfVeXlffu-s9La34EuP96usrM8llkRjmA7G0caCUDF_IFCS0UuW"
          />
          <div className="flex flex-col truncate">
            <span className="font-headline text-[16px] sm:text-[17px] font-bold tracking-tight text-[#e1e2ea] truncate leading-tight">
              AriaKeys
            </span>
            <span className="font-telemetry text-[10px] sm:text-[11px] text-[#bbc9cf] truncate uppercase tracking-widest leading-none mt-0.5">
              {getSubTitle()}
            </span>
          </div>
        </div>

        {/* Streak Counter & Profile Button */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Hardware MIDI Status Chip */}
          <div
            onClick={onProfileClick}
            role="button"
            tabIndex={0}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#191c21] border border-[#232e42] hover:border-[#00d2ff]/40 text-[#00d2ff] cursor-pointer transition-colors shadow-xs"
            title="Web MIDI Audio Latency & Diagnostics"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#00d2ff] animate-pulse" />
            <span className="font-telemetry text-[11px] font-bold tracking-tight">MIDI 4.2ms</span>
          </div>

          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#ea9f00]/15 border border-[#ea9f00]/30 shadow-[0_0_14px_rgba(255,189,88,0.25)]">
            <span className="material-symbols-outlined text-[#ffbd58] text-[18px] leading-none">
              local_fire_department
            </span>
            <span className="font-telemetry text-[12px] font-bold text-[#ffbd58] tracking-tight">
              {USER_PROFILE.streakDays}d
            </span>
          </div>

          <button
            onClick={onProfileClick}
            aria-label="View user profile"
            className="p-0.5 rounded-full bg-[#00d2ff]/20 border border-[#00d2ff]/40 shadow-[0_0_12px_rgba(0,210,255,0.4)] hover:scale-105 active:scale-95 transition-transform"
            type="button"
          >
            <img
              alt="Alex Profile"
              className="w-8 h-8 rounded-full object-cover"
              src={USER_PROFILE.avatarUrl}
            />
          </button>
        </div>
      </div>
    </header>
  );
};
