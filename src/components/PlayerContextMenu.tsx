import {
    ContextMenu,
    ContextMenuCheckboxItem,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuLabel,
    ContextMenuRadioGroup,
    ContextMenuRadioItem,
    ContextMenuSeparator,
    ContextMenuShortcut,
    ContextMenuSub,
    ContextMenuSubContent,
    ContextMenuSubTrigger,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useFullscreenAsFocusedPlayer, useMpvPlayer } from "@/hooks/use-mpv-player";
import MpvPlayer, { Track } from "@/services/MpvPlayer";

import { open } from "@tauri-apps/api/dialog";

import { useWindowFullscreen } from "@/hooks/use-tauri-window";
import { getLanguageFullName } from "@/lib/utils";

const PlayerContextMenu: React.FC<React.PropsWithChildren> = ({ children }) => {
    const { info } = useMpvPlayer();
    const [isFullScreen, setIsFullScreen] = useFullscreenAsFocusedPlayer(() =>
        useWindowFullscreen("container")
    );

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

    const handlePlayPauseToggle = () => {
        if (info.isPaused) {
            MpvPlayer.play();
        } else {
            MpvPlayer.pause();
        }
    };

    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
            <ContextMenuContent className="w-64">
                <ContextMenuItem inset onClick={handlePlayFile}>
                    Open file
                </ContextMenuItem>

                <ContextMenuSeparator />

                <ContextMenuItem inset onClick={handlePlayPauseToggle}>
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
                        <TracksMenuContent tracks={info.tracks} />
                    </ContextMenuSubContent>
                </ContextMenuSub>
            </ContextMenuContent>
        </ContextMenu>
    );
};

const TracksMenuContent: React.FC<{ tracks: Track[] }> = ({ tracks }) => {
    const TYPES: { title: string; value: "video" | "audio" | "sub" }[] = [
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

    const handleTrackChange = (type: "video" | "audio" | "sub", trackId: number) => {
        let key: "videoId" | "audioId" | "subtitleId";
        switch (type) {
            case "video":
                key = "videoId";
                break;
            case "audio":
                key = "audioId";
                break;
            case "sub":
                key = "subtitleId";
                break;
        }

        MpvPlayer.setTracks({ [key]: trackId });
    };

    return (
        <>
            {TYPES.map(({ title, value: type }) => {
                const selectedTrackId = tracks.find((t) => t.type === type && t.selected)?.id;

                return (
                    <ContextMenuRadioGroup
                        key={type}
                        value={selectedTrackId?.toString()}
                        onValueChange={(trackIdValue) =>
                            handleTrackChange(type, parseInt(trackIdValue))
                        }
                    >
                        <ContextMenuLabel inset>{title}</ContextMenuLabel>
                        <ContextMenuSeparator />

                        {tracks
                            .filter((t) => t.type === type)
                            .map((t) => (
                                <ContextMenuRadioItem value={t.id.toString()} key={t.id}>
                                    <TrackText track={t} />
                                </ContextMenuRadioItem>
                            ))}
                    </ContextMenuRadioGroup>
                );
            })
                // Add separators between radio menus
                .map((element, index) => (
                    <>
                        {index > 0 && <ContextMenuSeparator />}
                        {element}
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
