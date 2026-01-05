
import React, { useState, useEffect } from 'react';
import { X, Image as ImageIcon, Zap, Palette, Clock, Globe, Gauge, Maximize2 } from 'lucide-react';
import { AppSettings } from '../types';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
}

const Settings: React.FC<SettingsProps> = ({ isOpen, onClose, settings, onUpdateSettings }) => {
  const [shouldRender, setShouldRender] = useState(false);
  const [isAnimatingIn, setIsAnimatingIn] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      // Small delay to allow DOM mount before animating class change
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setIsAnimatingIn(true));
      });
    } else {
      setIsAnimatingIn(false);
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 300); // Matches duration-300
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!shouldRender) return null;

  const colors = [
    "#ec4899", // Pink (Default)
    "#8b5cf6", // Violet
    "#3b82f6", // Blue
    "#10b981", // Emerald
    "#f59e0b", // Amber
    "#ef4444", // Red
  ];

  const timezones = [
    "Local",
    "UTC",
    "America/New_York",
    "America/Los_Angeles",
    "Europe/London",
    "Europe/Paris",
    "Asia/Tokyo",
    "Asia/Shanghai",
    "Australia/Sydney"
  ];

  return (
    <div
      className={`fixed inset-0 z-[300] flex items-center justify-center transition-all duration-300 ease-out ${isAnimatingIn ? 'bg-black/60 backdrop-blur-sm opacity-100' : 'bg-black/0 backdrop-blur-none opacity-0'}`}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`
          bg-[#1a1b26]/90 border border-white/10 p-6 rounded-3xl w-full max-w-md shadow-2xl relative overflow-hidden 
          transition-all duration-400 ease-spring transform max-h-[90vh] overflow-y-auto custom-scrollbar
          ${isAnimatingIn ? 'scale-100 translate-y-0 opacity-100' : 'scale-90 translate-y-8 opacity-0'}
        `}
      >
        {/* Glow effect */}
        {!settings.performanceMode && (
          <div
            className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 blur-[80px] rounded-full pointer-events-none opacity-20 transition-colors duration-500"
            style={{ backgroundColor: settings.accentColor }}
          ></div>
        )}

        <div className="relative z-10">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              Settings
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition-all active:scale-90 hover:rotate-90 duration-300"
            >
              <X size={20} className="text-white/70" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Performance Section */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest">System</h3>

              <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 transition-all hover:bg-white/10 hover:scale-[1.02] duration-300 active:scale-[0.98]">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-xl transition-colors duration-300 ${settings.performanceMode ? 'text-white' : 'bg-white/10 text-white/50'}`}
                    style={{ backgroundColor: settings.performanceMode ? settings.accentColor : undefined }}
                  >
                    <Gauge size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">Performance Mode</h3>
                    <p className="text-xs text-white/40">Disable blurs, physics & shadows</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer group">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={settings.performanceMode}
                    onChange={(e) => onUpdateSettings({ ...settings, performanceMode: e.target.checked })}
                  />
                  <div
                    className={`w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all duration-300 group-hover:scale-105 shadow-inner`}
                    style={{ backgroundColor: settings.performanceMode ? settings.accentColor : undefined }}
                  ></div>
                </label>
              </div>
            </div>

            {/* Audio Section */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest">Audio</h3>

              {/* Bass Boost Toggle */}
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 transition-all hover:bg-white/10 hover:scale-[1.02] duration-300 active:scale-[0.98]">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-xl transition-colors duration-300 ${settings.bassBoost ? 'text-white' : 'bg-white/10 text-white/50'}`}
                    style={{ backgroundColor: settings.bassBoost ? settings.accentColor : undefined }}
                  >
                    <Zap size={20} fill={settings.bassBoost ? "currentColor" : "none"} className={settings.bassBoost ? "animate-pulse" : ""} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">Bass Boost</h3>
                    <p className="text-xs text-white/40">Enhance low frequencies</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer group">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={settings.bassBoost}
                    onChange={(e) => onUpdateSettings({ ...settings, bassBoost: e.target.checked })}
                  />
                  <div
                    className={`w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all duration-300 group-hover:scale-105 shadow-inner`}
                    style={{ backgroundColor: settings.bassBoost ? settings.accentColor : undefined }}
                  ></div>
                </label>
              </div>
            </div>

            {/* Presentation Section */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest">Presentation</h3>

              <button
                onClick={() => {
                  window.open(`${window.location.origin}${window.location.pathname}?mode=presentation`, '_blank', 'width=1280,height=720');
                }}
                className="w-full p-4 bg-gradient-to-r from-purple-500/20 to-blue-500/20 hover:from-purple-500/30 hover:to-blue-500/30 border border-white/10 rounded-2xl flex items-center justify-between group transition-all duration-300 active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/10 rounded-xl text-white group-hover:bg-white/20 transition-colors">
                    <Maximize2 size={20} />
                  </div>
                  <div className="text-left">
                    <h3 className="text-sm font-semibold text-white">Open Presentation Window</h3>
                    <p className="text-xs text-white/40">Launch immersive lyrics display</p>
                  </div>
                </div>
                <div className="text-white/40 group-hover:translate-x-1 transition-transform">
                  →
                </div>
              </button>
            </div>

            {/* Display Section */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest">Display</h3>

              {/* Clock Toggle */}
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 transition-all hover:bg-white/10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/10 rounded-xl text-white/70">
                    <Clock size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">Immersive Clock</h3>
                    <p className="text-xs text-white/40">Show date & time in immersive mode</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer group">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={settings.showClock}
                    onChange={(e) => onUpdateSettings({ ...settings, showClock: e.target.checked })}
                  />
                  <div
                    className={`w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all duration-300 group-hover:scale-105 shadow-inner`}
                    style={{ backgroundColor: settings.showClock ? settings.accentColor : undefined }}
                  ></div>
                </label>
              </div>

              {/* Timezone Selector */}
              {settings.showClock && (
                <div className="space-y-2 animate-slide-up-fade">
                  <label className="text-sm font-medium text-white/70 flex items-center gap-2 pl-1">
                    <Globe size={14} />
                    Timezone
                  </label>
                  <div className="relative">
                    <select
                      value={settings.clockTimezone}
                      onChange={(e) => onUpdateSettings({ ...settings, clockTimezone: e.target.value })}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none appearance-none transition-all hover:border-white/20 focus:border-white/40"
                    >
                      {timezones.map(tz => (
                        <option key={tz} value={tz} className="bg-[#1e1e2e] text-white">
                          {tz}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/40">
                      <Globe size={16} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Customization Section */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest">Theme</h3>

              <label className="text-sm font-medium text-white/70 flex items-center gap-2 pl-1">
                <Palette size={16} />
                Accent Color
              </label>
              <div className="flex gap-3 items-center flex-wrap">
                {colors.map((c, i) => (
                  <button
                    key={c}
                    onClick={() => onUpdateSettings({ ...settings, accentColor: c })}
                    className={`w-8 h-8 rounded-full border-2 transition-all duration-300 hover:scale-125 active:scale-90 ${settings.accentColor === c ? 'border-white scale-110 shadow-[0_0_15px_currentColor]' : 'border-transparent opacity-80 hover:opacity-100'}`}
                    style={{ backgroundColor: c, animationDelay: `${i * 50}ms` }}
                  />
                ))}
                <div className="w-px h-8 bg-white/10 mx-2"></div>
                <input
                  type="color"
                  value={settings.accentColor}
                  onChange={(e) => onUpdateSettings({ ...settings, accentColor: e.target.value })}
                  className="w-8 h-8 rounded-full bg-transparent cursor-pointer border-0 p-0 transition-transform hover:scale-110 active:scale-95"
                />
              </div>

              {/* Wallpaper Input */}
              <div className="space-y-3 mt-4">
                <label className="text-sm font-medium text-white/70 flex items-center gap-2 pl-1">
                  <ImageIcon size={16} />
                  Wallpaper URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={settings.wallpaper}
                    onChange={(e) => onUpdateSettings({ ...settings, wallpaper: e.target.value })}
                    placeholder="https://..."
                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition-all placeholder:text-white/20 focus:border-white/40 focus:ring-1 focus:ring-white/20"
                    style={{ borderColor: `color-mix(in srgb, ${settings.accentColor} 30%, transparent)` }}
                  />
                </div>
                <p className="text-xs text-white/30 ml-1">Paste a direct image link to change background.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;