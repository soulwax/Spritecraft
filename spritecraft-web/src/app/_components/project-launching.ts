export type SpriteCraftLaunchConfig = {
	id?: string;
	label?: string;
	description?: string;
	bodyType: string;
	animation: string;
	projectName: string;
	prompt: string;
	enginePreset: string;
	previewMode: string;
	category: string;
	animationFilter: string;
	tagFilter: string;
	catalogSearch?: string;
	seededSelections?: Record<string, string>;
};

export const projectTemplates: SpriteCraftLaunchConfig[] = [
	{
		id: "npc-base",
		label: "NPC Base",
		description:
			"Grounded background character with neutral gear and quick readability.",
		bodyType: "male",
		animation: "idle",
		projectName: "NPC Base",
		prompt:
			"Create a practical background NPC with simple readable equipment and neutral colors.",
		enginePreset: "none",
		previewMode: "single",
		category: "all",
		animationFilter: "current",
		tagFilter: "all",
	},
	{
		id: "player-character",
		label: "Player Character",
		description:
			"Hero-forward starting point with comparison-friendly motion setup.",
		bodyType: "male",
		animation: "idle",
		projectName: "Player Character",
		prompt:
			"Create a player-ready hero with distinct silhouette, layered outfit, and animation-friendly accessories.",
		enginePreset: "both",
		previewMode: "compare",
		category: "all",
		animationFilter: "current",
		tagFilter: "all",
	},
	{
		id: "enemy",
		label: "Enemy",
		description:
			"Combat-readable threat silhouette with faction identity cues.",
		bodyType: "male",
		animation: "slash",
		projectName: "Enemy Variant",
		prompt:
			"Create an enemy with a clear threat silhouette, faction identity, and combat-ready equipment.",
		enginePreset: "godot",
		previewMode: "compare",
		category: "all",
		animationFilter: "current",
		tagFilter: "all",
	},
	{
		id: "portrait",
		label: "Portrait",
		description:
			"Identity-first setup focused on the face, hair, and upper body.",
		bodyType: "male",
		animation: "idle",
		projectName: "Portrait Study",
		prompt:
			"Create a portrait-focused character emphasizing head, hair, and upper-body identity cues.",
		enginePreset: "none",
		previewMode: "single",
		category: "Head",
		animationFilter: "any",
		tagFilter: "all",
	},
];

export function buildStudioTemplateUrl(template: SpriteCraftLaunchConfig) {
	const params = new URLSearchParams({
		bodyType: template.bodyType,
		animation: template.animation,
		projectName: template.projectName,
		prompt: template.prompt,
		enginePreset: template.enginePreset,
		previewMode: template.previewMode,
		category: template.category,
		animationFilter: template.animationFilter,
		tagFilter: template.tagFilter,
	});
	if (template.catalogSearch?.trim()) {
		params.set("catalogSearch", template.catalogSearch.trim());
	}
	if (template.seededSelections && Object.keys(template.seededSelections).length) {
		params.set("selections", JSON.stringify(template.seededSelections));
	}
	return `http://127.0.0.1:8080/?${params.toString()}`;
}

export function buildStudioRestoreUrl(id: string) {
	return `http://127.0.0.1:8080/?restore=${encodeURIComponent(id)}`;
}
