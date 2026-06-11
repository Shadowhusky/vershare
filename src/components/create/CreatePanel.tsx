"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import {
  Type,
  FileText,
  Code,
  File as FileIcon,
  Image as ImageIcon,
  Loader2,
  Send,
  Settings2,
  Zap,
  Clock,
  Infinity,
  LogOut,
  User,
} from "lucide-react";
import TextTab from "./TextTab";
import MarkdownTab from "./MarkdownTab";
import CodeTab from "./CodeTab";
import FileTab from "./FileTab";
import ImageTab from "./ImageTab";
import SmartDropZone, { SmartDetectResult } from "./SmartDropZone";
import ShareLinkBox from "@/components/shared/ShareLinkBox";
import P2PSharePanel from "./P2PSharePanel";
import RetroProgress from "@/components/shared/RetroProgress";
import SharedPreview, { LastShared } from "./SharedPreview";
import { ShareType } from "@/lib/types";
import { HistoryItem } from "@/hooks/use-upload-history";
import { useT } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { MAX_FILE_SIZE, UPLOAD_PART_SIZE, formatFileSize } from "@/lib/constants";
import { uploadFileMultipart, UploadCanceledError } from "@/lib/multipart-upload";
import {
  canCompressVideo,
  compressVideo,
  remuxVideo,
  probeMp4Streamable,
  cleanupCompressTmp,
  CompressionCanceled,
} from "@/lib/video-compress";
import type { TranslationKey } from "@/lib/i18n/locales/en";

interface SubmitPayload {
  type: ShareType;
  content?: string;
  language?: string;
  file?: File;
}

const TABS: { type: ShareType; labelKey: TranslationKey; icon: React.ReactNode }[] = [
  { type: "text", labelKey: "create.tab.text", icon: <Type size={14} /> },
  { type: "markdown", labelKey: "create.tab.md", icon: <FileText size={14} /> },
  { type: "code", labelKey: "create.tab.code", icon: <Code size={14} /> },
  { type: "file", labelKey: "create.tab.file", icon: <FileIcon size={14} /> },
  { type: "image", labelKey: "create.tab.img", icon: <ImageIcon size={14} /> },
];

export default function CreatePanel({ onCreated }: { onCreated: (item: HistoryItem) => void }) {
  const t = useT();
  const [mode, setMode] = useState<"smart" | "manual">("smart");
  const [activeTab, setActiveTab] = useState<ShareType>("text");
  const [title, setTitle] = useState("");

  // Smart mode state
  const [smartResult, setSmartResult] = useState<SmartDetectResult | null>(null);

  // Manual mode state
  const [textContent, setTextContent] = useState("");
  const [mdContent, setMdContent] = useState("");
  const [codeContent, setCodeContent] = useState("");
  const [codeLanguage, setCodeLanguage] = useState("javascript");
  const [file, setFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  // Expiry & auth state
  const [permanent, setPermanent] = useState(false);
  const { email: userEmail, verified: emailVerified, openAuth, logout } = useAuth();
  const wantsPermanentRef = useRef(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shareId, setShareId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ loaded: number; total: number } | null>(null);
  const uploadAbortRef = useRef<AbortController | null>(null);
  const [lastShared, setLastShared] = useState<LastShared | null>(null);
  const [compressAsk, setCompressAsk] = useState<SubmitPayload | null>(null);
  const [compressPct, setCompressPct] = useState<number | null>(null);
  const [streamFixPct, setStreamFixPct] = useState<number | null>(null);
  const cancelCompressRef = useRef<(() => void) | null>(null);
  const busyTransfer = uploadProgress !== null || compressPct !== null || streamFixPct !== null;

  // Leaving mid-upload/compress silently kills the work — warn first
  useEffect(() => {
    if (!busyTransfer) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busyTransfer]);

  // Object URLs hold the shared File alive — release on replace/unmount
  const lastObjectUrlRef = useRef<string | null>(null);
  useEffect(() => {
    const prev = lastObjectUrlRef.current;
    if (prev && prev !== lastShared?.objectUrl) URL.revokeObjectURL(prev);
    lastObjectUrlRef.current = lastShared?.objectUrl ?? null;
  }, [lastShared]);
  useEffect(() => () => {
    if (lastObjectUrlRef.current) URL.revokeObjectURL(lastObjectUrlRef.current);
  }, []);

  // Sweep compression temp files left by previous sessions
  useEffect(() => {
    cleanupCompressTmp();
  }, []);

  const [demoText, setDemoText] = useState<string | null>(null);

  // Listen for wizard demo injection
  useEffect(() => {
    const handler = () => {
      if (mode === "smart") {
        setDemoText(t("create.demoText"));
      }
    };
    window.addEventListener("vershare:inject-demo", handler);
    return () => window.removeEventListener("vershare:inject-demo", handler);
  }, [mode, t]);

  // Complete a pending PERMANENT selection once the user finishes auth
  useEffect(() => {
    if (emailVerified && wantsPermanentRef.current) {
      setPermanent(true);
      wantsPermanentRef.current = false;
    }
    if (!userEmail) setPermanent(false);
  }, [userEmail, emailVerified]);

  const handleSmartDetect = useCallback((result: SmartDetectResult) => {
    setSmartResult(result);
  }, []);

  const getSubmitData = (): {
    type: ShareType;
    content?: string;
    language?: string;
    file?: File;
  } | null => {
    if (mode === "smart") {
      if (!smartResult) return null;
      if (smartResult.file) {
        return { type: smartResult.type, file: smartResult.file };
      }
      if (smartResult.content?.trim()) {
        return {
          type: smartResult.type,
          content: smartResult.content,
          language: smartResult.language,
        };
      }
      return null;
    }

    // Manual mode
    switch (activeTab) {
      case "text":
        return textContent.trim() ? { type: "text", content: textContent } : null;
      case "markdown":
        return mdContent.trim() ? { type: "markdown", content: mdContent } : null;
      case "code":
        return codeContent.trim()
          ? { type: "code", content: codeContent, language: codeLanguage }
          : null;
      case "file":
        return file ? { type: "file", file } : null;
      case "image":
        return imageFile ? { type: "image", file: imageFile } : null;
    }
  };

  const submitData = getSubmitData();
  const canSubmit = submitData !== null;

  const finishCreate = async (data: Record<string, any>, payload: SubmitPayload) => {
    setShareId(data.id);
    setLastShared(
      payload.file
        ? {
            type: payload.type,
            fileName: payload.file.name,
            mime: payload.file.type || "application/octet-stream",
            objectUrl: URL.createObjectURL(payload.file),
          }
        : { type: payload.type, content: payload.content, language: payload.language }
    );

    // Auto-copy to clipboard (no native share popup)
    const shareUrl = `${window.location.origin}/s/${data.id}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setToast(t("create.toast.linkCopied"));
    } catch {
      setToast(t("create.toast.shareCreated"));
    }
    setTimeout(() => setToast(null), 3000);

    onCreated({
      share_id: data.id,
      share_type: data.type,
      title: data.title || null,
      file_name: data.fileName || null,
      file_size: data.fileSize || null,
      created_at: data.createdAt,
      expires_at: data.expiresAt || null,
    });
  };

  // Camera MP4/MOVs keep their index (moov) at the file's end — the player
  // must fetch the tail before it can start. A stream-copy remux into
  // fragmented MP4 (no re-encode, I/O-speed) makes playback start instantly.
  const prepareVideoForStreaming = async (payload: SubmitPayload): Promise<SubmitPayload> => {
    const f = payload.file;
    if (!f || !f.type.startsWith("video/") || !canCompressVideo()) return payload;
    const streamable = await probeMp4Streamable(f).catch(() => null);
    if (streamable !== false) return payload;
    setStreamFixPct(0);
    try {
      const remuxed = await remuxVideo(f, setStreamFixPct, (cancel) => {
        cancelCompressRef.current = cancel;
      });
      return { ...payload, file: remuxed };
    } catch {
      return payload; // canceled or codec can't be copied — share untouched
    } finally {
      setStreamFixPct(null);
      cancelCompressRef.current = null;
    }
  };

  const performSubmit = async (rawPayload: SubmitPayload) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const payload = await prepareVideoForStreaming(rawPayload);
      // Chunked path: required past the single-request ceiling, and preferred
      // for signed-in users beyond one chunk — big single bodies blow the
      // Worker memory limit server-side (Cloudflare 1102)
      const chunked =
        payload.file &&
        (payload.file.size > MAX_FILE_SIZE || (userEmail && payload.file.size > UPLOAD_PART_SIZE));
      if (payload.file && chunked) {
        if (!userEmail) {
          openAuth();
          throw new Error(t("create.upload.signInRequired"));
        }
        const controller = new AbortController();
        uploadAbortRef.current = controller;
        setUploadProgress({ loaded: 0, total: payload.file.size });
        const data = await uploadFileMultipart({
          file: payload.file,
          type: payload.type === "image" ? "image" : "file",
          title: title.trim() || undefined,
          permanent: permanent || undefined,
          onProgress: (loaded, total) => setUploadProgress({ loaded, total }),
          signal: controller.signal,
        });
        await finishCreate(data as unknown as Record<string, any>, payload);
        return;
      }

      let res: Response;

      if (payload.file) {
        const formData = new FormData();
        formData.append("file", payload.file);
        formData.append("type", payload.type);
        if (title.trim()) formData.append("title", title.trim());
        if (permanent) formData.append("permanent", "true");
        res = await fetch("/api/shares", { method: "POST", body: formData });
      } else {
        res = await fetch("/api/shares", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: payload.type,
            title: title.trim() || undefined,
            content: payload.content,
            language: payload.language,
            permanent: permanent || undefined,
          }),
        });
      }

      // Worker-limit failures return an HTML error page, not JSON
      const data = (await res.json().catch(() => ({}))) as Record<string, any>;
      if (!res.ok) {
        throw new Error(data.error || `${t("create.error.createFailed")} (${res.status})`);
      }
      await finishCreate(data, payload);
    } catch (err) {
      if (!(err instanceof UploadCanceledError)) {
        setError(err instanceof Error ? err.message : t("create.error.generic"));
      }
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
      uploadAbortRef.current = null;
    }
  };

  const handleSubmit = async () => {
    if (!submitData || isSubmitting) return;
    const f = submitData.file;
    // Big videos: offer in-browser compression before committing to the upload
    if (f && f.type.startsWith("video/") && f.size > MAX_FILE_SIZE && canCompressVideo()) {
      setCompressAsk(submitData);
      return;
    }
    await performSubmit(submitData);
  };

  const startCompress = async () => {
    if (!compressAsk) return;
    const payload = compressAsk;
    setCompressPct(0);
    try {
      const compressed = await compressVideo(payload.file!, setCompressPct, (cancel) => {
        cancelCompressRef.current = cancel;
      });
      setCompressAsk(null);
      setCompressPct(null);
      await performSubmit({ ...payload, file: compressed });
    } catch (err) {
      setCompressAsk(null);
      setCompressPct(null);
      if (err instanceof CompressionCanceled) return;
      setToast(t("compress.failed"));
      setTimeout(() => setToast(null), 4000);
      await performSubmit(payload);
    } finally {
      cancelCompressRef.current = null;
    }
  };

  const shareOriginal = async () => {
    if (!compressAsk) return;
    const payload = compressAsk;
    setCompressAsk(null);
    await performSubmit(payload);
  };

  const handleReset = () => {
    setShareId(null);
    setLastShared(null);
    setTitle("");
    setSmartResult(null);
    setTextContent("");
    setMdContent("");
    setCodeContent("");
    setFile(null);
    setImageFile(null);
    setError(null);
  };

  if (shareId) {
    return (
      <div className="space-y-6">
        <ShareLinkBox shareId={shareId} />
        {lastShared && <SharedPreview shared={lastShared} />}
        <button
          onClick={handleReset}
          className="w-full py-3 border-2 border-pixel-cyan/30 text-pixel-cyan font-[family-name:var(--font-pixel-stack)] text-sm hover:bg-pixel-cyan/10 hover:border-pixel-cyan/50 transition-all"
        >
          &gt; {t("create.newDrop")}
        </button>
      </div>
    );
  }

  // P2P props
  const p2pType = mode === "smart" ? (submitData?.type || "text") : activeTab;
  const p2pContent =
    mode === "smart"
      ? submitData?.content
      : activeTab === "text"
        ? textContent
        : activeTab === "markdown"
          ? mdContent
          : activeTab === "code"
            ? codeContent
            : undefined;
  const p2pLanguage =
    mode === "smart"
      ? submitData?.language
      : activeTab === "code"
        ? codeLanguage
        : undefined;
  const p2pFile =
    mode === "smart"
      ? submitData?.file
      : activeTab === "file"
        ? file
        : activeTab === "image"
          ? imageFile
          : undefined;

  return (
    <div className="space-y-6">
      {/* Title input */}
      <div>
        <label className="text-pixel-gray text-sm block mb-2">
          <span className="text-pixel-amber/50">&gt;</span> {t("create.title.label")}{" "}
          <span className="text-pixel-gray/50">{t("create.title.optional")}</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("create.title.placeholder")}
          className="pixel-input text-base"
        />
      </div>

      {/* Expiry toggle */}
      <div data-tour="expiry" className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPermanent(false)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-[family-name:var(--font-pixel-stack)] border transition-all ${
              !permanent
                ? "border-pixel-amber text-pixel-amber bg-pixel-amber/10"
                : "border-pixel-gray/30 text-pixel-gray/50 hover:text-pixel-gray"
            }`}
          >
            <Clock size={12} />
            {t("create.expiry.sevenDays")}
          </button>
          <button
            onClick={() => {
              if (!userEmail || !emailVerified) {
                wantsPermanentRef.current = true;
                openAuth();
              } else {
                setPermanent(true);
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-[family-name:var(--font-pixel-stack)] border transition-all ${
              permanent && emailVerified
                ? "border-pixel-green text-pixel-green bg-pixel-green/10"
                : "border-pixel-gray/30 text-pixel-gray/50 hover:text-pixel-gray"
            }`}
          >
            <Infinity size={12} />
            {t("create.expiry.permanent")}
            {userEmail && !emailVerified && (
              <span className="text-pixel-amber text-[10px] ml-1">!</span>
            )}
          </button>
        </div>
        {userEmail ? (
          <div className="flex items-center gap-2">
            <span className="text-pixel-cyan text-sm flex items-center gap-1">
              <User size={10} /> {userEmail}
            </span>
            <button
              onClick={() => logout()}
              className="text-pixel-gray/50 hover:text-pixel-pink transition-colors"
            >
              <LogOut size={12} />
            </button>
          </div>
        ) : null}
      </div>

      {/* Mode toggle */}
      <div data-tour="mode" className="flex items-center justify-end gap-2">
        <button
          onClick={() => setMode("smart")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-[family-name:var(--font-pixel-stack)] border transition-all ${
            mode === "smart"
              ? "border-pixel-green text-pixel-green bg-pixel-green/10"
              : "border-pixel-gray/30 text-pixel-gray/50 hover:text-pixel-gray hover:border-pixel-gray/50"
          }`}
        >
          <Zap size={12} />
          {t("create.mode.smart")}
        </button>
        <button
          onClick={() => setMode("manual")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-[family-name:var(--font-pixel-stack)] border transition-all ${
            mode === "manual"
              ? "border-pixel-green text-pixel-green bg-pixel-green/10"
              : "border-pixel-gray/30 text-pixel-gray/50 hover:text-pixel-gray hover:border-pixel-gray/50"
          }`}
        >
          <Settings2 size={12} />
          {t("create.mode.manual")}
        </button>
      </div>

      {/* Content area */}
      <div data-tour="content">
      {mode === "smart" ? (
        <SmartDropZone onDetect={handleSmartDetect} injectText={demoText} />
      ) : (
        <>
          {/* Tab bar */}
          <div className="flex border-b-2 border-pixel-green/20 overflow-x-auto mb-4">
            {TABS.map((tab) => (
              <button
                key={tab.type}
                onClick={() => setActiveTab(tab.type)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-[family-name:var(--font-pixel-stack)] transition-all shrink-0 ${
                  activeTab === tab.type ? "tab-active" : "tab-inactive"
                }`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{t(tab.labelKey)}</span>
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div>
            {activeTab === "text" && (
              <TextTab content={textContent} onChange={setTextContent} />
            )}
            {activeTab === "markdown" && (
              <MarkdownTab content={mdContent} onChange={setMdContent} />
            )}
            {activeTab === "code" && (
              <CodeTab
                content={codeContent}
                language={codeLanguage}
                onContentChange={setCodeContent}
                onLanguageChange={setCodeLanguage}
              />
            )}
            {activeTab === "file" && <FileTab file={file} onFile={setFile} />}
            {activeTab === "image" && (
              <ImageTab file={imageFile} onFile={setImageFile} />
            )}
          </div>
        </>
      )}
      </div>

      {/* Error */}
      {error && (
        <p className="text-pixel-pink text-sm font-[family-name:var(--font-pixel-stack)]">
          {t("create.error.label", { message: error })}
        </p>
      )}

      {/* Chunked upload progress */}
      {uploadProgress && (
        <div className="pixel-border p-4 space-y-3 bg-pixel-dark/40">
          <RetroProgress
            percent={Math.floor((uploadProgress.loaded / uploadProgress.total) * 100)}
            color="cyan"
            label={`${formatFileSize(uploadProgress.loaded)} / ${formatFileSize(uploadProgress.total)}`}
          />
          <button
            onClick={() => uploadAbortRef.current?.abort()}
            className="px-3 py-1.5 text-xs font-[family-name:var(--font-pixel-stack)] border border-pixel-gray/30 text-pixel-gray hover:text-pixel-pink hover:border-pixel-pink/40 transition-colors"
          >
            {t("create.upload.cancel")}
          </button>
        </div>
      )}

      {/* Submit */}
      <button
        data-tour="submit"
        onClick={handleSubmit}
        disabled={!canSubmit || isSubmitting}
        className={`w-full py-4 border-2 font-[family-name:var(--font-pixel-stack)] text-base flex items-center justify-center gap-3 transition-all ${
          canSubmit && !isSubmitting
            ? "border-pixel-green text-pixel-green hover:bg-pixel-green/10 animate-pulse-glow"
            : "border-pixel-gray/30 text-pixel-gray/50 cursor-not-allowed"
        }`}
      >
        {isSubmitting ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            {t("create.submit.dropping")}
          </>
        ) : (
          <>
            <Send size={16} />
            {t("create.submit.dropIt")}
          </>
        )}
      </button>

      {/* P2P Option — divider + panel only when there is content to share */}
      {canSubmit && (
        <div data-tour="p2p" className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 border-t border-pixel-gray/20" />
            <span className="text-pixel-gray/40 text-sm font-[family-name:var(--font-pixel-stack)]">
              {t("create.or")}
            </span>
            <div className="flex-1 border-t border-pixel-gray/20" />
          </div>

          <P2PSharePanel
            type={p2pType}
            content={p2pContent}
            language={p2pLanguage}
            title={title.trim() || undefined}
            file={p2pFile}
          />
        </div>
      )}

      {/* Stream-copy remux of moov-at-end videos */}
      {streamFixPct !== null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-overlay-in">
          <div className="pixel-border bg-pixel-darker p-6 max-w-md w-full mx-4 space-y-4 animate-modal-in">
            <h3 className="font-[family-name:var(--font-pixel-stack)] text-pixel-cyan text-xs">
              {t("stream.title")}
            </h3>
            <RetroProgress percent={streamFixPct} color="cyan" label={t("stream.progress")} />
            <div className="flex justify-end">
              <button
                onClick={() => cancelCompressRef.current?.()}
                className="px-4 py-2 border border-pixel-gray/30 text-pixel-gray text-xs font-[family-name:var(--font-pixel-stack)] hover:text-pixel-pink hover:border-pixel-pink/40 transition-all"
              >
                {t("confirm.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Compression offer for big videos */}
      {compressAsk && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-overlay-in"
          onClick={() => {
            if (compressPct === null) setCompressAsk(null);
          }}
        >
          <div
            className="pixel-border bg-pixel-darker p-6 max-w-md w-full mx-4 space-y-4 animate-modal-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-[family-name:var(--font-pixel-stack)] text-pixel-amber text-xs">
              {t("compress.title")}
            </h3>
            {compressPct === null ? (
              <>
                <p className="text-pixel-gray text-sm">
                  {t("compress.body", {
                    name: compressAsk.file!.name,
                    size: formatFileSize(compressAsk.file!.size),
                  })}
                </p>
                <div className="flex gap-3 justify-end flex-wrap">
                  <button
                    onClick={shareOriginal}
                    className="px-4 py-2 border border-pixel-gray/30 text-pixel-gray text-xs font-[family-name:var(--font-pixel-stack)] hover:bg-pixel-gray/10 transition-all"
                  >
                    {t("compress.original")}
                  </button>
                  <button
                    onClick={startCompress}
                    className="px-4 py-2 border border-pixel-green text-pixel-green text-xs font-[family-name:var(--font-pixel-stack)] hover:bg-pixel-green/10 transition-all animate-pulse-glow"
                  >
                    {t("compress.action")}
                  </button>
                </div>
              </>
            ) : (
              <>
                <RetroProgress percent={compressPct} color="purple" label={t("compress.progress")} />
                <div className="flex justify-end">
                  <button
                    onClick={() => cancelCompressRef.current?.()}
                    className="px-4 py-2 border border-pixel-gray/30 text-pixel-gray text-xs font-[family-name:var(--font-pixel-stack)] hover:text-pixel-pink hover:border-pixel-pink/40 transition-all"
                  >
                    {t("confirm.cancel")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 pixel-border bg-pixel-darker text-pixel-green font-[family-name:var(--font-pixel-stack)] text-sm animate-fade-in">
          {toast}
        </div>
      )}

    </div>
  );
}
