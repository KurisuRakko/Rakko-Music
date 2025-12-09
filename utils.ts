export const formatTime = (seconds: number): string => {
  if (!seconds || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

export const getFileNameWithoutExtension = (filename: string): string => {
  return filename.replace(/\.[^/.]+$/, "");
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
      
      // Even empty lines can be useful for spacing, but usually we skip them if truly empty
      if (text || line.includes(']')) { 
         result.push({ time, text });
      }
    }
  }
  return result.sort((a, b) => a.time - b.time);
};

export const extractAlbumArt = async (file: File): Promise<string | null> => {
  return new Promise((resolve) => {
    // Check if jsmediatags is loaded
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