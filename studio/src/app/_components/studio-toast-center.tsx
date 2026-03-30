"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  type StudioToastPayload,
  studioToastEventName,
} from "~/app/_components/studio-toast";

function toneBorder(tone: StudioToastPayload["tone"]) {
  if (tone === "success") {
    return "border-emerald-400/35 bg-emerald-400/12";
  }
  if (tone === "warning") {
    return "border-amber-400/35 bg-amber-400/12";
  }
  if (tone === "destructive") {
    return "border-rose-400/35 bg-rose-400/12";
  }
  return "border-[color:var(--border-strong)] bg-[color:var(--hero-surface)]";
}

function ToastToneIcon({ tone }: { tone: StudioToastPayload["tone"] }) {
  if (tone === "success") {
    return <CheckCircle2 className="mt-0.5 size-4 text-emerald-300" />;
  }
  if (tone === "warning") {
    return <AlertTriangle className="mt-0.5 size-4 text-amber-300" />;
  }
  if (tone === "destructive") {
    return <XCircle className="mt-0.5 size-4 text-rose-300" />;
  }
  return <Info className="mt-0.5 size-4 text-[color:var(--accent)]" />;
}

export function StudioToastCenter() {
  const [toasts, setToasts] = useState<StudioToastPayload[]>([]);

  useEffect(() => {
    function handleToast(event: Event) {
      const detail = (event as CustomEvent<StudioToastPayload>).detail;
      if (!detail) {
        return;
      }

      setToasts((current) => [...current.slice(-3), detail]);
      window.setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== detail.id));
      }, detail.durationMs ?? 4200);
    }

    window.addEventListener(studioToastEventName, handleToast as EventListener);
    return () => {
      window.removeEventListener(
        studioToastEventName,
        handleToast as EventListener,
      );
    };
  }, []);

  if (!toasts.length) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-[min(100vw-2rem,24rem)] flex-col gap-3 sm:right-6 sm:top-6">
      {toasts.map((toast) => (
        <section
          className={`pointer-events-auto rounded-[24px] border px-4 py-3 shadow-[0_22px_60px_rgba(7,8,12,0.28)] backdrop-blur studio-toast-enter ${toneBorder(toast.tone)}`}
          key={toast.id}
        >
          <div className="flex items-start gap-3">
            <ToastToneIcon tone={toast.tone} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[color:var(--foreground)]">
                {toast.title}
              </p>
              {toast.description ? (
                <p className="mt-1 text-sm leading-6 text-[color:var(--muted-foreground)]">
                  {toast.description}
                </p>
              ) : null}
            </div>
            <Button
              aria-label="Dismiss toast"
              className="h-8 w-8 shrink-0 rounded-full"
              onClick={() =>
                setToasts((current) =>
                  current.filter((entry) => entry.id !== toast.id),
                )
              }
              size="sm"
              type="button"
              variant="ghost"
            >
              <X className="size-4" />
            </Button>
          </div>
        </section>
      ))}
    </div>
  );
}
