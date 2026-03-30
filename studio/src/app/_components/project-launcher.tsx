"use client";

import { useMemo, useState } from "react";
import { ExternalLink, Sparkles, WandSparkles } from "lucide-react";
import { useRouter } from "next/navigation";

import {
	buildWorkspaceLaunchUrl,
	projectTemplates,
	type SpriteCraftLaunchConfig,
} from "~/app/_components/project-launching";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Select } from "~/components/ui/select";

type ProjectLauncherProps = {
	bodyTypes: string[];
	animations: string[];
};

const fallbackConfig: SpriteCraftLaunchConfig = {
	bodyType: "male",
	animation: "idle",
	projectName: "New SpriteCraft Project",
	prompt: "",
	enginePreset: "none",
	previewMode: "single",
	category: "all",
	animationFilter: "current",
	tagFilter: "all",
};

export function ProjectLauncher({
	bodyTypes,
	animations,
}: ProjectLauncherProps) {
	const router = useRouter();
	const [selectedTemplateId, setSelectedTemplateId] = useState(
		projectTemplates[0]?.id ?? "",
	);
	const selectedTemplate = useMemo(
		() =>
			projectTemplates.find((template) => template.id === selectedTemplateId) ??
			projectTemplates[0],
		[selectedTemplateId],
	);
	const [customProjectName, setCustomProjectName] = useState(
		selectedTemplate?.projectName ?? fallbackConfig.projectName,
	);
	const [customPrompt, setCustomPrompt] = useState(
		selectedTemplate?.prompt ?? fallbackConfig.prompt,
	);
	const [bodyType, setBodyType] = useState(
		selectedTemplate?.bodyType ?? bodyTypes[0] ?? fallbackConfig.bodyType,
	);
	const [animation, setAnimation] = useState(
		selectedTemplate?.animation ?? animations[0] ?? fallbackConfig.animation,
	);
	const [enginePreset, setEnginePreset] = useState(
		selectedTemplate?.enginePreset ?? fallbackConfig.enginePreset,
	);
	const [previewMode, setPreviewMode] = useState(
		selectedTemplate?.previewMode ?? fallbackConfig.previewMode,
	);

	function syncFromTemplate(templateId: string) {
		setSelectedTemplateId(templateId);
		const template =
			projectTemplates.find((entry) => entry.id === templateId) ??
			projectTemplates[0];
		if (!template) {
			return;
		}

		setCustomProjectName(template.projectName);
		setCustomPrompt(template.prompt);
		setBodyType(template.bodyType);
		setAnimation(template.animation);
		setEnginePreset(template.enginePreset);
		setPreviewMode(template.previewMode);
	}

	const launchConfig: SpriteCraftLaunchConfig = {
		...(selectedTemplate ?? fallbackConfig),
		projectName:
			customProjectName.trim() ||
			selectedTemplate?.projectName ||
			fallbackConfig.projectName,
		prompt: customPrompt.trim(),
		bodyType,
		animation,
		enginePreset,
		previewMode,
	};

	function launchIntoBuilder(config: SpriteCraftLaunchConfig) {
		if (process.env.NODE_ENV !== "production") {
			console.info("[spritecraft] Launching builder from project launcher", {
				config,
			});
		}
		router.push(buildWorkspaceLaunchUrl(config));
	}

	return (
		<section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
			<Card className="border-[color:var(--accent-soft)] bg-transparent">
				<CardHeader>
					<CardTitle className="flex items-center gap-3">
						<Sparkles className="size-5 text-[color:var(--accent)]" />
						<span>New Project Launcher</span>
					</CardTitle>
					<CardDescription>
						Start from a template or shape a launch config here, then open the
						web builder with your setup already in place.
					</CardDescription>
				</CardHeader>
				<CardContent className="grid gap-3 sm:grid-cols-2">
					{projectTemplates.map((template) => (
						<div
							className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-4"
							key={template.id}
						>
							<div className="mb-3 flex items-center justify-between gap-3">
								<h3 className="font-medium">{template.label}</h3>
								<Badge>{template.animation}</Badge>
							</div>
							<p className="mb-4 text-sm text-[color:var(--muted-foreground)]">
								{template.description}
							</p>
							<div className="flex flex-wrap gap-2">
								<Badge>{template.enginePreset}</Badge>
								<Badge>{template.previewMode}</Badge>
							</div>
							<div className="mt-4 flex flex-wrap gap-2">
								<Button
									onClick={() => syncFromTemplate(template.id ?? "")}
									type="button"
									variant="secondary"
								>
									Use In Form
								</Button>
								<Button
									onClick={() => launchIntoBuilder(template)}
									type="button"
								>
									<ExternalLink className="mr-2 size-4" />
									Launch
								</Button>
							</div>
						</div>
					))}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-3">
						<WandSparkles className="size-5 text-[color:var(--accent)]" />
						<span>Custom Launch Setup</span>
					</CardTitle>
					<CardDescription>
						This is the main starting surface for project framing before you
						drop into the builder workspace below.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<Select
						onChange={(event) => syncFromTemplate(event.target.value)}
						value={selectedTemplateId}
					>
						{projectTemplates.map((template) => (
							<option key={template.id} value={template.id}>
								{template.label}
							</option>
						))}
					</Select>

					<Input
						onChange={(event) => setCustomProjectName(event.target.value)}
						placeholder="Project name"
						value={customProjectName}
					/>

					<textarea
						className="min-h-32 w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-4 py-3 text-sm text-[color:var(--foreground)] outline-none transition focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] placeholder:text-[color:var(--muted-foreground)]"
						onChange={(event) => setCustomPrompt(event.target.value)}
						placeholder="Creative brief"
						value={customPrompt}
					/>

					<div className="grid gap-3 sm:grid-cols-2">
						<Select
							onChange={(event) => setBodyType(event.target.value)}
							value={bodyType}
						>
							{bodyTypes.map((option) => (
								<option key={option} value={option}>
									{option}
								</option>
							))}
						</Select>
						<Select
							onChange={(event) => setAnimation(event.target.value)}
							value={animation}
						>
							{animations.map((option) => (
								<option key={option} value={option}>
									{option}
								</option>
							))}
						</Select>
					</div>

					<div className="grid gap-3 sm:grid-cols-2">
						<Select
							onChange={(event) => setEnginePreset(event.target.value)}
							value={enginePreset}
						>
							<option value="none">None</option>
							<option value="godot">Godot</option>
							<option value="unity">Unity</option>
							<option value="both">Godot + Unity</option>
							<option value="aseprite">Aseprite JSON</option>
							<option value="generic">Generic JSON</option>
							<option value="all">All presets</option>
						</Select>
						<Select
							onChange={(event) => setPreviewMode(event.target.value)}
							value={previewMode}
						>
							<option value="single">Single preview</option>
							<option value="compare">Compare animations</option>
						</Select>
					</div>

					<div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-4 text-sm text-[color:var(--muted-foreground)]">
						<div className="mb-3 flex flex-wrap gap-2">
							<Badge>{launchConfig.bodyType}</Badge>
							<Badge>{launchConfig.animation}</Badge>
							<Badge>{launchConfig.enginePreset}</Badge>
							<Badge>{launchConfig.previewMode}</Badge>
						</div>
						<p>
							Launching from here keeps framing and building in one web-native
							SpriteCraft flow.
						</p>
					</div>

					<Button
						className="w-full"
						onClick={() => launchIntoBuilder(launchConfig)}
						type="button"
					>
						<ExternalLink className="mr-2 size-4" />
						Open In Builder
					</Button>
				</CardContent>
			</Card>
		</section>
	);
}
