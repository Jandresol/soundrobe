import type { Garment } from "@/types/soundrobe";

const placeholderPalette = {
  top: ["#151821", "#e64aa0", "#ffd3e8"],
  bottom: ["#202020", "#7b6aa8", "#d8dbe2"],
  dress: ["#241627", "#7b6aa8", "#ffd3e8"],
  outerwear: ["#111111", "#641f32", "#b99146"],
  shoe: ["#151821", "#6f7684", "#ffffff"],
  accessory: ["#3a2631", "#b99146", "#ffd3e8"],
};

export function GarmentCard({
  garment,
  isSelected,
  isInLook,
  isSaved,
  onSelect,
  onSave,
  onWhyThis,
  onNextOption,
  onMoreLikeThis,
  onNotForMe,
  actionLabel,
  showNextOption,
}: {
  garment: Garment;
  isSelected: boolean;
  isInLook?: boolean;
  isSaved?: boolean;
  onSelect: (garment: Garment) => void;
  onSave?: (garment: Garment) => void;
  onWhyThis: (garment: Garment) => void;
  onNextOption?: (garment: Garment) => void;
  onMoreLikeThis?: (garment: Garment) => void;
  onNotForMe?: (garment: Garment) => void;
  actionLabel?: string;
  showNextOption?: boolean;
}) {
  const colors = placeholderPalette[garment.category];
  const sellerLabel = [garment.brand, garment.retailer].filter(Boolean).join(" / ") || "Demo products";
  const resolvedIsInLook = Boolean(isInLook);
  const resolvedActionLabel = actionLabel ?? (resolvedIsInLook ? "REMOVE" : "ADD");

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(garment)}
      onKeyDown={(event) => {
        if (event.key === "Enter") onSelect(garment);
      }}
      className={`catalog-tile w-full border-2 bg-[#f8f9fb] p-1 text-left transition-all ${
        isSelected ? "border-[#e64aa0] shadow-[0_0_0_3px_#ffd3e8,inset_0_0_0_2px_#e64aa0]" : "border-[#202020]"
      }`}
    >
      <div className="mb-2 flex aspect-[4/5] min-h-44 items-center justify-center border-2 border-[#202020] bg-[#eef3fb] p-1">
        {garment.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={garment.image} alt="" className="h-full w-full object-contain [image-rendering:pixelated]" />
        ) : (
          <div
            className="flex h-full w-full items-end justify-start border border-[#202020] p-2"
            style={{ background: placeholderBackground(colors) }}
          >
            <span className="border-2 border-[#202020] bg-white px-2 py-1 text-[10px] font-bold uppercase text-[#151821]">
              {garment.category}
            </span>
          </div>
        )}
      </div>
      <div className="space-y-1 px-1 pb-1 text-[10px] uppercase text-[#111111]">
        <div className="text-fit min-h-8 font-bold leading-4">{garment.name.toUpperCase()}</div>
        <div className="truncate text-[9px] text-[#4b4b4b]">{sellerLabel}</div>
        <div className="flex flex-wrap gap-1 text-[9px]">
          {garment.influences.map((influence) => (
            <span key={influence} className="border border-[#202020] bg-[#e9edf5] px-1">
              {influence}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-1 border-t border-[#c8c8c8] pt-1">
          <span className="font-bold">${garment.price} {garment.matchScore ? `/ ${garment.matchScore}%` : ""}</span>
        </div>
        <div className="grid grid-cols-2 gap-1">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onSelect(garment);
            }}
            className={`bevel-button min-h-[24px] border border-[#202020] px-1 py-[2px] font-bold ${resolvedIsInLook ? "bg-[#d8dbe2]" : "bg-[#ffd3e8]"}`}
          >
            {resolvedIsInLook ? "- " : "+ "}{resolvedActionLabel}
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onWhyThis(garment);
            }}
            className="bevel-button min-h-[24px] border border-[#202020] bg-[#f7f7f7] px-1 py-[2px] font-bold"
          >
            WHY?
          </button>
        </div>
        <div className="grid grid-cols-2 gap-1">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onSave?.(garment);
            }}
            className={`bevel-button min-h-[24px] border border-[#202020] px-1 py-[2px] font-bold ${isSaved ? "bg-[#d8dbe2]" : "bg-white"}`}
          >
            {isSaved ? "SAVED" : "SAVE"}
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onMoreLikeThis?.(garment);
            }}
            className="bevel-button min-h-[24px] border border-[#202020] bg-white px-1 py-[2px] font-bold"
          >
            MORE LIKE THIS
          </button>
        </div>
        {onNotForMe ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onNotForMe(garment);
            }}
            className="bevel-button block min-h-[24px] w-full border border-[#202020] bg-[#f7f7f7] px-1 py-[3px] text-center font-bold"
          >
            NOT FOR ME
          </button>
        ) : null}
        {(resolvedIsInLook || showNextOption) && onNextOption ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onNextOption(garment);
            }}
            className="bevel-button block min-h-[24px] w-full border border-[#202020] bg-[#f7f7f7] px-1 py-[3px] text-center font-bold"
          >
            NEXT OPTION
          </button>
        ) : null}
        {garment.productUrl ? (
          <a
            href={garment.productUrl}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => event.stopPropagation()}
            className="bevel-button block min-h-[24px] border border-[#202020] bg-[#ffd3e8] px-1 py-[3px] text-center font-bold"
          >
            SHOP
          </a>
        ) : null}
      </div>
    </div>
  );
}

function placeholderBackground(colors: string[]) {
  return `
    radial-gradient(circle at 18% 18%, rgba(255,255,255,0.38) 0 2px, transparent 2px 8px),
    linear-gradient(135deg, ${colors[0]} 0%, ${colors[1]} 56%, ${colors[2]} 100%)
  `;
}
