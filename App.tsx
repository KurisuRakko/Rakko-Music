import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Song, AudioState, AppSettings } from './types';
import { WALLPAPER_URL, DEFAULT_ACCENT_COLOR } from './constants';
import { formatTime, getFileNameWithoutExtension, extractAlbumArt } from './utils';
import Controls from './components/Controls';
import Playlist from './components/Playlist';
import Settings from './components/Settings';
import LyricsView from './components/LyricsView';
import { ListMusic, Settings as SettingsIcon, Disc, Mic2, Music2, ScanEye, Play, Pause } from 'lucide-react';

type DesktopViewMode = 'library' | 'lyrics';

const App: React.FC = () => {
  // --- State ---
  const [songs, setSongs] = useState<Song[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [currentCover, setCurrentCover] = useState<string | null>(null);
  
  const [audioState, setAudioState] = useState<AudioState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.8,
    isLooping: false,
    isShuffle: false,
  });

  const [settings, setSettings] = useState<AppSettings>({
    wallpaper: WALLPAPER_URL,
    bassBoost: false,
    accentColor: DEFAULT_ACCENT_COLOR,
  });

  // Mobile drawer state
  const [isMobileLibraryOpen, setIsMobileLibraryOpen] = useState(false);
  // Mobile Lyrics Toggle
  const [isMobileLyricsOpen, setIsMobileLyricsOpen] = useState(false);

  // Desktop View Mode
  const [desktopViewMode, setDesktopViewMode] = useState<DesktopViewMode>('library');
  
  const [showSettings, setShowSettings] = useState(false);

  // Immersive Mode State
  const [isImmersive, setIsImmersive] = useState(false);

  // --- Refs ---
  const audioRef = useRef<HTMLAudioElement>(new Audio());

  // --- Audio Event Handlers ---
  const handleTimeUpdate = () => {
    setAudioState(prev => ({ ...prev, currentTime: audioRef.current.currentTime }));
  };

  const handleLoadedMetadata = () => {
    setAudioState(prev => ({ ...prev, duration: audioRef.current.duration }));
    if (audioState.isPlaying) {
      audioRef.current.play().catch(e => console.error("Play error:", e));
    }
  };

  const playNext = useCallback(() => {
    if (songs.length === 0) return;
    
    let nextIndex;
    const currentIndex = songs.findIndex(s => s.id === currentSong?.id);

    if (audioState.isShuffle) {
      nextIndex = Math.floor(Math.random() * songs.length);
    } else {
      nextIndex = (currentIndex + 1) % songs.length;
    }

    setCurrentSong(songs[nextIndex]);
  }, [songs, currentSong, audioState.isShuffle]);

  const handleEnded = useCallback(() => {
    if (audioState.isLooping) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
    } else {
      playNext();
    }
  }, [audioState.isLooping, playNext]);

  // --- Setup Audio Listeners ---
  useEffect(() => {
    const audio = audioRef.current;
    
    // Default config
    audio.volume = audioState.volume;
    
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [handleEnded, audioState.volume]);

  // --- Song Change Effect ---
  useEffect(() => {
    if (currentSong) {
      audioRef.current.src = currentSong.url;
      audioRef.current.load();
      audioRef.current.play().then(() => {
         setAudioState(prev => ({ ...prev, isPlaying: true }));
      }).catch(err => {
         console.error("Playback failed", err);
         setAudioState(prev => ({ ...prev, isPlaying: false }));
      });

      // Extract Album Art
      extractAlbumArt(currentSong.file).then(cover => {
        setCurrentCover(cover);
      });

    } else {
      audioRef.current.pause();
      setAudioState(prev => ({ ...prev, isPlaying: false }));
      setCurrentCover(null);
    }
  }, [currentSong]);

  // --- Actions ---
  const togglePlayPause = () => {
    if (!currentSong && songs.length > 0) {
      setCurrentSong(songs[0]);
      return;
    }
    
    if (audioState.isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setAudioState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
  };

  const playPrev = () => {
    if (songs.length === 0) return;
    const currentIndex = songs.findIndex(s => s.id === currentSong?.id);
    const prevIndex = (currentIndex - 1 + songs.length) % songs.length;
    setCurrentSong(songs[prevIndex]);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    audioRef.current.currentTime = time;
    setAudioState(prev => ({ ...prev, currentTime: time }));
  };

  const handleSeekToTime = (time: number) => {
    if (audioRef.current) {
        audioRef.current.currentTime = time;
        setAudioState(prev => ({ ...prev, currentTime: time }));
        if (!audioState.isPlaying) {
            audioRef.current.play();
            setAudioState(prev => ({ ...prev, isPlaying: true }));
        }
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = Number(e.target.value);
    audioRef.current.volume = vol;
    setAudioState(prev => ({ ...prev, volume: vol }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newSongs: Song[] = Array.from(e.target.files).map((item) => {
        const file = item as File;
        return {
          id: Math.random().toString(36).substr(2, 9),
          file,
          name: getFileNameWithoutExtension(file.name),
          artist: 'Local Track',
          url: URL.createObjectURL(file)
        };
      });
      setSongs(prev => [...prev, ...newSongs]);
    }
  };

  const handleCurrentLyricsImport = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (currentSong && e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          const reader = new FileReader();
          reader.onload = (ev) => {
              const text = ev.target?.result as string;
              handleUpdateLyrics(currentSong.id, text);
          };
          reader.readAsText(file);
      }
  };

  const handleUpdateLyrics = (songId: string, lyrics: string) => {
      setSongs(prevSongs => prevSongs.map(s => {
          if (s.id === songId) {
              return { ...s, lyrics: lyrics };
          }
          return s;
      }));
      
      if (currentSong?.id === songId) {
          setCurrentSong(prev => prev ? { ...prev, lyrics: lyrics } : null);
      }
  };

  const handleRemoveSong = (songId: string) => {
      setSongs(prev => {
          const newSongs = prev.filter(s => s.id !== songId);
          if (currentSong?.id === songId) {
              if (newSongs.length > 0) {
                  const nextSong = newSongs[0]; 
                  setCurrentSong(nextSong);
              } else {
                  setCurrentSong(null);
                  setAudioState(p => ({ ...p, isPlaying: false }));
              }
          }
          return newSongs;
      });
  };

  const toggleDesktopView = (mode: DesktopViewMode) => {
      setDesktopViewMode(mode);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden flex font-sans text-white select-none bg-black">
      
      {/* === BACKGROUND LAYER === */}
      <div className="absolute inset-0 z-0 overflow-hidden">
         {/* Normal Mode Background (Blurry Album Art) */}
         <div 
           className={`absolute inset-0 bg-cover bg-center transition-all duration-1000 ease-elegant ${isImmersive ? 'opacity-0 scale-105' : 'opacity-100 scale-100'}`}
           style={{
             backgroundImage: currentCover ? `url(${currentCover})` : `url(${settings.wallpaper})`,
             filter: 'blur(30px) brightness(0.7)',
           }}
         />
         
         {/* Immersive Mode Background (Clear Wallpaper) */}
         <div 
           className={`absolute inset-0 bg-cover bg-center transition-all duration-1000 ease-elegant ${isImmersive ? 'opacity-100 scale-100 blur-none' : 'opacity-0 scale-105 blur-md'}`}
           style={{
             backgroundImage: `url(${settings.wallpaper})`,
             filter: 'brightness(0.6)', 
           }}
         />
         
         <div className="absolute inset-0 bg-black/10" />
      </div>

      {/* === MAIN LAYOUT CONTAINER === */}
      {/* 
          We use a flex layout for standard view, but when immersive is active, 
          we visually transform the components using absolute positioning or translation logic 
          handled via classes to ensure a smooth Morph.
      */}
      <div className="relative z-10 w-full h-full flex flex-col md:flex-row">
        
        {/* === LEFT PANEL: Player === */}
        <div className={`
             transition-all duration-1000 ease-elegant z-20 flex flex-col justify-center
             ${isImmersive 
                ? 'absolute bottom-12 left-12 w-[30vw] min-w-[300px] max-w-[400px] h-auto bg-black/40 backdrop-blur-2xl rounded-3xl p-6 border border-white/10 shadow-2xl items-start' 
                : 'relative flex-1 md:w-1/2 items-center p-6 md:p-12 h-full'
             }
        `}>
            {/* Logo Header (Normal Mode Only) */}
            <div className={`absolute top-0 left-0 w-full p-6 md:p-8 flex justify-between items-center z-20 transition-opacity duration-500 ${isImmersive ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
              <div className="flex items-center gap-2 text-white/90">
                  <div className={`p-2 rounded-lg bg-white/10 backdrop-blur-md`}>
                    <Music2 size={20} style={{ color: settings.accentColor }} />
                  </div>
                  <span className="font-bold tracking-wider text-sm uppercase">Rakko Player</span>
              </div>
              <div className="flex md:hidden gap-2">
                 <button onClick={() => setIsMobileLyricsOpen(!isMobileLyricsOpen)} className="p-3 bg-white/5 rounded-full backdrop-blur-md text-white/80">
                    <Mic2 size={20} style={{ color: isMobileLyricsOpen ? settings.accentColor : undefined }}/>
                 </button>
                 <button onClick={() => setIsMobileLibraryOpen(true)} className="p-3 bg-white/5 rounded-full backdrop-blur-md text-white/80">
                    <ListMusic size={20} />
                 </button>
              </div>
            </div>

            {/* Inner Content Wrapper */}
            <div className={`
                flex transition-all duration-1000 ease-elegant w-full
                ${isImmersive ? 'flex-row items-center gap-4' : 'flex-col items-center max-w-2xl mx-auto'}
            `}>
               
               {/* Album Art */}
               <div className={`
                   relative transition-all duration-1000 ease-elegant shadow-2xl
                   ${isImmersive ? 'w-16 h-16 rounded-lg mb-0 flex-shrink-0' : 'w-full max-w-md aspect-square rounded-[2.5rem] mb-12'}
               `}>
                   {/* Glow (Normal Mode Only) */}
                   <div className={`absolute inset-0 blur-[60px] rounded-full transition-all duration-1000 ${isImmersive ? 'opacity-0' : 'opacity-40'}`} style={{ backgroundColor: settings.accentColor }}></div>
                   
                   <div className={`w-full h-full overflow-hidden border border-white/10 bg-black/20 relative z-10 transition-all duration-1000 ${isImmersive ? 'rounded-lg' : 'rounded-[2rem] md:rounded-[2.5rem]'}`}>
                       {currentSong ? (
                          <div key={currentSong.id} className="w-full h-full animate-scale-fade-in">
                            {currentCover ? (
                                <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url(${currentCover})` }} />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${settings.accentColor}40, #111)` }}>
                                  <Disc size={isImmersive ? 24 : 96} className="opacity-30" />
                                </div>
                            )}
                          </div>
                       ) : (
                         <div className="w-full h-full bg-neutral-900/50 flex items-center justify-center">
                            <Disc size={isImmersive ? 24 : 64} className="opacity-20" />
                         </div>
                       )}
                   </div>
               </div>

               {/* Track Info */}
               <div className={`transition-all duration-1000 ease-elegant flex flex-col ${isImmersive ? 'text-left items-start flex-1 overflow-hidden' : 'text-center items-center w-full mb-8'}`}>
                 <h1 className={`font-bold text-white drop-shadow-lg truncate w-full transition-all duration-1000 ${isImmersive ? 'text-lg' : 'text-2xl md:text-4xl'}`}>
                   {currentSong?.name || "Ready to Play"}
                 </h1>
                 <p className={`font-medium truncate w-full transition-all duration-1000 ${isImmersive ? 'text-sm text-white/60' : 'text-lg text-white/60'}`}>
                   {currentSong?.artist || "Rakko Music"}
                 </p>
               </div>

               {/* Immersive Mini Play Button */}
               <button 
                  onClick={togglePlayPause}
                  className={`flex-shrink-0 p-3 bg-white text-black rounded-full hover:scale-105 active:scale-95 transition-all duration-500 ease-elegant ${isImmersive ? 'opacity-100 scale-100 visible' : 'opacity-0 scale-0 invisible w-0 h-0 p-0'}`}
               >
                  {audioState.isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
               </button>

            </div>

             {/* Full Controls (Normal Mode Only) */}
             <div className={`w-full transition-all duration-700 ease-elegant ${isImmersive ? 'opacity-0 pointer-events-none h-0 overflow-hidden' : 'opacity-100 h-auto'}`}>
                <Controls 
                    audioState={audioState}
                    onPlayPause={togglePlayPause}
                    onNext={playNext}
                    onPrev={playPrev}
                    onSeek={handleSeek}
                    onVolumeChange={handleVolumeChange}
                    onToggleLoop={() => setAudioState(p => ({...p, isLooping: !p.isLooping}))}
                    onToggleShuffle={() => setAudioState(p => ({...p, isShuffle: !p.isShuffle}))}
                    formatTime={formatTime}
                    accentColor={settings.accentColor}
                />
             </div>
        </div>

        {/* === RIGHT PANEL: Content (Lyrics / Library) === */}
        <div className={`
           flex flex-col relative z-10 transition-all duration-1000 ease-elegant
           ${isImmersive 
              ? 'w-full h-full fixed inset-0 pl-0 md:pl-[35%] bg-transparent' // Occupy full screen, but pad left to avoid player
              : 'md:w-1/2 bg-black/20 backdrop-blur-xl md:backdrop-blur-none border-l border-white/5'
           }
           ${!isImmersive && !isMobileLibraryOpen ? 'translate-x-full md:translate-x-0' : 'translate-x-0'}
        `}>
           {/* Right Header (Desktop Actions) */}
           <div className={`flex justify-between items-center p-6 md:p-8 min-h-[88px] relative z-50`}>
               <button onClick={() => setIsMobileLibraryOpen(false)} className={`md:hidden text-white/50 hover:text-white transition-opacity ${isImmersive ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>Close</button>

               <div className={`hidden md:flex bg-black/20 p-1 rounded-full backdrop-blur-md border border-white/5 transition-all duration-500 ${isImmersive ? 'opacity-0 -translate-y-4 pointer-events-none' : 'opacity-100 translate-y-0'}`}>
                   <button onClick={() => toggleDesktopView('library')} className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 ${desktopViewMode === 'library' ? 'bg-white/10 text-white shadow-lg scale-105' : 'text-white/40 hover:text-white/80'}`}>Library</button>
                   <button onClick={() => toggleDesktopView('lyrics')} className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 ${desktopViewMode === 'lyrics' ? 'bg-white/10 text-white shadow-lg scale-105' : 'text-white/40 hover:text-white/80'}`}>Lyrics</button>
               </div>

               <div className="flex gap-4 items-center">
                   {/* Settings */}
                   <button onClick={() => setShowSettings(true)} className="p-3 hover:bg-white/10 rounded-full transition-colors text-white/40 hover:text-white" title="Settings">
                      <SettingsIcon size={20} />
                   </button>
                   
                   {/* Immersive Toggle */}
                   <button 
                      onClick={() => setIsImmersive(!isImmersive)}
                      className={`p-3 rounded-full transition-all duration-300 backdrop-blur-md shadow-lg group ${isImmersive ? 'bg-white text-black hover:scale-110' : 'bg-white/10 text-white hover:bg-white hover:text-black'}`}
                      title={isImmersive ? "Exit Immersive Mode" : "Enter Immersive Mode"}
                   >
                      <ScanEye size={20} />
                   </button>
               </div>
           </div>

           {/* Content Area */}
           <div className="flex-1 overflow-hidden relative">
              {/* Library View */}
              <div className={`absolute inset-0 transition-all duration-500 ease-elegant transform ${desktopViewMode === 'library' && !isImmersive ? 'opacity-100 translate-y-0 z-10' : 'opacity-0 translate-y-8 z-0 pointer-events-none'}`}>
                  <Playlist 
                      songs={songs}
                      currentSong={currentSong}
                      isPlaying={audioState.isPlaying}
                      onSelect={(song) => {
                        setCurrentSong(song);
                        setAudioState(p => ({ ...p, isPlaying: true }));
                        if (window.innerWidth < 768) setIsMobileLibraryOpen(false);
                      }}
                      onAddFiles={handleFileSelect}
                      onRemoveSong={handleRemoveSong}
                      onUpdateLyrics={handleUpdateLyrics}
                      accentColor={settings.accentColor}
                  />
              </div>

              {/* Lyrics View */}
              <div className={`absolute inset-0 transition-all duration-1000 ease-elegant transform ${desktopViewMode === 'lyrics' || isImmersive ? 'opacity-100 translate-y-0 z-10' : 'opacity-0 translate-y-8 z-0 pointer-events-none'}`}>
                 <div className={`h-full w-full transition-all duration-1000 ${isImmersive ? 'px-8 md:px-20' : 'px-8 pb-8'}`}>
                    <LyricsView 
                        lyrics={currentSong?.lyrics}
                        currentTime={audioState.currentTime}
                        onImportLyrics={handleCurrentLyricsImport}
                        accentColor={settings.accentColor}
                        onSeek={handleSeekToTime}
                        variant={isImmersive ? 'immersive' : 'default'}
                    />
                 </div>
              </div>
           </div>
        </div>

        {/* Settings Modal */}
        <Settings 
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          settings={settings}
          onUpdateSettings={setSettings}
        />

      </div>
    </div>
  );
};

export default App;