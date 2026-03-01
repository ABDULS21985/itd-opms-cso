"use client";

interface SidebarResizeHandleProps {
  collapsed: boolean;
  isDragging: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onDoubleClick: () => void;
}

export function SidebarResizeHandle({
  collapsed,
  isDragging,
  onPointerDown,
  onDoubleClick,
}: SidebarResizeHandleProps) {
  if (collapsed) return null;

  return (
    <div
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
      className={`
        absolute right-0 top-0 bottom-0 w-1 z-20
        hidden lg:block
        cursor-col-resize
        group/resize
        transition-colors duration-150
        ${isDragging ? "bg-[#6B5521]/60" : "hover:bg-[#6B5521]/30"}
      `}
      style={{ touchAction: "none" }}
      role="separator"
      aria-label="Resize sidebar"
      aria-orientation="vertical"
    >
      {/* Wider hit area */}
      <div className="absolute -left-1 -right-1 top-0 bottom-0" />
      {/* Visual indicator on hover */}
      <div
        className={`
          absolute right-0 top-1/2 -translate-y-1/2
          w-[3px] h-8 rounded-full
          transition-all duration-200
          ${
            isDragging
              ? "bg-[#6B5521] opacity-100"
              : "bg-[#6B5521]/40 opacity-0 group-hover/resize:opacity-100"
          }
        `}
      />
    </div>
  );
}
