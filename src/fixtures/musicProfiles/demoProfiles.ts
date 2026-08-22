import type { RawDemoMusicProfile } from "@/src/engine/music/normalizeMusicProfile";

const artistId = (name: string) => name.toLowerCase().replaceAll(" ", "-").replaceAll(".", "").replaceAll("'", "");
const artists = (items: Array<[string, string[], number]>) => items.map(([name, genres, weight]) => ({ id: artistId(name), name, genres, weight }));
const cover = (name: string) => `/api/demo-cover?name=${encodeURIComponent(name)}`;
const tracks = (items: Array<[string, string, string, string, number, number, string[]?]>) => items.map(([name, artistName, albumName, imageName, releaseYear, weight, tags], index) => ({
  id: `${name.toLowerCase().replaceAll(" ", "-")}-${index}`,
  name,
  artistIds: [artistId(artistName)],
  albumName,
  tags: tags ?? [],
  releaseYear,
  imageUrl: cover(imageName),
  weight,
}));

export const demoMusicProfiles: RawDemoMusicProfile[] = [
  {
    id: "demo-jasmine",
    displayName: "Jasmine",
    ranges: {
      longTerm: { artists: artists([["Erykah Badu", ["neo-soul", "r&b"], 35], ["The Slits", ["punk"], 25], ["Aaliyah", ["r&b"], 22], ["The Strokes", ["alternative rock", "rock"], 18]]), tracks: tracks([["Didn't Cha Know", "Erykah Badu", "Mama's Gun", "mamas-gun", 2000, 25, ["neo-soul", "smooth", "warm"]], ["Typical Girls", "The Slits", "Cut", "cut", 1979, 20, ["punk", "riot-grrrl", "angular"]], ["Rock the Boat", "Aaliyah", "Aaliyah", "aaliyah", 2001, 25, ["r&b", "sensual", "sleek"]], ["Last Nite", "The Strokes", "Is This It", "is-this-it", 2001, 20, ["garage rock", "downtown", "worn"]]]) },
      mediumTerm: { artists: artists([["The Faint", ["electropop", "alternative rock"], 22], ["SZA", ["contemporary r&b"], 25], ["Bikini Kill", ["punk"], 18]]), tracks: tracks([["Agenda Suicide", "The Faint", "Danse Macabre", "danse-macabre", 2001, 18, ["electropop", "club", "sharp"]], ["Broken Clocks", "SZA", "Ctrl", "ctrl", 2017, 20, ["r&b", "soft", "intimate"]], ["Rebel Girl", "Bikini Kill", "Pussy Whipped", "pussy-whipped", 1993, 18, ["punk", "riot-grrrl", "bold"]]]) },
      shortTerm: { artists: artists([["Solange", ["neo-soul", "r&b"], 20], ["Yeah Yeah Yeahs", ["alternative rock"], 18]]), tracks: tracks([["Cranes in the Sky", "Solange", "A Seat at the Table", "seat-at-the-table", 2016, 20, ["neo-soul", "soft", "minimal"]], ["Maps", "Yeah Yeah Yeahs", "Fever to Tell", "fever-to-tell", 2003, 18, ["indie rock", "romantic", "raw"]]]) },
    },
  },
  { id: "demo-dream", displayName: "Dream Pop Listener", ranges: { longTerm: { artists: artists([["Cocteau Twins", ["dream pop"], 35], ["Slowdive", ["shoegaze"], 30], ["Big Thief", ["indie folk"], 20]]), tracks: tracks([["Alison", "Slowdive", "Souvlaki", "souvlaki", 1993, 28], ["Cherry-coloured Funk", "Cocteau Twins", "Heaven or Las Vegas", "heaven-or-las-vegas", 1990, 25], ["Simulation Swarm", "Big Thief", "Dragon New Warm Mountain I Believe in You", "dragon", 2022, 15]]) }, mediumTerm: { artists: artists([["Beach House", ["dream pop"], 28]]), tracks: tracks([["Space Song", "Beach House", "Depression Cherry", "depression-cherry", 2015, 25]]) }, shortTerm: { artists: artists([["Mazzy Star", ["dream pop"], 18]]), tracks: tracks([["Fade Into You", "Mazzy Star", "So Tonight That I Might See", "so-tonight", 1993, 18]]) } } },
  { id: "demo-pop", displayName: "Electropop Listener", ranges: { longTerm: { artists: artists([["Lady Gaga", ["dance pop", "electropop"], 35], ["Britney Spears", ["pop", "dance pop"], 26]]), tracks: tracks([["Toxic", "Britney Spears", "In the Zone", "in-the-zone", 2003, 30], ["Bad Romance", "Lady Gaga", "The Fame Monster", "fame-monster", 2009, 26]]) }, mediumTerm: { artists: artists([["Charli XCX", ["electropop"], 30]]), tracks: tracks([["Vroom Vroom", "Charli XCX", "Vroom Vroom", "vroom-vroom", 2016, 25]]) }, shortTerm: { artists: artists([["PinkPantheress", ["pop"], 20]]), tracks: tracks([["Boy's a liar", "PinkPantheress", "Take Me Home", "take-me-home", 2022, 20]]) } } },
  { id: "demo-70s", displayName: "Seventies Rock Listener", ranges: { longTerm: { artists: artists([["Fleetwood Mac", ["rock", "folk"], 35], ["Led Zeppelin", ["rock", "blues"], 28]]), tracks: tracks([["Dreams", "Fleetwood Mac", "Rumours", "rumours", 1977, 30], ["Going to California", "Led Zeppelin", "Led Zeppelin IV", "zeppelin-iv", 1971, 24]]) }, mediumTerm: { artists: artists([["Joni Mitchell", ["folk"], 25]]), tracks: tracks([["A Case of You", "Joni Mitchell", "Blue", "blue", 1971, 22]]) }, shortTerm: { artists: artists([["Weyes Blood", ["folk"], 15]]), tracks: tracks([["Andromeda", "Weyes Blood", "Titanic Rising", "titanic-rising", 2019, 15]]) } } },
  { id: "demo-90s", displayName: "90s R&B Hip-Hop Listener", ranges: { longTerm: { artists: artists([["TLC", ["r&b"], 35], ["A Tribe Called Quest", ["hip-hop"], 30], ["Mary J. Blige", ["r&b", "hip-hop"], 25]]), tracks: tracks([["Creep", "TLC", "CrazySexyCool", "crazysexycool", 1994, 30], ["Electric Relaxation", "A Tribe Called Quest", "Midnight Marauders", "midnight-marauders", 1993, 28], ["Real Love", "Mary J. Blige", "What's the 411?", "whats-the-411", 1992, 24]]) }, mediumTerm: { artists: artists([["Jodeci", ["r&b"], 22]]), tracks: tracks([["Come and Talk to Me", "Jodeci", "Forever My Lady", "forever-my-lady", 1991, 22]]) }, shortTerm: { artists: artists([["Victoria Monet", ["contemporary r&b"], 20]]), tracks: tracks([["On My Mama", "Victoria Monet", "Jaguar II", "jaguar-ii", 2023, 20]]) } } },
];
