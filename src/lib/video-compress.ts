// Client-side video compression via WebCodecs (hardware-accelerated where the
// platform allows). mediabunny is imported lazily so the home bundle stays slim.
//
// Output streams to an OPFS temp file (disk-backed) as fragmented MP4 — keeping
// the whole compressed file in memory crashed tabs on multi-GB videos.
import type { StreamTargetChunk } from "mediabunny";

export function canCompressVideo(): boolean {
  return typeof window !== "undefined" && "VideoEncoder" in window;
}

export class CompressionCanceled extends Error {
  constructor() {
    super("Compression canceled");
    this.name = "CompressionCanceled";
  }
}

const MAX_WIDTH = 1280;
// Without OPFS the output must fit in one ArrayBuffer — only safe for inputs
// that can't produce a huge result.
const MAX_INPUT_WITHOUT_OPFS = 1024 * 1024 * 1024; // 1GB

const TMP_DIR = "vershare-compress";

async function getTmpDir(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const root = await navigator.storage.getDirectory();
    return await root.getDirectoryHandle(TMP_DIR, { create: true });
  } catch {
    return null;
  }
}

export async function cleanupCompressTmp(): Promise<void> {
  try {
    const root = await navigator.storage.getDirectory();
    await root.removeEntry(TMP_DIR, { recursive: true });
  } catch {
    // nothing to clean
  }
}

// Walk top-level ISO-BMFF boxes (header reads only — instant on any size).
// Returns false when the moov index sits after mdat: browsers must fetch the
// file tail before playback can start, which feels like download-then-play.
// true = already streamable (moov first, or fragmented); null = not MP4/MOV.
export async function probeMp4Streamable(file: File): Promise<boolean | null> {
  let offset = 0;
  let sawMdat = false;
  for (let i = 0; i < 64 && offset + 8 <= file.size; i++) {
    const hdr = new DataView(await file.slice(offset, offset + 16).arrayBuffer());
    if (hdr.byteLength < 8) return null;
    let size: number = hdr.getUint32(0);
    const type = String.fromCharCode(hdr.getUint8(4), hdr.getUint8(5), hdr.getUint8(6), hdr.getUint8(7));
    if (i === 0 && type !== "ftyp") return null;
    if (type === "moov") return !sawMdat;
    if (type === "moof") return true;
    if (type === "mdat") sawMdat = true;
    if (size === 1) {
      if (hdr.byteLength < 16) return null;
      size = Number(hdr.getBigUint64(8));
    } else if (size === 0) {
      break;
    }
    if (size < 8) return null;
    offset += size;
  }
  return sawMdat ? false : null;
}

export async function compressVideo(
  file: File,
  onProgress: (pct: number) => void,
  registerCancel: (cancel: () => void) => void
): Promise<File> {
  return convertVideo(file, "compress", onProgress, registerCancel);
}

// Stream copy into fragmented MP4 — same encoded samples, no quality loss,
// runs at I/O speed. Makes moov-at-end files start playing instantly.
export async function remuxVideo(
  file: File,
  onProgress: (pct: number) => void,
  registerCancel: (cancel: () => void) => void
): Promise<File> {
  return convertVideo(file, "remux", onProgress, registerCancel);
}

async function convertVideo(
  file: File,
  mode: "compress" | "remux",
  onProgress: (pct: number) => void,
  registerCancel: (cancel: () => void) => void
): Promise<File> {
  const {
    Input,
    Output,
    Conversion,
    ALL_FORMATS,
    BlobSource,
    BufferTarget,
    StreamTarget,
    Mp4OutputFormat,
    QUALITY_MEDIUM,
    ConversionCanceledError,
  } = await import("mediabunny");

  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
  const videoTrack = await input.getPrimaryVideoTrack();
  if (!videoTrack) throw new Error("No video track found");
  const targetWidth = Math.min(MAX_WIDTH, videoTrack.displayWidth || MAX_WIDTH);

  // Prefer a disk-backed OPFS target; memory stays flat regardless of size
  const tmpDir = await getTmpDir();
  let opfsHandle: FileSystemFileHandle | null = null;
  let opfsWritable: FileSystemWritableFileStream | null = null;
  if (tmpDir) {
    try {
      opfsHandle = await tmpDir.getFileHandle(`out-${Date.now()}.mp4`, { create: true });
      opfsWritable = await opfsHandle.createWritable();
    } catch {
      opfsHandle = null;
      opfsWritable = null;
    }
  }

  if (!opfsWritable && file.size > MAX_INPUT_WITHOUT_OPFS) {
    throw new Error("Video too large to compress in this browser");
  }

  const target = opfsWritable
    ? new StreamTarget(
        new WritableStream<StreamTargetChunk>({
          write: (chunk) =>
            opfsWritable!.write({ type: "write", position: chunk.position, data: chunk.data }),
        }),
        { chunked: true }
      )
    : new BufferTarget();

  const output = new Output({
    // fragmented MP4 writes strictly forward — no whole-file buffering in the
    // muxer — and plays natively in all modern browsers
    format: new Mp4OutputFormat({ fastStart: "fragmented" }),
    target,
  });

  // Without video/audio overrides mediabunny copies the encoded samples
  // verbatim (remux); with them it transcodes (compress).
  const conversion = await Conversion.init(
    mode === "compress"
      ? {
          input,
          output,
          video: { width: targetWidth, bitrate: QUALITY_MEDIUM },
          audio: { bitrate: QUALITY_MEDIUM },
        }
      : { input, output }
  );

  // A discarded track means the source codec can't be decoded/re-encoded here —
  // bail so the caller falls back to sharing the original.
  if (conversion.discardedTracks.length > 0) {
    await opfsWritable?.abort().catch(() => {});
    throw new Error("Source codec not supported for compression");
  }

  conversion.onProgress = (progress) => onProgress(Math.min(99, Math.round(progress * 100)));
  registerCancel(() => {
    conversion.cancel().catch(() => {});
  });

  try {
    await conversion.execute();
  } catch (err) {
    await opfsWritable?.abort().catch(() => {});
    if (err instanceof ConversionCanceledError) throw new CompressionCanceled();
    throw err;
  }

  const base = file.name.replace(/\.[^.]+$/, "");
  const outName = mode === "compress" ? `${base}-compressed.mp4` : `${base}.mp4`;
  onProgress(100);

  if (opfsWritable && opfsHandle) {
    await opfsWritable.close();
    // The returned File is disk-backed — uploading slices it straight off OPFS
    const result = await opfsHandle.getFile();
    return new File([result], outName, { type: "video/mp4" });
  }

  const buffer = (target as InstanceType<typeof BufferTarget>).buffer;
  if (!buffer) throw new Error("Compression produced no output");
  return new File([buffer], outName, { type: "video/mp4" });
}
