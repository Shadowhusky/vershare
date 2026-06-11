// Client-side video compression via WebCodecs (hardware-accelerated where the
// platform allows). mediabunny is imported lazily so the home bundle stays slim.

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
    Mp4OutputFormat,
    QUALITY_MEDIUM,
    ConversionCanceledError,
  } = await import("mediabunny");

  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
  const videoTrack = await input.getPrimaryVideoTrack();
  if (!videoTrack) throw new Error("No video track found");
  const targetWidth = Math.min(MAX_WIDTH, videoTrack.displayWidth || MAX_WIDTH);

  const output = new Output({
    format: new Mp4OutputFormat({ fastStart: "in-memory" }),
    target: new BufferTarget(),
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
    throw new Error("Source codec not supported for compression");
  }

  conversion.onProgress = (progress) => onProgress(Math.min(99, Math.round(progress * 100)));
  registerCancel(() => {
    conversion.cancel().catch(() => {});
  });

  try {
    await conversion.execute();
  } catch (err) {
    if (err instanceof ConversionCanceledError) throw new CompressionCanceled();
    throw err;
  }

  const buffer = output.target.buffer;
  if (!buffer) throw new Error("Compression produced no output");
  onProgress(100);

  const base = file.name.replace(/\.[^.]+$/, "");
  return new File([buffer], `${base}-compressed.mp4`, { type: "video/mp4" });
}
