import { ParsedMusicInfo, Song } from './types';

export const formatTime = (seconds: number): string => {
  if (!seconds || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

export const getFileNameWithoutExtension = (filename: string): string => {
  return filename.replace(/\.[^/.]+$/, "");
};

export const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
};

export interface LrcLine {
  time: number;
  text: string;
}

export const parseLrc = (lrc: string): LrcLine[] => {
  const lines = lrc.split('\n');
  const result: LrcLine[] = [];
  // Matches [mm:ss.xx] or [mm:ss:xx]
  const timeRegex = /\[(\d{2}):(\d{2})[.:](\d{2,3})\]/;

  for (const line of lines) {
    const match = timeRegex.exec(line);
    if (match) {
      const min = parseInt(match[1]);
      const sec = parseInt(match[2]);
      // Handle both 2 digit (centi) and 3 digit (milli) matches
      const msStr = match[3].padEnd(3, '0').substring(0, 3);
      const ms = parseInt(msStr);

      const time = min * 60 + sec + ms / 1000;
      const text = line.replace(timeRegex, '').trim();

      if (text || line.includes(']')) {
        result.push({ time, text });
      }
    }
  }
  return result.sort((a, b) => a.time - b.time);
};

export const extractAlbumArt = async (file?: File): Promise<string | null> => {
  return new Promise((resolve) => {
    if (!file) {
      resolve(null);
      return;
    }
    if (!(window as any).jsmediatags) {
      console.warn("jsmediatags not loaded");
      resolve(null);
      return;
    }

    (window as any).jsmediatags.read(file, {
      onSuccess: (tag: any) => {
        const { picture } = tag.tags;
        if (picture) {
          try {
            const { data, format } = picture;
            let base64String = "";
            for (let i = 0; i < data.length; i++) {
              base64String += String.fromCharCode(data[i]);
            }
            const base64 = window.btoa(base64String);
            resolve(`data:${format};base64,${base64}`);
          } catch (e) {
            console.error("Error parsing cover art", e);
            resolve(null);
          }
        } else {
          resolve(null);
        }
      },
      onError: (error: any) => {
        console.warn("Error reading tags", error);
        resolve(null);
      }
    });
  });
};

// --- Advanced Music Info Parser ---

const cleanString = (str: string): string => str.trim();

export function parseMusicInfo(input: string): ParsedMusicInfo {
  // 1. Separation of Artists and Title (Rule: Rightmost " - ")
  // e.g. "Artist A - Artist B - Title" -> Artists: "Artist A - Artist B", Title: "Title"
  const separator = " - ";
  const lastIndex = input.lastIndexOf(separator);

  let rawArtist = "";
  let rawTitle = input;

  if (lastIndex !== -1) {
    rawArtist = input.substring(0, lastIndex);
    rawTitle = input.substring(lastIndex + separator.length);
  }

  let title = rawTitle;
  let album: string | null = null;
  let features: string[] = [];
  let version: string | null = null;
  let extra: string | null = null;

  // Helper to append to version/extra
  const append = (current: string | null, newVal: string) => current ? `${current} ${newVal}` : newVal;

  // 2. Parse Title (Extract Brackets)
  // Match (...), [...], （...）, 【...】
  const bracketRegex = /([(\[（【])(.*?)([)\]）】])/g;

  title = title.replace(bracketRegex, (match, open, content, close) => {
    const c = content.trim();
    if (!c) return "";
    const lc = c.toLowerCase();

    // A. Detect Features (feat. / ft.) inside brackets
    if (/^(?:feat\.|ft\.|with|featuring)\s+/i.test(c)) {
      const featStr = c.replace(/^(?:feat\.|ft\.|with|featuring)\s+/i, "");
      // Will be split later
      features.push(featStr);
      return " ";
    }

    // B. Detect Album Keywords
    if (/\b(ost|original soundtrack|album|ep|anthology|collection|edition|deluxe)\b/i.test(lc)) {
      album = append(album, c);
      return " ";
    }

    // C. Detect Version / Type
    const versionKeywords = [
      "remix", "mix", "live", "edit", "ver.", "version", "instrumental", "acoustic",
      "demo", "cover", "remaster", "vip", "radio", "extended", "movie", "anime", "tv size",
      "short", "complete", "original", "完全版", "中文", "翻唱", "inst", "off vocal"
    ];

    if (versionKeywords.some(k => lc.includes(k))) {
      version = append(version, c);
      return " ";
    }

    // D. Fallback to Extra
    extra = append(extra, c);

    return " ";
  });

  // Clean Title
  // Remove version info or extra symbols that might have been left over
  title = title.replace(/\s{2,}/g, ' ').trim();

  // 3. Parse Artists
  let artists: string[] = [];

  // Helper to split artist strings based on specified delimiters
  const splitArtists = (str: string): string[] => {
    // 1. Replace complex separators with a common one \0
    // Delimiters: , & 、 和 / x ft. feat.
    // Note: "ft." and "feat." usually precede a name, but if they appear in the artist string 
    // (e.g. "Artist A feat. Artist B"), we treat "Artist B" as a main artist here or feature.
    // The requirement says split artists by these.

    let s = str;

    // Handle "feat." "ft." first to ensure they act as separators
    s = s.replace(/\s+(?:feat\.|ft\.|with|featuring)\s+/gi, '\0');

    // Handle " x " (surrounded by spaces to avoid words like 'extra')
    s = s.replace(/\s+[xX]\s+/g, '\0');

    // Handle " / "
    s = s.replace(/\s*\/\s*/g, '\0');

    // Handle " & " and ", & "
    s = s.replace(/\s*,?\s*&\s+/g, '\0');

    // Handle "、" "和" (CJK)
    s = s.replace(/[、和]/g, '\0');

    // Handle ","
    s = s.replace(/,/g, '\0');

    return s.split('\0').map(cleanString).filter(Boolean);
  };

  if (rawArtist) {
    artists = splitArtists(rawArtist);
  }

  // 4. Flatten and Deduplicate Features
  // Features extracted from title brackets also need splitting
  const flatFeatures: string[] = [];
  features.forEach(f => flatFeatures.push(...splitArtists(f)));

  features = [...new Set(flatFeatures)];
  artists = [...new Set(artists)];

  // Remove artists from features to avoid duplication
  features = features.filter(f => !artists.includes(f));

  return {
    artists,
    title,
    album,
    features,
    version,
    extra
  };
}

// --- Intelligent Lyrics Matching ---

/**
 * Normalizes a string for comparison:
 * 1. Lowercase
 * 2. Trim
 * 3. Convert '…' to '...'
 * 4. Merge spaces
 * 5. Remove trailing dots
 * 6. Remove version info in brackets (if present in the string)
 */
const normalizeForMatch = (str: string): string => {
  let s = str.toLowerCase();

  // Convert ellipsis
  s = s.replace(/…/g, '...');

  // Remove version info brackets for matching purposes (heuristic)
  // e.g. "Title (Live)" matches "Title.lrc"
  s = s.replace(/([(\[（【])(.*?)([)\]）】])/g, '');

  // Remove standard punctuation that often differs
  s = s.replace(/[.,!?'"：]/g, ' ');

  // Merge spaces
  s = s.replace(/\s+/g, ' ').trim();

  // Remove trailing dots (handled by replace above but ensure specifically for the requirement)
  s = s.replace(/\.+$/, '');

  return s;
};

// Levenshtein distance for similarity
const levenshteinDistance = (a: string, b: string): number => {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = Array.from({ length: a.length + 1 }, () =>
    new Array(b.length + 1).fill(0)
  );

  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[a.length][b.length];
};

const calculateSimilarity = (s1: string, s2: string): number => {
  const longer = s1.length > s2.length ? s1 : s2;
  if (longer.length === 0) return 1.0;
  const distance = levenshteinDistance(s1, s2);
  return (longer.length - distance) / longer.length;
};

interface LyricFile {
  name: string; // Filename
  content: string;
}

/**
 * Matches lyrics to songs based on strict > partial > similarity rules.
 * @param songs Array of Song objects (must have metadata parsed)
 * @param lyricsFiles Array of raw lyric objects
 * @returns Map of songId -> lyric content
 */
export const matchLyrics = (songs: Song[], lyricsFiles: LyricFile[]): Record<string, string> => {
  const matches: Record<string, string> = {};
  const usedLyrics = new Set<number>(); // Indices of used lyrics

  // Helper to extract comparison title from Lyric Filename
  // Rule: Lyrics title = Filename OR right side of " - "
  const getLyricTitle = (filename: string): string => {
    const nameNoExt = getFileNameWithoutExtension(filename);
    const lastDash = nameNoExt.lastIndexOf(' - ');
    if (lastDash !== -1) {
      return nameNoExt.substring(lastDash + 3);
    }
    return nameNoExt;
  };

  // Iterate through songs to find best match
  songs.forEach(song => {
    // Determine the "Match Title" from the song
    // We use the parsed title, but we also check the raw file name's right side as a fallback
    const targetTitle = normalizeForMatch(song.metadata?.title || song.name);

    let bestMatchIndex = -1;
    let bestMatchScore = 0;
    // Score Types: 3 = Exact, 2 = Containment, 1 = Similarity
    let bestMatchType = 0;

    lyricsFiles.forEach((lrc, index) => {
      if (usedLyrics.has(index)) return;

      const lrcTitleRaw = getLyricTitle(lrc.name);
      const lrcTitle = normalizeForMatch(lrcTitleRaw);

      // 1. Exact Match (Highest Priority)
      if (lrcTitle === targetTitle) {
        if (bestMatchType < 3) {
          bestMatchType = 3;
          bestMatchIndex = index;
          bestMatchScore = 1;
        }
        return;
      }

      // 2. Containment / Partial Match (Middle Priority)
      // Check if one contains the other and length difference is small
      if (bestMatchType < 3) {
        if (lrcTitle.includes(targetTitle) || targetTitle.includes(lrcTitle)) {
          const lenDiff = Math.abs(lrcTitle.length - targetTitle.length);
          // Allow small differences (e.g. extra punctuation removed)
          if (lenDiff < 5) {
            if (bestMatchType < 2) {
              bestMatchType = 2;
              bestMatchIndex = index;
              bestMatchScore = 1; // Placeholder
            }
            // If we already have a type 2 match, maybe check which is closer in length?
            // For now, first find is fine or could optimize.
          }
        }
      }

      // 3. Similarity Match (Lowest Priority)
      if (bestMatchType < 2) {
        const similarity = calculateSimilarity(lrcTitle, targetTitle);
        if (similarity >= 0.85 && similarity > bestMatchScore) {
          bestMatchType = 1;
          bestMatchScore = similarity;
          bestMatchIndex = index;
        }
      }
    });

    if (bestMatchIndex !== -1) {
      matches[song.id] = lyricsFiles[bestMatchIndex].content;
      usedLyrics.add(bestMatchIndex); // Mark as used (1-to-1 mapping)
    }
  });

  return matches;
};

export interface VideoFile {
  name: string;
  file: File;
}

export const matchVideos = (songs: Song[], videoFiles: VideoFile[]): Record<string, string> => {
  const matches: Record<string, string> = {};
  const usedVideos = new Set<number>();

  const getVideoTitle = (filename: string): string => {
    return getFileNameWithoutExtension(filename);
  };

  songs.forEach(song => {
    const targetTitle = normalizeForMatch(song.metadata?.title || song.name);

    let bestMatchIndex = -1;
    let bestMatchScore = 0;
    let bestMatchType = 0; // 3=Exact, 2=Containment, 1=Similarity

    videoFiles.forEach((vid, index) => {
      if (usedVideos.has(index)) return;

      const vidTitleRaw = getVideoTitle(vid.name);
      const vidTitle = normalizeForMatch(vidTitleRaw);

      // 1. Exact Match
      if (vidTitle === targetTitle) {
        if (bestMatchType < 3) {
          bestMatchType = 3;
          bestMatchIndex = index;
          bestMatchScore = 1;
        }
        return;
      }

      // 2. Containment
      if (bestMatchType < 3) {
        if (vidTitle.includes(targetTitle) || targetTitle.includes(vidTitle)) {
          const lenDiff = Math.abs(vidTitle.length - targetTitle.length);
          if (lenDiff < 5) { // Strict containment
            if (bestMatchType < 2) {
              bestMatchType = 2;
              bestMatchIndex = index;
              bestMatchScore = 1;
            }
          }
        }
      }

      // 3. Similarity
      if (bestMatchType < 2) {
        const similarity = calculateSimilarity(vidTitle, targetTitle);
        if (similarity >= 0.85 && similarity > bestMatchScore) {
          bestMatchType = 1;
          bestMatchScore = similarity;
          bestMatchIndex = index;
        }
      }
    });

    if (bestMatchIndex !== -1) {
      matches[song.id] = URL.createObjectURL(videoFiles[bestMatchIndex].file);
      usedVideos.add(bestMatchIndex);
    }
  });

  return matches;
};
