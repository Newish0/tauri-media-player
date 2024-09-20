import React, { useEffect, memo, useState } from "react";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DraggableAttributes,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "./ui/button";
import { DragHandleDots1Icon } from "@radix-ui/react-icons";
import { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";

type DraggableSimplePlaylistProps = {
    items: {
        id: string | number;
        element: React.ReactElement;
    }[];
    onDragEnd: (event: DragEndEvent) => void;
    disabled?: boolean;
};

const DraggableSimplePlaylist: React.FC<DraggableSimplePlaylistProps> = memo(
    ({ items: defaultItems, onDragEnd, disabled }) => {
        const [items, setItems] = useState(defaultItems);

        const sensors = useSensors(
            useSensor(PointerSensor),
            useSensor(KeyboardSensor, {
                coordinateGetter: sortableKeyboardCoordinates,
            })
        );

        useEffect(() => {
            setItems(defaultItems);
        }, [defaultItems]);

        return (
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext
                    disabled={disabled}
                    items={items.map((i) => i.id)}
                    strategy={verticalListSortingStrategy}
                >
                    {items.map(({ id, element }) => (
                        <SortableItem key={id} id={id}>
                            {element}
                        </SortableItem>
                    ))}
                </SortableContext>
            </DndContext>
        );

        function handleDragEnd(event: DragEndEvent) {
            const { active, over } = event;

            if (over && active.id !== over.id) {
                setItems((items) => {
                    const oldIndex = items.findIndex((i) => i.id === active.id);
                    const newIndex = items.findIndex((i) => i.id === over.id);

                    if (!oldIndex || !newIndex) return items;

                    return arrayMove(items, oldIndex, newIndex);
                });
            }

            onDragEnd(event);
        }
    }
);

export default DraggableSimplePlaylist;

export type SortableItemChildProps = {
    listeners?: SyntheticListenerMap;
    attributes?: DraggableAttributes;
};

export const SortableItem: React.FC<React.PropsWithChildren<{ id: string | number }>> = function (
    props
) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
        id: props.id,
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const childWithProps = React.isValidElement(props.children)
        ? React.cloneElement(props.children, { ...{ listeners, attributes } })
        : props.children;

    return (
        <div ref={setNodeRef} style={style}>
            {childWithProps}
        </div>
    );
};
