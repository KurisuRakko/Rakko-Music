
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Song, Playlist as PlaylistType } from '../types';
import { usePlaylists } from '../hooks/usePlaylists';
import {
  ListMusic,
  Plus,
  Trash2,
  MoreVertical,
  ArrowLeft,
  Search,
  Check,
  Disc,
  Play,
  Music2,
  ListFilter,
  Link2,
  Edit2
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
  onQueueUpdate?: (newQueue: Song[]) => void;
}

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
  onOpenMysteryCode,
  onQueueUpdate
}) => {
  // --- Hooks ---
  const {
    playlists,
    createPlaylist,
    deletePlaylist,
    renamePlaylist,
    addSongToPlaylist,
    removeSongFromPlaylist,
    toggleSongInPlaylist,
    reorderPlaylist
  } = usePlaylists();

  // --- State ---
  // Default to 'detail' (Song List).
  const [currentView, setCurrentView] = useState<'detail' | 'overview'>('detail');
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);

  // UI - Rename / Create
  const [isRenaming, setIsRenaming] = useState(false);
  const [newNameInput, setNewNameInput] = useState('');

  // UI - Search
  const [searchQuery, setSearchQuery] = useState('');

  // UI - Menus
  const [songMenuOpen, setSongMenuOpen] = useState<string | null>(null);

  // UI - Create Modal
  const [isCreating, setIsCreating] = useState(false);
  const [createNameInput, setCreateNameInput] = useState('');

  // Drag & Drop
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const songMenuRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const createInputRef = useRef<HTMLInputElement>(null);

  // --- Effects ---
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (songMenuRef.current && !songMenuRef.current.contains(e.target as Node)) {
        setSongMenuOpen(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus();
    }
  }, [isRenaming]);

  useEffect(() => {
    if (isCreating && createInputRef.current) {
      createInputRef.current.focus();
    }
  }, [isCreating]);

  // --- Logic ---
  const activePlaylist = useMemo(() =>
    playlists.find(p => p.id === activePlaylistId),
    [playlists, activePlaylistId]);

  const displayedSongs = useMemo(() => {
    let list = activePlaylistId
      ? songs.filter(s => activePlaylist?.songIds.includes(s.id))
      : songs;

    // Sort to match playlist order
    if (activePlaylistId && activePlaylist) {
      list = [...list].sort((a, b) => { // defensive copy
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

  // --- Handlers ---
  const handlePlaylistClick = (playlistId: string | null) => {
    setActivePlaylistId(playlistId);
    setCurrentView('detail');
  };

  const executeCreatePlaylist = () => {
    const name = createNameInput.trim() || 'New Playlist';
    const newPlaylist = createPlaylist(name);
    setActivePlaylistId(newPlaylist.id);
    setIsCreating(false);
    setCreateNameInput('');
  };

  const handleDragEnd = () => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      if (activePlaylistId) {
        // Reordering specific playlist
        reorderPlaylist(activePlaylistId, draggedIndex, dragOverIndex);

        // --- QUEUE SYNC ---
        // If we just reordered the playlist we are currently viewing,
        // and if this playlist is conceptually the "active context", we might want to sync.
        // However, 'activePlaylistId' is just what we are VIEWING.
        // To strictly sync, we calculate the NEW order and send it up.
        // We can't rely on 'activePlaylist' from state yet because it hasn't updated.
        // So we assume the reorder worked and construct the new list.

        // Actually, since reorderPlaylist updates internal state effectively immediately for next render,
        // we can construct the new song list manually here.
        const sourceSong = displayedSongs[draggedIndex];
        const newSongs = [...displayedSongs];
        newSongs.splice(draggedIndex, 1);
        newSongs.splice(dragOverIndex, 0, sourceSong);

        onQueueUpdate?.(newSongs);

      } else {
        // Reordering All Songs (Global)
        onReorder(draggedIndex, dragOverIndex);
      }
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // --- Renderers ---

  // 1. Overview Overlay
  const renderOverview = () => (
    <div className={`absolute inset-0 flex flex-col bg-black/60 backdrop-blur-3xl transition-all duration-500 ease-elegant z-50 ${currentView === 'overview' ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <button
          onClick={() => setCurrentView('detail')}
          className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="font-medium text-sm">Back</span>
        </button>
        <span className="font-semibold text-white">Your Playlists</span>
        <button
          onClick={() => setIsCreating(true)}
          className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors shadow-lg"
        >
          <Plus size={20} />
        </button>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">

          {/* All Songs Tile */}
          <div
            onClick={() => handlePlaylistClick(null)}
            className={`group relative flex flex-col p-4 aspect-square rounded-2xl border transition-all duration-300 ease-spring cursor-pointer ${activePlaylistId === null ? 'bg-white/10 border-white/20 shadow-lg scale-[1.02]' : 'bg-white/5 border-white/5 hover:bg-white/10 hover:scale-[1.02]'}`}
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
              onClick={() => handlePlaylistClick(playlist.id)}
              className={`group relative flex flex-col p-4 aspect-square rounded-2xl border transition-all duration-300 ease-spring cursor-pointer ${activePlaylistId === playlist.id ? 'bg-white/10 border-white/20 shadow-lg scale-[1.02]' : 'bg-white/5 border-white/5 hover:bg-white/10 hover:scale-[1.02]'}`}
            >
              <div
                className="p-3 w-fit rounded-xl mb-auto backdrop-blur-md transition-colors"
                style={{ backgroundColor: `${accentColor}20` }}
              >
                <ListMusic size={24} style={{ color: accentColor }} />
              </div>
              <div className="w-full">
                <h3 className="text-base font-bold text-white truncate w-full">{playlist.name}</h3>
                <p className="text-xs text-white/50 mt-1">{playlist.songIds.length} tracks</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Modal Overlay */}
      {isCreating && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-8 transition-opacity duration-300 ease-elegant" onClick={() => setIsCreating(false)}>
          <div className="w-full max-w-xs bg-[#1a1b26] border border-white/10 p-6 rounded-2xl shadow-2xl transform transition-all duration-300 ease-spring animate-pop-in" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4">Create Playlist</h3>
            <input
              ref={createInputRef}
              type="text"
              placeholder="Playlist Name"
              value={createNameInput}
              onChange={e => setCreateNameInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && executeCreatePlaylist()}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder:text-white/30 outline-none focus:border-white/30 mb-4"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setIsCreating(false)} className="px-4 py-2 text-xs font-semibold text-white/50 hover:text-white transition-colors">Cancel</button>
              <button onClick={executeCreatePlaylist} className="px-4 py-2 text-xs font-bold bg-white text-black rounded-lg hover:scale-105 active:scale-95 transition-all">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // 2. Song List View
  const renderSongList = () => (
    <div className={`absolute inset-0 flex flex-col transition-transform duration-300 ${currentView === 'detail' ? 'scale-100 opacity-100' : 'scale-95 opacity-50'}`}>

      {/* Search & Toolbar */}
      <div className="flex flex-col z-20 pb-2">
        <div className="flex items-center gap-3 px-4 pt-2 h-12">

          {/* Switcher */}
          <button
            onClick={() => setCurrentView('overview')}
            className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition-all border border-transparent hover:border-white/5 group"
          >
            <ListFilter size={16} className="text-white/50 group-hover:text-white transition-colors" />
            <span className="text-sm font-semibold truncate max-w-[120px]">
              {activePlaylistId ? activePlaylist?.name : 'All Songs'}
            </span>
          </button>

          {/* Search */}
          <div className="flex-1 relative group">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-white/70 transition-colors" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 hover:bg-white/10 focus:bg-white/10 border border-transparent focus:border-white/10 rounded-lg py-1.5 pl-9 pr-3 text-xs text-white placeholder:text-white/20 outline-none transition-all"
            />
          </div>

          {/* Rename / Delete Playlist Actions */}
          {activePlaylistId && (
            <div className="flex items-center gap-1">
              {!isRenaming ? (
                <button
                  onClick={() => {
                    setNewNameInput(activePlaylist?.name || '');
                    setIsRenaming(true);
                  }}
                  className="p-2 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition-colors"
                  title="Rename"
                >
                  <Edit2 size={16} />
                </button>
              ) : (
                <div className="absolute top-14 left-4 right-4 z-50 flex gap-2 bg-[#1a1b26] p-2 rounded-xl border border-white/10 shadow-xl animate-in fade-in slide-in-from-top-2">
                  <input
                    ref={renameInputRef}
                    type="text"
                    value={newNameInput}
                    onChange={e => setNewNameInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        renamePlaylist(activePlaylistId, newNameInput);
                        setIsRenaming(false);
                      }
                    }}
                    className="flex-1 bg-white/5 rounded px-3 py-1 text-sm text-white outline-none border border-white/10 focus:border-white/30"
                  />
                  <button onClick={() => {
                    renamePlaylist(activePlaylistId, newNameInput);
                    setIsRenaming(false);
                  }} className="px-3 py-1 bg-white text-black text-xs font-bold rounded hover:scale-105 transition-transform">Save</button>
                  <button onClick={() => setIsRenaming(false)} className="px-3 py-1 bg-white/10 text-white text-xs font-bold rounded hover:bg-white/20 transition-colors">Cancel</button>
                </div>
              )}

              <button
                onClick={() => {
                  if (confirm("Delete this playlist?")) {
                    deletePlaylist(activePlaylistId);
                    setActivePlaylistId(null);
                  }
                }}
                className="p-2 hover:bg-red-500/10 text-white/40 hover:text-red-400 rounded-lg transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}

          {/* Global Actions */}
          {!activePlaylistId && (
            <div className="flex items-center gap-1">
              <input type="file" ref={fileInputRef} onChange={onAddFiles} accept="audio/*" multiple className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} className="p-2 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors">
                <Plus size={18} />
              </button>
              {onOpenMysteryCode && (
                <button onClick={onOpenMysteryCode} className="p-2 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors">
                  <Link2 size={18} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Song List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-24">
        {displayedSongs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-60 px-4 text-center">
            <div className="p-4 bg-white/5 rounded-full mb-4">
              <Disc size={40} className="text-white/40" strokeWidth={1} style={{ color: searchQuery ? undefined : accentColor }} />
            </div>
            <h3 className="text-sm font-medium text-white mb-1">
              {searchQuery ? "No results found" : (activePlaylistId ? "Empty Playlist" : "No music yet")}
            </h3>
            <p className="text-[10px] text-white/40 max-w-[200px] leading-relaxed">
              {searchQuery
                ? `No songs matching "${searchQuery}"`
                : (activePlaylistId ? "Right-click songs in All Songs to add them here." : "Import tracks to get started.")}
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
          <div className="flex flex-col gap-0.5"
            onDragOver={e => e.preventDefault()} // Allow dropping in list
          >
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
                    transition-all duration-300 ease-elegant border border-transparent
                    ${isCurrent ? 'bg-white/10 border-l-2' : 'hover:bg-white/5 border-l-2 border-l-transparent'}
                    ${isDragging ? 'opacity-40' : 'opacity-100'}
                    ${isDragOver && !isDragging ? 'border-t-white/30' : ''}
                    animate-fade-in-up
                  `}
                  style={{
                    borderLeftColor: isCurrent ? accentColor : 'transparent',
                    animationDelay: `${index * 30}ms`
                  }}
                >
                  <div className="w-6 flex items-center justify-center text-xs font-mono font-medium text-white/20 group-hover:text-white/40">
                    {isCurrent && isPlaying ? (
                      <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: accentColor }}></div>
                    ) : (
                      <span className="text-[10px]">{index + 1}</span>
                    )}
                  </div>

                  <div className="relative w-10 h-10 rounded-md overflow-hidden bg-white/5 flex-shrink-0 shadow-sm group-hover:shadow-md transition-shadow">
                    {song.coverUrl ? (
                      <img src={song.coverUrl} alt={song.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Music2 size={16} className="text-white/20" /></div>
                    )}
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

                  {/* Context Menu */}
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

                    {songMenuOpen === song.id && (
                      <div className={`absolute right-0 w-48 bg-[#1a1b26] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden py-1 ${isNearBottom ? 'bottom-full mb-1' : 'top-full mt-1'}`}>
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
                                    toggleSongInPlaylist(pl.id, song.id);
                                    // No need to sync queue here as adding to another playlist doesn't affect current playback
                                    // unless we are looking at THAT playlist, but that's handled by that view updating.
                                    setSongMenuOpen(null);
                                  }}
                                  className="w-full text-left px-4 py-1.5 text-xs font-medium text-white/80 hover:bg-white/10 hover:text-white flex items-center justify-between transition-colors"
                                >
                                  <span className="truncate">{pl.name}</span>
                                  {isInside && <Check size={12} style={{ color: accentColor }} />}
                                </button>
                              )
                            })}
                            <div className="h-px bg-white/5 my-1 mx-2"></div>
                          </>
                        )}
                        {activePlaylistId ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const newPlaylist = activePlaylist!.songIds.filter(id => id !== song.id);
                              // We need to call removeSongFromPlaylist but also sync queue if active
                              removeSongFromPlaylist(activePlaylistId, song.id);

                              // Sync queue!
                              // Construct new list to pass up
                              const newSongs = displayedSongs.filter(s => s.id !== song.id);
                              onQueueUpdate?.(newSongs);

                              setSongMenuOpen(null);
                            }}
                            className="w-full text-left px-4 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition-colors"
                          >
                            <Trash2 size={12} /> Remove from Playlist
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveSong(song.id);
                              setSongMenuOpen(null);
                            }}
                            className="w-full text-left px-4 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition-colors"
                          >
                            <Trash2 size={12} /> Delete from Library
                          </button>
                        )}
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
      {renderOverview()}
    </div>
  );
};

export default Playlist;
