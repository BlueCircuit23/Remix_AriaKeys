import React from 'react';
import { INITIAL_STATS, USER_PROFILE, REPERTOIRE_SONGS } from '../data/mockData';

interface StatsScreenProps {
  onGoToPractice: () => void;
}

export const StatsScreen: React.FC<StatsScreenProps> = ({ onGoToPractice }) => {
  const stats = INITIAL_STATS;

  return (
    <div className="flex flex-col w-full max-w-xl mx-auto px-4 space-y-4 pb-28 pt-2">
      {/* Top Atelier Identity Card */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#272a30] via-[#1d2025] to-[#0b0e13] border border-[#232e42] p-4 shadow-xl">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#ffbd58]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <img
              alt="Alex Profile"
              className="w-14 h-14 rounded-full object-cover ring-2 ring-[#ffbd58]"
              src={USER_PROFILE.avatarUrl}
            />
            <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-[#10b981] ring-2 ring-[#1d2025]" />
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-headline text-[19px] font-bold text-[#e1e2ea]">
                {USER_PROFILE.name}'s Atelier
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-[#ea9f00]/20 text-[#ffbd58] font-telemetry text-[10px] font-bold">
                {stats.currentGrade}
              </span>
            </div>
            <p className="font-sans text-[12px] text-[#bbc9cf] mt-0.5">
              14-day continuous streak • Daily target: 30 mins
            </p>
          </div>
        </div>

        {/* 3 Metric Pillars */}
        <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-[#232e42]/60 text-center">
          <div className="flex flex-col items-center">
            <span className="font-telemetry text-[18px] font-extrabold text-[#e1e2ea]">
              {stats.totalHours}h
            </span>
            <span className="font-sans text-[11px] text-[#bbc9cf]">Total Practice</span>
          </div>
          <div className="flex flex-col items-center border-x border-[#232e42]/60">
            <span className="font-telemetry text-[18px] font-extrabold text-[#00d2ff]">
              {stats.masteredCount}
            </span>
            <span className="font-sans text-[11px] text-[#bbc9cf]">Mastered Scores</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="font-telemetry text-[18px] font-extrabold text-[#ffbd58]">
              {stats.streakDays}d
            </span>
            <span className="font-sans text-[11px] text-[#bbc9cf]">Current Streak</span>
          </div>
        </div>
      </section>

      {/* Weekly Practice Rhythm Chart */}
      <section className="bg-[#1d2025] border border-[#232e42] rounded-2xl p-4 shadow-md flex flex-col space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#00d2ff] text-[20px]">calendar_month</span>
            <h3 className="font-headline text-[16px] font-bold text-[#e1e2ea]">Weekly Practice Distribution</h3>
          </div>
          <span className="font-telemetry text-[11px] text-[#00d2ff] font-bold">
            245 mins this week
          </span>
        </div>

        <div className="flex items-end justify-between gap-2 h-36 pt-4 px-2">
          {stats.weeklyMinutes.map((item, idx) => {
            const heightPct = Math.min(100, (item.minutes / 60) * 100);
            const isToday = idx === 6; // Sunday
            return (
              <div key={item.day} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                <span className="font-telemetry text-[10px] text-[#bbc9cf]">
                  {item.minutes}m
                </span>
                <div className="w-full bg-[#0b0e13] rounded-t-lg h-24 flex items-end p-0.5 border border-[#232e42]">
                  <div
                    className={`w-full rounded-t-md transition-all duration-500 ${
                      isToday
                        ? 'bg-gradient-to-t from-[#ffbd58] to-[#ea9f00] shadow-[0_0_12px_rgba(255,189,88,0.5)]'
                        : 'bg-gradient-to-t from-[#00d2ff] to-[#45d1f6]'
                    }`}
                    style={{ height: `${heightPct}%` }}
                  />
                </div>
                <span className={`font-telemetry text-[11px] ${isToday ? 'font-bold text-[#ffbd58]' : 'text-[#859399]'}`}>
                  {item.day}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Performance Precision Telemetry */}
      <section className="bg-[#1d2025] border border-[#232e42] rounded-2xl p-4 shadow-md space-y-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#ffbd58] text-[20px]">analytics</span>
          <h3 className="font-headline text-[16px] font-bold text-[#e1e2ea]">
            Acoustic &amp; Touch Precision
          </h3>
        </div>

        <div className="space-y-3">
          {/* Pitch Precision */}
          <div className="space-y-1">
            <div className="flex justify-between text-[12px] font-telemetry">
              <span className="text-[#bbc9cf]">Pitch Accuracy &amp; Note Attack</span>
              <span className="font-bold text-[#00d2ff]">{stats.pitchPrecisionPct}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-[#0b0e13] overflow-hidden border border-[#232e42]">
              <div className="h-full bg-[#00d2ff] rounded-full" style={{ width: `${stats.pitchPrecisionPct}%` }} />
            </div>
          </div>

          {/* Tempo Stability */}
          <div className="space-y-1">
            <div className="flex justify-between text-[12px] font-telemetry">
              <span className="text-[#bbc9cf]">Metronome &amp; Tempo Stability</span>
              <span className="font-bold text-[#ffbd58]">{stats.tempoStabilityPct}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-[#0b0e13] overflow-hidden border border-[#232e42]">
              <div className="h-full bg-[#ffbd58] rounded-full" style={{ width: `${stats.tempoStabilityPct}%` }} />
            </div>
          </div>

          {/* Dynamic Expression */}
          <div className="space-y-1">
            <div className="flex justify-between text-[12px] font-telemetry">
              <span className="text-[#bbc9cf]">Velocity Dynamic Expression</span>
              <span className="font-bold text-[#45d1f6]">{stats.expressionScorePct}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-[#0b0e13] overflow-hidden border border-[#232e42]">
              <div className="h-full bg-[#45d1f6] rounded-full" style={{ width: `${stats.expressionScorePct}%` }} />
            </div>
          </div>
        </div>
      </section>

      {/* Top Repertoire Progress */}
      <section className="bg-[#1d2025] border border-[#232e42] rounded-2xl p-4 shadow-md space-y-3">
        <h3 className="font-headline text-[16px] font-bold text-[#e1e2ea]">
          Active Repertoire Progress
        </h3>
        <div className="space-y-2">
          {REPERTOIRE_SONGS.slice(0, 3).map((song) => (
            <div
              key={song.id}
              className="flex items-center justify-between p-2.5 bg-[#191c21] rounded-xl border border-[#272a30]"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  alt={song.title}
                  className="w-9 h-9 rounded-lg object-cover"
                  src={song.artworkUrl}
                />
                <div className="flex flex-col min-w-0">
                  <span className="font-headline text-[13px] font-bold text-[#e1e2ea] truncate">
                    {song.title}
                  </span>
                  <span className="font-sans text-[11px] text-[#bbc9cf] truncate">
                    {song.composer}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-telemetry text-[12px] font-bold text-[#00d2ff]">
                  {song.masteryPct}%
                </span>
                <span className="material-symbols-outlined text-[#10b981] text-[18px]">
                  check_circle
                </span>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onGoToPractice}
          className="w-full py-2.5 rounded-xl bg-[#00d2ff] hover:bg-[#45d1f6] text-[#001f28] font-headline text-[14px] font-bold shadow-[0_0_16px_rgba(0,210,255,0.4)] active:scale-[0.98] transition-all cursor-pointer mt-2"
          type="button"
        >
          Resume Today's Drill
        </button>
      </section>
    </div>
  );
};
