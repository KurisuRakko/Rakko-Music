import React, { useState, useRef, useEffect } from 'react';
import { Song } from '../types';
import { Music, Plus, Play, Trash2, FileText } from 'lucide-react';

interface PlaylistProps {
  songs: Song[];
  currentSong: Song | null;
  isPlaying: boolean;
  onSelect: (song: Song) => void;
  onAddFiles: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveSong: (id: string) => void;
  onUpdateLyrics: (id: string, lyrics: string) => void;
  accentColor: string;
}

const Playlist: React.FC<PlaylistProps> = ({ 
  songs, 
  currentSong, 
  isPlaying, 
  onSelect, 
  onAddFiles,
  onRemoveSong,
  onUpdateLyrics,
  accentColor
}) => {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; songId: string } | null>(null);
  const lyricsInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const handleContextMenu = (e: React.MouseEvent, songId: string) => {
    e.preventDefault();
    const x = Math.min(e.clientX, window.innerWidth - 180);
    const y = Math.min(e.clientY, window.innerHeight - 120);
    setContextMenu({ x, y, songId });
  };

  const handleLyricsFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (contextMenu && e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        onUpdateLyrics(contextMenu.songId, text);
        setContextMenu(null);
      };
      reader.readAsText(file);
    }
    if (e.target) e.target.value = '';
  };

  const triggerLyricsImport = () => {
    lyricsInputRef.current?.click();
  };

  const removeSelectedSong = () => {
    if (contextMenu) {
      onRemoveSong(contextMenu.songId);
      setContextMenu(null);
    }
  };

  return (
    <div className="flex flex-col h-full w-full">
      <div className="px-6 md:px-8 pb-4 animate-slide-up-fade">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">Library</h2>
          <label className="cursor-pointer group">
              <input 
                type="file" 
                accept="audio/*" 
                multiple 
                className="hidden" 
                onChange={onAddFiles}
              />
              <div className="p-2.5 bg-white/10 rounded-full hover:bg-white text-white hover:text-black transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95">
                <Plus size={20} />
              </div>
          </label>
        </div>
        <p className="text-white/40 text-sm font-medium">{songs.length} Tracks</p>
      </div>
      
      <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-4 space-y-1 custom-scrollbar">
        {songs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-white/20 space-y-4 border-2 border-dashed border-white/5 rounded-2xl m-2 animate-scale-fade-in">
             <div className="p-4 rounded-full bg-white/5">
                <Music size={32} />
             </div>
             <p className="text-sm font-medium">Add local files to start</p>
          </div>
        ) : (
          songs.map((song, index) => {
            const isActive = currentSong?.id === song.id;
            return (
              <div
                key={song.id}
                onClick={() => onSelect(song)}
                onContextMenu={(e) => handleContextMenu(e, song.id)}
                className={`
                  group relative flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all duration-300 ease-elegant select-none
                  opacity-0 animate-slide-in-right
                  ${isActive ? 'bg-white/10' : 'hover:bg-white/5'}
                `}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Playing Indicator / Number */}
                <div className="w-8 flex justify-center text-xs font-medium text-white/40 group-hover:text-white">
                  {isActive && isPlaying ? (
                     <div className="flex gap-0.5 items-end h-3">
                        <div className="w-0.5 animate-[pulse_0.6s_ease-in-out_infinite] h-full" style={{ backgroundColor: accentColor }}></div>
                        <div className="w-0.5 animate-[pulse_0.8s_ease-in-out_infinite] h-2/3" style={{ backgroundColor: accentColor }}></div>
                        <div className="w-0.5 animate-[pulse_1.1s_ease-in-out_infinite] h-1/2" style={{ backgroundColor: accentColor }}></div>
                     </div>
                  ) : (
                    <span className="group-hover:hidden">{index + 1}</span>
                  )}
                  <Play 
                    size={12} 
                    className={`hidden group-hover:block ${isActive ? '' : 'text-white'}`} 
                    fill="currentColor"
                    style={{ color: isActive ? accentColor : undefined }}
                  />
                </div>

                {/* Song Info */}
                <div className="flex-1 overflow-hidden">
                  <h4 className={`text-sm font-medium truncate ${isActive ? 'text-white' : 'text-white/80 group-hover:text-white'}`}>
                    {song.name}
                  </h4>
                  <p className="text-xs text-white/40 truncate">
                    {song.artist}
                  </p>
                </div>

                {isActive && (
                   <div 
                      className="w-1.5 h-1.5 rounded-full shadow-[0_0_8px_currentColor] animate-scale-fade-in"
                      style={{ backgroundColor: accentColor, color: accentColor }}
                   ></div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div 
          ref={menuRef}
          className="fixed z-50 min-w-[160px] bg-[#1e1e2e] border border-white/10 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] py-2 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button 
            onClick={triggerLyricsImport}
            className="w-full text-left px-4 py-2.5 text-sm text-white/80 hover:bg-white/10 hover:text-white flex items-center gap-3 transition-colors"
          >
            <FileText size={16} />
            Import Lyrics
          </button>
          <div className="h-px bg-white/5 my-1"></div>
          <button 
            onClick={removeSelectedSong}
            className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 flex items-center gap-3 transition-colors"
          >
            <Trash2 size={16} />
            Remove Song
          </button>
        </div>
      )}

      {/* Hidden File Input for Lyrics */}
      <input 
        type="file" 
        ref={lyricsInputRef}
        accept=".lrc,.txt"
        className="hidden" 
        onChange={handleLyricsFileSelect}
      />
    </div>
  );
};

export default Playlist;