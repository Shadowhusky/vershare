// Client-side video tooling via WebCodecs/mediabunny (lazily imported).
//
// All outputs are regular MP4s with the moov index written at the FRONT
// (fastStart "reserve"): browsers start playing fragmented MP4 only after
// scanning the whole file for an index (measured — full download), and
// moov-at-end files need the tail first. Everything streams to OPFS so
// memory stays flat on multi-GB videos (in-memory buffering crashed tabs).
import type { StreamTargetChunk, Output, Target, Rotation } from "mediabunny";

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
// true = already streamable (moov first); null = not MP4/MOV.
// Fragmented files (moof) also return false — browsers scan them fully.
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
    if (type === "moof") return false;
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

interface OutputSink {
  target: Target;
  finish: (outName: string) => Promise<File>;
  abort: () => Promise<void>;
}

async function createOutputSink(inputSize: number): Promise<OutputSink> {
  const { StreamTarget, BufferTarget } = await import("mediabunny");

  const tmpDir = await getTmpDir();
  if (tmpDir) {
    try {
      const handle = await tmpDir.getFileHandle(`out-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mp4`, {
        create: true,
      });
      const writable = await handle.createWritable();
      const target = new StreamTarget(
        new WritableStream<StreamTargetChunk>({
          write: (chunk) =>
            writable.write({ type: "write", position: chunk.position, data: chunk.data }),
        }),
        { chunked: true }
      );
      return {
        target,
        finish: async (outName) => {
          await writable.close();
          // disk-backed File — uploads slice it straight off OPFS
          const result = await handle.getFile();
          return new File([result], outName, { type: "video/mp4" });
        },
        abort: async () => {
          await writable.abort().catch(() => {});
        },
      };
    } catch {
      // fall through to in-memory target
    }
  }

  if (inputSize > MAX_INPUT_WITHOUT_OPFS) {
    throw new Error("Video too large to process in this browser");
  }
  const target = new BufferTarget();
  return {
    target,
    finish: async (outName) => {
      if (!target.buffer) throw new Error("Conversion produced no output");
      return new File([target.buffer], outName, { type: "video/mp4" });
    },
    abort: async () => {},
  };
}

function outName(file: File, suffix: string): string {
  return `${file.name.replace(/\.[^.]+$/, "")}${suffix}.mp4`;
}

// Packet-copy a video into a fast-start MP4 (moov reserved at the front).
// No re-encode — I/O-speed, lossless. The two track iterators are merged by
// timestamp so the muxer interleaves without buffering a whole track.
async function faststartCopy(
  src: Blob,
  name: string,
  onProgress: (fraction: number) => void,
  isCanceled: () => boolean
): Promise<File> {
  const {
    Input,
    Output,
    ALL_FORMATS,
    BlobSource,
    Mp4OutputFormat,
    EncodedPacketSink,
    EncodedVideoPacketSource,
    EncodedAudioPacketSource,
  } = await import("mediabunny");

  const input = new Input({ source: new BlobSource(src), formats: ALL_FORMATS });
  const videoTrack = await input.getPrimaryVideoTrack();
  if (!videoTrack || !videoTrack.codec) throw new Error("Unsupported video codec");
  const videoConfig = await videoTrack.getDecoderConfig();
  if (!videoConfig) throw new Error("Unsupported video codec");
  const audioTrack = await input.getPrimaryAudioTrack();
  const audioUsable = !!audioTrack?.codec;
  const audioConfig = audioUsable ? await audioTrack!.getDecoderConfig() : null;

  const duration = await input.computeDuration();
  const videoStats = await videoTrack.computePacketStats(Infinity);
  const audioStats = audioUsable ? await audioTrack!.computePacketStats(Infinity) : null;

  const sink = await createOutputSink(src.size);
  const output = new Output({
    format: new Mp4OutputFormat({ fastStart: "reserve" }),
    target: sink.target,
  });

  const videoSource = new EncodedVideoPacketSource(videoTrack.codec);
  output.addVideoTrack(videoSource, {
    maximumPacketCount: videoStats.packetCount + 16,
    rotation: videoTrack.rotation as Rotation,
  });
  const audioSource = audioUsable ? new EncodedAudioPacketSource(audioTrack!.codec!) : null;
  if (audioSource) {
    output.addAudioTrack(audioSource, { maximumPacketCount: (audioStats?.packetCount ?? 0) + 16 });
  }

  await output.start();

  try {
    const videoSink = new EncodedPacketSink(videoTrack);
    const audioSink = audioSource ? new EncodedPacketSink(audioTrack!) : null;

    // AAC priming gives audio a negative start timestamp, which the packet
    // sources reject — shift both tracks uniformly to keep A/V sync.
    const firstV = await videoSink.getFirstPacket({ metadataOnly: true });
    const firstA = audioSink ? await audioSink.getFirstPacket({ metadataOnly: true }) : null;
    const shift = Math.max(0, -Math.min(firstV?.timestamp ?? 0, firstA?.timestamp ?? 0));

    const videoIter = videoSink.packets()[Symbol.asyncIterator]();
    const audioIter = audioSink ? audioSink.packets()[Symbol.asyncIterator]() : null;

    let v = await videoIter.next();
    let a = audioIter ? await audioIter.next() : { done: true as const, value: undefined };
    let firstVideo = true;
    let firstAudio = true;

    while (!v.done || !a.done) {
      if (isCanceled()) throw new CompressionCanceled();
      const pickVideo = !v.done && (a.done || v.value.timestamp <= a.value!.timestamp);
      if (pickVideo) {
        const packet = shift > 0 ? v.value!.clone({ timestamp: v.value!.timestamp + shift }) : v.value!;
        await videoSource.add(packet, firstVideo ? { decoderConfig: videoConfig } : undefined);
        firstVideo = false;
        if (duration > 0) onProgress(Math.min(0.99, v.value!.timestamp / duration));
        v = await videoIter.next();
      } else {
        const packet = shift > 0 ? a.value!.clone({ timestamp: a.value!.timestamp + shift }) : a.value!;
        await audioSource!.add(packet, firstAudio ? { decoderConfig: audioConfig! } : undefined);
        firstAudio = false;
        a = await audioIter!.next();
      }
    }

    await output.finalize();
  } catch (err) {
    await cancelOutput(output);
    await sink.abort();
    throw err;
  }

  onProgress(1);
  return sink.finish(name);
}

async function cancelOutput(output: Output): Promise<void> {
  try {
    await output.cancel();
  } catch {
    // already finalized/canceled
  }
}

// Lossless restructure: same encoded samples, index moved to the front so
// playback starts instantly.
export async function remuxVideo(
  file: File,
  onProgress: (pct: number) => void,
  registerCancel: (cancel: () => void) => void
): Promise<File> {
  let canceled = false;
  registerCancel(() => {
    canceled = true;
  });
  return faststartCopy(file, outName(file, ""), (f) => onProgress(Math.round(f * 100)), () => canceled);
}

export async function compressVideo(
  file: File,
  onProgress: (pct: number) => void,
  registerCancel: (cancel: () => void) => void
): Promise<File> {
  const { Input, Output, Conversion, ALL_FORMATS, BlobSource, Mp4OutputFormat, QUALITY_MEDIUM, ConversionCanceledError } =
    await import("mediabunny");

  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
  const videoTrack = await input.getPrimaryVideoTrack();
  if (!videoTrack) throw new Error("No video track found");
  const targetWidth = Math.min(MAX_WIDTH, videoTrack.displayWidth || MAX_WIDTH);

  // Pass 1: transcode into a fragmented temp (the only mode the high-level
  // converter can stream to disk). Pass 2 below restructures it to fast-start.
  const tempSink = await createOutputSink(file.size);
  const output = new Output({
    format: new Mp4OutputFormat({ fastStart: "fragmented" }),
    target: tempSink.target,
  });

  const conversion = await Conversion.init({
    input,
    output,
    video: { width: targetWidth, bitrate: QUALITY_MEDIUM },
    audio: { bitrate: QUALITY_MEDIUM },
  });

  // A discarded track means the source codec can't be decoded here — bail so
  // the caller falls back to sharing the original.
  if (conversion.discardedTracks.length > 0) {
    await tempSink.abort();
    throw new Error("Source codec not supported for compression");
  }

  let canceled = false;
  conversion.onProgress = (progress) => onProgress(Math.min(90, Math.round(progress * 90)));
  registerCancel(() => {
    canceled = true;
    conversion.cancel().catch(() => {});
  });

  let temp: File;
  try {
    await conversion.execute();
    temp = await tempSink.finish("temp.mp4");
  } catch (err) {
    await tempSink.abort();
    if (err instanceof ConversionCanceledError) throw new CompressionCanceled();
    throw err;
  }

  return faststartCopy(
    temp,
    outName(file, "-compressed"),
    (f) => onProgress(90 + Math.round(f * 10)),
    () => canceled
  );
}
