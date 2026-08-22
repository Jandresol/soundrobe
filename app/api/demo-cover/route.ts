import { NextRequest, NextResponse } from "next/server";

const palettes = [
  ["#151821", "#e64aa0", "#ffd3e8", "#1746b8"],
  ["#2b1845", "#9a6742", "#f7f1f6", "#b99146"],
  ["#202020", "#d8dbe2", "#ffffff", "#641f32"],
  ["#173f9d", "#b7d3fb", "#f6b8d7", "#151821"],
  ["#441c1e", "#d4a13b", "#fff7cc", "#202020"],
];

export function GET(request: NextRequest) {
  const rawName = request.nextUrl.searchParams.get("name") ?? "soundrobe";
  const safeName = rawName.replace(/[^a-z0-9 -]/gi, "").slice(0, 28) || "soundrobe";
  const seed = Array.from(safeName).reduce((total, char) => total + char.charCodeAt(0), 0);
  const colors = palettes[seed % palettes.length];
  const title = safeName.replaceAll("-", " ").toUpperCase();
  const initials = title.split(" ").filter(Boolean).slice(0, 3).map((word) => word[0]).join("");
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320" role="img" aria-label="${escapeXml(title)} demo album cover">
  <rect width="320" height="320" fill="${colors[0]}"/>
  <rect x="18" y="18" width="284" height="284" fill="${colors[2]}" stroke="${colors[3]}" stroke-width="8"/>
  <path d="M18 214 L302 78 L302 302 L18 302 Z" fill="${colors[1]}" opacity=".9"/>
  <circle cx="96" cy="94" r="42" fill="${colors[1]}" stroke="${colors[0]}" stroke-width="6"/>
  <circle cx="96" cy="94" r="12" fill="${colors[2]}" stroke="${colors[0]}" stroke-width="5"/>
  <g opacity=".45">
    <rect x="158" y="44" width="98" height="14" fill="${colors[0]}"/>
    <rect x="158" y="70" width="122" height="14" fill="${colors[0]}"/>
    <rect x="158" y="96" width="78" height="14" fill="${colors[0]}"/>
  </g>
  <text x="28" y="252" font-family="Arial Black, Tahoma, sans-serif" font-size="56" font-weight="900" letter-spacing="-3" fill="${colors[0]}">${escapeXml(initials)}</text>
  <text x="28" y="286" font-family="Tahoma, Arial, sans-serif" font-size="17" font-weight="700" fill="${colors[0]}">${escapeXml(title)}</text>
</svg>`;

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
