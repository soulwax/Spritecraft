import { AlertTriangle, CheckCircle2, LoaderCircle, Sparkles } from "lucide-react";

import { Badge } from "~/components/ui/badge";

export type StudioActivityItem = {
  label: string;
  detail: string;
  state: "loading" | "error" | "success" | "idle";
};

function ActivityIcon({ state }: { state: StudioActivityItem["state"] }) {
  if (state === "loading") {
    return <LoaderCircle className="size-4 animate-spin text-[color:var(--accent)]" />;
  }
  if (state === "error") {
    return <AlertTriangle className="size-4 text-[color:var(--destructive)]" />;
  }
  if (state === "success") {
    return <CheckCircle2 className="size-4 text-[color:var(--success)]" />;
  }
  return <Sparkles className="size-4 text-[color:var(--muted-foreground)]" />;
}

export function activityVariant(
  state: StudioActivityItem["state"],
): "default" | "success" | "warning" | "destructive" {
  if (state === "success") {
    return "success";
  }
  if (state === "error") {
    return "destructive";
  }
  if (state === "loading") {
    return "warning";
  }
  return "default";
}

export function StudioActivityStrip({
  items,
  title = "Current activity",
}: {
  items: StudioActivityItem[];
  title?: string;
}) {
  if (!items.length) {
    return null;
  }

  return (
    <div className="rounded-[28px] border border-[color:var(--border-strong)] bg-[color:var(--hero-surface)]/94 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
            {title}
          </p>
          <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
            SpriteCraft is handling background work or needs your attention.
          </p>
        </div>
        <Badge>{items.length} active</Badge>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {items.map((item) => (
          <div
            className="flex items-start gap-3 rounded-[22px] border border-[color:var(--border)] bg-[color:var(--surface-soft)]/84 p-3"
            key={`${item.state}-${item.label}`}
          >
            <ActivityIcon state={item.state} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-[color:var(--foreground)]">
                  {item.label}
                </p>
                <Badge variant={activityVariant(item.state)}>{item.state}</Badge>
              </div>
              <p className="mt-1 text-sm leading-6 text-[color:var(--muted-foreground)]">
                {item.detail}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
