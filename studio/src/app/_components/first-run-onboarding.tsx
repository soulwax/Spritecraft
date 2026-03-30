import { AlertTriangle, CheckCircle2, KeyRound, PackageSearch } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";

type OnboardingStep = {
  id: string;
  title: string;
  status: "ok" | "warning" | "error";
  optional: boolean;
  detail: string;
  actionLabel: string;
  actionHint: string;
};

type FirstRunOnboardingProps = {
  isFirstRun: boolean;
  hasBlockingStep: boolean;
  steps: OnboardingStep[];
};

function statusVariant(
  status: OnboardingStep["status"],
): "success" | "warning" | "destructive" {
  if (status === "ok") return "success";
  if (status === "error") return "destructive";
  return "warning";
}

function stepIcon(step: OnboardingStep) {
  if (step.id === "gemini") {
    return KeyRound;
  }
  if (step.id === "lpc-assets") {
    return PackageSearch;
  }
  return step.status === "ok" ? CheckCircle2 : AlertTriangle;
}

export function FirstRunOnboarding({
  isFirstRun,
  hasBlockingStep,
  steps,
}: FirstRunOnboardingProps) {
  return (
    <Card className="border-[color:var(--border-strong)] bg-[color:var(--surface-soft)]/82">
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant={hasBlockingStep ? "destructive" : "warning"}>
            {isFirstRun ? "First run" : "Setup"}
          </Badge>
          <Badge>Environment</Badge>
        </div>
        <CardTitle>Set up SpriteCraft before the first long session.</CardTitle>
        <CardDescription className="max-w-3xl text-base leading-7">
          Check the layered asset source, local environment file, and optional Gemini setup.
          The builder works best when these are settled early.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-3">
        {steps.map((step) => {
          const Icon = stepIcon(step);
          return (
            <div
              className="rounded-[24px] border border-[color:var(--border)] bg-[color:var(--surface-strong)]/72 p-5"
              key={step.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] text-[color:var(--accent)]">
                  <Icon className="size-5" />
                </div>
                <Badge variant={statusVariant(step.status)}>{step.status}</Badge>
              </div>
              <p className="mt-4 font-medium text-[color:var(--foreground)]">{step.title}</p>
              <p className="mt-2 text-sm leading-6 text-[color:var(--muted-foreground)]">
                {step.detail}
              </p>
              <div className="mt-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-soft)]/80 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
                  {step.actionLabel}
                </p>
                <code className="mt-2 block text-xs leading-6 text-[color:var(--foreground)]">
                  {step.actionHint}
                </code>
              </div>
              {step.optional ? (
                <p className="mt-3 text-xs text-[color:var(--muted-foreground)]">
                  Optional for local-only workflows.
                </p>
              ) : null}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
