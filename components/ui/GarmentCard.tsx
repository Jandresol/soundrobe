import type { Garment } from "@/types/soundrobe";

export function GarmentCard({
  garment,
  isSelected,
  onSelect,
  onWhyThis,
}: {
  garment: Garment;
  isSelected: boolean;
  onSelect: (garment: Garment) => void;
  onWhyThis: (garment: Garment) => void;
}) {
  const palette = {
    top: ["#1f1f1f", "#7b1f2d", "#d8c9ae"],
    bottom: ["#303030", "#596247", "#d6d6d6"],
    outerwear: ["#111111", "#641f32", "#b99146"],
    shoe: ["#111111", "#8a8a8a", "#d8d8d8"],
    accessory: ["#b99146", "#d8c9ae", "#641f32"],
  };

  const colors = palette[garment.category];

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
      <div className="mb-2 flex h-32 items-center justify-center border-2 border-[#202020] bg-[#eef3fb]">
        {garment.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={garment.image} alt="" className="h-full w-full object-cover [image-rendering:pixelated]" />
        ) : (
          <div
            className="catalog-cutout h-16 w-16 border-2 border-[#202020]"
            style={{
              background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]} 55%, ${colors[2]})`,
            }}
          />
        )}
      </div>
      <div className="space-y-1 px-1 pb-1 text-[10px] uppercase text-[#111111]">
        <div className="text-fit min-h-8 font-bold leading-4">{garment.name.toUpperCase()}</div>
        <div className="truncate text-[9px] text-[#4b4b4b]">{garment.brand ?? "DEMO"} / {garment.retailer ?? "DEMO PRODUCTS"}</div>
        <div className="flex flex-wrap gap-1 text-[9px]">
          {garment.influences.map((influence) => (
            <span key={influence} className="border border-[#202020] bg-[#e9edf5] px-1">
              {influence}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-1">
          <span className="font-bold">${garment.price} {garment.matchScore ? `/ ${garment.matchScore}%` : ""}</span>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onWhyThis(garment);
            }}
            className="bevel-button border border-[#202020] bg-[#f7f7f7] px-1 py-[1px] font-bold"
          >
            WHY THIS?
          </button>
        </div>
        {garment.productUrl ? (
          <a
            href={garment.productUrl}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => event.stopPropagation()}
            className="bevel-button inline-block border border-[#202020] bg-[#ffd3e8] px-1 py-[1px] font-bold"
          >
            SHOP
          </a>
        ) : null}
      </div>
    </div>
  );
}
