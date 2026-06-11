"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { X, ChevronRight, ChevronLeft } from "lucide-react";
import { useT } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n/locales/en";

interface HelpWizardProps {
  open: boolean;
  onClose: () => void;
  onRequestContent?: () => void; // called when wizard needs content to be present
}

interface TourStep {
  target: string; // data-tour attribute value
  title: TranslationKey;
  description: TranslationKey;
  position: "top" | "bottom" | "left" | "right";
}

const STEPS: TourStep[] = [
  {
    target: "mode",
    title: "wizard.step1.title",
    description: "wizard.step1.body",
    position: "bottom",
  },
  {
    target: "content",
    title: "wizard.step2.title",
    description: "wizard.step2.body",
    position: "bottom",
  },
  {
    target: "expiry",
    title: "wizard.step3.title",
    description: "wizard.step3.body",
    position: "bottom",
  },
  {
    target: "submit",
    title: "wizard.step4.title",
    description: "wizard.step4.body",
    position: "top",
  },
  {
    target: "p2p",
    title: "wizard.step5.title",
    description: "wizard.step5.body",
    position: "top",
  },
];

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export default function HelpWizard({ open, onClose, onRequestContent }: HelpWizardProps) {
  const t = useT();
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [tipStyle, setTipStyle] = useState<React.CSSProperties>({});
  const [arrowStyle, setArrowStyle] = useState<React.CSSProperties>({});
  const [arrowDir, setArrowDir] = useState<"up" | "down">("up");
  const overlayRef = useRef<HTMLDivElement>(null);

  const PAD = 8; // padding around spotlight
  const TIP_GAP = 12; // gap between spotlight and tooltip

  const measure = useCallback(() => {
    if (!open) return;
    const current = STEPS[step];
    const el = document.querySelector(`[data-tour="${current.target}"]`);
    if (!el) {
      setTargetRect(null);
      return;
    }

    const r = el.getBoundingClientRect();
    const rect: Rect = {
      top: r.top - PAD,
      left: r.left - PAD,
      width: r.width + PAD * 2,
      height: r.height + PAD * 2,
    };
    setTargetRect(rect);

    // Position tooltip
    const tipW = Math.min(320, window.innerWidth - 32);
    let tipTop: number;
    let tipLeft: number;
    let dir: "up" | "down";

    const spaceBelow = window.innerHeight - (rect.top + rect.height);
    const spaceAbove = rect.top;

    if (current.position === "bottom" && spaceBelow > 140) {
      tipTop = rect.top + rect.height + TIP_GAP;
      dir = "up";
    } else if (current.position === "top" && spaceAbove > 140) {
      tipTop = rect.top - TIP_GAP;
      dir = "down";
    } else if (spaceBelow > spaceAbove) {
      tipTop = rect.top + rect.height + TIP_GAP;
      dir = "up";
    } else {
      tipTop = rect.top - TIP_GAP;
      dir = "down";
    }

    // Horizontally center on target, clamped to viewport
    tipLeft = rect.left + rect.width / 2 - tipW / 2;
    tipLeft = Math.max(16, Math.min(tipLeft, window.innerWidth - tipW - 16));

    if (dir === "down") {
      setTipStyle({
        position: "fixed",
        bottom: window.innerHeight - tipTop,
        left: tipLeft,
        width: tipW,
      });
    } else {
      setTipStyle({
        position: "fixed",
        top: tipTop,
        left: tipLeft,
        width: tipW,
      });
    }

    // Arrow pointing at target center
    const arrowLeft = Math.max(
      tipLeft + 16,
      Math.min(rect.left + rect.width / 2, tipLeft + tipW - 16)
    );

    if (dir === "up") {
      setArrowStyle({
        position: "fixed",
        top: tipTop - 6,
        left: arrowLeft - 6,
      });
    } else {
      setArrowStyle({
        position: "fixed",
        top: tipTop + 1,
        left: arrowLeft - 6,
      });
    }
    setArrowDir(dir);
  }, [open, step]);

  // When reaching a step that needs content (submit/p2p), inject demo text
  useEffect(() => {
    if (!open) return;
    const current = STEPS[step];
    if ((current.target === "submit" || current.target === "p2p") && onRequestContent) {
      onRequestContent();
    }
  }, [open, step, onRequestContent]);

  // Scroll target into view & measure
  useEffect(() => {
    if (!open) return;
    const current = STEPS[step];
    // Small delay to let injected content render the target element
    const delay = (current.target === "submit" || current.target === "p2p") ? 400 : 0;
    const t = setTimeout(() => {
      const el = document.querySelector(`[data-tour="${current.target}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
        // Wait for scroll to settle before measuring
        setTimeout(measure, 350);
      } else {
        setTargetRect(null);
      }
    }, delay);
    return () => clearTimeout(t);
  }, [open, step, measure]);

  // Re-measure on resize / scroll
  useEffect(() => {
    if (!open) return;
    window.addEventListener("resize", measure);
    // Capture scroll on main since it's the scrollable container
    const main = document.querySelector("main");
    main?.addEventListener("scroll", measure, { passive: true });
    return () => {
      window.removeEventListener("resize", measure);
      main?.removeEventListener("scroll", measure);
    };
  }, [open, measure]);

  // Reset step when opening
  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  if (!open) return null;

  const current = STEPS[step];
  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;

  // Four mask panels around the spotlight rect — guarantees the bounded
  // section is never covered (clip-path holes mis-fill under nonzero winding).
  const panels: React.CSSProperties[] = targetRect
    ? [
        { top: 0, left: 0, width: "100%", height: targetRect.top },
        { top: targetRect.top + targetRect.height, left: 0, width: "100%", bottom: 0 },
        { top: targetRect.top, left: 0, width: targetRect.left, height: targetRect.height },
        {
          top: targetRect.top,
          left: targetRect.left + targetRect.width,
          right: 0,
          height: targetRect.height,
        },
      ]
    : [{ inset: 0 }];

  return (
    <div ref={overlayRef} className="fixed inset-0 z-[200]">
      {/* Mask panels — the spotlight cutout stays fully clear */}
      {panels.map((p, i) => (
        <div
          key={i}
          className="absolute bg-black/70 transition-all duration-300"
          style={p}
          onClick={onClose}
        />
      ))}

      {/* Spotlight border glow */}
      {targetRect && (
        <div
          className="absolute border-2 border-pixel-green/60 pointer-events-none transition-all duration-300"
          style={{
            top: targetRect.top,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height,
            boxShadow: "0 0 20px rgba(126,231,135,0.22), inset 0 0 20px rgba(126,231,135,0.05)",
          }}
        />
      )}

      {/* Arrow */}
      {targetRect && (
        <div
          className="pointer-events-none transition-all duration-300"
          style={arrowStyle}
        >
          <div
            className="w-3 h-3 bg-pixel-darker border-pixel-green/40"
            style={{
              transform: "rotate(45deg)",
              borderWidth: arrowDir === "up" ? "2px 0 0 2px" : "0 2px 2px 0",
            }}
          />
        </div>
      )}

      {/* Tooltip */}
      <div
        className="pixel-border bg-pixel-darker p-4 space-y-3 transition-all duration-300"
        style={tipStyle}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Step counter + close */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1 transition-all ${
                  i === step
                    ? "w-5 bg-pixel-green"
                    : i < step
                      ? "w-2.5 bg-pixel-green/40"
                      : "w-2.5 bg-pixel-gray/30"
                }`}
              />
            ))}
          </div>
          <button
            onClick={onClose}
            className="text-pixel-gray hover:text-pixel-pink transition-colors -mr-1 -mt-1 p-1"
          >
            <X size={14} />
          </button>
        </div>

        {/* Title */}
        <h4 className="font-[family-name:var(--font-pixel-stack)] text-pixel-green text-xs">
          {t(current.title)}
        </h4>

        {/* Description */}
        <p className="text-pixel-gray text-sm leading-relaxed">
          {t(current.description)}
        </p>

        {/* Nav */}
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={() => setStep((s) => s - 1)}
            disabled={isFirst}
            className={`flex items-center gap-1 px-2 py-1.5 text-xs font-[family-name:var(--font-pixel-stack)] border transition-all ${
              isFirst
                ? "border-pixel-gray/20 text-pixel-gray/30 cursor-not-allowed"
                : "border-pixel-gray/30 text-pixel-gray hover:text-pixel-green hover:border-pixel-green/30"
            }`}
          >
            <ChevronLeft size={10} />
            {t("wizard.back")}
          </button>

          <span className="text-pixel-gray/40 text-xs">
            {t("wizard.progress", { current: step + 1, total: STEPS.length })}
          </span>

          {isLast ? (
            <button
              onClick={onClose}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-[family-name:var(--font-pixel-stack)] border-2 border-pixel-green text-pixel-green hover:bg-pixel-green/10 transition-all animate-pulse-glow"
            >
              {t("wizard.gotIt")}
            </button>
          ) : (
            <button
              onClick={() => setStep((s) => s + 1)}
              className="flex items-center gap-1 px-2 py-1.5 text-xs font-[family-name:var(--font-pixel-stack)] border border-pixel-green/30 text-pixel-green hover:bg-pixel-green/10 transition-all"
            >
              {t("wizard.next")}
              <ChevronRight size={10} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
