import type { RawDemoMusicProfile } from "@/src/engine/music/normalizeMusicProfile";

const artists = (items: Array<[string, string[], number]>) => items.map(([name, genres, weight], index) => ({ id: `${name.toLowerCase().replaceAll(" ", "-")}-${index}`, name, genres, weight }));
const tracks = (items: Array<[string, number, number]>) => items.map(([name, releaseYear, weight], index) => ({ id: `${name.toLowerCase().replaceAll(" ", "-")}-${index}`, name, artistIds: [], releaseYear, weight }));

export const demoMusicProfiles: RawDemoMusicProfile[] = [
  {
    id: "demo-jasmine",
    displayName: "Jasmine",
    ranges: {
      longTerm: { artists: artists([["Erykah Badu", ["neo-soul", "r&b"], 35], ["The Slits", ["punk"], 25], ["Aaliyah", ["r&b"], 22], ["The Strokes", ["alternative rock", "rock"], 18]]), tracks: tracks([["Didn't Cha Know", 2000, 25], ["Typical Girls", 1979, 20], ["Rock the Boat", 2001, 25], ["Last Nite", 2001, 20]]) },
      mediumTerm: { artists: artists([["The Faint", ["electropop", "alternative rock"], 22], ["SZA", ["contemporary r&b"], 25], ["Bikini Kill", ["punk"], 18]]), tracks: tracks([["Agenda Suicide", 2001, 18], ["Broken Clocks", 2017, 20], ["Rebel Girl", 1993, 18]]) },
      shortTerm: { artists: artists([["Solange", ["neo-soul", "r&b"], 20], ["Yeah Yeah Yeahs", ["alternative rock"], 18]]), tracks: tracks([["Cranes in the Sky", 2016, 20], ["Maps", 2003, 18]]) },
    },
  },
  { id: "demo-dream", displayName: "Dream Pop Listener", ranges: { longTerm: { artists: artists([["Cocteau Twins", ["dream pop"], 35], ["Slowdive", ["shoegaze"], 30], ["Big Thief", ["indie folk"], 20]]), tracks: tracks([["Alison", 1993, 28], ["Cherry-coloured Funk", 1990, 25], ["Simulation Swarm", 2022, 15]]) }, mediumTerm: { artists: artists([["Beach House", ["dream pop"], 28]]), tracks: tracks([["Space Song", 2015, 25]]) }, shortTerm: { artists: artists([["Mazzy Star", ["dream pop"], 18]]), tracks: tracks([["Fade Into You", 1993, 18]]) } } },
  { id: "demo-pop", displayName: "Electropop Listener", ranges: { longTerm: { artists: artists([["Lady Gaga", ["dance pop", "electropop"], 35], ["Britney Spears", ["pop", "dance pop"], 26]]), tracks: tracks([["Toxic", 2003, 30], ["Bad Romance", 2009, 26]]) }, mediumTerm: { artists: artists([["Charli XCX", ["electropop"], 30]]), tracks: tracks([["Vroom Vroom", 2016, 25]]) }, shortTerm: { artists: artists([["PinkPantheress", ["pop"], 20]]), tracks: tracks([["Boy's a liar", 2022, 20]]) } } },
  { id: "demo-70s", displayName: "Seventies Rock Listener", ranges: { longTerm: { artists: artists([["Fleetwood Mac", ["rock", "folk"], 35], ["Led Zeppelin", ["rock", "blues"], 28]]), tracks: tracks([["Dreams", 1977, 30], ["Going to California", 1971, 24]]) }, mediumTerm: { artists: artists([["Joni Mitchell", ["folk"], 25]]), tracks: tracks([["A Case of You", 1971, 22]]) }, shortTerm: { artists: artists([["Weyes Blood", ["folk"], 15]]), tracks: tracks([["Andromeda", 2019, 15]]) } } },
  { id: "demo-90s", displayName: "90s R&B Hip-Hop Listener", ranges: { longTerm: { artists: artists([["TLC", ["r&b"], 35], ["A Tribe Called Quest", ["hip-hop"], 30], ["Mary J. Blige", ["r&b", "hip-hop"], 25]]), tracks: tracks([["Creep", 1994, 30], ["Electric Relaxation", 1993, 28], ["Real Love", 1992, 24]]) }, mediumTerm: { artists: artists([["Jodeci", ["r&b"], 22]]), tracks: tracks([["Come and Talk to Me", 1991, 22]]) }, shortTerm: { artists: artists([["Victoria Monet", ["contemporary r&b"], 20]]), tracks: tracks([["On My Mama", 2023, 20]]) } } },
];
