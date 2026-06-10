"use client";
import Peer, { DataConnection } from "peerjs";

export interface P2PPayload {
  type: "text" | "markdown" | "code" | "file" | "image";
  title?: string;
  content?: string;
  language?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
}

export interface P2PFileChunk {
  kind: "chunk";
  index: number;
  total: number;
  data: string; // base64-encoded
}

export interface P2PMetadata {
  kind: "metadata";
  payload: P2PPayload;
  hasFile: boolean;
}

export interface P2PComplete {
  kind: "complete";
}

export type P2PMessage = P2PMetadata | P2PFileChunk | P2PComplete;

const CHUNK_SIZE = 16 * 1024; // 16KB
const CONNECT_TIMEOUT_MS = 15_000;

function getIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
  ];

  // Add TURN server(s) from env for NAT relay fallback
  const turnUrl = process.env.NEXT_PUBLIC_TURN_URL;
  const turnUser = process.env.NEXT_PUBLIC_TURN_USERNAME;
  const turnCred = process.env.NEXT_PUBLIC_TURN_CREDENTIAL;

  if (turnUrl) {
    const urls = turnUrl.split(",").map((u) => u.trim());
    servers.push({
      urls,
      username: turnUser || "",
      credential: turnCred || "",
    });
  }

  return servers;
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export function createPeer(): Promise<Peer> {
  return new Promise((resolve, reject) => {
    const peer = new Peer({
      config: {
        iceServers: getIceServers(),
        iceCandidatePoolSize: 10,
      },
    });
    peer.on("open", () => resolve(peer));
    peer.on("error", (err) => reject(err));
  });
}

/**
 * Connect to a remote peer with timeout and retry.
 */
export function connectToPeer(
  peer: Peer,
  remotePeerId: string,
  retries = 1
): Promise<DataConnection> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let attempt = 0;

    function tryConnect() {
      const conn = peer.connect(remotePeerId, { reliable: true });
      const timer = setTimeout(() => {
        if (!settled) {
          conn.close();
          if (attempt < retries) {
            attempt++;
            tryConnect();
          } else {
            settled = true;
            reject(new Error("Connection timed out — the sender may have closed their tab or both peers are behind restrictive NATs. Configure a TURN server for reliable connections."));
          }
        }
      }, CONNECT_TIMEOUT_MS);

      conn.on("open", () => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(conn);
        }
      });

      conn.on("error", (err) => {
        clearTimeout(timer);
        if (!settled) {
          if (attempt < retries) {
            attempt++;
            tryConnect();
          } else {
            settled = true;
            reject(err);
          }
        }
      });
    }

    tryConnect();
  });
}

/**
 * Send payload over a data connection.
 * fileBuffer should be pre-read from the File object before calling this.
 */
export async function sendPayload(
  conn: DataConnection,
  payload: P2PPayload,
  fileBuffer?: ArrayBuffer,
  onProgress?: (pct: number) => void
): Promise<void> {
  const hasFile = !!fileBuffer && fileBuffer.byteLength > 0;

  // Send metadata
  conn.send(JSON.stringify({ kind: "metadata", payload, hasFile }));
  await new Promise((r) => setTimeout(r, 100));

  if (hasFile) {
    const total = Math.ceil(fileBuffer.byteLength / CHUNK_SIZE);

    for (let i = 0; i < total; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, fileBuffer.byteLength);
      const chunk = fileBuffer.slice(start, end);

      conn.send(
        JSON.stringify({
          kind: "chunk",
          index: i,
          total,
          data: arrayBufferToBase64(chunk),
        } as P2PFileChunk)
      );

      const pct = Math.round(((i + 1) / total) * 100);
      onProgress?.(pct);

      // Yield to event loop every few chunks so React can re-render on both sides
      if (i % 4 === 0) {
        await new Promise((r) => setTimeout(r, 4));
      }
    }
  } else {
    // Text-only share — instant 100%
    onProgress?.(100);
  }

  await new Promise((r) => setTimeout(r, 50));
  conn.send(JSON.stringify({ kind: "complete" } as P2PComplete));
}

export function receivePayload(
  conn: DataConnection,
  onMetadata: (payload: P2PPayload, hasFile: boolean) => void,
  onProgress: (pct: number) => void,
  onComplete: (fileBlob?: Blob) => void
) {
  const chunks: ArrayBuffer[] = [];
  let metadata: P2PPayload | null = null;

  conn.on("data", (raw: unknown) => {
    let msg: P2PMessage;
    try {
      msg = typeof raw === "string" ? JSON.parse(raw) : (raw as P2PMessage);
    } catch {
      return;
    }

    if (msg.kind === "metadata") {
      metadata = msg.payload;
      onMetadata(msg.payload, (msg as P2PMetadata).hasFile);
    } else if (msg.kind === "chunk") {
      chunks[msg.index] = base64ToArrayBuffer(msg.data);
      onProgress(Math.round(((msg.index + 1) / msg.total) * 100));
    } else if (msg.kind === "complete") {
      if (chunks.length > 0 && metadata) {
        const blob = new Blob(chunks, {
          type: metadata.mimeType || "application/octet-stream",
        });
        onComplete(blob);
      } else {
        onComplete();
      }
    }
  });
}
