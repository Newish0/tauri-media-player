import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

const TitledScrollArea: React.FC<React.PropsWithChildren<{ title: string }>> = ({
    children,
    title,
}) => {
    return (
        <>
            <h2 className=" font-semibold px-4 pt-2 pb-1">{title}</h2>
            <ScrollArea className="h-full overflow-auto p-2">{children}</ScrollArea>
        </>
    );
};

export default TitledScrollArea;
