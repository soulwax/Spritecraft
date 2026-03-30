export const studioPreferencesStorageKey = "studio.preferences.v1";
export const studioPreferencesChangedEvent = "spritecraft:studio-preferences";

export const studioThemes = ["kanagawa", "paper"] as const;
export const studioNamingStyles = [
	"kebab",
	"snake",
	"camel",
	"pascal",
] as const;

export type StudioTheme = (typeof studioThemes)[number];
export type StudioNamingStyle = (typeof studioNamingStyles)[number];

export type StudioPreferences = {
	theme: StudioTheme;
	showAiAssistance: boolean;
	showHistoryTools: boolean;
	defaultEnginePreset: string;
	defaultNamingStyle: StudioNamingStyle;
};

export const defaultStudioPreferences: StudioPreferences = {
	theme: "kanagawa",
	showAiAssistance: true,
	showHistoryTools: true,
	defaultEnginePreset: "none",
	defaultNamingStyle: "kebab",
};

export function normalizeStudioPreferences(
	input: unknown,
): StudioPreferences {
	if (!input || typeof input !== "object") {
		return defaultStudioPreferences;
	}

	const preferences = input as Partial<StudioPreferences>;
	return {
		theme: studioThemes.includes(preferences.theme as StudioTheme)
			? (preferences.theme as StudioTheme)
			: defaultStudioPreferences.theme,
		showAiAssistance:
			typeof preferences.showAiAssistance === "boolean"
				? preferences.showAiAssistance
				: defaultStudioPreferences.showAiAssistance,
		showHistoryTools:
			typeof preferences.showHistoryTools === "boolean"
				? preferences.showHistoryTools
				: defaultStudioPreferences.showHistoryTools,
		defaultEnginePreset:
			typeof preferences.defaultEnginePreset === "string" &&
			preferences.defaultEnginePreset.trim()
				? preferences.defaultEnginePreset
				: defaultStudioPreferences.defaultEnginePreset,
		defaultNamingStyle: studioNamingStyles.includes(
			preferences.defaultNamingStyle as StudioNamingStyle,
		)
			? (preferences.defaultNamingStyle as StudioNamingStyle)
			: defaultStudioPreferences.defaultNamingStyle,
	};
}

export function loadStudioPreferences(): StudioPreferences {
	if (typeof window === "undefined") {
		return defaultStudioPreferences;
	}

	try {
		const raw = window.localStorage.getItem(studioPreferencesStorageKey);
		if (!raw) {
			return defaultStudioPreferences;
		}
		return normalizeStudioPreferences(JSON.parse(raw));
	} catch {
		return defaultStudioPreferences;
	}
}

export function saveStudioPreferences(
	input: StudioPreferences,
): StudioPreferences {
	const normalized = normalizeStudioPreferences(input);
	if (typeof window === "undefined") {
		return normalized;
	}

	window.localStorage.setItem(
		studioPreferencesStorageKey,
		JSON.stringify(normalized),
	);
	window.dispatchEvent(
		new CustomEvent(studioPreferencesChangedEvent, {
			detail: normalized,
		}),
	);
	return normalized;
}

export function applyStudioTheme(theme: StudioTheme) {
	if (typeof document === "undefined") {
		return;
	}

	document.documentElement.dataset.theme = theme;
	document.documentElement.style.colorScheme =
		theme === "paper" ? "light" : "dark";
}
