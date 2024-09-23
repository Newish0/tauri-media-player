import React, { useEffect, memo, useState, ReactElement } from "react";
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
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";

type DraggableListProps<T> = {
    items: T[];
    onDragEnd: (event: DragEndEvent) => void;
    disabled?: boolean;
    renderItem: (item: T, index: number, props: SortableItemProps) => ReactElement;
    getItemId: (item: T) => string | number;
};

type SortableItemProps = {
    listeners?: SyntheticListenerMap;
    attributes?: DraggableAttributes;
    ref: (element: HTMLElement | null) => void;
    style?: React.CSSProperties;
};

function DraggableList<T>({
    items: defaultItems,
    onDragEnd,
    disabled,
    renderItem,
    getItemId,
}: DraggableListProps<T>) {
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

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setItems((items) => {
                const oldIndex = items.findIndex((i) => getItemId(i) === active.id);
                const newIndex = items.findIndex((i) => getItemId(i) === over.id);

                return arrayMove(items, oldIndex, newIndex);
            });
        }

        onDragEnd(event);
    }

    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
                disabled={disabled}
                items={items.map(getItemId)}
                strategy={verticalListSortingStrategy}
            >
                {items.map((item, index) => (
                    <SortableItem key={getItemId(item)} id={getItemId(item)}>
                        {(props) => renderItem(item, index, props)}
                    </SortableItem>
                ))}
            </SortableContext>
        </DndContext>
    );
}

const SortableItem: React.FC<{
    id: string | number;
    children: (props: SortableItemProps) => ReactElement;
}> = ({ id, children }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return children({
        ref: setNodeRef,
        style,
        attributes,
        listeners,
    });
};

export default memo(DraggableList) as typeof DraggableList;
