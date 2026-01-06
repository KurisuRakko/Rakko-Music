
export interface ParsedMusicInfo {
  artists: string[];
  title: string;
  album: string | null;
  features: string[];
  version: string | null;
  extra: string | null;
}

export interface Song {
  id: string;
  file: File;
  name: string;
  artist: string; // Legacy fallback or joined string
  url: string;
  lyrics?: string;
  videoUrl?: string; // URL for the music video
  metadata?: ParsedMusicInfo; // Rich metadata
}

export interface AudioState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isLooping: boolean;
  isShuffle: boolean;
}

export interface AppSettings {
  wallpaper: string;
  bassBoost: boolean;
  accentColor: string;

  performanceMode: boolean;
  idleMode: boolean;
}

export type AppMode = 'standard' | 'immersive' | 'coverflow' | 'shelf';