
/**
 * Recursively scans a directory handle for files.
 * Returns a flat array of File objects.
 */
export async function scanDirectory(directoryHandle: FileSystemDirectoryHandle): Promise<File[]> {
    const files: File[] = [];

    for await (const entry of directoryHandle.values()) {
        if (entry.kind === 'file') {
            try {
                const file = await entry.getFile();
                files.push(file);
            } catch (err) {
                console.warn(`Failed to read file ${entry.name}:`, err);
            }
        } else if (entry.kind === 'directory') {
            try {
                const subFiles = await scanDirectory(entry);
                files.push(...subFiles);
            } catch (err) {
                console.warn(`Failed to read directory ${entry.name}:`, err);
            }
        }
    }

    return files;
}

/**
 * Prompts the user to select a directory and returns all files within it (recursively).
 */
export async function openDirectoryAndGetFiles(): Promise<File[]> {
    try {
        // @ts-ignore - showDirectoryPicker is not yet in all TS libs
        const directoryHandle = await window.showDirectoryPicker();
        return await scanDirectory(directoryHandle);
    } catch (err) {
        if ((err as Error).name === 'AbortError') {
            return []; // User cancelled
        }
        console.error("Error accessing directory:", err);
        throw err;
    }
}
