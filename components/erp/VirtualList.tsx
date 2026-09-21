"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef, type ReactNode } from "react";

/** Window long lists (relations, documents) so thousands of rows stay off-DOM. */
export function VirtualList<T>({
  items,
  estimateSize = 56,
  className,
  render,
}: {
  items: T[];
  estimateSize?: number;
  className?: string;
  render: (item: T, index: number) => ReactNode;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan: 10,
  });
  return (
    <div ref={parentRef} className={className}>
      <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
        {virtualizer.getVirtualItems().map((v) => (
          <div key={v.key} style={{ position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${v.start}px)` }}>
            {render(items[v.index], v.index)}
          </div>
        ))}
      </div>
    </div>
  );
}
