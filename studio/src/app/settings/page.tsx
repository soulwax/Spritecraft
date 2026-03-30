import { Cog, FolderOutput, Sparkles } from "lucide-react";

import { StudioSettingsPanel } from "~/app/_components/studio-settings-panel";
import { Badge } from "~/components/ui/badge";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { getStudioPageData } from "~/server/studio-page-data";

export default async function SettingsPage() {
	const { exportPresets, runtime, bootstrap } = await getStudioPageData();

	return (
		<main className="flex flex-col gap-8">
			<section className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_0.9fr]">
				<div className="rounded-[36px] border border-[color:var(--border-strong)] bg-[color:var(--hero-surface)] px-6 py-7 shadow-[0_28px_100px_rgba(0,0,0,0.26)] sm:px-8 sm:py-8">
					<div className="flex flex-wrap items-center gap-3">
						<Badge variant="success">Settings</Badge>
						<Badge>Runtime + preferences</Badge>
					</div>
					<h1 className="mt-4 max-w-3xl text-balance text-4xl font-semibold leading-tight text-[color:var(--foreground)] sm:text-5xl">
						Tune the Studio without blurring the line between UI preference and backend ownership.
					</h1>
					<p className="mt-5 max-w-2xl text-base leading-7 text-[color:var(--hero-copy)]">
						Use this page to inspect the current local runtime and save client-side
						preferences for how SpriteCraft Studio should feel on this machine.
					</p>
				</div>

				<div className="grid gap-4">
					{[
						{
							icon: FolderOutput,
							label: "Export presets",
							value: `${exportPresets.length}`,
						},
						{
							icon: Sparkles,
							label: "Gemini mode",
							value: runtime.geminiMode,
						},
						{
							icon: Cog,
							label: "History mode",
							value: runtime.historyMode,
						},
					].map((item) => (
						<Card
							className="border-[color:var(--border)] bg-[color:var(--surface-soft)]/78"
							key={item.label}
						>
							<CardContent className="flex items-center gap-4 p-5">
								<div className="flex size-12 items-center justify-center rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] text-[color:var(--accent)]">
									<item.icon className="size-5" />
								</div>
								<div>
									<p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
										{item.label}
									</p>
									<p className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">
										{item.value}
									</p>
								</div>
							</CardContent>
						</Card>
					))}
					<Card className="border-[color:var(--border)] bg-[color:var(--surface-soft)]/78">
						<CardHeader>
							<CardTitle className="text-lg">Backend contract</CardTitle>
						</CardHeader>
						<CardContent className="pt-0 text-sm leading-6 text-[color:var(--muted-foreground)]">
							<p>Gemini configured: {bootstrap?.config.hasGemini ? "yes" : "no"}</p>
							<p>Database configured: {bootstrap?.config.hasDatabase ? "yes" : "no"}</p>
							<p>LPC content root visible: {bootstrap?.config.hasLpcProject ? "yes" : "no"}</p>
						</CardContent>
					</Card>
				</div>
			</section>

			<StudioSettingsPanel exportPresets={exportPresets} runtime={runtime} />
		</main>
	);
}
