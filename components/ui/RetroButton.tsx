import type { ButtonHTMLAttributes, ReactNode } from "react";

interface RetroButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
}

export function RetroButton({
  children,
  variant = "secondary",
  size = "md",
  className = "",
  ...props
}: RetroButtonProps) {
  const base =
    "bevel-button relative border-2 border-[#303030] bg-[#e4e4e4] font-bold uppercase tracking-[0.035em] shadow-[3px_3px_0_#8c8c8c] transition-all duration-75 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_#8c8c8c]";

  const styles = {
    primary: "bg-[#ffd3e8] text-[#111111]",
    secondary: "bg-[#d8dbe2] text-[#111111]",
    ghost: "bg-[#f4f4f4] text-[#111111]",
  };

  const sizes = {
    sm: "min-h-[26px] px-2 py-1 text-[10px]",
    md: "min-h-[32px] px-3 py-1.5 text-[11px]",
    lg: "min-h-[40px] px-4 py-2 text-[12px]",
  };

  return (
    <button
      className={`${base} ${styles[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
