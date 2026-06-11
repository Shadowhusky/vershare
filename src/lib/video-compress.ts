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

export async function compressVideo(
  file: File,
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

  const conversion = await Conversion.init({
    input,
    output,
    video: { width: targetWidth, bitrate: QUALITY_MEDIUM },
    audio: { bitrate: QUALITY_MEDIUM },
  });

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
  const outName = `${base}-compressed.mp4`;
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
