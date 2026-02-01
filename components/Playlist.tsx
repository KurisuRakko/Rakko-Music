import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Song, Playlist as PlaylistType } from '../types';
import {
  ListMusic,
  Plus,
  Trash2,
  MoreVertical,
  X,
  FileMusic,
  FolderOpen,
  Link2,
  ArrowLeft,
  Search,
  Check,
  Disc,
  GripVertical,
  Play,
  Music2,
  ListFilter
} from 'lucide-react';

interface PlaylistProps {
  songs: Song[];
  currentSong: Song | null;
  isPlaying: boolean;
  onSelect: (song: Song, contextSongs?: Song[]) => void;
  onAddFiles: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAddFolderAPI: () => void;
  onRemoveSong: (songId: string) => void;
  onUpdateLyrics: (songId: string, lyrics: string) => void;
  onReorder: (sourceIndex: number, destinationIndex: number) => void;
  accentColor: string;
  onOpenMysteryCode?: () => void;
}

const PLAYLISTS_STORAGE_KEY = 'rakko_playlists';

const Playlist: React.FC<PlaylistProps> = ({
  songs,
  currentSong,
  isPlaying,
  onSelect,
  onAddFiles,
  onAddFolderAPI,
  onRemoveSong,
  onReorder,
  accentColor,
  onOpenMysteryCode
}) => {
  // --- State ---
  const [playlists, setPlaylists] = useState<PlaylistType[]>([]);
  // Default to 'detail' (Song List).
  const [currentView, setCurrentView] = useState<'detail' | 'overview'>('detail');
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingName, setEditingName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [songMenuOpen, setSongMenuOpen] = useState<string | null>(null);

  // Drag & Drop
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const songMenuRef = useRef<HTMLDivElement>(null);

  // --- Effects ---
  useEffect(() => {
    try {
      const saved = localStorage.getItem(PLAYLISTS_STORAGE_KEY);
      if (saved) setPlaylists(JSON.parse(saved));
    } catch (e) {
      console.error('[Playlist] Failed to load playlists:', e);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(PLAYLISTS_STORAGE_KEY, JSON.stringify(playlists));
  }, [playlists]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (songMenuRef.current && !songMenuRef.current.contains(e.target as Node)) {
        setSongMenuOpen(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- Logic ---
  const activePlaylist = useMemo(() =>
    playlists.find(p => p.id === activePlaylistId),
    [playlists, activePlaylistId]);

  const displayedSongs = useMemo(() => {
    let list = activePlaylistId
      ? songs.filter(s => activePlaylist?.songIds.includes(s.id))
      : songs;

    if (activePlaylistId && activePlaylist) {
      list = list.sort((a, b) => {
        return activePlaylist.songIds.indexOf(a.id) - activePlaylist.songIds.indexOf(b.id);
      });
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.artist.toLowerCase().includes(q) ||
        (s.metadata?.title || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [songs, activePlaylistId, activePlaylist, searchQuery]);

  const handleCreatePlaylist = () => {
    const newPlaylist: PlaylistType = {
      id: Math.random().toString(36).substr(2, 9),
      name: `New Playlist`,
      songIds: [],
      createdAt: Date.now(),
    };
    setPlaylists([...playlists, newPlaylist]);
    setActivePlaylistId(newPlaylist.id);
    setCurrentView('detail'); // Go to the new playlist directly
    setIsEditingTitle(true);
    setEditingName(newPlaylist.name);
  };

  const handleDeletePlaylist = () => {
    if (confirm(`Are you sure you want to delete "${activePlaylist?.name}"?`)) {
      setPlaylists(prev => prev.filter(p => p.id !== activePlaylistId));
      setActivePlaylistId(null); // Back to All Songs
      // Stay in detail view
    }
  };

  const handleRenamePlaylist = () => {
    if (activePlaylistId && editingName.trim()) {
      setPlaylists(prev => prev.map(p =>
        p.id === activePlaylistId ? { ...p, name: editingName.trim() } : p
      ));
    }
    setIsEditingTitle(false);
  };

  const handleToggleSongInPlaylist = (songId: string, playlistId: string) => {
    setPlaylists(prev => prev.map(p => {
      if (p.id === playlistId) {
        if (p.songIds.includes(songId)) {
          return { ...p, songIds: p.songIds.filter(id => id !== songId) };
        } else {
          return { ...p, songIds: [...p.songIds, songId] };
        }
      }
      return p;
    }));
  };

  const handleDragEnd = () => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      if (activePlaylistId) {
        setPlaylists(prev => prev.map(p => {
          if (p.id === activePlaylistId) {
            const newIds = [...p.songIds];
            const sourceId = displayedSongs[draggedIndex].id;
            const targetId = displayedSongs[dragOverIndex].id;
            const realSourceIdx = newIds.indexOf(sourceId);
            const realTargetIdx = newIds.indexOf(targetId);
            if (realSourceIdx !== -1 && realTargetIdx !== -1) {
              newIds.splice(realSourceIdx, 1);
              newIds.splice(realTargetIdx, 0, sourceId);
            }
            return { ...p, songIds: newIds };
          }
          return p;
        }));
      } else {
        onReorder(draggedIndex, dragOverIndex);
      }
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // --- Components ---

  // 1. Overview Overlay (Playlist Selector)
  const renderPlaylists = () => (
    <div className={`absolute inset-0 flex flex-col bg-black/60 backdrop-blur-3xl transition-all duration-300 z-50 ${currentView === 'overview' ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
      }`}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <button
          onClick={() => setCurrentView('detail')}
          className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="font-medium text-sm">Back</span>
        </button>
        <span className="font-semibold text-white">Playlists</span>
        <button
          onClick={handleCreatePlaylist}
          className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
        >
          <Plus size={20} />
        </button>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">

          {/* All Songs Tile */}
          <div
            onClick={() => {
              setActivePlaylistId(null);
              setCurrentView('detail');
            }}
            className={`group relative flex flex-col p-4 aspect-square rounded-2xl border transition-all cursor-pointer ${activePlaylistId === null ? 'bg-white/10 border-white/20 shadow-lg' : 'bg-white/5 border-white/5 hover:bg-white/10'
              }`}
          >
            <div className="p-3 bg-white/5 w-fit rounded-xl mb-auto backdrop-blur-md">
              <Music2 size={24} className="text-white/80" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">All Songs</h3>
              <p className="text-xs text-white/50 mt-1">{songs.length} tracks</p>
            </div>
          </div>

          {/* User Playlists */}
          {playlists.map((playlist) => (
            <div
              key={playlist.id}
              onClick={() => {
                setActivePlaylistId(playlist.id);
                setCurrentView('detail');
              }}
              className={`group relative flex flex-col p-4 aspect-square rounded-2xl border transition-all cursor-pointer ${activePlaylistId === playlist.id ? 'bg-white/10 border-white/20 shadow-lg' : 'bg-white/5 border-white/5 hover:bg-white/10'
                }`}
            >
              <div
                className="p-3 w-fit rounded-xl mb-auto backdrop-blur-md"
                style={{ backgroundColor: `${accentColor}20` }}
              >
                <ListMusic size={24} style={{ color: accentColor }} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white truncate">{playlist.name}</h3>
                <p className="text-xs text-white/50 mt-1">{playlist.songIds.length} tracks</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // 2. Song List (Main View)
  const renderSongList = () => (
    <div className={`absolute inset-0 flex flex-col transition-transform duration-300 ${currentView === 'detail' ? 'scale-100 opacity-100' : 'scale-95 opacity-50'
      }`}>
      {/* Header Toolbar */}
      <div className="flex flex-col z-20 pb-2">
        <div className="flex items-center gap-3 px-4 pt-2 h-12">

          {/* Playlist Switcher (Left) */}
          <button
            onClick={() => setCurrentView('overview')}
            className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition-all border border-transparent hover:border-white/5"
          >
            <ListFilter size={16} />
            <span className="text-sm font-semibold truncate max-w-[120px]">
              {activePlaylistId ? activePlaylist?.name : 'Playlists'}
            </span>
          </button>

          {/* Search Bar (Center) */}
          <div className="flex-1 relative group">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-white/70 transition-colors" />
            <input
              type="text"
              placeholder={activePlaylistId ? `Search ${activePlaylist?.name}...` : "Search songs..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 hover:bg-white/10 focus:bg-white/10 border border-transparent focus:border-white/10 rounded-lg py-1.5 pl-9 pr-3 text-xs text-white placeholder:text-white/20 outline-none transition-all"
            />
          </div>

          {/* Title Editing (Only when custom playlist is active) */}
          {activePlaylistId && (
            isEditingTitle ? (
              <input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={handleRenamePlaylist}
                onKeyDown={(e) => e.key === 'Enter' && handleRenamePlaylist()}
                autoFocus
                className="w-32 bg-white/10 text-sm px-2 py-1 rounded border border-white/20 text-white outline-none"
              />
            ) : (
              <button
                onClick={() => {
                  setEditingName(activePlaylist?.name || '');
                  setIsEditingTitle(true);
                }}
                className="p-2 hover:bg-white/5 rounded-lg text-white/40 hover:text-white transition-colors"
                title="Rename Playlist"
              >
                <span className="text-[10px] font-bold px-1 tracking-wider">RENAME</span>
              </button>
            )
          )}

          {/* Action Tools (Right) */}
          <div className="flex items-center gap-1">
            {!activePlaylistId && (
              <>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={onAddFiles}
                  accept="audio/*"
                  multiple
                  className="hidden"
                />
                <button onClick={() => fileInputRef.current?.click()} className="p-2 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors" title="Add Files">
                  <Plus size={18} />
                </button>
                {onOpenMysteryCode && (
                  <button onClick={onOpenMysteryCode} className="p-2 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors">
                    <Link2 size={18} />
                  </button>
                )}
              </>
            )}
            {activePlaylistId && (
              <button onClick={handleDeletePlaylist} className="p-2 hover:bg-red-500/10 text-white/40 hover:text-red-400 rounded-lg transition-colors">
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-24">
        {displayedSongs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-60 select-none text-center px-4">
            {/* Icon */}
            <div className="p-4 bg-white/5 rounded-full mb-4">
              <Disc size={40} className="text-white/40" strokeWidth={1} style={{ color: searchQuery ? undefined : accentColor }} />
            </div>

            <h3 className="text-sm font-medium text-white mb-1">
              {searchQuery ? "No results found" : (activePlaylistId ? "Empty Playlist" : "No music yet")}
            </h3>

            <p className="text-[10px] text-white/40 max-w-[200px] leading-relaxed">
              {searchQuery
                ? `We couldn't find any songs matching "${searchQuery}"`
                : (activePlaylistId
                  ? "Add songs from your library by right-clicking them."
                  : "Import your favorite tracks to get started.")}
            </p>

            {/* Action Button */}
            {activePlaylistId && !searchQuery && (
              <button
                onClick={() => setActivePlaylistId(null)}
                className="mt-6 px-5 py-2 bg-white/10 hover:bg-white/20 text-white text-xs rounded-full transition-colors font-medium border border-white/5"
              >
                Browse Library
              </button>
            )}

            {!activePlaylistId && !searchQuery && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-6 px-6 py-2 bg-white text-black text-xs rounded-full transition-transform hover:scale-105 active:scale-95 font-bold shadow-lg shadow-white/10"
              >
                Import Files
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {displayedSongs.map((song, index) => {
              const isCurrent = currentSong?.id === song.id;
              const isDragging = draggedIndex === index;
              const isDragOver = dragOverIndex === index;
              const isNearBottom = index > displayedSongs.length - 4 && displayedSongs.length > 4;

              return (
                <div
                  key={song.id}
                  draggable
                  onDragStart={(e) => {
                    setDraggedIndex(index);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverIndex(index);
                  }}
                  onDragEnd={handleDragEnd}
                  onClick={() => onSelect(song, displayedSongs)}
                  className={`
                      group relative flex items-center gap-3 px-3 py-2 rounded-lg cursor-default
                      transition-all duration-200 border border-transparent
                      ${isCurrent
                      ? 'bg-gradient-to-r from-white/10 to-transparent border-l-2'
                      : 'hover:bg-white/5 border-l-2 border-l-transparent'
                    }
                      ${isDragging ? 'opacity-40' : 'opacity-100'}
                      ${isDragOver && !isDragging ? 'border-t-white/30' : ''}
                    `}
                  style={{
                    borderLeftColor: isCurrent ? accentColor : 'transparent'
                  }}
                >
                  <div className="w-6 flex items-center justify-center text-xs font-mono font-medium text-white/20 group-hover:text-white/40">
                    {isCurrent && isPlaying ? (
                      <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: accentColor }}></div>
                    ) : (
                      <span className="text-[10px]">{index + 1}</span>
                    )}
                  </div>

                  {/* Cover Art Thumbnail */}
                  <div className="relative w-10 h-10 rounded-md overflow-hidden bg-white/5 flex-shrink-0 shadow-sm group-hover:shadow-md transition-shadow">
                    {song.coverUrl ? (
                      <img src={song.coverUrl} alt={song.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music2 size={16} className="text-white/20" />
                      </div>
                    )}
                    {/* Play Overlay on Hover */}
                    <div className={`absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ${isCurrent && isPlaying ? 'opacity-0' : ''}`}>
                      <Play size={16} className="text-white fill-white" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
                    <span className={`text-sm truncate ${isCurrent ? 'text-white font-bold' : 'text-white/90 font-medium'}`}>
                      {song.metadata?.title || song.name}
                    </span>
                    <span className={`text-[10px] truncate ${isCurrent ? 'text-white/60' : 'text-white/40'}`}>
                      {song.metadata?.artists.join(', ') || song.artist}
                    </span>
                  </div>

                  {/* Indicators */}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {song.lyrics && <span className="text-[9px] px-1 bg-white/10 rounded text-white/50">LRC</span>}
                    {song.videoUrl && <span className="text-[9px] px-1 bg-white/10 rounded text-white/50">MV</span>}
                  </div>

                  {/* Context Menu Button */}
                  <div className="relative" ref={songMenuOpen === song.id ? songMenuRef : undefined}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSongMenuOpen(songMenuOpen === song.id ? null : song.id);
                      }}
                      className={`p-1.5 rounded hover:bg-white/20 text-white/30 hover:text-white transition-opacity ${songMenuOpen === song.id ? 'opacity-100 bg-white/20' : 'opacity-0 group-hover:opacity-100'}`}
                    >
                      <MoreVertical size={14} />
                    </button>

                    {/* Acrylic Context Menu */}
                    {songMenuOpen === song.id && (
                      <div className={`
                          absolute right-0 w-48 bg-[#1a1b26]/90 backdrop-blur-3xl border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden py-1
                          ${isNearBottom ? 'bottom-full mb-1' : 'top-full mt-1'}
                        `}>
                        {playlists.length > 0 && (
                          <>
                            <div className="px-3 py-1.5 text-[9px] uppercase font-bold text-white/30 tracking-widest pl-4">Add to...</div>
                            {playlists.map(pl => {
                              const isInside = pl.songIds.includes(song.id);
                              return (
                                <button
                                  key={pl.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleSongInPlaylist(song.id, pl.id);
                                  }}
                                  className="w-full text-left px-4 py-1.5 text-xs font-medium text-white/80 hover:bg-white/10 hover:text-white flex items-center justify-between group/item transition-colors"
                                >
                                  <span className="truncate">{pl.name}</span>
                                  {isInside && <Check size={12} style={{ color: accentColor }} />}
                                </button>
                              )
                            })}
                            <div className="h-px bg-white/5 my-1 mx-2"></div>
                          </>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveSong(song.id);
                            setSongMenuOpen(null);
                          }}
                          className="w-full text-left px-4 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition-colors"
                        >
                          <Trash2 size={12} />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="relative w-full h-full overflow-hidden font-sans select-none">
      {renderSongList()}
      {renderPlaylists()}
    </div>
  );
};

export default Playlist;
