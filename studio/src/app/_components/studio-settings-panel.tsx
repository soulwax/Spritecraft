"use client";

import { useEffect, useMemo, useState } from "react";
import { Database, FolderOutput, Palette, Sparkles } from "lucide-react";

import {
	defaultStudioPreferences,
	loadStudioPreferences,
	saveStudioPreferences,
	type StudioNamingStyle,
	type StudioPreferences,
	type StudioTheme,
} from "~/app/_components/studio-preferences";
import { StudioActivityStrip } from "~/app/_components/studio-activity-strip";
import { showStudioToast } from "~/app/_components/studio-toast";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { Select } from "~/components/ui/select";

type ExportPresetOption = {
	id: string;
	label: string;
	description: string;
};

type RuntimeSummary = {
	exportDirectory: string;
	projectPackageDirectory: string;
	recoveryDirectory: string;
	logsDirectory: string;
	supportBundleDirectory: string;
	lpcProjectRoot: string;
	usesBundledLpcAssets: boolean;
	hasDotEnvFile: boolean;
	historyMode: "enabled" | "degraded" | "disabled";
	historyPersistenceAvailable: boolean;
	geminiMode: "enabled" | "disabled";
};

type StudioSettingsPanelProps = {
	exportPresets: ExportPresetOption[];
	runtime: RuntimeSummary;
};

function runtimeBadgeVariant(
	status: "enabled" | "degraded" | "disabled",
): "success" | "warning" | "default" {
	if (status === "enabled") return "success";
	if (status === "degraded") return "warning";
	return "default";
}

function ToggleRow({
	label,
	description,
	value,
	onChange,
}: {
	label: string;
	description: string;
	value: boolean;
	onChange: (next: boolean) => void;
}) {
	return (
		<div className="flex flex-col gap-3 rounded-[22px] border border-[color:var(--border)] bg-[color:var(--surface-soft)]/76 p-4 sm:flex-row sm:items-center sm:justify-between">
			<div>
				<p className="font-medium text-[color:var(--foreground)]">{label}</p>
				<p className="mt-1 text-sm leading-6 text-[color:var(--muted-foreground)]">
					{description}
				</p>
			</div>
			<div className="flex gap-2 self-start sm:self-auto">
				<Button
					onClick={() => onChange(true)}
					type="button"
					variant={value ? "default" : "secondary"}
				>
					On
				</Button>
				<Button
					onClick={() => onChange(false)}
					type="button"
					variant={!value ? "default" : "secondary"}
				>
					Off
				</Button>
			</div>
		</div>
	);
}

export function StudioSettingsPanel({
	exportPresets,
	runtime,
}: StudioSettingsPanelProps) {
	const [preferences, setPreferences] = useState<StudioPreferences>(
		defaultStudioPreferences,
	);
	const [supportNote, setSupportNote] = useState("");
	const [supportBundlePath, setSupportBundlePath] = useState("");
	const [supportStatus, setSupportStatus] = useState<"idle" | "loading" | "error">(
		"idle",
	);
	const [supportError, setSupportError] = useState("");
	const effectiveExportPresets = useMemo(
		() =>
			exportPresets.length
				? exportPresets
				: [{ id: "none", label: "None", description: "" }],
		[exportPresets],
	);

	useEffect(() => {
		setPreferences(loadStudioPreferences());
	}, []);

	useEffect(() => {
		if (!supportBundlePath) {
			return;
		}

		showStudioToast({
			title: "Support bundle exported",
			description: supportBundlePath,
			tone: "success",
			durationMs: 5600,
		});
	}, [supportBundlePath]);

	useEffect(() => {
		if (!supportError) {
			return;
		}

		showStudioToast({
			title: "Support bundle failed",
			description: supportError,
			tone: "destructive",
			durationMs: 5600,
		});
	}, [supportError]);

	function updatePreferences(
		partial: Partial<StudioPreferences>,
	): StudioPreferences {
		const next = saveStudioPreferences({
			...preferences,
			...partial,
		});
		setPreferences(next);
		return next;
	}

	async function exportSupportBundle() {
		setSupportStatus("loading");
		setSupportError("");

		try {
			const response = await fetch("/api/spritecraft/support/bundle", {
				method: "POST",
				headers: {
					"content-type": "application/json",
				},
				body: JSON.stringify({
					note: supportNote,
				}),
			});
			const payload = (await response.json()) as {
				bundlePath?: string;
				error?: string;
			};
			if (!response.ok) {
				throw new Error(
					payload.error ?? "SpriteCraft could not create a support bundle.",
				);
			}

			setSupportBundlePath(payload.bundlePath ?? "");
			setSupportStatus("idle");
		} catch (error) {
			setSupportStatus("error");
			setSupportError(
				error instanceof Error
					? error.message
					: "SpriteCraft could not create a support bundle.",
			);
		}
	}

	return (
		<div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_0.95fr]">
			<div className="grid gap-6">
				<StudioActivityStrip
					items={
						supportStatus === "loading"
							? [
									{
										label: "Building support bundle",
										detail:
											"Collecting runtime snapshots, structured logs, and recovery records for support.",
										state: "loading",
									},
								]
							: supportError
								? [
										{
											label: "Support export needs attention",
											detail: supportError,
											state: "error",
										},
									]
								: []
					}
					title="Settings activity"
				/>
				<Card className="border-[color:var(--border-strong)] bg-[color:var(--hero-surface)]">
					<CardHeader>
						<CardTitle className="flex items-center gap-3">
							<Palette className="size-5 text-[color:var(--accent)]" />
							<span>Studio Preferences</span>
						</CardTitle>
						<CardDescription className="text-base leading-7 text-[color:var(--hero-copy)]">
							These preferences belong to the Studio UI on this machine. The
							Dart backend still owns exports, persistence, and AI runtime
							availability.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid gap-4 md:grid-cols-2">
							<label className="grid gap-2">
								<span className="text-xs uppercase tracking-[0.16em] text-[color:var(--muted-foreground)]">
									Theme
								</span>
								<Select
									onChange={(event) =>
										updatePreferences({
											theme: event.target.value as StudioTheme,
										})
									}
									value={preferences.theme}
								>
									<option value="kanagawa">Kanagawa night</option>
									<option value="paper">Paper studio</option>
								</Select>
							</label>
							<label className="grid gap-2">
								<span className="text-xs uppercase tracking-[0.16em] text-[color:var(--muted-foreground)]">
									Default export preset
								</span>
								<Select
									onChange={(event) =>
										updatePreferences({
											defaultEnginePreset: event.target.value,
										})
									}
									value={preferences.defaultEnginePreset}
								>
									{effectiveExportPresets.map((option) => (
										<option key={option.id} value={option.id}>
											{option.label}
										</option>
									))}
								</Select>
							</label>
							<label className="grid gap-2">
								<span className="text-xs uppercase tracking-[0.16em] text-[color:var(--muted-foreground)]">
									Default naming style
								</span>
								<Select
									onChange={(event) =>
										updatePreferences({
											defaultNamingStyle:
												event.target.value as StudioNamingStyle,
										})
									}
									value={preferences.defaultNamingStyle}
								>
									<option value="kebab">kebab-case filenames</option>
									<option value="snake">snake_case filenames</option>
									<option value="camel">camelCase filenames</option>
									<option value="pascal">PascalCase filenames</option>
								</Select>
							</label>
							<div className="rounded-[22px] border border-[color:var(--border)] bg-[color:var(--surface-soft)]/76 p-4">
								<p className="text-xs uppercase tracking-[0.16em] text-[color:var(--muted-foreground)]">
									Current preference bundle
								</p>
								<div className="mt-3 flex flex-wrap gap-2">
									<Badge>{preferences.theme}</Badge>
									<Badge>{preferences.defaultEnginePreset}</Badge>
									<Badge>{preferences.defaultNamingStyle}</Badge>
								</div>
							</div>
						</div>

						<ToggleRow
							description="Hide or show AI brief, naming, and style-helper surfaces inside the builder without changing backend Gemini availability."
							label="AI assistance surfaces"
							onChange={(next) =>
								updatePreferences({ showAiAssistance: next })
							}
							value={preferences.showAiAssistance}
						/>
						<ToggleRow
							description="Choose whether DB-backed project browsing stays visible in the Studio navigation on this machine."
							label="History and project tools"
							onChange={(next) =>
								updatePreferences({ showHistoryTools: next })
							}
							value={preferences.showHistoryTools}
						/>
					</CardContent>
				</Card>
			</div>

			<div className="grid gap-6">
				<Card className="border-[color:var(--border)] bg-[color:var(--surface-soft)]/80">
					<CardHeader>
						<CardTitle className="flex items-center gap-3">
							<FolderOutput className="size-5 text-[color:var(--accent)]" />
							<span>Runtime Paths</span>
						</CardTitle>
						<CardDescription>
							These values come from the Dart backend and packaged runtime
							layout.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4 text-sm">
						<div className="rounded-[22px] border border-[color:var(--border)] bg-[color:var(--surface-strong)]/74 p-4">
							<p className="text-xs uppercase tracking-[0.16em] text-[color:var(--muted-foreground)]">
								Export directory
							</p>
							<p className="mt-2 break-all text-[color:var(--foreground)]">
								{runtime.exportDirectory}
							</p>
						</div>
						<div className="rounded-[22px] border border-[color:var(--border)] bg-[color:var(--surface-strong)]/74 p-4">
							<p className="text-xs uppercase tracking-[0.16em] text-[color:var(--muted-foreground)]">
								Project packages
							</p>
							<p className="mt-2 break-all text-[color:var(--foreground)]">
								{runtime.projectPackageDirectory}
							</p>
						</div>
						<div className="rounded-[22px] border border-[color:var(--border)] bg-[color:var(--surface-strong)]/74 p-4">
							<p className="text-xs uppercase tracking-[0.16em] text-[color:var(--muted-foreground)]">
								Recovery logs
							</p>
							<p className="mt-2 break-all text-[color:var(--foreground)]">
								{runtime.recoveryDirectory}
							</p>
						</div>
						<div className="rounded-[22px] border border-[color:var(--border)] bg-[color:var(--surface-strong)]/74 p-4">
							<p className="text-xs uppercase tracking-[0.16em] text-[color:var(--muted-foreground)]">
								LPC asset root
							</p>
							<p className="mt-2 break-all text-[color:var(--foreground)]">
								{runtime.lpcProjectRoot}
							</p>
							<div className="mt-3">
								<Badge variant={runtime.usesBundledLpcAssets ? "warning" : "success"}>
									{runtime.usesBundledLpcAssets
										? "packaged runtime assets"
										: "git submodule checkout"}
								</Badge>
							</div>
						</div>
						<div className="rounded-[22px] border border-[color:var(--border)] bg-[color:var(--surface-strong)]/74 p-4">
							<p className="text-xs uppercase tracking-[0.16em] text-[color:var(--muted-foreground)]">
								Structured logs
							</p>
							<p className="mt-2 break-all text-[color:var(--foreground)]">
								{runtime.logsDirectory}
							</p>
						</div>
						<div className="rounded-[22px] border border-[color:var(--border)] bg-[color:var(--surface-strong)]/74 p-4">
							<p className="text-xs uppercase tracking-[0.16em] text-[color:var(--muted-foreground)]">
								Support bundles
							</p>
							<p className="mt-2 break-all text-[color:var(--foreground)]">
								{runtime.supportBundleDirectory}
							</p>
						</div>
					</CardContent>
				</Card>

				<Card className="border-[color:var(--border)] bg-[color:var(--surface-soft)]/80">
					<CardHeader>
						<CardTitle className="flex items-center gap-3">
							<Database className="size-5 text-[color:var(--accent)]" />
							<span>Backend Integrations</span>
						</CardTitle>
						<CardDescription>
							Runtime availability and current backend mode.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex items-center justify-between gap-3 rounded-[22px] border border-[color:var(--border)] bg-[color:var(--surface-strong)]/74 p-4">
							<div>
								<p className="font-medium text-[color:var(--foreground)]">
									History persistence
								</p>
								<p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
									DB-backed save, restore, duplicate, and package flows.
								</p>
							</div>
							<Badge variant={runtimeBadgeVariant(runtime.historyMode)}>
								{runtime.historyMode}
							</Badge>
						</div>
						<div className="flex items-center justify-between gap-3 rounded-[22px] border border-[color:var(--border)] bg-[color:var(--surface-strong)]/74 p-4">
							<div>
								<p className="font-medium text-[color:var(--foreground)]">
									Local .env
								</p>
								<p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
									Repeatable machine-level configuration for local runs.
								</p>
							</div>
							<Badge variant={runtime.hasDotEnvFile ? "success" : "warning"}>
								{runtime.hasDotEnvFile ? "present" : "missing"}
							</Badge>
						</div>
						<div className="flex items-center justify-between gap-3 rounded-[22px] border border-[color:var(--border)] bg-[color:var(--surface-strong)]/74 p-4">
							<div className="flex items-start gap-3">
								<Sparkles className="mt-0.5 size-4 text-[color:var(--accent)]" />
								<div>
									<p className="font-medium text-[color:var(--foreground)]">
										Gemini assistance
									</p>
									<p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
										Planning, naming, and style-helper requests stay optional.
									</p>
								</div>
							</div>
							<Badge
								variant={
									runtime.geminiMode === "enabled" ? "success" : "warning"
								}
							>
								{runtime.geminiMode}
							</Badge>
						</div>
					</CardContent>
				</Card>

				<Card className="border-[color:var(--border)] bg-[color:var(--surface-soft)]/80">
					<CardHeader>
						<CardTitle>Support Bundle</CardTitle>
						<CardDescription>
							Export a diagnostics zip with runtime snapshots, recent logs, and
							recovery indexes for support triage.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<textarea
							className="min-h-28 w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-4 py-3 text-sm text-[color:var(--foreground)] outline-none transition focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] placeholder:text-[color:var(--muted-foreground)]"
							onChange={(event) => setSupportNote(event.target.value)}
							placeholder="Optional note for what the user saw before exporting the bundle"
							value={supportNote}
						/>
						<Button onClick={() => void exportSupportBundle()} type="button">
							{supportStatus === "loading"
								? "Building support bundle..."
								: "Export support bundle"}
						</Button>
						{supportBundlePath ? (
							<div className="rounded-[22px] border border-[color:var(--border)] bg-[color:var(--surface-strong)]/74 p-4 text-sm">
								<p className="font-medium text-[color:var(--foreground)]">
									Bundle ready
								</p>
								<p className="mt-2 break-all text-[color:var(--muted-foreground)]">
									{supportBundlePath}
								</p>
							</div>
						) : null}
						{supportError ? (
							<p className="text-sm text-[color:var(--destructive)]">
								{supportError}
							</p>
						) : null}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
