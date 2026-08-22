import type { Category, Garment } from "@/types/soundrobe";

const slotMeta: Record<Category, { label: string; className: string }> = {
  outerwear: { label: "Outerwear", className: "md:col-span-2" },
  top: { label: "Top", className: "" },
  bottom: { label: "Bottom", className: "" },
  shoe: { label: "Shoes", className: "" },
  accessory: { label: "Accessory", className: "" },
};

function ProductThumbnail({ garment }: { garment: Garment }) {
  if (garment.image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={garment.image} alt="" className="h-full w-full object-cover [image-rendering:pixelated]" />
    );
  }

  return (
    <div
      className="h-16 w-20 border-2 border-[#202020]"
      style={{
        background: "linear-gradient(135deg, #151821 0%, #641f32 54%, #d8c9ae 100%)",
      }}
    />
  );
}

export function OutfitCanvas({
  garments,
  selectedCategory,
  onSelectSlot,
}: {
  garments: (Garment | undefined)[];
  selectedCategory: string;
  onSelectSlot: (category: string, garmentId: string) => void;
}) {
  const visibleGarments = garments.filter(Boolean) as Garment[];
  const emptySlots = Object.entries(slotMeta) as Array<[Category, { label: string; className: string }]>;

  return (
    <div className="dressup-stage border-2 border-[#202020] p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-2 border-[#202020] bg-[#f8f9fb] px-3 py-2">
        <div>
          <div className="ui-chrome-text text-[10px] font-bold uppercase text-[#4e5666]">Outfit Preview</div>
          <div className="text-[13px] font-bold uppercase text-[#151821]">Click worn pieces to remove. Add from the item tray.</div>
        </div>
        <div className="ui-chrome-text border-2 border-[#202020] bg-[#ffd3e8] px-2 py-1 text-[10px] font-bold uppercase">
          {visibleGarments.length} pieces
        </div>
      </div>

      <div className="grid auto-rows-[minmax(128px,auto)] gap-3 md:grid-cols-2">
        {visibleGarments.length ? visibleGarments.map((garment) => {
          const isActive = selectedCategory === garment.category;
          const meta = slotMeta[garment.category];

          return (
          <button
            type="button"
            key={garment.id}
            onClick={() => onSelectSlot(garment.category, garment.id)}
            className={`catalog-tile flex min-h-[128px] min-w-0 gap-3 border-2 p-2 text-left transition ${
              isActive ? "border-[#e64aa0] bg-[#f7f1f6] outline outline-4 outline-[#ffd3e8]" : "border-[#202020] bg-[#f8f9fb]"
            } ${meta.className}`}
          >
            <div className="flex h-[104px] w-[96px] shrink-0 items-center justify-center border-2 border-[#202020] bg-[#eef3fb]">
              <ProductThumbnail garment={garment} />
            </div>
            <div className="min-w-0 flex-1">
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
            </div>
          </button>
          );
        }) : emptySlots.map(([category, meta]) => (
          <div
            key={category}
            className={`min-h-[128px] border-2 border-dashed border-[#6f7684] bg-[#f8f9fb]/75 p-2 ${meta.className}`}
          >
            <div className="flex h-full min-h-[108px] items-center justify-center border-2 border-[#202020] bg-white/70">
              <div className="text-center text-[10px] font-bold uppercase leading-4 text-[#5d5360]">
                <div className="ui-chrome-text text-[#1746b8]">{meta.label}</div>
                <div>Build to fill slot</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
