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
import { ShareType } from "@/lib/types";
import { HistoryItem } from "@/hooks/use-upload-history";
import { useT } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import type { TranslationKey } from "@/lib/i18n/locales/en";

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

  const handleSubmit = async () => {
    if (!submitData || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    try {
      let res: Response;

      if (submitData.file) {
        const formData = new FormData();
        formData.append("file", submitData.file);
        formData.append("type", submitData.type);
        if (title.trim()) formData.append("title", title.trim());
        if (permanent) formData.append("permanent", "true");
        res = await fetch("/api/shares", { method: "POST", body: formData });
      } else {
        res = await fetch("/api/shares", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: submitData.type,
            title: title.trim() || undefined,
            content: submitData.content,
            language: submitData.language,
            permanent: permanent || undefined,
          }),
        });
      }

      if (!res.ok) {
        const data = await res.json() as Record<string, any>;
        throw new Error(data.error || t("create.error.createFailed"));
      }

      const data = await res.json() as Record<string, any>;
      setShareId(data.id);

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
    } catch (err) {
      setError(err instanceof Error ? err.message : t("create.error.generic"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setShareId(null);
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
          <div className="flex border-b-2 border-pixel-green/20 overflow-x-auto">
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

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 pixel-border bg-pixel-darker text-pixel-green font-[family-name:var(--font-pixel-stack)] text-sm animate-fade-in">
          {toast}
        </div>
      )}

    </div>
  );
}
