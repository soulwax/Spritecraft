import { afterEach, describe, expect, test } from "bun:test";

import {
  createStudioToastPayload,
  showStudioToast,
  studioToastEventName,
} from "./studio-toast";

const originalWindow = globalThis.window;

afterEach(() => {
  globalThis.window = originalWindow;
});

describe("createStudioToastPayload", () => {
  test("fills in default tone and duration", () => {
    const payload = createStudioToastPayload(
      {
        title: "Saved",
        description: "Workspace updated.",
      },
      { id: "toast-fixed" },
    );

    expect(payload).toEqual({
      id: "toast-fixed",
      title: "Saved",
      description: "Workspace updated.",
      tone: "default",
      durationMs: 4200,
    });
  });

  test("keeps explicit tone and duration", () => {
    const payload = createStudioToastPayload(
      {
        title: "Export failed",
        tone: "destructive",
        durationMs: 5600,
      },
      { id: "toast-explicit" },
    );

    expect(payload.tone).toBe("destructive");
    expect(payload.durationMs).toBe(5600);
    expect(payload.id).toBe("toast-explicit");
  });
});

describe("showStudioToast", () => {
  test("dispatches a normalized custom event", () => {
    let observedEvent: Event | null = null;

    globalThis.window = {
      dispatchEvent(event: Event) {
        observedEvent = event;
        return true;
      },
    } as Window & typeof globalThis;

    showStudioToast({
      title: "Bundle ready",
      description: "Support bundle exported.",
      tone: "success",
    });

    expect(observedEvent).toBeInstanceOf(CustomEvent);
    const toastEvent = observedEvent as CustomEvent<{
      title: string;
      description?: string;
      tone: string;
      durationMs: number;
      id: string;
    }>;
    expect(toastEvent.type).toBe(studioToastEventName);
    expect(toastEvent.detail.title).toBe("Bundle ready");
    expect(toastEvent.detail.description).toBe("Support bundle exported.");
    expect(toastEvent.detail.tone).toBe("success");
    expect(toastEvent.detail.durationMs).toBe(4200);
    expect(toastEvent.detail.id.startsWith("toast-")).toBe(true);
  });
});
