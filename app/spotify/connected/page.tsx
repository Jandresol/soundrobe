"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SpotifyConnectedPage() {
  const router = useRouter();

  useEffect(() => {
    window.sessionStorage.setItem("soundrobe-run-analysis", "spotify");
    router.replace("/?run=spotify");
  }, [router]);

  return (
    <main className="app-shell flex min-h-screen items-center justify-center p-4">
      <div className="retro-window border-2 border-[#202020] bg-[#f7f1f6] p-4 text-center">
        <div className="title-bar-blue mb-3 border-2 border-[#202020] px-3 py-1 text-[11px] font-bold uppercase text-white">
          Spotify connected
        </div>
        <div className="text-[13px] font-bold uppercase text-[#151821]">Building your Soundrobe...</div>
      </div>
    </main>
  );
}
