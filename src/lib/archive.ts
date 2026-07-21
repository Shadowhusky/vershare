// Client-side ZIP reading/writing via @zip.js/zip.js (lazily imported).
//
// Reading uses HTTP range requests: only the central directory (at the zip's
// tail) is fetched to list entries, and each entry is extracted on demand —
// a multi-GB archive can be browsed for a few KB of transfer.
// Writing (folder upload) streams into OPFS so memory stays flat.

export interface ArchiveEntry {
  path: string;
  name: string;
  dir: boolean;
  size: number;
  getBlob: (mime?: string) => Promise<Blob>;
}

export type ArchiveSource = { url: string } | { blob: Blob };

// zip.js is loaded at runtime from a self-hosted static ESM bundle
// (public/vendor, built with esbuild) instead of through the app bundler:
// bundling it dragged ~500KB into every SSR chunk and pushed the Worker
// over Cloudflare's size limit. The Function indirection hides the import
// from every bundler in the chain (Turbopack folds literals; OpenNext's
// esbuild then tries to resolve them).
type ZipModule = typeof import("@zip.js/zip.js");
// eslint-disable-next-line @typescript-eslint/no-implied-eval
const runtimeImport = new Function("u", "return import(u)") as (u: string) => Promise<ZipModule>;
let zipModule: Promise<ZipModule> | null = null;
function loadZip(): Promise<ZipModule> {
  if (!zipModule) {
    zipModule = runtimeImport("/vendor/zipjs-2.8.33.mjs");
    zipModule.catch(() => {
      zipModule = null;
    });
  }
  return zipModule;
}

const ZIP_MIMES = new Set([
  "application/zip",
  "application/x-zip-compressed",
]);

export function isArchive(mimeType?: string, fileName?: string): boolean {
  if (mimeType && ZIP_MIMES.has(mimeType)) return true;
  return /\.zip$/i.test(fileName || "");
}

export async function openArchive(source: ArchiveSource): Promise<ArchiveEntry[]> {
  const { ZipReader, HttpReader, BlobReader, BlobWriter } = await loadZip();

  const reader =
    "url" in source
      ? // preventHeadRequest: our raw endpoint streams GETs without a
        // Content-Length; zip.js probes with `Range: bytes=0-0` instead and
        // reads the size from Content-Range.
        new ZipReader(
          new HttpReader(source.url, { forceRangeRequests: true, preventHeadRequest: true })
        )
      : new ZipReader(new BlobReader(source.blob));

  const entries = await reader.getEntries();
  return entries
    .filter((e) => !e.filename.startsWith("__MACOSX/") && !/(^|\/)\.DS_Store$/.test(e.filename))
    .map((e) => {
      const path = e.filename.replace(/\/$/, "");
      return {
        path,
        name: path.split("/").pop() || path,
        dir: e.directory,
        size: e.uncompressedSize,
        getBlob: async (mime?: string) => {
          if (e.directory || !("getData" in e)) throw new Error("Entry not readable");
          return e.getData(new BlobWriter(mime || "application/octet-stream"));
        },
      };
    });
}

// Extensions that are already compressed — store them instead of deflating
const STORED_EXT =
  /\.(zip|gz|bz2|xz|7z|rar|jpe?g|png|gif|webp|avif|heic|mp4|m4v|mov|mkv|webm|mp3|m4a|aac|ogg|opus|flac|pdf|woff2?)$/i;

const TMP_DIR = "vershare-zip";
// Files returned by finish() stay backed by their OPFS entry for as long as
// they're referenced (uploads, previews) — so never wipe the whole dir on
// pack. Each page session writes into its own subdir; stale sibling subdirs
// from previous sessions are swept once.
const SESSION_DIR = `s-${Math.random().toString(36).slice(2, 10)}`;
let sweptStale = false;

async function createZipTarget(totalSize: number): Promise<{
  writable: WritableStream<Uint8Array> | null;
  finish: (name: string) => Promise<File>;
}> {
  try {
    const root = await navigator.storage.getDirectory();
    const base = await root.getDirectoryHandle(TMP_DIR, { create: true });
    if (!sweptStale) {
      sweptStale = true;
      try {
        const names: string[] = [];
        for await (const name of (base as unknown as { keys(): AsyncIterable<string> }).keys()) {
          if (name !== SESSION_DIR) names.push(name);
        }
        await Promise.all(names.map((n) => base.removeEntry(n, { recursive: true }).catch(() => {})));
      } catch {
        // sweep is best-effort
      }
    }
    const dir = await base.getDirectoryHandle(SESSION_DIR, { create: true });
    const handle = await dir.getFileHandle(`out-${Math.random().toString(36).slice(2, 10)}.zip`, {
      create: true,
    });
    const writable = await handle.createWritable();
    return {
      writable: writable as unknown as WritableStream<Uint8Array>,
      finish: async (name) => {
        const result = await handle.getFile();
        return new File([result], name, { type: "application/zip" });
      },
    };
  } catch {
    if (totalSize > 1024 * 1024 * 1024) {
      throw new Error("Folder too large to pack in this browser");
    }
    return { writable: null, finish: async () => { throw new Error("unused"); } };
  }
}

export async function zipFiles(
  files: { file: File; path: string }[],
  zipName: string,
  onProgress: (pct: number) => void
): Promise<File> {
  const { ZipWriter, BlobReader, BlobWriter } = await loadZip();

  const totalSize = files.reduce((s, f) => s + f.file.size, 0) || 1;
  const target = await createZipTarget(totalSize);

  const writer = target.writable
    ? new ZipWriter(target.writable)
    : new ZipWriter(new BlobWriter("application/zip"));

  let doneSize = 0;
  for (const { file, path } of files) {
    await writer.add(path, new BlobReader(file), {
      level: STORED_EXT.test(path) ? 0 : 6,
      onprogress: async (progress: number, total: number) => {
        if (total > 0) {
          onProgress(Math.min(99, Math.round(((doneSize + (progress / total) * file.size) / totalSize) * 100)));
        }
      },
    });
    doneSize += file.size;
    onProgress(Math.min(99, Math.round((doneSize / totalSize) * 100)));
  }

  const closed = await writer.close();
  onProgress(100);

  if (target.writable) {
    return target.finish(zipName);
  }
  return new File([closed as Blob], zipName, { type: "application/zip" });
}

// Traverse a dropped directory (webkitGetAsEntry tree) into {file, path} pairs
export async function collectDroppedEntries(
  items: DataTransferItemList
): Promise<{ files: { file: File; path: string }[]; folderName: string | null }> {
  const roots: FileSystemEntry[] = [];
  for (const item of items) {
    const entry = item.webkitGetAsEntry?.();
    if (entry) roots.push(entry);
  }
  if (!roots.some((r) => r.isDirectory)) return { files: [], folderName: null };

  const files: { file: File; path: string }[] = [];
  const readAll = async (entry: FileSystemEntry, prefix: string): Promise<void> => {
    if (entry.isFile) {
      const file = await new Promise<File>((resolve, reject) =>
        (entry as FileSystemFileEntry).file(resolve, reject)
      );
      if (file.name === ".DS_Store") return;
      files.push({ file, path: prefix + file.name });
    } else if (entry.isDirectory) {
      const dirReader = (entry as FileSystemDirectoryEntry).createReader();
      // readEntries returns batches of ≤100 — drain until empty
      let batch: FileSystemEntry[];
      do {
        batch = await new Promise<FileSystemEntry[]>((resolve, reject) =>
          dirReader.readEntries(resolve, reject)
        );
        for (const child of batch) {
          await readAll(child, prefix + entry.name + "/");
        }
      } while (batch.length > 0);
    }
  };

  for (const root of roots) {
    await readAll(root, "");
  }
  const folderName = roots.find((r) => r.isDirectory)?.name || null;
  return { files, folderName };
}
