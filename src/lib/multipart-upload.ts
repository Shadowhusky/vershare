// Client-side chunked upload: slice the file into uniform parts (R2 multipart
// requires equal sizes except the last), push each through its own request to
// stay under the Workers body cap, then complete to stitch them into the share.

export interface ShareCreated {
  id: string;
  type: string;
  title: string | null;
  fileName?: string;
  fileSize?: number;
  createdAt: string;
  expiresAt: string | null;
}

interface PartRef {
  partNumber: number;
  etag: string;
}

const CONCURRENCY = 3;
const PART_RETRIES = 3;

export class UploadCanceledError extends Error {
  constructor() {
    super("Upload canceled");
    this.name = "UploadCanceledError";
  }
}

async function jsonOrThrow(res: Response): Promise<Record<string, unknown>> {
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error((data.error as string) || `Request failed (${res.status})`);
  }
  return data;
}

function putPart(
  uploadId: string,
  partNumber: number,
  blob: Blob,
  onBytes: (loaded: number) => void,
  signal: AbortSignal
): Promise<PartRef> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const onAbort = () => xhr.abort();
    signal.addEventListener("abort", onAbort, { once: true });

    xhr.open("PUT", `/api/uploads/${uploadId}/part?n=${partNumber}`);
    xhr.responseType = "json";
    xhr.upload.onprogress = (e) => onBytes(e.loaded);
    xhr.onload = () => {
      signal.removeEventListener("abort", onAbort);
      if (xhr.status >= 200 && xhr.status < 300 && xhr.response?.etag) {
        onBytes(blob.size);
        resolve(xhr.response as PartRef);
      } else {
        reject(new Error(xhr.response?.error || `Part ${partNumber} failed (${xhr.status})`));
      }
    };
    xhr.onerror = () => {
      signal.removeEventListener("abort", onAbort);
      reject(new Error(`Part ${partNumber} failed (network)`));
    };
    xhr.onabort = () => {
      signal.removeEventListener("abort", onAbort);
      reject(new UploadCanceledError());
    };
    xhr.send(blob);
  });
}

export async function uploadFileMultipart(options: {
  file: File;
  type: "file" | "image";
  title?: string;
  permanent?: boolean;
  onProgress: (loaded: number, total: number) => void;
  signal: AbortSignal;
}): Promise<ShareCreated> {
  const { file, signal, onProgress } = options;

  const init = await jsonOrThrow(
    await fetch("/api/uploads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        type: options.type,
      }),
    })
  );
  const uploadId = init.id as string;
  const partSize = init.partSize as number;
  const partCount = Math.ceil(file.size / partSize);

  const loadedByPart = new Map<number, number>();
  const reportProgress = () => {
    let loaded = 0;
    for (const v of loadedByPart.values()) loaded += v;
    onProgress(Math.min(loaded, file.size), file.size);
  };

  const abortServerSide = () =>
    fetch(`/api/uploads/${uploadId}`, { method: "DELETE", keepalive: true }).catch(() => {});

  const parts: PartRef[] = [];
  let nextPart = 1;
  let failed: Error | null = null;

  const worker = async () => {
    while (!failed && !signal.aborted) {
      const n = nextPart++;
      if (n > partCount) return;
      const blob = file.slice((n - 1) * partSize, Math.min(n * partSize, file.size));

      let done = false;
      let lastError: Error | null = null;
      for (let attempt = 1; attempt <= PART_RETRIES && !done; attempt++) {
        try {
          const part = await putPart(uploadId, n, blob, (b) => {
            loadedByPart.set(n, b);
            reportProgress();
          }, signal);
          parts.push(part);
          done = true;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          if (lastError instanceof UploadCanceledError) break;
          loadedByPart.set(n, 0);
          reportProgress();
        }
      }
      if (!done) {
        failed = lastError ?? new Error(`Part ${n} failed`);
        return;
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, partCount) }, worker));

  if (signal.aborted) {
    abortServerSide();
    throw new UploadCanceledError();
  }
  if (failed) {
    abortServerSide();
    throw failed;
  }

  const share = await jsonOrThrow(
    await fetch(`/api/uploads/${uploadId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        parts,
        title: options.title,
        permanent: options.permanent || undefined,
      }),
    })
  );
  return share as unknown as ShareCreated;
}
