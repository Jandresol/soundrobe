"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Play,
  UserRound,
} from "lucide-react";

import { GarmentCard } from "@/components/ui/GarmentCard";
import { OutfitCanvas } from "@/components/ui/OutfitCanvas";
import { Panel } from "@/components/ui/Panel";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { RetroButton } from "@/components/ui/RetroButton";
import { adaptGarments, adaptMusicProfile, adaptOutfits, adaptStyleProfile } from "@/lib/result-adapter";
import { defaultLook as fallbackLook, defaultSavedGarments, defaultSavedLooks, garments as fallbackGarments, lookPresets as fallbackLooks, musicProfile as fallbackMusicProfile, styleProfile as fallbackStyleProfile } from "@/lib/mock-data";
import type { SoundrobeResult } from "@/src/domain/soundrobe/types";
import type { Category, Garment, Outfit, Screen } from "@/types/soundrobe";

const tabs: Array<{ label: string; value: Screen }> = [
  { label: "PROFILE", value: "profile" },
  { label: "MUSIC DNA", value: "dna" },
  { label: "SOUNDROBE", value: "soundrobe" },
  { label: "LOOKS", value: "looks" },
  { label: "CLOSET", value: "closet" },
];

const categoryTabs: Array<{ label: string; value: Category }> = [
  { label: "TOPS", value: "top" },
  { label: "BOTTOMS", value: "bottom" },
  { label: "OUTERWEAR", value: "outerwear" },
  { label: "SHOES", value: "shoe" },
  { label: "ACCESSORIES", value: "accessory" },
];

const analysisSteps = [
  "READING MUSIC PROFILE",
  "MAPPING GENRES",
  "IDENTIFYING ERAS",
  "FINDING YOUR STYLE THREAD",
  "BUILDING WARDROBE",
  "SEARCHING STORES",
  "MATCHING PRODUCTS",
  "ASSEMBLING LOOKS",
];

export default function HomePage() {
  const [screen, setScreen] = useState<Screen>("home");
  const [soundrobeResult, setSoundrobeResult] = useState<SoundrobeResult | null>(null);
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [spotifyMessage, setSpotifyMessage] = useState("Demo music ready");
  const [analysisMusicSource, setAnalysisMusicSource] = useState<"spotify" | "demo">("demo");
  const [timeWeights, setTimeWeights] = useState({ longTerm: 50, mediumTerm: 30, shortTerm: 20 });
  const [analysisIndex, setAnalysisIndex] = useState(0);
  const [analysisProgress, setAnalysisProgress] = useState(12);
  const [selectedCategory, setSelectedCategory] = useState<Category>("top");
  const [selectedSlotCategory, setSelectedSlotCategory] = useState<string>("outerwear");
  const [currentLook, setCurrentLook] = useState(fallbackLook);
  const [selectedGarmentId, setSelectedGarmentId] = useState<string>(fallbackLook.garmentIds[0]);
  const [nowPlayingIndex, setNowPlayingIndex] = useState(0);
  const [savedGarments, setSavedGarments] = useState<string[]>(() => {
    if (typeof window === "undefined") return defaultSavedGarments;
    const savedPieces = window.localStorage.getItem("soundrobe-saved-garments");
    return savedPieces ? JSON.parse(savedPieces) as string[] : defaultSavedGarments;
  });
  const [savedLooks, setSavedLooks] = useState<string[]>(() => {
    if (typeof window === "undefined") return defaultSavedLooks;
    const savedOutfits = window.localStorage.getItem("soundrobe-saved-looks");
    return savedOutfits ? JSON.parse(savedOutfits) as string[] : defaultSavedLooks;
  });
  const [savedLookNames, setSavedLookNames] = useState<Record<string, string>>(() => {
    if (typeof window === "undefined") return {};
    const names = window.localStorage.getItem("soundrobe-saved-look-names");
    return names ? JSON.parse(names) as Record<string, string> : {};
  });
  const [whyThisGarmentId, setWhyThisGarmentId] = useState<string | null>(null);

  const garments = useMemo(() => soundrobeResult ? adaptGarments(soundrobeResult) : fallbackGarments, [soundrobeResult]);
  const lookPresets = useMemo(() => soundrobeResult ? adaptOutfits(soundrobeResult) : fallbackLooks, [soundrobeResult]);
  const defaultLook = lookPresets[0] ?? fallbackLook;
  const musicProfile = useMemo(() => soundrobeResult ? adaptMusicProfile(soundrobeResult) : fallbackMusicProfile, [soundrobeResult]);
  const styleProfile = useMemo(() => soundrobeResult ? adaptStyleProfile(soundrobeResult) : fallbackStyleProfile, [soundrobeResult]);
  const appliedTimeWeights = soundrobeResult?.metadata.diagnostics?.timeWeights ?? { longTerm: 0.5, mediumTerm: 0.3, shortTerm: 0.2 };
  const displayedAppliedWeights = {
    longTerm: Math.round(appliedTimeWeights.longTerm * 100),
    mediumTerm: Math.round(appliedTimeWeights.mediumTerm * 100),
    shortTerm: Math.round(appliedTimeWeights.shortTerm * 100),
  };
  const hasUnappliedMix =
    timeWeights.longTerm !== displayedAppliedWeights.longTerm ||
    timeWeights.mediumTerm !== displayedAppliedWeights.mediumTerm ||
    timeWeights.shortTerm !== displayedAppliedWeights.shortTerm;
  const modalGarment = garments.find((garment) => garment.id === whyThisGarmentId) ?? null;
  const hasGenreData = musicProfile.genres.some((genre) => genre.value > 0);
  const topGenreLine = hasGenreData ? musicProfile.genres.slice(0, 4).map((genre) => genre.name).join(" / ") : "No music tags returned";
  const topArtistLine = musicProfile.artists.slice(0, 4).map((artist) => artist.name).join(" / ");
  const sourceDrivers = [
    ...musicProfile.trackTags.filter((tag) => !musicProfile.genres.some((genre) => genre.name.toLowerCase() === tag.name.toLowerCase())),
    ...musicProfile.eras.slice(0, 2),
  ].slice(0, 5);
  const nowPlaying = useMemo(() => {
    const track = musicProfile.tracks[nowPlayingIndex % Math.max(musicProfile.tracks.length, 1)];
    const genreLine = `${musicProfile.genres.slice(0, 4).map((genre) => genre.name).join(" // ")} //`;
    if (!track) {
      return { title: genreLine, detail: "Top genre mix", progress: 62, imageUrl: undefined };
    }
    const artistLine = track.artists.length ? track.artists.join(" / ") : "Top track";
    const progressSeed = Array.from(track.name).reduce((total, char) => total + char.charCodeAt(0), 0);
    return {
      title: `${track.name} //`,
      detail: `${artistLine}${track.releaseYear ? ` // ${track.releaseYear}` : ""}`,
      progress: 34 + (progressSeed % 42),
      imageUrl: track.imageUrl,
    };
  }, [musicProfile, nowPlayingIndex]);

  const currentLookGarments = useMemo(() => {
    const slotOrder: Array<Category> = ["outerwear", "top", "bottom", "shoe", "accessory"];
    return currentLook.garmentIds
      .map((id) => garments.find((garment) => garment.id === id))
      .filter((garment): garment is Garment => Boolean(garment))
      .sort((a, b) => slotOrder.indexOf(a.category) - slotOrder.indexOf(b.category));
  }, [currentLook, garments]);
  const normalizedSelectedCategory = selectedSlotCategory === "shoes" ? "shoe" : selectedSlotCategory;

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("soundrobe-saved-garments", JSON.stringify(savedGarments));
  }, [savedGarments]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("soundrobe-saved-looks", JSON.stringify(savedLooks));
  }, [savedLooks]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("soundrobe-saved-look-names", JSON.stringify(savedLookNames));
  }, [savedLookNames]);

  useEffect(() => {
    let cancelled = false;
    const searchParams = new URLSearchParams(window.location.search);
    const pendingAnalysis = window.sessionStorage.getItem("soundrobe-run-analysis");
    const shouldRunSpotify = searchParams.get("run") === "spotify" || searchParams.get("spotify") === "connected" || pendingAnalysis === "spotify";
    if (searchParams.get("run") === "spotify" || searchParams.get("spotify") === "connected") {
      window.history.replaceState({}, "", window.location.pathname);
      window.setTimeout(() => {
        if (!cancelled) {
          setAnalysisMusicSource("spotify");
          setSpotifyMessage("Spotify connected. Building your Soundrobe...");
          setScreen("analysis");
        }
      }, 0);
    } else if (pendingAnalysis === "spotify") {
      window.sessionStorage.removeItem("soundrobe-run-analysis");
      window.setTimeout(() => {
        if (!cancelled) {
          setAnalysisMusicSource("spotify");
          setSpotifyMessage("Spotify connected. Building your Soundrobe...");
          setScreen("analysis");
        }
      }, 0);
    } else if (searchParams.get("spotify") === "error") {
      window.history.replaceState({}, "", window.location.pathname);
      window.setTimeout(() => {
        if (!cancelled) setSpotifyMessage("Spotify did not connect. Demo music is still available.");
      }, 0);
    } else if (searchParams.get("spotify") === "missing-config") {
      window.history.replaceState({}, "", window.location.pathname);
      window.setTimeout(() => {
        if (!cancelled) setSpotifyMessage("Spotify keys are missing. Add them to .env.local and restart dev.");
      }, 0);
    }
    fetch("/api/music/spotify/status", { cache: "no-store" })
      .then((response) => response.json() as Promise<{ connected: boolean }>)
      .then((status) => {
        if (!cancelled) {
          setSpotifyConnected(status.connected);
          if (status.connected && !shouldRunSpotify) setSpotifyMessage("Spotify connected");
        }
      })
      .catch(() => {
        if (!cancelled) setSpotifyConnected(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (screen !== "analysis") return;

    let cancelled = false;
    const run = async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 0));
        if (cancelled) return;
        setAnalysisIndex(0);
        setAnalysisProgress(12);
        for (let index = 0; index < analysisSteps.length - 1; index += 1) {
          if (cancelled) return;
          setAnalysisIndex(index);
          setAnalysisProgress(Math.round(((index + 1) / analysisSteps.length) * 100));
          await new Promise((resolve) => setTimeout(resolve, 120));
        }
        const params = new URLSearchParams({
          music: analysisMusicSource,
          longTerm: String(timeWeights.longTerm),
          mediumTerm: String(timeWeights.mediumTerm),
          shortTerm: String(timeWeights.shortTerm),
        });
        const response = await fetch(`/api/soundrobe?${params.toString()}`, { cache: "no-store" });
        if (!response.ok) {
          const payload = await response.json().catch(() => null) as { error?: string } | null;
          throw new Error(payload?.error ?? `Soundrobe request failed: ${response.status}`);
        }
        const result = await response.json() as SoundrobeResult;
        if (cancelled) return;
        setSoundrobeResult(result);
        setNowPlayingIndex(0);
        setSpotifyConnected(result.metadata.musicSource === "spotify");
        setSpotifyMessage(result.metadata.musicSource === "spotify" ? "Using Spotify music profile" : "Using demo music profile");
        const nextLooks = adaptOutfits(result);
        const nextGarments = adaptGarments(result);
        const generatedLook = nextLooks[0] ?? { ...fallbackLook, id: "look-generated-empty", garmentIds: nextGarments.slice(0, 5).map((garment) => garment.id) };
        setCurrentLook(generatedLook);
        setSelectedGarmentId(nextGarments[0]?.id ?? generatedLook.garmentIds[0] ?? fallbackLook.garmentIds[0]);
        setAnalysisIndex(analysisSteps.length - 1);
        setAnalysisProgress(100);
        setScreen("soundrobe");
      } catch (error) {
        if (!cancelled) {
          setSpotifyConnected(false);
          setSpotifyMessage(error instanceof Error ? error.message : "Could not build from Spotify. Connect again.");
          setScreen("home");
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [analysisMusicSource, screen, timeWeights]);

  const handleDemoStart = () => {
    setAnalysisMusicSource("demo");
    setScreen("analysis");
  };

  const handleEnterSoundrobe = () => {
    setAnalysisMusicSource("spotify");
    setScreen("analysis");
  };

  const updateTimeWeight = (key: "longTerm" | "mediumTerm" | "shortTerm", value: number) => {
    setTimeWeights((previous) => ({ ...previous, [key]: value }));
  };

  const handleRegenerateWithWeights = async () => {
    if (!soundrobeResult) {
      setAnalysisMusicSource(analysisMusicSource);
      setScreen("analysis");
      return;
    }

    try {
      setSpotifyMessage("Rebuilding fashion mix from cached music...");
      const response = await fetch("/api/soundrobe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          musicProfile: soundrobeResult.musicProfile,
          musicSource: soundrobeResult.metadata.musicSource,
          timeWeights: {
            longTerm: timeWeights.longTerm,
            mediumTerm: timeWeights.mediumTerm,
            shortTerm: timeWeights.shortTerm,
          },
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error ?? `Soundrobe rebuild failed: ${response.status}`);
      }
      const result = await response.json() as SoundrobeResult;
      const nextLooks = adaptOutfits(result);
      const nextGarments = adaptGarments(result);
      setSoundrobeResult(result);
      setNowPlayingIndex(0);
      const generatedLook = nextLooks[0] ?? { ...fallbackLook, id: "look-generated-empty", garmentIds: nextGarments.slice(0, 5).map((garment) => garment.id) };
      setCurrentLook(generatedLook);
      setSelectedGarmentId(nextGarments[0]?.id ?? generatedLook.garmentIds[0] ?? fallbackLook.garmentIds[0]);
      setSelectedCategory("top");
      setSelectedSlotCategory("outerwear");
      setSpotifyMessage("Fashion mix rebuilt from cached music");
    } catch (error) {
      setSpotifyMessage(error instanceof Error ? error.message : "Could not rebuild fashion mix");
    }
  };

  const setWeightPreset = (preset: "core" | "balanced" | "current") => {
    const presets = {
      core: { longTerm: 70, mediumTerm: 20, shortTerm: 10 },
      balanced: { longTerm: 40, mediumTerm: 35, shortTerm: 25 },
      current: { longTerm: 20, mediumTerm: 30, shortTerm: 50 },
    };
    setTimeWeights(presets[preset]);
  };

  const handleSpotifyConnect = () => {
    window.location.assign(new URL("/api/music/spotify/login", window.location.origin).toString());
  };

  const handleReset = () => {
    setScreen("home");
    setCurrentLook(defaultLook);
    setSelectedCategory("top");
    setSelectedSlotCategory("outerwear");
    setSelectedGarmentId(defaultLook.garmentIds[0]);
    setNowPlayingIndex(0);
    setAnalysisProgress(12);
    setAnalysisIndex(0);
  };

  const toggleCurrentLookGarment = (garment: Garment) => {
    setCurrentLook((previous) => {
      const exists = previous.garmentIds.includes(garment.id);
      const garmentIds = exists
        ? previous.garmentIds.filter((id) => id !== garment.id)
        : [...previous.garmentIds, garment.id];
      return { ...previous, garmentIds };
    });
    setSelectedGarmentId(garment.id);
  };

  const removeCurrentLookGarment = (garmentId: string) => {
    setCurrentLook((previous) => ({ ...previous, garmentIds: previous.garmentIds.filter((id) => id !== garmentId) }));
  };

  const handleRemix = () => {
    setCurrentLook((previous) => ({
      ...previous,
      garmentIds: previous.garmentIds.map((id, index) => {
        if (index > 1) return id;
        const current = garments.find((garment) => garment.id === id);
        const replacement = garments.find((garment) => garment.category === current?.category && garment.id !== id);
        return replacement?.id ?? id;
      }),
    }));
  };

  const handleSaveLook = () => {
    setSavedLooks((previous) => (previous.includes(currentLook.id) ? previous : [...previous, currentLook.id]));
    setSavedLookNames((previous) => ({ ...previous, [currentLook.id]: currentLook.name }));
  };

  const handleSaveSpecificLook = (look: Outfit) => {
    setSavedLooks((previous) => (previous.includes(look.id) ? previous : [...previous, look.id]));
    setSavedLookNames((previous) => ({ ...previous, [look.id]: savedLookNames[look.id] ?? look.name }));
  };

  const handleRenameLook = (name: string) => {
    setCurrentLook((previous) => ({ ...previous, name }));
    setSavedLookNames((previous) => (savedLooks.includes(currentLook.id) ? { ...previous, [currentLook.id]: name } : previous));
  };

  const handleSelectAlbum = (albumName: string) => {
    const trackIndex = musicProfile.tracks.findIndex((track) => track.albumName === albumName);
    if (trackIndex >= 0) setNowPlayingIndex(trackIndex);
  };

  const handleSelectOutfitSlot = (category: string, garmentId: string) => {
    const normalized = category === "shoes" ? "shoe" : category;
    setSelectedSlotCategory(normalized);
    setSelectedGarmentId(garmentId);
    if (["top", "bottom", "outerwear", "shoe", "accessory"].includes(normalized)) {
      setSelectedCategory(normalized as Category);
    }
    removeCurrentLookGarment(garmentId);
  };

  const homeTools = [
    { icon: "↖", label: "Profile", action: () => setScreen("profile") },
    { icon: "♪", label: "Music DNA", action: () => setScreen(soundrobeResult ? "dna" : "home") },
    { icon: "♡", label: "Save Look", action: handleSaveLook },
    { icon: "✓", label: "Enter", action: spotifyConnected ? handleEnterSoundrobe : handleDemoStart },
    { icon: "✂", label: "Remix", action: handleRemix },
    { icon: "A", label: "Palette", action: () => setScreen(soundrobeResult ? "dna" : "home") },
    { icon: "▭", label: "Looks", action: () => setScreen("looks") },
    { icon: "☆", label: "Closet", action: () => setScreen("closet") },
  ];

  const renderScreen = () => {
    if (screen === "home") {
      return (
        <div className="grid gap-3 p-2 md:grid-cols-[150px_minmax(0,1fr)] md:p-3 xl:grid-cols-[150px_minmax(0,1fr)_320px]">
          <div className="paint-rail border-2 border-[#202020] p-2">
            <div className="grid grid-cols-2 gap-1.5">
              {homeTools.map((tool) => (
                <button
                  key={tool.icon}
                  type="button"
                  title={tool.label}
                  aria-label={tool.label}
                  onClick={tool.action}
                  className="bevel-button h-12 border-2 border-[#202020] bg-[#f3e5ee] text-lg font-bold text-[#1746b8]"
                >
                  {tool.icon}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="border-2 border-[#202020] bg-[#f7f1f6] p-4 shadow-[5px_5px_0_rgba(23,70,184,0.45)]">
              <div className="ui-chrome-text mb-2 bg-[#1746b8] px-2 py-1 text-[11px] font-bold uppercase text-white">all new ★ soundrobe</div>
              <h1 className="display-wordmark text-[44px] uppercase leading-[0.9] text-[#1746b8] md:text-[72px]">{"LET'S MATCH!"}</h1>
              <p className="mt-2 max-w-xl text-[13px] font-semibold leading-5 text-[#303746]">Music goes in. A playable wardrobe comes out. Palette, pieces, reasons, and looks are generated by the pipeline underneath.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {spotifyConnected ? (
                  <>
                    <RetroButton variant="primary" size="lg" onClick={handleEnterSoundrobe}>ENTER SOUNDROBE</RetroButton>
                    <RetroButton variant="secondary" size="lg" onClick={handleSpotifyConnect}>REFRESH SPOTIFY</RetroButton>
                  </>
                ) : (
                  <>
                    <RetroButton variant="primary" size="lg" onClick={handleSpotifyConnect}>CONNECT MUSIC</RetroButton>
                    <RetroButton variant="secondary" size="lg" onClick={handleDemoStart}>TRY DEMO</RetroButton>
                  </>
                )}
              </div>
              <div className="ui-chrome-text mt-3 inline-flex border-2 border-[#202020] bg-[#f8f9fb] px-2 py-1 text-[10px] font-bold uppercase text-[#4e5666]">
                {spotifyMessage}
              </div>
            </div>
            <OutfitCanvas garments={currentLookGarments} selectedCategory={normalizedSelectedCategory} onSelectSlot={handleSelectOutfitSlot} />
          </div>

          <div className="space-y-3">
            <Panel title="NOW PLAYING">
              <div className="space-y-3">
                <div className="grid grid-cols-[76px_minmax(0,1fr)] gap-2 border-2 border-[#202020] bg-[#f7f7f7] p-2">
                  <div className="flex h-24 min-w-0 items-center justify-center border-2 border-[#202020] bg-[#dfe7f5]">
                    <div className="spinning-cd" aria-label="Soundrobe compact disc" />
                  </div>
                  <div className="min-w-0 space-y-2 text-[10px] font-bold uppercase">
                    <div className="ticker-window bg-[#151821] px-2 py-1 text-[#ffd3e8]"><span className="marquee">get started // connect music // build wardrobe //</span></div>
                    <div className="truncate border-2 border-[#202020] bg-white px-2 py-1 text-[9px] text-[#303746]">No music loaded yet</div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button type="button" aria-label="Connect music" onClick={spotifyConnected ? handleEnterSoundrobe : handleSpotifyConnect} className="bevel-button flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#202020] bg-[#ffd3e8]"><Play className="ml-0.5 h-4 w-4 fill-current" /></button>
                    </div>
                    <div className="h-4 border-2 border-[#202020] bg-white p-[2px]"><div className="h-full bg-[#1746b8]" style={{ width: "28%" }} /></div>
                  </div>
                </div>
                <div className="flex h-12 items-end gap-1 border-2 border-[#202020] bg-black p-1">
                  {[32, 52, 40, 70, 46, 68, 58, 45, 72, 60, 34, 80].map((height, index) => (
                    <span key={height + index} className="equalizer-bar" style={{ height: `${height}%` }} />
                  ))}
                </div>
              </div>
            </Panel>
          </div>
        </div>
      );
    }

    if (screen === "analysis") {
      return (
        <div className="space-y-4 p-2 md:p-4">
          <Panel title="ANALYZING MUSIC PROFILE..." className="overflow-hidden">
            <div className="space-y-5 px-2 py-4 text-[10px] font-bold uppercase text-[#111111]">
              <div className="text-[13px]">USER: {musicProfile.userName.toUpperCase()}</div>

              {analysisSteps.map((step, index) => (
                <div key={step} className="grid gap-2 md:grid-cols-[230px_1fr]">
                  <span className={index <= analysisIndex ? "text-[#111111]" : "text-[#6d6d6d]"}>
                    {step}...
                  </span>
                  <div className="relative h-5 border-2 border-[#303030] bg-[#f4f4f4]">
                    <div
                      className={`h-full border-r-2 border-[#303030] ${index <= analysisIndex ? "bg-[#1746b8]" : "bg-[#d8d8d8]"}`}
                      style={{ width: index < analysisIndex ? "100%" : index === analysisIndex ? `${analysisProgress}%` : "18%" }}
                    />
                  </div>
                </div>
              ))}

              <div className="pt-3">
                <div className="mb-2 text-[11px] font-bold uppercase">NOW PROCESSING</div>
                <div className="border-2 border-[#303030] bg-[#f5f5f5] p-2 text-[11px] tracking-[0.12em]">
                  {musicProfile.genres.slice(0, 4).map((genre) => genre.name).join(" / ")}
                </div>
              </div>

              <div className="rounded-none border-2 border-[#303030] bg-[#ededed] p-3">
                <div className="mb-3 text-[11px] font-bold uppercase">ERA TIMELINE</div>
                <div className="grid grid-cols-6 gap-2 text-[10px] uppercase">
                  {['70s', '80s', '90s', '00s', '10s', '20s'].map((label) => (
                    <div key={label} className="text-center">
                      <div className="mb-2 text-[#4d4d4d]">{label}</div>
                      <div className="flex h-10 items-end justify-center gap-1">
                        {[40, 22, 64, 92, 58, 30].map((height, index) => (
                          <span
                            key={`${label}-${index}`}
                            className="block w-3 border border-[#303030] bg-[#ffd3e8]"
                            style={{ height: `${height}%` }}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Panel>
        </div>
      );
    }

    if (screen === "dna" || screen === "soundrobe") {
      return (
        <div className="space-y-4 p-2 md:p-4">
          <div className="grid gap-3 border-2 border-[#202020] bg-[#f7f1f6] p-3 shadow-[4px_4px_0_rgba(230,74,160,0.45)] lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="min-w-0">
              <div className="ui-chrome-text text-[10px] font-bold uppercase text-[#4a4a4a]">music profile loaded</div>
              <div className="display-wordmark mt-1 text-[30px] uppercase leading-none text-[#1746b8] md:text-[42px]">{musicProfile.userName.toUpperCase()} SOUNDROBE</div>
              <div className="mt-3 grid gap-2 text-[10px] font-bold uppercase md:grid-cols-2">
                <div className="border-2 border-[#202020] bg-white px-2 py-1.5">
                  <span className="mr-2 text-[#6b6070]">Top music tags</span>
                  <span>{topGenreLine}</span>
                </div>
                <div className="min-w-0 border-2 border-[#202020] bg-white px-2 py-1.5">
                  <span className="mr-2 text-[#6b6070]">Top artists</span>
                  <span className="break-words">{topArtistLine}</span>
                </div>
              </div>
            </div>
            <div className="border-2 border-[#202020] bg-[#ececec] p-2 shadow-[3px_3px_0_rgba(32,32,32,0.22)]">
              <div className="mb-2 bg-[#151821] px-2 py-1 text-[9px] font-bold uppercase text-[#ffd3e8]">now playing</div>
              <div className="grid grid-cols-[74px_minmax(0,1fr)] gap-2">
                <div className="flex h-[74px] items-center justify-center border-2 border-[#202020] bg-[#dfe7f5]">
                  <div
                    className="spinning-cd"
                    style={nowPlaying.imageUrl ? { backgroundImage: `url(${nowPlaying.imageUrl})` } : undefined}
                    aria-label={nowPlaying.imageUrl ? "Album cover disc" : "Generated compact disc"}
                  />
                </div>
                <div className="min-w-0 space-y-1 text-[10px] font-bold uppercase">
                  <div className="ticker-window bg-[#151821] px-2 py-1 text-[#ffd3e8]"><span className="marquee">{nowPlaying.title}</span></div>
                  <div className="truncate border-2 border-[#202020] bg-white px-2 py-1 text-[9px] text-[#303746]">{nowPlaying.detail}</div>
                  <div className="h-4 border-2 border-[#202020] bg-white p-[2px]"><div className="h-full bg-[#1746b8]" style={{ width: `${nowPlaying.progress}%` }} /></div>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-start gap-2 lg:col-span-2">
              {screen === "dna" ? (
                <RetroButton size="sm" variant="primary" onClick={() => setScreen("soundrobe")}>ENTER SOUNDROBE</RetroButton>
              ) : null}
              {screen === "soundrobe" ? (
                <RetroButton size="sm" variant="primary" onClick={() => setScreen("dna")}>MUSIC DNA</RetroButton>
              ) : null}
              <RetroButton size="sm" onClick={handleReset}>RESET</RetroButton>
            </div>
          </div>

          {!hasGenreData && soundrobeResult?.metadata.musicSource === "spotify" ? (
            <div className="border-2 border-[#202020] bg-[#fff7cc] p-3 text-[11px] font-bold uppercase leading-5 shadow-[3px_3px_0_rgba(32,32,32,0.25)]">
              Spotify returned your artists and tracks, but the artist objects used for this run did not include genre strings. Open /api/music/spotify/genres to inspect the raw response.
            </div>
          ) : null}

          <div className={screen === "dna" ? "grid gap-3 xl:grid-cols-[0.9fr_1.35fr_0.75fr]" : "grid gap-3 xl:grid-cols-[1.35fr_0.75fr]"}>
            {screen === "dna" ? (
            <Panel title="MUSIC DNA">
              <div className="space-y-3 text-[11px] font-bold uppercase">
                {hasGenreData ? (
                  musicProfile.genres.slice(0, 8).map((genre) => (
                    <div key={genre.name} className="space-y-1">
                      <div className="flex items-center justify-between gap-3">
                        <span>{genre.name}</span>
                        <span>{genre.value}%</span>
                      </div>
                      <ProgressBar value={genre.value} />
                    </div>
                  ))
                ) : (
                  <div className="border-2 border-[#202020] bg-white p-3 text-[10px] leading-5 text-[#303746]">
                    No music tags available in this generated profile.
                  </div>
                )}
                <div className="border-t-2 border-[#202020] pt-2 text-[9px] leading-4 text-[#5d5360]">
                  Weighted from Spotify top artists and the artists attached to your top tracks.
                </div>
              </div>
            </Panel>
            ) : null}

            {screen === "dna" ? (
            <Panel title="STYLE SIGNALS">
              <div className="space-y-3 font-bold text-[#212121]">
                {musicProfile.moodTags.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {musicProfile.moodTags.slice(0, 6).map((tag) => (
                      <span key={tag.name} className="border-2 border-[#202020] bg-white px-2 py-1 text-[9px] uppercase text-[#4d4d4d]">
                        {tag.name}
                      </span>
                    ))}
                  </div>
                ) : null}
                <div className="flex flex-wrap items-center gap-1.5">
                  {styleProfile.fashionSignals.slice(0, 4).map((signal) => (
                    <span key={signal.name} className="border-2 border-[#202020] bg-[#ffd3e8] px-2 py-1 text-[9px] uppercase">
                      {signal.name} {signal.value}%
                    </span>
                  ))}
                </div>
                <div className="grid gap-2 text-[10px] font-bold uppercase sm:grid-cols-2">
                  {musicProfile.artists.map((artist) => (
                    <div key={artist.name} className="catalog-tile min-w-0 border-2 border-[#202020] bg-[#f3f3f3] p-2">
                      <div className="truncate">{artist.name}</div>
                      <div className="mt-1 break-words text-[9px] leading-4 text-[#5f5f5f]">{artist.label || "no Spotify genres returned"}</div>
                    </div>
                  ))}
                </div>
              </div>
            </Panel>
            ) : null}

            {screen === "dna" ? (
            <Panel title="PALETTE">
              <div className="grid grid-cols-2 gap-2 xl:grid-cols-1">
                {styleProfile.palette.map((color) => (
                  <div key={color.hex} className="min-w-0 border-2 border-[#202020] bg-[#f8f9fb] p-1.5 text-[10px] font-bold uppercase">
                    <span className="mb-1.5 block h-20 border-2 border-[#202020] xl:h-16" style={{ background: color.hex }} />
                    <span className="block truncate leading-4">{color.name}</span>
                    <span className="block truncate text-[8px] leading-3 text-[#5a5a5a]">{color.hex}</span>
                  </div>
                ))}
              </div>
            </Panel>
            ) : null}
          </div>

          {screen === "dna" ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="TOP SONGS">
              <div className="grid gap-2 md:grid-cols-2">
                {musicProfile.tracks.slice(0, 10).map((track, index) => (
                  <button
                    key={`${track.name}-${track.artists.join("/")}`}
                    type="button"
                    onClick={() => setNowPlayingIndex(index)}
                    className="bevel-button grid min-w-0 grid-cols-[66px_minmax(0,1fr)] gap-2 border-2 border-[#202020] bg-[#f8f9fb] p-2 text-left"
                  >
                    <div className="flex h-[66px] items-center justify-center border-2 border-[#202020] bg-[#dfe7f5]">
                      {track.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={track.imageUrl} alt="" className="h-full w-full object-cover [image-rendering:pixelated]" />
                      ) : (
                        <div className="h-8 w-8 rounded-full border-4 border-white bg-[#111]" />
                      )}
                    </div>
                    <div className="min-w-0 text-[10px] font-bold uppercase leading-4">
                      <div className="truncate">{track.name}</div>
                      <div className="truncate text-[9px] text-[#5d5360]">{track.artists.join(" / ") || "unknown artist"}</div>
                      <div className="truncate text-[9px] text-[#5d5360]">{track.albumName ?? track.releaseYear ?? "top track"}</div>
                      <div className="mt-1 h-3 border border-[#202020] bg-white p-[1px]">
                        <div className="h-full bg-[#e64aa0]" style={{ width: `${track.value ?? 0}%` }} />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </Panel>

            <Panel title="TOP ALBUMS">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {musicProfile.albums.slice(0, 6).map((album) => (
                  <button
                    key={`${album.name}-${album.artists.join("/")}`}
                    type="button"
                    onClick={() => handleSelectAlbum(album.name)}
                    className="catalog-tile min-w-0 border-2 border-[#202020] bg-[#f8f9fb] p-2 text-left"
                  >
                    <div className="mb-2 aspect-square border-2 border-[#202020] bg-[#dfe7f5]">
                      {album.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={album.imageUrl} alt="" className="h-full w-full object-cover [image-rendering:pixelated]" />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-[#151821] text-[9px] font-bold uppercase text-[#ffd3e8]">album</div>
                      )}
                    </div>
                    <div className="text-[10px] font-bold uppercase leading-4">
                      <div className="truncate">{album.name}</div>
                      <div className="truncate text-[9px] text-[#5d5360]">{album.artists.join(" / ") || "various"}</div>
                      <div className="mt-1 h-3 border border-[#202020] bg-white p-[1px]">
                        <div className="h-full bg-[#1746b8]" style={{ width: `${album.value}%` }} />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </Panel>
          </div>
          ) : null}

          {screen === "dna" ? (
          <Panel title="FASHION SIGNALS / MIXER">
            <div className="grid gap-3 md:grid-cols-2">
              {styleProfile.fashionSignals.slice(0, 8).map((signal) => (
                <div key={signal.name} className="grid items-center gap-3 md:grid-cols-[180px_1fr_40px]">
                  <div className="text-[11px] font-bold uppercase">{signal.name}</div>
                  <div className="relative h-5 border-2 border-[#202020] bg-[#f4f4f4]">
                    <div className="h-full border-r-2 border-[#202020] bg-[#e64aa0]" style={{ width: `${signal.value}%` }} />
                  </div>
                  <div className="text-right text-[11px] font-bold uppercase">{signal.value}%</div>
                </div>
              ))}
            </div>
          </Panel>
          ) : null}

          {screen === "dna" ? (
          <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <Panel title="CORE TASTE / CURRENT ROTATION">
              <div className="space-y-3 text-[11px] font-bold uppercase">
                {[
                  { key: "longTerm" as const, label: "ARCHIVE", description: "years-deep taste" },
                  { key: "mediumTerm" as const, label: "SEASON", description: "last few months" },
                  { key: "shortTerm" as const, label: "NOW", description: "recent plays" },
                ].map((range) => (
                  <label key={range.key} className="block border-2 border-[#202020] bg-[#f7f7f7] p-2">
                    <div className="mb-2 grid grid-cols-[78px_minmax(0,1fr)_42px] items-center gap-2">
                      <span>{range.label}</span>
                      <span className="truncate text-[9px] text-[#5d5360]">{range.description}</span>
                      <span className="text-right">{timeWeights[range.key]}%</span>
                    </div>
                    <div className="grid grid-cols-[minmax(0,1fr)_44px] items-center gap-2">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={timeWeights[range.key]}
                        onChange={(event) => updateTimeWeight(range.key, Number(event.target.value))}
                        className="soundrobe-slider w-full"
                      />
                      <div className="h-4 border-2 border-[#202020] bg-white p-[2px]">
                        <div className="h-full bg-[#1746b8]" style={{ width: `${timeWeights[range.key]}%` }} />
                      </div>
                    </div>
                  </label>
                ))}
                <div className="grid gap-1.5 sm:grid-cols-3">
                  <RetroButton size="sm" onClick={() => setWeightPreset("core")}>CORE</RetroButton>
                  <RetroButton size="sm" onClick={() => setWeightPreset("balanced")}>BALANCED</RetroButton>
                  <RetroButton size="sm" onClick={() => setWeightPreset("current")}>NOW</RetroButton>
                </div>
                <div className={`border-2 border-[#202020] p-2 ${hasUnappliedMix ? "bg-[#fff7cc]" : "bg-white"}`}>
                  <div className="mb-2 flex items-center justify-between gap-2 text-[9px] leading-4">
                    <span>APPLIED MIX</span>
                    {hasUnappliedMix ? <span className="text-[#8a4d00]">REBUILD NEEDED</span> : <span className="text-[#5d5360]">LIVE</span>}
                  </div>
                  <div className="grid gap-1.5">
                    {[
                      { label: "ARCHIVE", value: displayedAppliedWeights.longTerm },
                      { label: "SEASON", value: displayedAppliedWeights.mediumTerm },
                      { label: "NOW", value: displayedAppliedWeights.shortTerm },
                    ].map((entry) => (
                      <div key={entry.label} className="grid grid-cols-[68px_minmax(0,1fr)_36px] items-center gap-2 text-[9px] leading-4">
                        <span>{entry.label}</span>
                        <div className="h-3 border border-[#202020] bg-white p-[1px]">
                          <div className="h-full bg-[#1746b8]" style={{ width: `${entry.value}%` }} />
                        </div>
                        <span className="text-right">{entry.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex">
                  <RetroButton size="sm" variant={hasUnappliedMix ? "primary" : "secondary"} onClick={handleRegenerateWithWeights}>REBUILD WITH MIX</RetroButton>
                </div>
              </div>
            </Panel>

            <Panel title="MUSIC / TAG DRIVERS">
              <div className="space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                  {sourceDrivers.map((entry) => {
                    const value = entry.value;
                    const bars = [0.42, 0.68, 0.36, 0.9, 0.58, 0.76].map((scale, index) => Math.max(12, Math.round(value * scale + index * 2)));
                    return (
                      <div key={entry.name} className="border-2 border-[#303030] bg-[#f2f2f2] p-2">
                        <div className="mb-2 flex items-center justify-between gap-2 text-[10px] font-bold uppercase text-[#111111]">
                          <span>{entry.name}</span>
                          <span>{value}%</span>
                        </div>
                        <div className="flex h-[72px] items-end gap-1 border-2 border-[#202020] bg-white p-1">
                          {bars.map((height, index) => (
                            <span
                              key={`${entry.name}-${height}-${index}`}
                              className="block flex-1 border border-[#303030] bg-[#1746b8]"
                              style={{ height: `${Math.min(100, height)}%` }}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Panel>
          </div>
          ) : null}
        </div>
      );
    }

    if (screen === "looks") {
      return (
        <div className="space-y-4 p-2 md:p-4">
          <div className="mb-3 text-[10px] font-bold uppercase text-[#4a4a4a]">LOOKBOOK</div>
          <div className="grid gap-4 xl:grid-cols-3">
            {lookPresets.map((look) => {
              const lookGarments = look.garmentIds.map((id) => garments.find((garment) => garment.id === id)).filter(Boolean) as Garment[];
              const total = lookGarments.reduce((sum, garment) => sum + garment.price, 0);

              return (
                <Panel key={look.id} title={look.name} className="look-card">
                  <div className="space-y-3">
                    <div className="grid h-[180px] grid-cols-2 gap-2 border-2 border-[#303030] bg-[#d9d9d9] p-2">
                      {lookGarments.slice(0, 6).map((garment, index) => (
                        <div key={`${look.id}-${garment.id}`} className="flex items-center justify-center border-2 border-[#303030] bg-[#eee]">
                          <span className="text-[9px] font-bold uppercase tracking-[0.08em]">{index + 1}</span>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2 text-[10px] font-bold uppercase">
                      <div className="flex justify-between">
                        <span>{lookGarments[0]?.influences[0] ?? "music"}</span>
                        <span>{lookGarments[0]?.matchScore ?? 0}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{lookGarments[1]?.influences[0] ?? "style"}</span>
                        <span>{lookGarments[1]?.matchScore ?? 0}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{lookGarments[2]?.influences[0] ?? "era"}</span>
                        <span>{lookGarments[2]?.matchScore ?? 0}%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between border-2 border-[#303030] bg-[#f3f3f3] px-2 py-2 text-[10px] font-bold uppercase">
                      <span>${total}</span>
                      <div className="flex gap-2">
                        <RetroButton
                          size="sm"
                          onClick={() => {
                            setCurrentLook(look);
                            setScreen("soundrobe");
                          }}
                        >
                          OPEN
                        </RetroButton>
                        <RetroButton size="sm" onClick={() => handleSaveSpecificLook(look)}>SAVE</RetroButton>
                      </div>
                    </div>
                  </div>
                </Panel>
              );
            })}
          </div>
        </div>
      );
    }

    if (screen === "closet") {
      return (
        <div className="space-y-4 p-2 md:p-4">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-bold uppercase text-[#4a4a4a]">MY CLOSET</div>
            <div className="flex gap-2">
              <RetroButton size="sm" onClick={() => setScreen("looks")}>PIECES</RetroButton>
              <RetroButton size="sm" onClick={() => setScreen("looks")}>LOOKS</RetroButton>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Panel title="PIECES">
              <div className="grid gap-2">
                {savedGarments.map((garmentId) => {
                  const garment = garments.find((entry) => entry.id === garmentId);
                  if (!garment) return null;
                  return (
                    <button
                      key={garment.id}
                      type="button"
                      onClick={() => {
                        setSelectedGarmentId(garment.id);
                        setScreen("soundrobe");
                      }}
                      className="bevel-button flex items-center justify-between border-2 border-[#303030] bg-[#f4f4f4] p-2 text-left text-[10px] font-bold uppercase"
                    >
                      <span>{garment.name}</span>
                      <span>{garment.category}</span>
                    </button>
                  );
                })}
              </div>
            </Panel>

            <Panel title="LOOKS">
              <div className="grid gap-2">
                {savedLooks.map((lookId) => {
                  const look = lookPresets.find((entry) => entry.id === lookId) ?? defaultLook;
                  const lookName = savedLookNames[look.id] ?? look.name;
                  return (
                    <button
                      key={look.id}
                      type="button"
                      onClick={() => setCurrentLook({ ...look, name: lookName })}
                      className="bevel-button flex items-center justify-between border-2 border-[#303030] bg-[#f4f4f4] p-2 text-left text-[10px] font-bold uppercase"
                    >
                      <span>{lookName}</span>
                      <span>{look.garmentIds.length} ITEMS</span>
                    </button>
                  );
                })}
              </div>
            </Panel>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4 p-2 md:p-4">
        <Panel title="PROFILE">
          <div className="grid gap-4 md:grid-cols-[160px_1fr]">
            <div className="flex h-[160px] items-center justify-center border-2 border-[#303030] bg-[#d7d7d7] text-[#111111]">
              <UserRound className="h-16 w-16" />
            </div>
            <div className="space-y-3">
              <div className="display-wordmark text-[27px] uppercase">{musicProfile.userName.toUpperCase()}</div>
              <div className="space-y-2 text-[10px] font-bold uppercase">
                <div>Top artists: {musicProfile.artists.slice(0, 3).map((artist) => artist.name).join(" / ")}</div>
                <div>Primary eras: {musicProfile.eras.slice(0, 3).map((era) => era.name).join(" / ")}</div>
                <div>Style signal: {styleProfile.fashionSignals.slice(0, 2).map((signal) => signal.name).join(" with ")}</div>
              </div>
              <RetroButton onClick={() => setScreen("soundrobe")} variant="primary">VIEW SOUNDROBE</RetroButton>
            </div>
          </div>
        </Panel>
      </div>
    );
  };

  return (
    <main className="app-shell min-h-screen p-2 md:p-5">
      <div className="mx-auto max-w-[1280px] border-2 border-[#202020] bg-[#d5d5d5] shadow-[8px_8px_0_#111]">
        <div className="title-bar-blue flex items-center justify-between border-b-2 border-[#202020] px-2 py-1">
          <div className="ui-chrome-text text-[12px] font-bold uppercase text-white">soundrobe.exe - fall fashions</div>
          <div className="flex gap-2">
            <span className="window-button">_</span>
            <span className="window-button">□</span>
            <span className="window-button">×</span>
          </div>
        </div>

        <div className="browser-bar flex items-center gap-2 border-b-2 border-[#202020] px-2 py-1 text-[11px]">
          <span className="font-bold underline">File</span>
          <span className="font-bold underline">Edit</span>
          <span className="font-bold underline">View</span>
          <span className="font-bold underline">Play</span>
          <span className="font-bold underline">Tools</span>
          <span className="font-bold underline">Help</span>
        </div>

        <div className="toolbar-rail flex flex-wrap items-center gap-1 border-b-2 border-[#202020] px-2 py-1.5">
          {tabs.map((tab) => (
            <button
              key={tab.label}
              type="button"
              onClick={() => setScreen(tab.value)}
              className={`retro-tab ${screen === tab.value ? "bg-[#ffd3e8] text-[#111111]" : "text-[#111111]"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="border-b-2 border-[#202020] bg-[#151821] px-3 py-2 text-[10px] font-bold uppercase text-[#ffd3e8]">
          <div className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-3 overflow-hidden">
            <span className="text-white">NOW PLAYING</span>
            <span className="ticker-window min-w-0 border-l border-[#ffd3e8]/40 pl-3">
              <span className="marquee">soundrobe // music dna // fashion matrix // your wardrobe is in motion //</span>
            </span>
          </div>
        </div>

        {renderScreen()}

        {screen === "soundrobe" && (
          <div className="space-y-4 p-2 md:p-4">
            <Panel title="SIGNATURE PIECES">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {garments.slice(0, 8).map((garment) => (
                  <GarmentCard
                    key={garment.id}
                    garment={garment}
                    isSelected={selectedGarmentId === garment.id}
                    onSelect={(entry) => {
                      setSelectedGarmentId(entry.id);
                      setSelectedCategory(entry.category);
                      setSavedGarments((previous) => (previous.includes(entry.id) ? previous : [...previous, entry.id]));
                    }}
                    onWhyThis={(entry) => setWhyThisGarmentId(entry.id)}
                  />
                ))}
              </div>
            </Panel>
          </div>
        )}

        {screen === "looks" || screen === "closet" ? null : null}

        {screen === "soundrobe" && (
          <div className="space-y-4 p-2 md:p-4">
            <Panel title="WARDROBE.EXE">
              <div className="grid gap-4 xl:grid-cols-[150px_minmax(0,1fr)]">
                <div className="paint-rail border-2 border-[#202020] p-2">
                  <div className="mb-3 text-[10px] font-bold uppercase text-[#111111]">CATEGORY</div>
                  <div className="grid grid-cols-2 gap-1.5 xl:grid-cols-1">
                    {categoryTabs.map((tab) => (
                      <button
                        key={tab.value}
                        type="button"
                        onClick={() => setSelectedCategory(tab.value)}
                        className={`bevel-button min-h-8 whitespace-normal border-2 px-2 py-1.5 text-center text-[9px] font-bold uppercase leading-3 ${
                          selectedCategory === tab.value ? "border-[#202020] bg-[#ffd3e8] text-[#111111]" : "border-[#202020] bg-[#f4f4f4] text-[#111111]"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="mb-2 text-[10px] font-bold uppercase text-[#4a4a4a]">{currentLook.name}</div>
                  <OutfitCanvas
                    garments={currentLookGarments}
                    selectedCategory={normalizedSelectedCategory}
                    onSelectSlot={handleSelectOutfitSlot}
                  />
                </div>

              </div>

              <div className="mt-4 grid gap-3 border-t-2 border-[#303030] pt-3 lg:grid-cols-[1fr_1.2fr]">
                <div className="border-2 border-[#202020] bg-[#f3f3f3] p-2">
                  <div className="mb-2 text-[10px] font-bold uppercase">ITEM TRAY</div>
                  <div className="grid grid-cols-2 gap-2">
                    {garments
                      .filter((garment) => garment.category === selectedCategory)
                      .map((garment) => (
                        <button
                          key={garment.id}
                          type="button"
                          onClick={() => toggleCurrentLookGarment(garment)}
                          className={`catalog-tile border-2 p-2 text-left text-[10px] font-bold uppercase ${
                            selectedGarmentId === garment.id ? "border-[#e64aa0] bg-[#f7f1f6]" : "border-[#202020] bg-[#f8f8f8]"
                          }`}
                        >
                          <div className="mb-2 flex h-20 items-center justify-center border-2 border-[#202020] bg-[#eef3fb]">
                            <div className="catalog-cutout h-10 w-12 border-2 border-[#202020] bg-[#596247]" />
                          </div>
                          {garment.name}
                        </button>
                      ))}
                  </div>
                </div>

                <div className="border-2 border-[#202020] bg-[#f7f1f6] p-3">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <label className="block text-[9px] font-bold uppercase text-[#5d5360]">
                        Look name
                        <input
                          value={currentLook.name}
                          onChange={(event) => handleRenameLook(event.target.value)}
                          className="mt-1 block w-full border-2 border-[#202020] bg-white px-2 py-1 text-[11px] font-bold uppercase text-[#111111] outline-none focus:bg-[#ffd3e8]"
                        />
                      </label>
                      <div className="text-fit mt-1 text-[10px] uppercase tracking-[0.08em] text-[#4d4d4d]">{currentLook.description}</div>
                    </div>
                    <div className="text-right text-[12px] font-bold uppercase">${currentLook.garmentIds.reduce((sum, id) => sum + (garments.find((item) => item.id === id)?.price ?? 0), 0)}</div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <RetroButton onClick={handleRemix}>REMIX LOOK</RetroButton>
                    <RetroButton onClick={handleSaveLook}>SAVE</RetroButton>
                    <RetroButton onClick={() => setScreen("closet")}>SHOP PIECES</RetroButton>
                  </div>
                </div>
              </div>
            </Panel>
          </div>
        )}
      </div>

      {modalGarment ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111111]/35 p-4">
          <div className="w-full max-w-[520px] border-2 border-[#303030] bg-[#d8d8d8] shadow-[8px_8px_0_#363636]">
            <div className="title-bar flex items-center justify-between border-b-2 border-[#303030] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em]">
              <span>WHY THIS?</span>
              <div className="flex gap-2">
                <span className="window-button">_</span>
                <span className="window-button">□</span>
                <span
                  className="window-button cursor-pointer hover:bg-[#ffd3e8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#e64aa0]"
                  onClick={() => setWhyThisGarmentId(null)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") setWhyThisGarmentId(null);
                  }}
                  role="button"
                  tabIndex={0}
                >
                  ×
                </span>
              </div>
            </div>
            <div className="space-y-4 p-4 text-[11px] uppercase tracking-[0.12em]">
              <div className="text-[18px] font-bold">{modalGarment.name.toUpperCase()}</div>
              <div className="space-y-3">
                <div className="text-[#4d4d4d]">MUSIC SOURCE</div>
                {modalGarment.influences.map((influence) => (
                  <div key={influence} className="flex items-center justify-between gap-4">
                    <span>{influence}</span>
                    <div className="flex-1 border-2 border-[#303030] bg-[#f4f4f4]">
                      <div className="h-3 bg-[#1746b8]" style={{ width: `${Math.min(90, 35 + modalGarment.influences.indexOf(influence) * 18)}%` }} />
                    </div>
                    <span>{Math.min(90, 35 + modalGarment.influences.indexOf(influence) * 18)}%</span>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <div className="text-[#4d4d4d]">WHY IT FITS</div>
                <p className="text-[11px] normal-case leading-5 tracking-[0.02em] text-[#1a1a1a]">
                  {modalGarment.explanation}
                </p>
              </div>
              <div className="flex justify-end">
                <RetroButton onClick={() => setWhyThisGarmentId(null)}>OK</RetroButton>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
