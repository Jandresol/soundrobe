export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const filledWidth = `${Math.min(100, Math.max(0, value))}%`;

  return (
    <div className="space-y-1">
      {label ? (
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.12em] text-[#111111]">
          <span>{label}</span>
          <span>{value}%</span>
        </div>
      ) : null}
      <div className="relative h-4 overflow-hidden border-2 border-[#303030] bg-[#f3f3f3]">
        <div
          className="h-full border-r-2 border-[#303030] bg-[#1746b8]"
          style={{ width: filledWidth }}
        />
      </div>
    </div>
  );
}
