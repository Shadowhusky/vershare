"use client";
import { useState, useEffect, useCallback } from "react";
import { X, Loader2, Mail, CheckCircle } from "lucide-react";
import GoogleSignInButton from "./GoogleSignInButton";
import { useT } from "@/lib/i18n";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onAuth: (email: string, verified: boolean) => void;
  initialEmail?: string | null;
  initialStep?: "credentials" | "verify";
}

export default function AuthModal({ open, onClose, onAuth, initialEmail, initialStep }: AuthModalProps) {
  const t = useT();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [step, setStep] = useState<"credentials" | "verify">(initialStep || "credentials");
  const [email, setEmail] = useState(initialEmail || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // ALL hooks must be before any early return

  const close = useCallback(() => {
    onClose();
    setError("");
    setStep("credentials");
    setPendingCode(null);
    setVerifyCode("");
    setResendCooldown(0);
  }, [onClose]);

  // Sync initial state when modal opens
  useEffect(() => {
    if (open) {
      setStep(initialStep || "credentials");
      if (initialEmail) setEmail(initialEmail);
      if (initialStep === "verify") {
        fetch("/api/auth/me").then(r => r.ok ? (r.json() as Record<string, any>) : null).then(data => {
          if (data?.verifyCode) setPendingCode(data.verifyCode);
        }).catch(() => {});
      }
    }
  }, [open, initialStep, initialEmail]);

  // Escape key handler
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  // Early return AFTER all hooks
  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (tab === "register" && password !== confirmPassword) {
      setError(t("auth.error.passwordMismatch"));
      return;
    }

    setLoading(true);
    try {
      const endpoint = tab === "login" ? "/api/auth/login" : "/api/auth/register";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json() as Record<string, any>;
        throw new Error(data.error || t("auth.error.failed"));
      }
      const data = await res.json() as Record<string, any>;

      if (tab === "login") {
        const meRes = await fetch("/api/auth/me");
        const me = await meRes.json() as Record<string, any>;
        onAuth(data.email, me.emailVerified === true);
        if (!me.emailVerified) {
          if (me.verifyCode) setPendingCode(me.verifyCode);
          setStep("verify");
        } else {
          close();
        }
      } else {
        setPendingCode(data.verifyCode || null);
        setStep("verify");
        onAuth(data.email, false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.error.generic"));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    try {
      const res = await fetch("/api/auth/resend", { method: "POST" });
      const data = await res.json() as Record<string, any>;
      if (!res.ok) {
        if (data.waitSeconds) setResendCooldown(data.waitSeconds);
        throw new Error(data.error || t("auth.error.resendFailed"));
      }
      setResendCooldown(data.cooldown || 60);
      if (data.verifyCode) setPendingCode(data.verifyCode);
      else setPendingCode(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.error.resendFailed"));
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: verifyCode }),
      });
      if (!res.ok) {
        const data = await res.json() as Record<string, any>;
        throw new Error(data.error || t("auth.error.verificationFailed"));
      }
      onAuth(email, true);
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.error.verificationFailed"));
    } finally {
      setLoading(false);
    }
  };

  // Verify step
  if (step === "verify") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-overlay-in" onClick={close}>
        <div className="pixel-border bg-pixel-darker p-6 max-w-sm w-full mx-4 space-y-4 animate-modal-in" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between">
            <h3 className="font-[family-name:var(--font-pixel-stack)] text-pixel-amber text-sm">
              {t("auth.verifyEmail")}
            </h3>
            <button onClick={close} className="text-pixel-gray hover:text-pixel-pink p-1">
              <X size={16} />
            </button>
          </div>

          <div className="flex items-center gap-3 p-3 pixel-border bg-pixel-dark/50">
            <Mail size={20} className="text-pixel-cyan shrink-0" />
            <div>
              <p className="text-pixel-gray text-sm">{t("auth.codeFor")}</p>
              <p className="text-pixel-cyan text-base">{email}</p>
            </div>
          </div>

          {pendingCode ? (
            <div className="p-3 pixel-border bg-pixel-green/5 text-center">
              <p className="text-pixel-gray/50 text-xs mb-1">{t("auth.yourCode")}</p>
              <p className="text-pixel-green font-[family-name:var(--font-pixel-stack)] text-lg tracking-widest">
                {pendingCode}
              </p>
            </div>
          ) : (
            <p className="text-pixel-gray text-sm">
              {t("auth.codeSent")}
            </p>
          )}

          <form onSubmit={handleVerify} className="space-y-3">
            <input
              type="text"
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder={t("auth.codePlaceholder")}
              className="pixel-input text-base text-center tracking-[0.5em]"
              maxLength={6}
              required
              autoFocus
            />

            {error && (
              <p className="text-pixel-pink text-sm font-[family-name:var(--font-pixel-stack)]">! {error}</p>
            )}

            <button
              type="submit"
              disabled={loading || verifyCode.length !== 6}
              className="w-full py-3 border-2 border-pixel-green text-pixel-green font-[family-name:var(--font-pixel-stack)] text-sm hover:bg-pixel-green/10 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 size={12} className="animate-spin" /> {t("auth.verifying")}</> : <><CheckCircle size={12} /> {t("auth.verify")}</>}
            </button>
          </form>

          <button
            onClick={handleResend}
            disabled={resendCooldown > 0}
            className="w-full text-center text-sm text-pixel-gray/50 hover:text-pixel-cyan transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {resendCooldown > 0 ? t("auth.resendIn", { seconds: resendCooldown }) : t("auth.resendCode")}
          </button>
        </div>
      </div>
    );
  }

  // Credentials step
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-overlay-in" onClick={close}>
      <div className="pixel-border bg-pixel-darker p-6 max-w-sm w-full mx-4 space-y-4 animate-modal-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-[family-name:var(--font-pixel-stack)] text-pixel-green text-sm">
            {tab === "login" ? t("auth.login") : t("auth.register")}
          </h3>
          <button onClick={close} className="text-pixel-gray hover:text-pixel-pink p-1">
            <X size={16} />
          </button>
        </div>

        <div className="flex border-b border-pixel-green/20">
          <button
            onClick={() => { setTab("login"); setError(""); }}
            className={`px-4 py-2 text-xs font-[family-name:var(--font-pixel-stack)] ${
              tab === "login" ? "text-pixel-green border-b-2 border-pixel-green" : "text-pixel-gray"
            }`}
          >
            {t("auth.login")}
          </button>
          <button
            onClick={() => { setTab("register"); setError(""); }}
            className={`px-4 py-2 text-xs font-[family-name:var(--font-pixel-stack)] ${
              tab === "register" ? "text-pixel-green border-b-2 border-pixel-green" : "text-pixel-gray"
            }`}
          >
            {t("auth.register")}
          </button>
        </div>

        <GoogleSignInButton
          onSuccess={(googleEmail) => {
            setError("");
            onAuth(googleEmail, true);
            close();
          }}
          onError={(message) => setError(message)}
        />

        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder={t("auth.emailPlaceholder")} className="pixel-input text-base" required />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder={t("auth.passwordPlaceholder")} className="pixel-input text-base" required minLength={6} />
          {tab === "register" && (
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t("auth.confirmPasswordPlaceholder")} className="pixel-input text-base" required minLength={6} />
          )}

          {error && <p className="text-pixel-pink text-sm font-[family-name:var(--font-pixel-stack)]">! {error}</p>}

          <button type="submit" disabled={loading}
            className="w-full py-3 border-2 border-pixel-green text-pixel-green font-[family-name:var(--font-pixel-stack)] text-sm hover:bg-pixel-green/10 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <><Loader2 size={12} className="animate-spin" /> {t("auth.loadingAction")}</> : tab === "login" ? t("auth.login") : t("auth.createAccount")}
          </button>
        </form>

        <p className="text-pixel-gray/50 text-sm text-center">
          {tab === "login" ? t("auth.needAccount") : t("auth.haveAccount")}
        </p>
      </div>
    </div>
  );
}
