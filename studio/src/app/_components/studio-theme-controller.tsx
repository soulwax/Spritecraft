"use client";

import { useEffect } from "react";

import {
	applyStudioTheme,
	loadStudioPreferences,
	studioPreferencesChangedEvent,
	type StudioPreferences,
} from "~/app/_components/studio-preferences";

export function StudioThemeController() {
	useEffect(() => {
		applyStudioTheme(loadStudioPreferences().theme);

		function handlePreferencesChanged(event: Event) {
			const detail = (event as CustomEvent<StudioPreferences>).detail;
			applyStudioTheme(detail.theme);
		}

		window.addEventListener(
			studioPreferencesChangedEvent,
			handlePreferencesChanged as EventListener,
		);

		return () => {
			window.removeEventListener(
				studioPreferencesChangedEvent,
				handlePreferencesChanged as EventListener,
			);
		};
	}, []);

	return null;
}
