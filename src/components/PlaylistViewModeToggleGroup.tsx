import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ListIcon, TableIcon } from "lucide-react";

export type ViewMode = "simple" | "table";

interface PlaylistViewModeToggleGroupProps {
    viewMode: ViewMode;
    onViewModeChange: (viewMode: ViewMode) => void;
}

export default function PlaylistViewModeToggleGroup({
    viewMode,
    onViewModeChange,
}: PlaylistViewModeToggleGroupProps) {
    return (
        <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(value) => {
                if (value) onViewModeChange(value as ViewMode);
            }}
            aria-label="View mode"
        >
            <ToggleGroupItem value="simple" aria-label="Simple mode">
                <ListIcon className="h-4 w-4" />
                <span className="sr-only">Simple mode</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="table" aria-label="Table mode">
                <TableIcon className="h-4 w-4" />
                <span className="sr-only">Table mode</span>
            </ToggleGroupItem>
        </ToggleGroup>
    );
}
