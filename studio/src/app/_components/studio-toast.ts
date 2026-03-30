"use client";

export type StudioToastTone = "default" | "success" | "warning" | "destructive";

export type StudioToastInput = {
  title: string;
  description?: string;
  tone?: StudioToastTone;
  durationMs?: number;
};

export type StudioToastPayload = StudioToastInput & {
  id: string;
};

export const studioToastEventName = "spritecraft:toast";

export function createStudioToastPayload(
  input: StudioToastInput,
  options?: { id?: string },
): StudioToastPayload {
  return {
    id:
      options?.id ??
      `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    tone: input.tone ?? "default",
    durationMs: input.durationMs ?? 4200,
    ...input,
  };
}

export function showStudioToast(input: StudioToastInput) {
  if (typeof window === "undefined") {
    return;
  }

  const payload = createStudioToastPayload(input);

  window.dispatchEvent(
    new CustomEvent<StudioToastPayload>(studioToastEventName, {
      detail: payload,
    }),
  );
}
