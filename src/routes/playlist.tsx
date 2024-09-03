import { ScrollArea } from "@/components/ui/scroll-area";
import { useMpvPlayer } from "@/hooks/use-mpv-player";
import { cn } from "@/lib/utils";
import MpvPlayer, { MpvEventId } from "@/services/MpvPlayer";
import { readDir } from "@tauri-apps/api/fs";
import { dirname, basename, normalize} from "@tauri-apps/api/path";
import { useEffect } from "react";
import { Await, LoaderFunction, useLoaderData, useRevalidator } from "react-router-dom";

interface IPlaylistEntry {
    name: string;
    path: string;
}

export const loader = (async ({
    params,
}): Promise<{
    playlistEntries: IPlaylistEntry[];
}> => {
    const { id } = params;

    let playlistEntries: IPlaylistEntry[] = [];

    if (id === "current-folder") {
        const currentFilepath = await MpvPlayer.getPath().catch(() => undefined);

        if (currentFilepath) {
            const dirPath = await dirname(currentFilepath);
            const files = await readDir(dirPath);

            for (const f of files) {
                playlistEntries.push({
                    name: f.name ?? (await basename(f.path)),
                    path: f.path,
                });
            }
        }
    }

    return { playlistEntries };
}) satisfies LoaderFunction;

const Playlist: React.FC = () => {
    const { playlistEntries } = useLoaderData() as Awaited<ReturnType<typeof loader>>;
    const { info: playerInfo } = useMpvPlayer();
    const revalidator = useRevalidator();

    useEffect(() => {
        MpvPlayer.on(MpvEventId.FileLoaded, revalidator.revalidate);

        return () => {
            MpvPlayer.off(MpvEventId.FileLoaded, revalidator.revalidate);
        };
    }, []);

    const handlePlayEntry = (entry: IPlaylistEntry) => {
        MpvPlayer.loadFile(entry.path);
    };

    return (
        <ScrollArea className="h-full space-y-1 px-1">
            {playlistEntries.map((entry) => {
                const isActive = playerInfo.path === entry.path;

                return (
                    <div
                        onDoubleClick={() => handlePlayEntry(entry)}
                        className={cn(
                            "block px-3 py-2 rounded-md text-sm font-medium transition-colors",
                            "hover:bg-accent hover:text-accent-foreground",
                            isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                        )}
                    >
                        {entry.name}
                    </div>
                );
            })}
        </ScrollArea>
    );
};

export default Playlist;
