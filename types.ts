export interface Song {
  id: string;
  file: File;
  name: string;
  artist: string; // Will default to Unknown if not parsed
  url: string;
  lyrics?: string;
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
}