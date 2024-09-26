import { ViewMode } from "@/components/PlaylistViewModeToggleGroup";
import { persistentMap } from "@nanostores/persistent";

export type ViewStates = {
    lastViewedPlaylistId: string;
    viewMode: ViewMode;
};

export const $viewStates = persistentMap<ViewStates>("viewStates:", {
    lastViewedPlaylistId: "current-folder",
    viewMode: "simple",
});
