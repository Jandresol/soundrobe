import type { Category, Garment } from "@/types/soundrobe";

const slotMeta: Record<Category, { label: string; className: string }> = {
  outerwear: { label: "Outerwear", className: "" },
  top: { label: "Top", className: "" },
  bottom: { label: "Bottom", className: "" },
  dress: { label: "Dress", className: "" },
  shoe: { label: "Shoes", className: "" },
  accessory: { label: "Accessory", className: "" },
};

const placeholderPalette: Record<Category, string[]> = {
  top: ["#151821", "#e64aa0", "#ffd3e8"],
  bottom: ["#202020", "#7b6aa8", "#d8dbe2"],
  dress: ["#241627", "#7b6aa8", "#ffd3e8"],
  outerwear: ["#111111", "#641f32", "#b99146"],
  shoe: ["#151821", "#6f7684", "#ffffff"],
  accessory: ["#3a2631", "#b99146", "#ffd3e8"],
};

function ProductThumbnail({ garment }: { garment: Garment }) {
  if (garment.image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={garment.image} alt="" className="h-full w-full object-contain [image-rendering:pixelated]" />
    );
  }

  const colors = placeholderPalette[garment.category];

  return (
    <div
      className="flex h-full w-full items-end justify-start border border-[#202020] p-1"
      style={{ background: placeholderBackground(colors) }}
    >
      <span className="border border-[#202020] bg-white px-1 text-[8px] font-bold uppercase text-[#151821]">
        {slotMeta[garment.category].label}
      </span>
    </div>
  );
}

export function OutfitCanvas({
  garments,
  selectedCategory,
  onSelectSlot,
  onRemoveGarment,
  onCycleCategory,
}: {
  garments: (Garment | undefined)[];
  selectedCategory: string;
  onSelectSlot: (category: string, garmentId: string) => void;
  onRemoveGarment: (garmentId: string) => void;
  onCycleCategory: (category: Category, currentGarmentId?: string) => void;
}) {
  const visibleGarments = garments.filter(Boolean) as Garment[];
  const occupiedCategories = new Set(visibleGarments.map((garment) => garment.category));
  const emptySlots = (Object.entries(slotMeta) as Array<[Category, { label: string; className: string }]>)
    .filter(([category]) => !occupiedCategories.has(category));

  return (
    <div className="dressup-stage border-2 border-[#202020] p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-2 border-[#202020] bg-[#f8f9fb] px-3 py-2">
        <div>
          <div className="ui-chrome-text text-[10px] font-bold uppercase text-[#4e5666]">Outfit Preview</div>
          <div className="text-[13px] font-bold uppercase text-[#151821]">Select a slot, swap with next, or add missing pieces.</div>
        </div>
        <div className="ui-chrome-text border-2 border-[#202020] bg-[#ffd3e8] px-2 py-1 text-[10px] font-bold uppercase">
          {visibleGarments.length} pieces
        </div>
      </div>

      <div className="grid auto-rows-fr gap-3 md:grid-cols-2">
        {visibleGarments.map((garment) => {
          const isActive = selectedCategory === garment.category;
          const meta = slotMeta[garment.category];

          return (
          <div
            role="button"
            tabIndex={0}
            key={garment.id}
            onClick={() => onSelectSlot(garment.category, garment.id)}
            onKeyDown={(event) => {
              if (event.key === "Enter") onSelectSlot(garment.category, garment.id);
            }}
            className={`catalog-tile flex min-h-[128px] min-w-0 gap-3 border-2 p-2 text-left transition ${
              isActive ? "border-[#e64aa0] bg-[#f7f1f6] outline outline-4 outline-[#ffd3e8]" : "border-[#202020] bg-[#f8f9fb]"
            } ${meta.className}`}
          >
            <div className="flex min-h-[104px] w-[96px] shrink-0 self-stretch items-center justify-center border-2 border-[#202020] bg-[#eef3fb] p-1">
              <ProductThumbnail garment={garment} />
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="ui-chrome-text mb-1 text-[10px] font-bold uppercase text-[#1746b8]">{meta.label}</div>
              <div className="text-fit text-[13px] font-bold uppercase leading-4 text-[#151821]">{garment.name}</div>
              <div className="mt-2 flex flex-wrap gap-1 text-[9px] uppercase text-[#303746]">
                {garment.influences.slice(0, 3).map((influence) => (
                  <span key={influence} className="border border-[#202020] bg-[#e9edf5] px-1 py-[1px]">
                    {influence}
                  </span>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase text-[#4e5666]">
                <span>${garment.price}</span>
                {garment.matchScore ? <span>{garment.matchScore}% match</span> : null}
              </div>
              <div className="mt-auto flex flex-wrap gap-1">
              <span
                role="button"
                tabIndex={0}
                onClick={(event) => {
                  event.stopPropagation();
                  onCycleCategory(garment.category, garment.id);
                }}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return;
                  event.stopPropagation();
                  onCycleCategory(garment.category, garment.id);
                }}
                className="bevel-button inline-flex w-fit border border-[#202020] bg-[#ffd3e8] px-2 py-1 text-[9px] font-bold uppercase text-[#151821]"
              >
                + Next
              </span>
              <span
                role="button"
                tabIndex={0}
                onClick={(event) => {
                  event.stopPropagation();
                  onRemoveGarment(garment.id);
                }}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return;
                  event.stopPropagation();
                  onRemoveGarment(garment.id);
                }}
                className="bevel-button inline-flex w-fit border border-[#202020] bg-[#f4f4f4] px-2 py-1 text-[9px] font-bold uppercase text-[#151821]"
              >
                Remove
              </span>
              </div>
            </div>
          </div>
          );
        })}
        {emptySlots.map(([category, meta]) => (
          <div
            key={category}
            className={`min-h-[128px] border-2 border-dashed border-[#6f7684] bg-[#f8f9fb]/75 p-2 ${meta.className}`}
          >
            <div className="flex h-full min-h-[108px] items-center justify-center border-2 border-[#202020] bg-white/70">
              <div className="text-center text-[10px] font-bold uppercase leading-4 text-[#5d5360]">
                <div className="ui-chrome-text text-[#1746b8]">{meta.label}</div>
                <button
                  type="button"
                  onClick={() => onCycleCategory(category)}
                  className="bevel-button mt-2 border border-[#202020] bg-[#ffd3e8] px-2 py-1 text-[9px] font-bold uppercase text-[#151821]"
                >
                  + Add
                </button>
              </div>
            </div>
          </div>
        ))}
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
