
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Song, AudioState, AppSettings, AppMode } from './types';
import { WALLPAPER_URL, DEFAULT_ACCENT_COLOR, DEFAULT_SETTINGS } from './constants';
import { formatTime, getFileNameWithoutExtension, extractAlbumArt, parseMusicInfo, readFileAsText, matchLyrics, matchVideos, VideoFile } from './utils';
import Controls from './components/Controls';
import Playlist from './components/Playlist';
import Settings from './components/Settings';
import LyricsView from './components/LyricsView';
import CoverFlow from './components/CoverFlow';
import ShelfView from './components/ShelfView';
import ModeControls from './components/ModeControls';
import { ListMusic, Settings as SettingsIcon, Disc, Mic2, Music2, Pause, Play, Upload, FileMusic, Video, X } from 'lucide-react';
import { usePresentationSync } from './hooks/usePresentationSync';
import ControllerView from './components/ControllerView';
import AppBackground from './components/AppBackground';
import MysteryCodeModal from './components/MysteryCodeModal';

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

  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('rakko_settings');
    if (saved) {
      try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      } catch (e) {
        console.error("Failed to parse settings", e);
      }
    }
    return {
      wallpaper: WALLPAPER_URL,
      bassBoost: false,
      accentColor: DEFAULT_ACCENT_COLOR,
      performanceMode: DEFAULT_SETTINGS.performanceMode,
      idleMode: DEFAULT_SETTINGS.idleMode
    };
  });

  // Persist settings
  useEffect(() => {
    localStorage.setItem('rakko_settings', JSON.stringify(settings));
  }, [settings]);

  // Loading State
  const [isLoading, setIsLoading] = useState(true);

  // Mobile drawer state
  const [isMobileLibraryOpen, setIsMobileLibraryOpen] = useState(false);
  // Mobile Lyrics Toggle
  const [isMobileLyricsOpen, setIsMobileLyricsOpen] = useState(false);

  // Desktop View Mode (Right Panel)
  const [desktopViewMode, setDesktopViewMode] = useState<DesktopViewMode>('library');

  const [showSettings, setShowSettings] = useState(false);

  // Global App Mode
  const [appMode, setAppMode] = useState<AppMode>('standard');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Navigation History for "From where, back to where" logic
  const [shelfOrigin, setShelfOrigin] = useState<'standard' | 'coverflow' | 'immersive'>('standard');

  // Prism View Background Toggle
  const [showPrismBg, setShowPrismBg] = useState(true);

  // Drag and Drop State
  const [isDragging, setIsDragging] = useState(false);

  // Mystery Code Modal
  const [isMysteryCodeOpen, setIsMysteryCodeOpen] = useState(false);

  // --- Refs ---
  const audioRef = useRef<HTMLAudioElement>(new Audio());
  const videoRef = useRef<HTMLVideoElement>(null);
  const isRecoveringFromBackground = useRef(false);

  // --- Effects ---

  // Simulate App Loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Listen for Fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // --- Audio Event Handlers ---
  const handleTimeUpdate = () => {
    const currentTime = audioRef.current.currentTime;
    setAudioState(prev => ({ ...prev, currentTime }));

    // Sync Video if it exists
    if (videoRef.current && currentSong?.videoUrl && !isRecoveringFromBackground.current) {
      const videoTime = videoRef.current.currentTime;
      const diff = videoTime - currentTime; // Positive: Video is ahead, Negative: Video is behind

      // Sync Logic:
      // 1. If drift is small (< 0.15s), do nothing (seamless).
      // 2. If drift is moderate (0.15s - 1.0s), adjust playback rate to catch up or slow down.
      // 3. If drift is large (> 1.0s), hard seek.

      if (Math.abs(diff) < 0.15) {
        // In Sync
        if (videoRef.current.playbackRate !== 1) videoRef.current.playbackRate = 1;

      } else if (Math.abs(diff) > 1.0) {
        // Major Drift -> Hard Seek
        console.warn(`[Sync] Major drift detected (${diff.toFixed(2)}s). Hard seeking.`);
        videoRef.current.currentTime = currentTime;
        videoRef.current.playbackRate = 1;

      } else {
        // Moderate Drift -> Adjust Speed
        // If video is ahead (diff > 0), slow down (0.95x).
        // If video is behind (diff < 0), speed up (1.05x).
        const targetRate = diff > 0 ? 0.95 : 1.05;
        if (videoRef.current.playbackRate !== targetRate) {
          videoRef.current.playbackRate = targetRate;
        }
      }
    }
  };

  const handleLoadedMetadata = () => {
    setAudioState(prev => ({ ...prev, duration: audioRef.current.duration }));
    if (audioState.isPlaying) {
      audioRef.current.play().catch(e => console.error("Play error:", e));
      // Video play handled in play/pause effect
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
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play();
      }
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
      // Ensure we stop playing if component unmounts
      // audio.pause(); // Fix: Do not pause on cleanup of this effect, only on unmount of App (which is fine to leave as is or remove)
      // Actually, removing the pause entirely is safer for stability during hot-reloads and prop updates.
      // audio.pause();
    };
  }, [handleEnded, audioState.volume, currentSong /* Re-bind if song changes to ensure closures are fresh if needed, though handlers use refs/state setters mostly */]);

  // --- Video Sync Effect ---
  useEffect(() => {
    if (videoRef.current) {
      if (audioState.isPlaying) {
        if (videoRef.current.paused) videoRef.current.play().catch(e => console.error("Video play error", e));
      } else {
        if (!videoRef.current.paused) videoRef.current.pause();
      }
    }
  }, [audioState.isPlaying]);

  // --- Visibility Change Handler to fix tab-switch stutter ---
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab hidden: Pause video to prevent decoding lag
        if (videoRef.current && !videoRef.current.paused) {
          videoRef.current.pause();
        }
      } else {
        // Tab visible: Hard sync and resume
        if (videoRef.current && currentSong?.videoUrl && audioState.isPlaying) {
          console.log("[App] Tab visible - Resyncing video");

          // Set recovery flag to prevent smart-sync from interfering for 1s
          isRecoveringFromBackground.current = true;

          videoRef.current.currentTime = audioRef.current.currentTime;
          videoRef.current.play().catch(console.error);

          setTimeout(() => {
            isRecoveringFromBackground.current = false;
          }, 1000);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [audioState.isPlaying, currentSong]);


  // --- Song Change Effect ---
  useEffect(() => {
    console.log("[App] currentSong effect triggered. Song:", currentSong?.name, "ID:", currentSong?.id);
    if (currentSong) {
      console.log("[App] Song Changed:", currentSong.name);
      audioRef.current.src = currentSong.url;
      audioRef.current.load();
      audioRef.current.play().then(() => {
        console.log("[App] Playback started successfully");
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
      console.log("[App] currentSong is null, pausing");
      audioRef.current.pause();
      setAudioState(prev => ({ ...prev, isPlaying: false }));
      setCurrentCover(null);
    }
  }, [currentSong]);

  // --- Actions ---
  const togglePlayPause = useCallback(() => {
    console.log("[App] togglePlayPause called. Current State:", audioState.isPlaying, "Audio Paused:", audioRef.current.paused);
    if (!currentSong && songs.length > 0) {
      setCurrentSong(songs[0]);
      return;
    }

    if (audioState.isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(e => console.error("Play error in toggle:", e));
    }
    setAudioState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
  }, [currentSong, songs, audioState.isPlaying]);

  const playPrev = useCallback(() => {
    console.log("[App] playPrev called");
    if (songs.length === 0) return;
    const currentIndex = songs.findIndex(s => s.id === currentSong?.id);
    const prevIndex = (currentIndex - 1 + songs.length) % songs.length;
    setCurrentSong(songs[prevIndex]);
  }, [songs, currentSong]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    audioRef.current.currentTime = time;
    if (videoRef.current) videoRef.current.currentTime = time;
    setAudioState(prev => ({ ...prev, currentTime: time }));
  };

  const handleSeekToTime = (time: number) => {
    console.log("[App] Seek to:", time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      if (videoRef.current) videoRef.current.currentTime = time;
      setAudioState(prev => ({ ...prev, currentTime: time }));
      if (!audioState.isPlaying) {
        audioRef.current.play().catch(console.error);
        setAudioState(prev => ({ ...prev, isPlaying: true }));
      }
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = Number(e.target.value);
    audioRef.current.volume = vol;
    setAudioState(prev => ({ ...prev, volume: vol }));
  };

  // Wrapped in useCallback to preserve reference for ModeControls memoization
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error enabling fullscreen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  }, []);

  const processFiles = async (files: File[]) => {
    if (files.length === 0) return;

    // 1. Separate Audio, Lyrics, and Video files
    const audioFiles = files.filter(f => f.type.startsWith('audio/') || /\.(mp3|wav|ogg|flac|m4a|weba)$/i.test(f.name));
    const lrcFiles = files.filter(f => /\.(lrc|txt)$/i.test(f.name));
    const videoFiles = files.filter(f => f.type.startsWith('video/') || /\.(mp4|webm|mkv|mov)$/i.test(f.name)).map(f => ({ name: f.name, file: f }));

    // 2. Process New Songs
    const newSongs: Song[] = audioFiles.map((file) => {
      const rawName = getFileNameWithoutExtension(file.name);
      const info = parseMusicInfo(rawName);
      const artistDisplay = info.artists.length > 0 ? info.artists.join(', ') : 'Unknown Artist';

      return {
        id: Math.random().toString(36).substr(2, 9),
        file,
        name: info.title,
        artist: artistDisplay,
        metadata: info,
        url: URL.createObjectURL(file)
      };
    });

    // 3. Read Lyrics Content
    const lrcContents: { name: string, content: string }[] = [];
    await Promise.all(lrcFiles.map(async (f) => {
      try {
        const text = await readFileAsText(f);
        lrcContents.push({ name: f.name, content: text });
      } catch (err) {
        console.error("Failed to read lyric file:", f.name, err);
      }
    }));

    // 4. Match Lyrics and Videos
    const matches = matchLyrics(newSongs, lrcContents);
    const videoMatches = matchVideos(newSongs, videoFiles); // Check previously loaded videos? No, checking current batch.

    newSongs.forEach(song => {
      if (matches[song.id]) {
        song.lyrics = matches[song.id];
      }
      if (videoMatches[song.id]) {
        song.videoUrl = videoMatches[song.id];
      }
    });

    // 5. Update State
    setSongs(prevSongs => {
      // Also checking existing songs against new matches?
      // For now, let's keep it simple and only match within the batch + what's already there if we wanted to support "add lrc later".
      // But matching video to existing songs is also good.
      const songsWithoutLyrics = prevSongs.filter(s => !s.lyrics);
      const songsWithoutVideo = prevSongs.filter(s => !s.videoUrl);

      const songsWithLyrics = prevSongs.filter(s => !!s.lyrics);

      // Try to match existing songs with new resources
      if (songsWithoutLyrics.length > 0 && lrcContents.length > 0) {
        const existingMatches = matchLyrics(songsWithoutLyrics, lrcContents);
        songsWithoutLyrics.forEach(s => {
          if (existingMatches[s.id]) s.lyrics = existingMatches[s.id];
        });
      }

      if (songsWithoutVideo.length > 0 && videoFiles.length > 0) {
        const existingVideoMatches = matchVideos(songsWithoutVideo, videoFiles);
        songsWithoutVideo.forEach(s => {
          if (existingVideoMatches[s.id]) s.videoUrl = existingVideoMatches[s.id];
        });
      }

      // Re-merge
      // Note: prevSongs might be mutated above (forEach), so constructing new array is important
      // But we mutated objects inside array, so they update in place if we reuse references.
      // Filter returns new array but references same objects.

      return [...prevSongs, ...newSongs];
    });

    if (currentSong) {
      const currentSongMatch = matchLyrics([currentSong], lrcContents);
      if (currentSongMatch[currentSong.id]) {
        setCurrentSong(prev => prev ? { ...prev, lyrics: currentSongMatch[currentSong.id] } : null);
      }

      const currentSongVideoMatch = matchVideos([currentSong], videoFiles);
      if (currentSongVideoMatch[currentSong.id]) {
        setCurrentSong(prev => prev ? { ...prev, videoUrl: currentSongVideoMatch[currentSong.id] } : null);
      }
    }
  };





  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(Array.from(e.target.files));
    }
  };

  const handleFolderSelectAPI = async () => {
    try {
      const { openDirectoryAndGetFiles } = await import('./utils/fileSystem');
      const files = await openDirectoryAndGetFiles();
      if (files.length > 0) {
        processFiles(files);
      }
    } catch (err) {
      console.error("Failed to open directory:", err);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types && Array.from(e.dataTransfer.types).includes("Files")) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
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

  const handleReorder = (sourceIndex: number, destinationIndex: number) => {
    setSongs(prev => {
      const newSongs = [...prev];
      const [movedSong] = newSongs.splice(sourceIndex, 1);
      newSongs.splice(destinationIndex, 0, movedSong);
      return newSongs;
    });
  };

  const toggleDesktopView = (mode: DesktopViewMode) => {
    setDesktopViewMode(mode);
  };

  // Wrapped in useCallback to preserve reference for ModeControls memoization
  const handleEnterShelfView = useCallback(() => {
    if (appMode !== 'shelf') {
      setShelfOrigin(appMode as 'standard' | 'coverflow' | 'immersive');
      setAppMode('shelf');
    }
  }, [appMode]);

  // Wrapped in useCallback to preserve reference for ModeControls memoization
  const exitShelfMode = useCallback(() => {
    if (shelfOrigin === 'standard') {
      setAppMode('standard');
    } else if (shelfOrigin === 'immersive') {
      setAppMode('immersive');
    } else {
      setAppMode('coverflow');
    }
  }, [shelfOrigin]);

  const isImmersive = appMode === 'immersive';
  const isCoverFlow = appMode === 'coverflow';
  const isShelf = appMode === 'shelf';
  const isStandard = appMode === 'standard';

  // --- Idle Mode Logic ---
  const [isIdle, setIsIdle] = useState(false);
  const idleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset idle mode when entering immersive/coverflow/shelf mode, or if not playing
  useEffect(() => {
    if (isCoverFlow || isShelf || !audioState.isPlaying) {
      setIsIdle(false);
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
        idleTimeoutRef.current = null;
      }
    }
  }, [isImmersive, isCoverFlow, isShelf, audioState.isPlaying]);


  useEffect(() => {
    const startTimer = () => {
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
      if (settings.idleMode && audioState.isPlaying) {
        idleTimeoutRef.current = setTimeout(() => {
          setIsIdle(true);
        }, 5000);
      }
    };

    const onActivity = () => {
      setIsIdle(false);
      startTimer();
    };

    window.addEventListener('mousemove', onActivity);
    window.addEventListener('keydown', onActivity);
    window.addEventListener('touchstart', onActivity);
    window.addEventListener('click', onActivity);
    window.addEventListener('scroll', onActivity);

    // Initial start
    startTimer();

    return () => {
      window.removeEventListener('mousemove', onActivity);
      window.removeEventListener('keydown', onActivity);
      window.removeEventListener('touchstart', onActivity);
      window.removeEventListener('click', onActivity);
      window.removeEventListener('scroll', onActivity);
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
    };
  }, [settings.idleMode, audioState.isPlaying]);

  // --- Presentation Sync Hook ---
  // Determine Role based on URL
  const isController = new URLSearchParams(window.location.search).get('mode') === 'controller';

  const { syncedSong, syncedCover, syncedAudioState, syncedSongs, syncedSettings, sendCommand, lastSyncTime, sendPing, lastPongTime } = usePresentationSync({
    role: isController ? 'controller' : 'player',
    currentSong: isController ? undefined : currentSong,
    currentCover: isController ? undefined : currentCover,
    audioState: isController ? undefined : audioState,
    songs: isController ? undefined : songs,
    // Player Handlers
    onPlay: () => {
      if (!audioState.isPlaying) togglePlayPause();
    },
    onPause: () => {
      if (audioState.isPlaying) togglePlayPause();
    },
    onTogglePlay: togglePlayPause,
    onNext: playNext,
    onPrev: playPrev,
    onSeek: handleSeekToTime,
    onSetVolume: (vol) => {
      audioRef.current.volume = vol;
      setAudioState(p => ({ ...p, volume: vol }));
    },
    onSetLoop: (loop) => setAudioState(p => ({ ...p, isLooping: loop })),
    onSetShuffle: (shuffle) => setAudioState(p => ({ ...p, isShuffle: shuffle })),
    onReorder: handleReorder,
    settings: settings, // Sync settings (including accentColor and controllerIdleMode)
    onPlaySong: (song) => {
      // Important: We receive a Song object from remote, but it might not match reference.
      // Or it might be a partial object if we stripped data. 
      // For now, let's find by ID.
      const found = songs.find(s => s.id === song.id);
      if (found) {
        setCurrentSong(found);
        setAudioState(p => ({ ...p, isPlaying: true }));
      }
    }
  });

  if (isController) {
    return (
      <ControllerView
        currentSong={syncedSong}
        currentCover={syncedCover}
        audioState={syncedAudioState}
        songs={syncedSongs}
        sendCommand={sendCommand}
        accentColor={settings.accentColor} // Note: Settings not synced yet, using default/local. Can sync later.
        lastSyncTime={lastSyncTime}
        settings={syncedSettings || settings} // Use synced settings if available, else local
        sendPing={sendPing}
        lastPongTime={lastPongTime}
      />
    );
  }

  return (
    <div
      className="relative w-screen h-screen overflow-hidden flex font-sans text-white select-none bg-black"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Version Watermark */}
      <div className="fixed bottom-4 left-4 z-[100] text-[10px] font-mono text-white/20 pointer-events-none select-none">
        Rakko Music v3.1.0
      </div>

      {/* === LOADING SCREEN === */}
      <div
        className={`fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] ${isLoading ? 'opacity-100' : 'opacity-0 pointer-events-none scale-110'}`}
      >
        <div className="relative">
          <div className="absolute inset-0 bg-white/20 blur-3xl rounded-full opacity-10 animate-pulse"></div>
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-[3px] border-white/5"></div>
            <div
              className="absolute inset-0 rounded-full border-[3px] border-t-transparent border-l-transparent border-r-transparent border-b-white animate-spin"
              style={{
                borderBottomColor: settings.accentColor,
                filter: `drop-shadow(0 0 10px ${settings.accentColor})`
              }}
            ></div>
          </div>
        </div>
      </div>



      {/* === BACKGROUND LAYER === */}
      <AppBackground
        appMode={appMode}
        currentCover={currentCover}
        currentSong={currentSong}
        isPlaying={audioState.isPlaying}
        settings={settings}
        videoRef={videoRef}
        audioElement={audioRef.current}
        showPrismBg={showPrismBg}
        loopVideo={audioState.isLooping}
      />

      {/* === DRAG OVERLAY === */}
      {isDragging && (
        <div className="absolute inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center animate-fade-in transition-all duration-300 pointer-events-none">
          <div className="p-16 rounded-[3rem] bg-white/5 border-4 border-dashed border-white/20 text-center animate-pop-in transform transition-transform shadow-2xl backdrop-blur-xl">
            <div className="w-32 h-32 bg-gradient-to-tr from-white/10 to-transparent rounded-full flex items-center justify-center mx-auto mb-8 text-white animate-bounce-sm shadow-[0_0_40px_rgba(255,255,255,0.1)]">
              <Upload size={64} style={{ color: settings.accentColor }} />
            </div>
            <h2 className="text-4xl font-bold text-white mb-4 tracking-tight">Drop to Import</h2>
            <div className="flex justify-center gap-8 text-white/50 text-sm font-medium uppercase tracking-widest">
              <span className="flex items-center gap-2"><Music2 size={16} /> Audio</span>
              <span className="flex items-center gap-2"><FileMusic size={16} /> Lyrics</span>
              <span className="flex items-center gap-2"><Video size={16} /> Video</span>
            </div>
          </div>
        </div>
      )}

      {/* === COVER FLOW OVERLAY === */}
      {isCoverFlow && (
        <CoverFlow
          songs={songs}
          currentSong={currentSong}
          isPlaying={audioState.isPlaying}
          onSelect={(song) => {
            setCurrentSong(song);
            setAudioState(p => ({ ...p, isPlaying: true }));
          }}
          onPlayPause={togglePlayPause}
          onNext={playNext}
          onPrev={playPrev}
          onClose={() => setAppMode('standard')}
          accentColor={settings.accentColor}
          showBackground={showPrismBg}
          performanceMode={settings.performanceMode}
        />
      )}

      {/* === SHELF VIEW OVERLAY === */}
      {isShelf && (
        <ShelfView
          songs={songs}
          currentSong={currentSong}
          isPlaying={audioState.isPlaying}
          onSelect={(song) => {
            setCurrentSong(song);
            setAudioState(p => ({ ...p, isPlaying: true }));
            exitShelfMode();
          }}
          onClose={exitShelfMode}
          accentColor={settings.accentColor}
          performanceMode={settings.performanceMode}
        />
      )}

      {/* === FLOATING MODE CONTROLS === */}
      <div className={`fixed top-6 right-6 z-[200] transition-all duration-500 opacity-100 translate-y-0`}>
        <ModeControls
          appMode={appMode}
          setAppMode={setAppMode}
          showPrismBg={showPrismBg}
          setShowPrismBg={setShowPrismBg}
          isFullscreen={isFullscreen}
          toggleFullscreen={toggleFullscreen}
          onEnterShelf={handleEnterShelfView}
          onExitShelf={exitShelfMode}
          performanceMode={settings.performanceMode}
          isIdle={isIdle}
        />
      </div>

      <MysteryCodeModal
        isOpen={isMysteryCodeOpen}
        onClose={() => setIsMysteryCodeOpen(false)}
        onSuccess={(newSong) => {
          setSongs(prev => [...prev, newSong]);
          // Auto play if appropriate
          if (!currentSong) {
            setCurrentSong(newSong);
            setAudioState(prev => ({ ...prev, isPlaying: true }));
          }
        }}
      />

      {/* === MAIN LAYOUT CONTAINER === */}
      <div className={`relative z-10 w-full h-full flex flex-col md:flex-row transition-opacity duration-500 ${(isCoverFlow || isShelf) ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>

        {/* === LEFT PANEL: Player === */}
        <div className={`
             transition-all duration-1000 ease-elegant flex flex-col justify-center
             ${isImmersive
            ? 'absolute bottom-12 left-12 w-[30vw] min-w-[300px] max-w-[400px] h-auto bg-black/40 backdrop-blur-2xl rounded-3xl p-6 border border-white/10 shadow-2xl items-start group hover:bg-black/50 z-50'
            : 'relative flex-1 md:w-1/2 items-center p-6 md:p-12 h-full z-20'
          }
        `}>
          {/* Logo Header (Normal Mode Only) */}
          <div className={`absolute top-0 left-0 w-full p-6 md:p-8 flex justify-between items-center z-20 transition-opacity duration-500 ${isImmersive ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            <div className="flex items-center gap-2 text-white/90">
              <div className={`p-2 rounded-lg bg-white/10 backdrop-blur-md shadow-inner`}>
                <Music2 size={20} style={{ color: settings.accentColor }} />
              </div>
              <span className="font-bold tracking-wider text-sm uppercase">Rakko Player</span>
            </div>
            <div className="flex md:hidden gap-2">
              <button onClick={() => setIsMobileLyricsOpen(!isMobileLyricsOpen)} className="p-3 bg-white/5 rounded-full backdrop-blur-md text-white/80 active:scale-90 transition-transform">
                <Mic2 size={20} style={{ color: isMobileLyricsOpen ? settings.accentColor : undefined }} />
              </button>
              <button onClick={() => setIsMobileLibraryOpen(true)} className="p-3 bg-white/5 rounded-full backdrop-blur-md text-white/80 active:scale-90 transition-transform">
                <ListMusic size={20} />
              </button>
            </div>
          </div>

          {/* Inner Content Wrapper */}
          <div className={`
                flex transition-all duration-1000 ease-elegant w-full
                ${isImmersive ? 'flex-row items-center gap-4' : 'flex-col items-center max-w-2xl mx-auto'}
                ${isIdle && !isImmersive ? 'translate-y-[15vh] scale-110' : 'translate-y-0 scale-100'}
            `}>

            {/* Album Art */}
            <div className={`
                   relative transition-all duration-1000 ease-elegant
                   ${settings.performanceMode ? '' : 'shadow-2xl'}
                   ${isImmersive ? 'w-16 h-16 rounded-lg mb-0 flex-shrink-0' : 'w-full max-w-md aspect-square rounded-[2.5rem] mb-12 hover:scale-[1.02]'}
               `}>
              {!settings.performanceMode && (
                <div className={`absolute inset-0 blur-[60px] rounded-full transition-all duration-1000 ${isImmersive ? 'opacity-0' : 'opacity-40 animate-pulse-slow'}`} style={{ backgroundColor: settings.accentColor }}></div>
              )}

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
              <div className="flex items-center gap-2 justify-center w-full">
                <h1 className={`font-bold text-white ${!settings.performanceMode ? 'drop-shadow-lg' : ''} truncate transition-all duration-1000 ${isImmersive ? 'text-lg w-full text-left' : 'text-2xl md:text-4xl max-w-full'}`}>
                  {currentSong?.metadata?.title || currentSong?.name || "Ready to Play"}
                </h1>
                {!isImmersive && currentSong?.metadata?.version && (
                  <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-white/20 text-white/90 border border-white/10 whitespace-nowrap">
                    {currentSong.metadata.version}
                  </span>
                )}
              </div>

              <div className={`flex items-center gap-2 truncate w-full transition-all duration-1000 ${isImmersive ? 'justify-start' : 'justify-center'}`}>
                <p className={`font-medium ${isImmersive ? 'text-sm text-white/60' : 'text-lg text-white/60'}`}>
                  {currentSong?.metadata?.artists.join(', ') || currentSong?.artist || "Rakko Music"}
                </p>
                {currentSong?.metadata?.features && currentSong.metadata.features.length > 0 && (
                  <span className={`text-white/40 ${isImmersive ? 'text-xs' : 'text-base'}`}>
                    ft. {currentSong.metadata.features.join(', ')}
                  </span>
                )}
              </div>
            </div>

            {/* Immersive Mini Play Button */}
            <button
              onClick={togglePlayPause}
              className={`flex-shrink-0 p-3 bg-white text-black rounded-full hover:scale-105 active:scale-95 transition-all duration-500 ease-spring ${isImmersive && !isIdle ? 'opacity-100 scale-100 visible' : 'opacity-0 scale-0 invisible w-0 h-0 p-0'}`}
            >
              {audioState.isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
            </button>

          </div>

          {/* Full Controls (Normal Mode Only) */}
          <div className={`w-full transition-all duration-700 ease-elegant ${isImmersive || isIdle ? 'opacity-0 pointer-events-none' : 'opacity-100'} ${isImmersive ? 'h-0 overflow-hidden' : 'h-auto'} ${isIdle ? 'translate-y-20' : ''}`}>
            <Controls
              audioState={audioState}
              onPlayPause={togglePlayPause}
              onNext={playNext}
              onPrev={playPrev}
              onSeek={handleSeek}
              onVolumeChange={handleVolumeChange}
              onToggleLoop={() => setAudioState(p => ({ ...p, isLooping: !p.isLooping }))}
              onToggleShuffle={() => setAudioState(p => ({ ...p, isShuffle: !p.isShuffle }))}
              formatTime={formatTime}
              accentColor={settings.accentColor}
            />
          </div>
        </div>

        {/* === RIGHT PANEL: Content (Lyrics / Library) === */}
        <div className={`
           flex flex-col transition-all duration-500 ease-elegant
           ${isImmersive
            ? 'fixed inset-0 z-30 w-full h-full pl-0 md:pl-[35%] bg-transparent pointer-events-none'
            : 'fixed inset-0 z-50 md:static md:z-10 md:w-1/2 bg-black/95 md:bg-black/20 backdrop-blur-3xl md:backdrop-blur-none border-l border-white/5'
          }
           ${!isImmersive && !isMobileLibraryOpen ? 'translate-x-full md:translate-x-0' : 'translate-x-0'}
        `}>
          {/* Right Header (Desktop Actions) */}
          <div className={`flex justify-between items-center p-6 md:p-8 min-h-[88px] relative z-50 transition-opacity duration-500 opacity-100 pointer-events-auto`}>
            <button onClick={() => {
              setIsMobileLibraryOpen(false);
            }} className={`md:hidden text-white/50 hover:text-white transition-opacity ${isImmersive ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
              Close
            </button>

            <div className={`hidden md:flex bg-black/20 p-1 rounded-full backdrop-blur-md border border-white/5 transition-all duration-500 ${isImmersive ? 'opacity-0 -translate-y-4 pointer-events-none' : 'opacity-100 translate-y-0'}`}>
              <button onClick={() => toggleDesktopView('library')} className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${desktopViewMode === 'library' ? 'bg-white/10 text-white shadow-lg scale-105' : 'text-white/40 hover:text-white/80'}`}>
                <ListMusic size={14} /> Library
              </button>
              <button onClick={() => toggleDesktopView('lyrics')} className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${desktopViewMode === 'lyrics' ? 'bg-white/10 text-white shadow-lg scale-105' : 'text-white/40 hover:text-white/80'}`}>
                <Mic2 size={14} /> Lyrics
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-hidden relative pointer-events-auto">
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
                onAddFolderAPI={handleFolderSelectAPI}
                onRemoveSong={handleRemoveSong}
                onUpdateLyrics={handleUpdateLyrics}
                onReorder={handleReorder}

                accentColor={settings.accentColor}
                onOpenMysteryCode={() => setIsMysteryCodeOpen(true)}
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
                  performanceMode={settings.performanceMode}
                />
              </div>
            </div>
          </div>

          {/* Settings Button */}
          <button
            onClick={() => setShowSettings(true)}
            className={`absolute bottom-6 right-6 z-40 p-3 rounded-full bg-black/40 hover:bg-white text-white/50 hover:text-black transition-all duration-300 hover:rotate-45 backdrop-blur-xl border border-white/5 shadow-lg ${isImmersive || isIdle ? 'opacity-0 pointer-events-none translate-y-10' : 'opacity-100 translate-y-0'}`}>
            <SettingsIcon size={20} />
          </button>
        </div>


        {/* === MOBILE LYRICS OVERLAY === */}
        <div className={`fixed inset-0 z-[60] bg-black/95 backdrop-blur-3xl transition-all duration-500 ease-elegant md:hidden flex flex-col ${isMobileLyricsOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full pointer-events-none'}`}>
          <div className="flex justify-between items-center p-6 border-b border-white/5 bg-white/5 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white/10">
                <Mic2 size={18} style={{ color: settings.accentColor }} />
              </div>
              <span className="text-lg font-bold text-white/90">Lyrics</span>
            </div>
            <button
              onClick={() => setIsMobileLyricsOpen(false)}
              className="p-3 bg-white/10 rounded-full active:scale-90 transition-transform text-white/80 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 overflow-hidden relative w-full h-full">
            <div className="absolute inset-0 px-4 pb-8">
              <LyricsView
                lyrics={currentSong?.lyrics}
                currentTime={audioState.currentTime}
                onImportLyrics={handleCurrentLyricsImport}
                accentColor={settings.accentColor}
                onSeek={handleSeekToTime}
                variant="immersive"
                performanceMode={settings.performanceMode}
              />
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