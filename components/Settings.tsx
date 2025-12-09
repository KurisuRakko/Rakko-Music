import React, { useState } from 'react';
import { X, Image as ImageIcon, Zap, Palette } from 'lucide-react';
import { AppSettings } from '../types';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
}

const Settings: React.FC<SettingsProps> = ({ isOpen, onClose, settings, onUpdateSettings }) => {
  const [localWallpaper, setLocalWallpaper] = useState(settings.wallpaper);

  if (!isOpen) return null;

  const handleSave = () => {
    onUpdateSettings({ ...settings, wallpaper: localWallpaper });
    onClose();
  };

  const colors = [
    "#ec4899", // Pink (Default)
    "#8b5cf6", // Violet
    "#3b82f6", // Blue
    "#10b981", // Emerald
    "#f59e0b", // Amber
    "#ef4444", // Red
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#1a1b26]/90 border border-white/10 p-6 rounded-3xl w-full max-w-md shadow-2xl relative overflow-hidden">
        {/* Glow effect */}
        <div 
            className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 blur-[80px] rounded-full pointer-events-none opacity-20"
            style={{ backgroundColor: settings.accentColor }}
        ></div>
        
        <div className="relative z-10">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              Settings
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <X size={20} className="text-white/70" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Bass Boost Toggle */}
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
              <div className="flex items-center gap-3">
                <div 
                  className={`p-2 rounded-xl transition-colors ${settings.bassBoost ? 'text-white' : 'bg-white/10 text-white/50'}`}
                  style={{ backgroundColor: settings.bassBoost ? settings.accentColor : undefined }}
                >
                  <Zap size={20} fill={settings.bassBoost ? "currentColor" : "none"} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Bass Boost</h3>
                  <p className="text-xs text-white/40">Enhance low frequencies</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  checked={settings.bassBoost}
                  onChange={(e) => onUpdateSettings({ ...settings, bassBoost: e.target.checked })}
                />
                <div 
                  className={`w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all`}
                  style={{ backgroundColor: settings.bassBoost ? settings.accentColor : undefined }}
                ></div>
              </label>
            </div>

            {/* Accent Color */}
            <div className="space-y-3">
               <label className="text-sm font-medium text-white/70 flex items-center gap-2">
                 <Palette size={16} />
                 Accent Color
               </label>
               <div className="flex gap-3 items-center">
                  <div className="flex gap-2">
                    {colors.map(c => (
                        <button
                          key={c}
                          onClick={() => onUpdateSettings({...settings, accentColor: c})}
                          className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${settings.accentColor === c ? 'border-white' : 'border-transparent'}`}
                          style={{ backgroundColor: c }}
                        />
                    ))}
                  </div>
                  <div className="w-px h-8 bg-white/10 mx-2"></div>
                  <input 
                    type="color" 
                    value={settings.accentColor}
                    onChange={(e) => onUpdateSettings({...settings, accentColor: e.target.value})}
                    className="w-8 h-8 rounded-full bg-transparent cursor-pointer border-0 p-0"
                  />
               </div>
            </div>

            {/* Wallpaper Input */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-white/70 flex items-center gap-2">
                <ImageIcon size={16} />
                Wallpaper URL
              </label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={localWallpaper}
                  onChange={(e) => setLocalWallpaper(e.target.value)}
                  placeholder="https://..."
                  className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition-colors placeholder:text-white/20"
                  style={{ borderColor: `color-mix(in srgb, ${settings.accentColor} 50%, transparent)` }}
                />
              </div>
              <p className="text-xs text-white/30 ml-1">Paste a direct image link to change background.</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex justify-end gap-3">
            <button 
              onClick={onClose}
              className="px-4 py-2 text-sm text-white/60 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              className="px-6 py-2 bg-white text-black text-sm font-bold rounded-xl hover:bg-gray-200 transition-transform active:scale-95"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;