import type { ReactNode } from "react";

export function Panel({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`retro-window overflow-hidden border-2 border-[#202020] bg-[#ececec] shadow-[5px_5px_0_#404040] ${className}`}>
      {title ? (
        <div className="title-bar-blue flex items-center justify-between border-b-2 border-[#202020] px-2 py-1 text-[10px] font-bold uppercase text-white">
          <span>{title}</span>
          <span className="flex gap-1">
            <span className="window-button">_</span>
            <span className="window-button">×</span>
          </span>
        </div>
      ) : null}
      <div className="p-3">{children}</div>
    </div>
  );
}
