"use client";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmColor?: "pink" | "green";
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "CONFIRM",
  confirmColor = "pink",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  const colorClass = confirmColor === "pink"
    ? "border-pixel-pink text-pixel-pink hover:bg-pixel-pink/10"
    : "border-pixel-green text-pixel-green hover:bg-pixel-green/10";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onCancel}>
      <div className="pixel-border bg-pixel-darker p-6 max-w-sm w-full mx-4 space-y-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-[family-name:var(--font-pixel-stack)] text-pixel-amber text-xs">
          {title}
        </h3>
        <p className="text-pixel-gray text-sm">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-pixel-gray/30 text-pixel-gray text-xs font-[family-name:var(--font-pixel-stack)] hover:bg-pixel-gray/10 transition-all"
          >
            CANCEL
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 border text-xs font-[family-name:var(--font-pixel-stack)] transition-all ${colorClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
