import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
    ContextMenuSeparator,
    ContextMenuSub,
    ContextMenuSubTrigger,
    ContextMenuSubContent,
    ContextMenuShortcut,
    ContextMenuCheckboxItem,
    ContextMenuRadioGroup,
    ContextMenuLabel,
    ContextMenuRadioItem,
} from "@/components/ui/context-menu";
import { useFullscreenAsFocusedPlayer, useMpvPlayer } from "@/hooks/use-mpv-player";
import MpvPlayer, { Track } from "@/services/MpvPlayer";

import { open } from "@tauri-apps/api/dialog";

import { getLanguageFullName } from "@/lib/utils";
import { title } from "process";
import { useWindowFullscreen } from "@/hooks/use-tauri-window";

const PlayerContextMenu: React.FC<React.PropsWithChildren> = ({ children }) => {
    const { info } = useMpvPlayer();
    const [isFullScreen, setIsFullScreen] = useFullscreenAsFocusedPlayer(() =>
        useWindowFullscreen("container")
    );

    console.log(info);

    const handlePlayFile = async () => {
        const path = await open({
            multiple: false,
        });

        if (!path) return;

        // TODO: Play multiple files
        if (Array.isArray(path)) throw new Error("Multiple files not implemented");

        MpvPlayer.loadFile(path);
    };

    const handleFullscreenChange = (isFullScreen: boolean) => {
        setIsFullScreen(isFullScreen);
    };

    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
            <ContextMenuContent className="w-64">
                <ContextMenuItem inset onClick={handlePlayFile}>
                    Open file
                </ContextMenuItem>

                <ContextMenuSeparator />

                <ContextMenuItem inset>
                    Play/Pause
                    <ContextMenuShortcut>Space</ContextMenuShortcut>
                </ContextMenuItem>

                {/* TODO: stop function to be implemented */}
                <ContextMenuItem inset disabled>
                    Stop
                    <ContextMenuShortcut>s</ContextMenuShortcut>
                </ContextMenuItem>

                <ContextMenuSeparator />

                <ContextMenuCheckboxItem
                    checked={isFullScreen}
                    onCheckedChange={handleFullscreenChange}
                >
                    Fullscreen
                    <ContextMenuShortcut>f</ContextMenuShortcut>
                </ContextMenuCheckboxItem>

                <ContextMenuSub>
                    <ContextMenuSubTrigger inset>Tracks</ContextMenuSubTrigger>
                    <ContextMenuSubContent>
                        <TracksSubmenuContent tracks={info.tracks} />
                    </ContextMenuSubContent>
                </ContextMenuSub>
            </ContextMenuContent>
        </ContextMenu>
    );
};

const TracksSubmenuContent: React.FC<{ tracks: Track[] }> = ({ tracks }) => {
    const TYPES = [
        {
            title: "Video",
            value: "video",
        },
        {
            title: "Audio",
            value: "audio",
        },
        {
            title: "Subtitle",
            value: "sub",
        },
    ];

    const handleTrackChange = (trackIdValue: string) => {
        const trackId = parseInt(trackIdValue);

        // TODO: set track
    };

    return (
        <>
            {TYPES.map((type) => (
                <ContextMenuRadioGroup
                    value={tracks.find((t) => t.type === type.value && t.selected)?.id.toString()}
                    onValueChange={handleTrackChange}
                >
                    <ContextMenuLabel inset>{type.title}</ContextMenuLabel>
                    <ContextMenuSeparator />

                    {tracks
                        .filter((t) => t.type === type.value)
                        .map((t) => (
                            <ContextMenuRadioItem value={t.id.toString()} key={t.id}>
                                <TrackText track={t} />
                            </ContextMenuRadioItem>
                        ))}
                </ContextMenuRadioGroup>
            ))
                // Add separators between radio menus
                .map((eln, i) => (
                    <>
                        {i > 0 && <ContextMenuSeparator />}
                        {eln}
                    </>
                ))}
        </>
    );
};

const TrackText: React.FC<{ track: Track }> = ({ track: t }) => {
    let entries: string[] = [];

    if (t.type === "video") {
        entries = [
            t.title,
            `${t.codec.toUpperCase()} ${t.codecProfile}`,
            `${t.demuxW}x${t.demuxH}`,
            `${t.demuxFps} FPS`,
            t.default && `Default`,
        ].filter((e) => e) as string[];
    }

    if (t.type === "audio") {
        entries = [
            t.lang && getLanguageFullName(t.lang),
            t.title,
            t.codec.toUpperCase(),
            `${t.audioChannels} channels`,
            `${t.demuxSamplerate}Hz`,
            t.default && `Default`,
        ].filter((e) => e) as string[];
    }

    if (t.type === "sub") {
        entries = [
            t.lang && getLanguageFullName(t.lang),
            t.title,
            t.codec.toUpperCase(),
            t.default && `Default`,
        ].filter((e) => e) as string[];
    }

    return <>{entries.join(", ")}</>;
};

export default PlayerContextMenu;
