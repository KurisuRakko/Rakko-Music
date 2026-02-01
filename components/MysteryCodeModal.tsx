import React, { useState, useEffect, useRef } from 'react';
import { X, ArrowRight, Loader2, Download, Check, AlertCircle, History, CheckSquare, Square } from 'lucide-react';
import { Song } from '../types';
import { parseMusicInfo } from '../utils';
import yaml from 'js-yaml';

interface MysteryCodeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (songs: Song | Song[]) => void;
    accentColor?: string;
}

interface ConfigItem {
    index?: string;
    name: string;
    link: string;
}

const HISTORY_KEY = 'rakko_mystery_history';

const MysteryCodeModal: React.FC<MysteryCodeModalProps> = ({ isOpen, onClose, onSuccess, accentColor }) => {
    // Input State
    const [code, setCode] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    // Flow State
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [candidates, setCandidates] = useState<ConfigItem[]>([]);
    const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
    const [resolvedBaseUrl, setResolvedBaseUrl] = useState<string>(''); // Store base URL for relative links

    // Execution State
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<string>('');

    // Progress State - Two progress bars
    const [overallProgress, setOverallProgress] = useState<{ current: number, total: number }>({ current: 0, total: 0 });
    const [songProgress, setSongProgress] = useState<number>(0);
    const [downloadSpeed, setDownloadSpeed] = useState<string>('');
    const [downloadPhase, setDownloadPhase] = useState<string>('');

    // History State
    const [history, setHistory] = useState<string[]>([]);

    // Animation State
    const [shouldRender, setShouldRender] = useState(false);
    const [isAnimatingIn, setIsAnimatingIn] = useState(false);

    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        if (isOpen) {
            setShouldRender(true);
            requestAnimationFrame(() => {
                requestAnimationFrame(() => setIsAnimatingIn(true));
            });

            const saved = localStorage.getItem(HISTORY_KEY);
            if (saved) {
                try {
                    setHistory(JSON.parse(saved));
                } catch (e) {
                    console.error("Failed to load history", e);
                }
            }
            if (inputRef.current) {
                setTimeout(() => inputRef.current?.focus(), 100);
            }
        } else {
            setIsAnimatingIn(false);
            const timer = setTimeout(() => {
                setShouldRender(false);
                resetState();
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    const resetState = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setCode('');
        setError(null);
        setIsLoading(false);
        setStatus('');
        setSongProgress(0);
        setDownloadSpeed('');
        setDownloadPhase('');
        setIsSelectionMode(false);
        setCandidates([]);
        setOverallProgress({ current: 0, total: 0 });
        setResolvedBaseUrl('');
    };

    const addToHistory = (url: string) => {
        setHistory(prev => {
            const temp = prev.filter(item => item !== url);
            const next = [url, ...temp].slice(0, 10);
            localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
            return next;
        });
    };

    const handleClose = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        onClose();
    };

    const downloadFile = async (url: string, signal: AbortSignal, onProgress?: (loaded: number, total: number, speed: number) => void): Promise<Blob> => {
        const startTime = performance.now();
        const response = await fetch(url, { signal });
        if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.statusText}`);

        const contentLength = response.headers.get('content-length');
        const total = contentLength ? parseInt(contentLength, 10) : 0;
        let loaded = 0;

        const reader = response.body?.getReader();
        if (!reader) throw new Error('ReadableStream not supported');

        const chunks: Uint8Array[] = [];

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                chunks.push(value);
                loaded += value.length;

                const currentTime = performance.now();
                const elapsed = (currentTime - startTime) / 1000;
                const speed = elapsed > 0 ? loaded / elapsed : 0;

                if (onProgress) {
                    onProgress(loaded, total, speed);
                }
            }
        } catch (err: any) {
            if (err.name === 'AbortError') {
                throw new Error('Download cancelled');
            }
            throw err;
        }

        return new Blob(chunks as any, { type: response.headers.get('content-type') || 'application/octet-stream' });
    };

    const resolveUrl = (base: string, path: string): string => {
        try {
            return new URL(path, base).toString();
        } catch (e) {
            if (path.startsWith('http')) return path;
            return `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
        }
    };

    const checkLocalConfig = async (input: string, signal: AbortSignal): Promise<string | null> => {
        const attempts = ['/config.yaml', '/config.yml', '/config.txt'];
        const normalizedInput = input.toLowerCase();

        for (const filename of attempts) {
            if (signal.aborted) return null;
            try {
                const res = await fetch(filename, { signal });
                if (res.ok) {
                    const text = await res.text();
                    let items: ConfigItem[] = [];
                    if (filename.endsWith('.txt')) {
                        items = parseTxtConfig(text, '');
                    } else {
                        items = parseYamlConfig(text, '');
                    }

                    const match = items.find(item =>
                        (item.index && item.index.toLowerCase() === normalizedInput) ||
                        item.name.toLowerCase() === normalizedInput
                    );

                    if (match) return match.link;
                }
            } catch (e) { }
        }
        return null;
    };

    const scanConfig = async (baseUrl: string, signal: AbortSignal): Promise<ConfigItem[] | null> => {
        const attempts = ['config.yaml', 'config.yml', 'config.txt'];
        const cleanBase = baseUrl.replace(/\/+$/, '') + '/';

        for (const filename of attempts) {
            if (signal.aborted) throw new Error('Cancelled');
            const target = resolveUrl(cleanBase, filename);
            try {
                const res = await fetch(target, { signal });
                if (res.ok) {
                    const text = await res.text();
                    let items: ConfigItem[];
                    if (filename.endsWith('.yaml') || filename.endsWith('.yml')) {
                        items = parseYamlConfig(text, cleanBase);
                    } else {
                        items = parseTxtConfig(text, cleanBase);
                    }
                    // Resolve all links to absolute URLs
                    return items.map(item => ({
                        ...item,
                        link: resolveUrl(cleanBase, item.link)
                    }));
                }
            } catch (e) {
                // Ignore and try next
            }
        }
        return null;
    };

    const parseTxtConfig = (text: string, baseUrl: string): ConfigItem[] => {
        const lines = text.split('\n');
        const items: ConfigItem[] = [];
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            const parts = trimmed.split('|').map(p => p.trim());
            if (parts.length >= 2) {
                if (parts.length >= 3) {
                    items.push({ index: parts[0], name: parts[1], link: parts[2] });
                } else {
                    items.push({ name: parts[0], link: parts[1] });
                }
            }
        }
        return items;
    };

    const parseYamlConfig = (text: string, baseUrl: string): ConfigItem[] => {
        try {
            const doc = yaml.load(text) as any;
            let list: any[] = [];

            if (Array.isArray(doc)) {
                list = doc;
            } else if (doc && typeof doc === 'object') {
                if (Array.isArray(doc.songs)) list = doc.songs;
                else if (Array.isArray(doc.items)) list = doc.items;
                else if (Array.isArray(doc.list)) list = doc.list;
            }

            return list.map((item: any) => ({
                index: item.index ? String(item.index) : undefined,
                name: item.name || item.title || 'Unknown',
                link: item.link || item.url || item.path
            })).filter(x => x.link);

        } catch (e) {
            console.error("YAML Parse Error", e);
            return [];
        }
    };

    const formatSpeed = (bytesPerSec: number): string => {
        if (bytesPerSec > 1024 * 1024) return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
        if (bytesPerSec > 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
        return `${Math.round(bytesPerSec)} B/s`;
    };

    const resolveMysteryCode = async (
        linkUrl: string,
        signal: AbortSignal,
        titleUpdate?: string,
        onProgress?: (percent: number, speed: string, phase: string) => void
    ): Promise<Song> => {
        const baseUrl = linkUrl.replace(/\/+$/, '');
        const codeName = baseUrl.split('/').pop() || 'Unknown';
        const info = parseMusicInfo(titleUpdate || decodeURIComponent(codeName));

        // Define custom overrides
        let customPaths = {
            music: '',
            video: '',
            cover: '',
            lyrics: ''
        };

        // 0. Pre-fetch info.txt to check for overrides
        try {
            console.log(`[Mystery] Fetching info.txt from ${baseUrl}/info.txt`);
            const r = await fetch(`${baseUrl}/info.txt`, { signal });
            if (r.ok) {
                const text = await r.text();
                const lines = text.split('\n');
                lines.forEach(line => {
                    const firstColon = line.indexOf(':');
                    if (firstColon === -1) return;

                    const key = line.substring(0, firstColon).trim().toLowerCase();
                    const val = line.substring(firstColon + 1).trim();

                    if (!val) return;

                    if (key === 'title') info.title = val;
                    else if (key === 'artist') info.artists = val.split(',').map(s => s.trim());
                    else if (key === 'album') info.album = val;
                    else if (key === 'version') info.version = val;
                    else if (key === 'extra') info.extra = val;
                    else if (key === 'music') customPaths.music = val;
                    else if (key === 'video') customPaths.video = val;
                    else if (key === 'cover' || key === 'image') customPaths.cover = val;
                    else if (key === 'lyrics') customPaths.lyrics = val;
                });
                console.log(`[Mystery] Parsed info.txt:`, info, customPaths);
            } else {
                console.warn(`[Mystery] info.txt not found or error: ${r.status}`);
            }
        } catch (e) {
            console.error(`[Mystery] Failed to fetch info.txt`, e);
        }

        // 1. Probe/Determine Audio
        let audioUrl: string | null = null;
        let foundExt = '';

        if (customPaths.music) {
            const testUrl = `${baseUrl}/${customPaths.music}`;
            // Detect extension from filename
            const ext = customPaths.music.split('.').pop() || 'mp3';
            audioUrl = testUrl;
            foundExt = ext;
        } else {
            const audioExtensions = ['mp3', 'flac', 'wav', 'ogg', 'm4a'];
            for (const ext of audioExtensions) {
                if (signal.aborted) throw new Error('Cancelled');
                const testUrl = `${baseUrl}/music.${ext}`;
                try {
                    const res = await fetch(testUrl, { method: 'HEAD', signal });
                    if (res.ok) {
                        const contentType = res.headers.get('content-type');
                        if (contentType && (contentType.includes('text/html') || contentType.includes('application/json'))) continue;
                        audioUrl = testUrl;
                        foundExt = ext;
                        break;
                    }
                } catch (e: any) {
                    if (e.name === 'AbortError') throw e;
                }
            }
        }

        if (!audioUrl) throw new Error(`No audio found at ${baseUrl}`);

        // 2. Download Audio with progress callback
        const audioBlob = await downloadFile(audioUrl, signal, (loaded, total, speed) => {
            if (total > 0 && onProgress) {
                onProgress(Math.round((loaded / total) * 100), formatSpeed(speed), '🎵 Audio');
            }
        });
        const localAudioUrl = URL.createObjectURL(audioBlob);

        // 3. Optional Resources
        let localVideoUrl: string | undefined = undefined;
        let localCoverUrl: string | undefined = undefined;
        let lyrics: string | undefined = undefined;

        // Video
        try {
            const vidUrl = customPaths.video ? `${baseUrl}/${customPaths.video}` : `${baseUrl}/video.mp4`;
            let shouldDownloadVideo = !!customPaths.video;

            if (!customPaths.video) {
                const hRes = await fetch(vidUrl, { method: 'HEAD', signal });
                if (hRes.ok) shouldDownloadVideo = true;
            }

            if (shouldDownloadVideo) {
                const vBlob = await downloadFile(vidUrl, signal, (loaded, total, speed) => {
                    if (total > 0 && onProgress) {
                        onProgress(Math.round((loaded / total) * 100), formatSpeed(speed), '🎬 Video');
                    }
                });
                localVideoUrl = URL.createObjectURL(vBlob);
            }
        } catch (e) {
            console.warn("[Mystery] Video download failed", e);
        }

        // Lyrics
        try {
            const lrcUrl = customPaths.lyrics ? `${baseUrl}/${customPaths.lyrics}` : `${baseUrl}/lyrics.lrc`;
            const r = await fetch(lrcUrl, { signal });
            if (r.ok) lyrics = await r.text();
        } catch (e) { }

        // Cover (Custom or Auto-detect)
        const coverCandidates = customPaths.cover
            ? [customPaths.cover]
            : ['cover.jpg', 'cover.png', 'image.jpg', 'image.png', 'folder.jpg'];

        for (const cand of coverCandidates) {
            if (localCoverUrl || signal.aborted) break;
            try {
                const coverUrl = `${baseUrl}/${cand}`;
                // Only do HEAD check if not explicitly specified (optimization)
                if (!customPaths.cover) {
                    const h = await fetch(coverUrl, { method: 'HEAD', signal });
                    if (!h.ok) continue;
                }
                const cBlob = await downloadFile(coverUrl, signal);
                localCoverUrl = URL.createObjectURL(cBlob);
            } catch (e) { }
        }

        const audioFile = new File([audioBlob], customPaths.music || `music.${foundExt}`, { type: audioBlob.type });

        return {
            id: Math.random().toString(36).substr(2, 9),
            name: info.title,
            artist: info.artists.join(', ') || 'Unknown Artist',
            url: localAudioUrl,
            file: audioFile,
            videoUrl: localVideoUrl,
            coverUrl: localCoverUrl,
            lyrics,
            metadata: info,
            mysteryCode: linkUrl
        };
    };

    // Step 1: Scan
    const handleScan = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!code.trim()) return;

        const controller = new AbortController();
        abortControllerRef.current = controller;
        setIsLoading(true);
        setError(null);
        setStatus('Scanning...');
        setSongProgress(0);

        addToHistory(code.trim());

        let targetUrl = code.trim();

        try {
            // 1. Check Local Config (Short Code Lookup)
            setStatus('Checking Shortcuts...');
            const localMatch = await checkLocalConfig(targetUrl, controller.signal);
            if (localMatch) {
                targetUrl = localMatch;
                setStatus(`Resolved: ${targetUrl}`);
            }

            if (controller.signal.aborted) return;

            // Store the resolved base URL for later use
            setResolvedBaseUrl(targetUrl);

            // 2. Check Remote/Target Config (Bulk Import)
            setStatus('Scanning Target...');
            const result = await scanConfig(targetUrl, controller.signal);

            if (controller.signal.aborted) return;

            if (result && result.length > 0) {
                // Found multiple items -> Selection Mode
                setCandidates(result);
                setSelectedIndices(new Set(result.map((_, i) => i)));
                setIsSelectionMode(true);
                setIsLoading(false);
                setStatus('');
            } else {
                // Fallback to direct import
                setStatus('Direct Import...');
                const song = await resolveMysteryCode(targetUrl, controller.signal, undefined, (percent, speed, phase) => {
                    setSongProgress(percent);
                    setDownloadSpeed(speed);
                    setDownloadPhase(phase);
                });
                if (!controller.signal.aborted) {
                    onSuccess(song);
                    onClose();
                }
            }
        } catch (err: any) {
            if (err.name === 'AbortError') return;
            try {
                setStatus('Attempting Direct Resolution...');
                const song = await resolveMysteryCode(targetUrl, controller.signal, undefined, (percent, speed, phase) => {
                    setSongProgress(percent);
                    setDownloadSpeed(speed);
                    setDownloadPhase(phase);
                });
                if (!controller.signal.aborted) {
                    onSuccess(song);
                    onClose();
                }
            } catch (directErr: any) {
                setError(directErr.message || 'Failed to resolve link.');
                setIsLoading(false);
            }
        }
    };

    // Step 2: Import Selected - FIXED: Now actually downloads songs
    const handleImportSelected = async () => {
        const toImport = candidates.filter((_, i) => selectedIndices.has(i));
        if (toImport.length === 0) return;

        const controller = new AbortController();
        abortControllerRef.current = controller;

        setIsLoading(true);
        setError(null);
        setOverallProgress({ current: 0, total: toImport.length });
        setSongProgress(0);
        setDownloadSpeed('');

        let successCount = 0;
        const downloadedSongs: Song[] = [];
        const total = toImport.length;

        for (let i = 0; i < total; i++) {
            if (controller.signal.aborted) break;
            const item = toImport[i];

            setOverallProgress({ current: i, total });
            setStatus(`Downloading: ${item.name}`);
            setSongProgress(0);

            try {
                // item.link is already absolute (resolved in scanConfig)
                const song = await resolveMysteryCode(item.link, controller.signal, item.name, (percent, speed, phase) => {
                    setSongProgress(percent);
                    setDownloadSpeed(speed);
                    setDownloadPhase(phase);
                });
                downloadedSongs.push(song);
                successCount++;
            } catch (e: any) {
                console.error(`Failed to import ${item.name}`, e);
                // Continue with others
            }
        }

        setOverallProgress({ current: total, total });
        setIsLoading(false);

        if (successCount > 0) {
            onSuccess(downloadedSongs);
            onClose();
        } else {
            setError("Failed to import selected songs.");
        }
    };

    const toggleSelection = (index: number) => {
        const next = new Set(selectedIndices);
        if (next.has(index)) next.delete(index);
        else next.add(index);
        setSelectedIndices(next);
    };

    const toggleSelectAll = () => {
        if (selectedIndices.size === candidates.length) {
            setSelectedIndices(new Set());
        } else {
            setSelectedIndices(new Set(candidates.map((_, i) => i)));
        }
    };

    if (!shouldRender) return null;

    const activeAccent = accentColor || '#ec4899';

    return (
        <div className={`fixed inset-0 z-[300] flex items-center justify-center transition-all duration-300 ease-out ${isAnimatingIn ? 'bg-black/60 backdrop-blur-sm opacity-100' : 'bg-black/0 backdrop-blur-none opacity-0'}`} onClick={handleClose}>
            <div
                onClick={(e) => e.stopPropagation()}
                className={`
                    relative w-full max-w-[500px] flex flex-col
                    bg-[#1a1b26]/90 border border-white/10 shadow-2xl rounded-3xl overflow-hidden
                    transform transition-all duration-400 ease-spring max-h-[85vh]
                    ${isAnimatingIn ? 'scale-100 translate-y-0 opacity-100' : 'scale-90 translate-y-8 opacity-0'}
                `}
            >
                {/* Glow Effect */}
                <div
                    className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 blur-[80px] rounded-full pointer-events-none opacity-20"
                    style={{ backgroundColor: activeAccent }}
                />

                {/* Header */}
                <div className="relative z-10 flex justify-between items-center p-6 border-b border-white/5">
                    <h2 className="text-xl font-bold text-white flex items-center gap-3">
                        <div className={`p-2 rounded-xl bg-white/5 text-white shadow-inner`} style={{ backgroundColor: `${activeAccent}20`, color: activeAccent }}>
                            <Download size={20} />
                        </div>
                        {isSelectionMode ? 'Select Songs' : 'Mystery Resources'}
                    </h2>
                    <button
                        onClick={handleClose}
                        className="p-2 hover:bg-white/10 rounded-full transition-all active:scale-90 hover:rotate-90 duration-300"
                    >
                        <X size={20} className="text-white/70" />
                    </button>
                </div>

                <div className="relative z-10 p-6 overflow-y-auto custom-scrollbar">

                    {!isSelectionMode ? (
                        /* === INPUT MODE === */
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <form onSubmit={handleScan} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-white/40 uppercase tracking-widest ml-1">Resource Link</label>
                                    <div className="relative group">
                                        <input
                                            ref={inputRef}
                                            type="text"
                                            value={code}
                                            onChange={(e) => setCode(e.target.value)}
                                            placeholder="https://example.com/collection/"
                                            className="w-full bg-black/20 border border-white/10 text-white placeholder-white/20 rounded-xl px-4 py-3.5 focus:outline-none focus:border-white/30 focus:bg-black/40 transition-all font-mono text-sm shadow-inner"
                                            style={{ borderColor: code ? `${activeAccent}40` : undefined }}
                                            disabled={isLoading}
                                            autoComplete="off"
                                        />
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity duration-300 opacity-0 group-focus-within:opacity-100 pointer-events-none">
                                            <Download size={14} className="text-white/30" />
                                        </div>
                                    </div>
                                </div>

                                {/* History */}
                                {history.length > 0 && !isLoading && (
                                    <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-2">
                                        {history.map((url, i) => (
                                            <button
                                                key={i}
                                                type="button"
                                                onClick={() => setCode(url)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 text-[10px] text-white/60 hover:text-white transition-all truncate max-w-full hover:scale-105 active:scale-95"
                                            >
                                                <History size={10} />
                                                <span className="truncate max-w-[200px]">{url.replace(/^https?:\/\//, '')}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Progress & Status - Single song mode */}
                                {isLoading && (
                                    <div className="space-y-3 py-4 p-4 rounded-xl bg-white/5 border border-white/5 animate-in fade-in zoom-in-95">
                                        <div className="flex justify-between text-xs font-mono font-medium">
                                            <span className="text-white/70 animate-pulse">{status}</span>
                                            <span className="flex items-center gap-3">
                                                {downloadPhase && <span className="text-white/40 px-1.5 py-0.5 rounded bg-white/5">{downloadPhase}</span>}
                                                <span style={{ color: activeAccent }}>{songProgress}%</span>
                                            </span>
                                        </div>
                                        <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden shadow-inner">
                                            <div
                                                className="h-full transition-all duration-300 rounded-full relative overflow-hidden"
                                                style={{ width: `${songProgress}%`, backgroundColor: activeAccent }}
                                            >
                                                <div className="absolute inset-0 bg-white/20 animate-[shimmer_1s_infinite] -skew-x-12"></div>
                                            </div>
                                        </div>
                                        {downloadSpeed && (
                                            <div className="flex justify-between items-center text-[10px] font-mono text-white/30 mt-1">
                                                <span>Transfer Rate</span>
                                                <span>{downloadSpeed}</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {error && (
                                    <div className="flex items-start gap-3 text-red-400 text-xs px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl animate-in shake">
                                        <AlertCircle size={16} className="shrink-0 mt-0.5" />
                                        <span className="leading-relaxed">{error}</span>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={isLoading || !code.trim()}
                                    className="w-full rounded-xl text-black font-bold py-3.5 disabled:opacity-50 disabled:grayscale hover:brightness-110 active:scale-[0.98] flex items-center justify-center gap-2 text-sm uppercase tracking-wide transition-all shadow-lg hover:shadow-xl"
                                    style={{ backgroundColor: activeAccent }}
                                >
                                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
                                    {isLoading ? 'Scanning...' : 'Start Scan'}
                                </button>
                            </form>
                        </div>
                    ) : (
                        /* === SELECTION MODE === */
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-8 duration-500">
                            <div className="flex items-center justify-between mb-2">
                                <button
                                    onClick={toggleSelectAll}
                                    className="flex items-center gap-2 text-xs font-bold text-white/60 hover:text-white transition-colors bg-white/5 px-3 py-1.5 rounded-lg hover:bg-white/10"
                                >
                                    {selectedIndices.size === candidates.length
                                        ? <CheckSquare size={14} style={{ color: activeAccent }} />
                                        : <Square size={14} />
                                    }
                                    Select All
                                </button>
                                <span className="text-xs font-mono text-white/40 bg-white/5 px-2 py-1 rounded">
                                    {selectedIndices.size} / {candidates.length}
                                </span>
                            </div>

                            <div className="max-h-[300px] overflow-y-auto space-y-2 custom-scrollbar pr-2 -mr-2">
                                {candidates.map((item, i) => {
                                    const isSelected = selectedIndices.has(i);
                                    return (
                                        <div
                                            key={i}
                                            onClick={() => !isLoading && toggleSelection(i)}
                                            className={`
                                                flex items-center gap-4 p-3 rounded-xl border cursor-pointer transition-all duration-300 group select-none
                                                ${isSelected ? 'bg-white/10 border-white/20 translate-x-1' : 'bg-transparent border-transparent hover:bg-white/5 hover:translate-x-0.5'}
                                            `}
                                        >
                                            {/* Animated Checkbox */}
                                            <div
                                                className={`
                                                    shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ease-out shadow-sm
                                                    ${isSelected ? 'border-transparent scale-110 rotate-0' : 'border-white/20 group-hover:border-white/40 scale-100 rotate-[-10deg]'}
                                                `}
                                                style={{ backgroundColor: isSelected ? activeAccent : 'transparent' }}
                                            >
                                                <Check
                                                    size={14}
                                                    className={`text-black font-bold transition-all duration-300 ${isSelected ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}
                                                    strokeWidth={4}
                                                />
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className={`text-sm font-semibold truncate transition-colors duration-300 ${isSelected ? 'text-white' : 'text-white/70 group-hover:text-white/90'}`}>
                                                    {item.name}
                                                </div>
                                                <div className="text-[10px] text-white/30 truncate font-mono transition-opacity duration-300 group-hover:text-white/50">
                                                    {item.link}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Two Progress Bars during bulk import */}
                            {isLoading && (
                                <div className="space-y-4 py-4 p-4 rounded-xl bg-white/5 border border-white/5 animate-in fade-in">
                                    {/* Overall Progress */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs text-white/50 font-mono">
                                            <span className="uppercase tracking-wider">Queue</span>
                                            <span>{overallProgress.current} / {overallProgress.total}</span>
                                        </div>
                                        <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden">
                                            <div
                                                className="h-full transition-all duration-500 ease-out rounded-full"
                                                style={{ width: `${overallProgress.total > 0 ? (overallProgress.current / overallProgress.total) * 100 : 0}%`, backgroundColor: activeAccent }}
                                            />
                                        </div>
                                    </div>

                                    {/* Current Song Progress */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs text-white/50 font-mono">
                                            <span className="truncate max-w-[200px] text-white/80">{status}</span>
                                            <span className="flex items-center gap-2">
                                                {downloadPhase && <span className="text-[9px] px-1 bg-white/10 rounded uppercase">{downloadPhase}</span>}
                                                <span>{songProgress}%</span>
                                            </span>
                                        </div>
                                        <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-white transition-all duration-300 rounded-full"
                                                style={{ width: `${songProgress}%` }}
                                            />
                                        </div>
                                        {downloadSpeed && (
                                            <div className="flex justify-end text-[10px] font-mono text-white/30">
                                                {downloadSpeed}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {error && (
                                <div className="flex items-start gap-3 text-red-400 text-xs px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <div className="pt-2 flex gap-3">
                                <button
                                    onClick={() => setIsSelectionMode(false)}
                                    disabled={isLoading}
                                    className="px-6 py-3 rounded-xl bg-white/5 text-white/60 font-semibold text-sm hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handleImportSelected}
                                    disabled={isLoading || selectedIndices.size === 0}
                                    className="flex-1 rounded-xl text-black font-bold py-3 disabled:opacity-50 hover:brightness-110 active:scale-[0.98] flex items-center justify-center gap-2 text-sm uppercase tracking-wide transition-all shadow-lg"
                                    style={{ backgroundColor: activeAccent }}
                                >
                                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                                    {isLoading ? 'Importing...' : `Import ${selectedIndices.size} Songs`}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MysteryCodeModal;
