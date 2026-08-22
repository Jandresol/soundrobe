export type PopularSpotifyGenre = {
  id: string;
  label: string;
  parent:
    | "pop"
    | "hip-hop"
    | "rock"
    | "r&b"
    | "latin"
    | "dance-electronic"
    | "country-folk"
    | "global"
    | "jazz-classical"
    | "alternative-indie";
  aliases: string[];
  fashionSeeds: string[];
};

export const popularSpotifyGenreMap: PopularSpotifyGenre[] = [
  { id: "pop", label: "Pop", parent: "pop", aliases: ["pop", "mainstream pop"], fashionSeeds: ["glossy", "playful", "color accent", "fitted top"] },
  { id: "dance-pop", label: "Dance Pop", parent: "pop", aliases: ["dance pop", "post-teen pop"], fashionSeeds: ["metallic", "mini skirt", "layered tank", "statement jewelry"] },
  { id: "electropop", label: "Electropop", parent: "pop", aliases: ["electropop", "metropopolis"], fashionSeeds: ["silver", "patent", "mesh", "digital"] },
  { id: "indie-pop", label: "Indie Pop", parent: "alternative-indie", aliases: ["indie pop", "bedroom pop"], fashionSeeds: ["washed denim", "cardigan", "sneakers", "soft color"] },
  { id: "art-pop", label: "Art Pop", parent: "pop", aliases: ["art pop", "escape room"], fashionSeeds: ["asymmetric", "sculptural", "offbeat accessory", "bold color"] },
  { id: "hyperpop", label: "Hyperpop", parent: "pop", aliases: ["hyperpop", "glitchcore"], fashionSeeds: ["neon", "vinyl", "platform shoes", "playful proportion"] },
  { id: "k-pop", label: "K-Pop", parent: "pop", aliases: ["k-pop", "korean pop"], fashionSeeds: ["polished", "cropped jacket", "pleated skirt", "statement bag"] },
  { id: "j-pop", label: "J-Pop", parent: "pop", aliases: ["j-pop", "japanese pop"], fashionSeeds: ["playful", "layered", "mini skirt", "graphic top"] },
  { id: "hip-hop", label: "Hip-Hop", parent: "hip-hop", aliases: ["hip hop", "hip-hop"], fashionSeeds: ["oversized", "denim", "sneakers", "gold jewelry"] },
  { id: "rap", label: "Rap", parent: "hip-hop", aliases: ["rap"], fashionSeeds: ["street", "baggy jeans", "graphic tee", "statement jewelry"] },
  { id: "trap", label: "Trap", parent: "hip-hop", aliases: ["trap", "atl hip hop"], fashionSeeds: ["black", "technical texture", "sneakers", "compact bag"] },
  { id: "drill", label: "Drill", parent: "hip-hop", aliases: ["drill", "uk drill", "chicago drill"], fashionSeeds: ["dark palette", "utility", "puffer", "boots"] },
  { id: "cloud-rap", label: "Cloud Rap", parent: "hip-hop", aliases: ["cloud rap", "emo rap"], fashionSeeds: ["washed black", "slouchy", "hoodie", "silver jewelry"] },
  { id: "r&b", label: "R&B", parent: "r&b", aliases: ["r&b", "rnb"], fashionSeeds: ["fitted", "satin", "rib knit", "gold jewelry"] },
  { id: "contemporary-r&b", label: "Contemporary R&B", parent: "r&b", aliases: ["contemporary r&b", "urban contemporary"], fashionSeeds: ["sleek", "body-skimming", "mesh", "compact shoulder bag"] },
  { id: "alternative-r&b", label: "Alternative R&B", parent: "r&b", aliases: ["alternative r&b", "alt r&b"], fashionSeeds: ["moody", "asymmetric", "plum", "silver jewelry"] },
  { id: "neo-soul", label: "Neo-Soul", parent: "r&b", aliases: ["neo soul", "neo-soul"], fashionSeeds: ["earth tone", "knit", "suede", "patterned scarf"] },
  { id: "soul", label: "Soul", parent: "r&b", aliases: ["soul", "classic soul"], fashionSeeds: ["warm color", "wide-leg trouser", "gold", "textured knit"] },
  { id: "funk", label: "Funk", parent: "r&b", aliases: ["funk", "p funk"], fashionSeeds: ["groovy", "flared", "satin", "bold accessory"] },
  { id: "rock", label: "Rock", parent: "rock", aliases: ["rock", "modern rock"], fashionSeeds: ["denim", "boots", "structured jacket", "worn texture"] },
  { id: "alternative-rock", label: "Alternative Rock", parent: "rock", aliases: ["alternative rock", "alt rock"], fashionSeeds: ["washed denim", "graphic tee", "cropped jacket", "black"] },
  { id: "indie-rock", label: "Indie Rock", parent: "alternative-indie", aliases: ["indie rock", "garage rock"], fashionSeeds: ["casual", "baby tee", "straight denim", "sneakers"] },
  { id: "classic-rock", label: "Classic Rock", parent: "rock", aliases: ["classic rock", "album rock"], fashionSeeds: ["suede", "bootcut", "leather belt", "vintage wash"] },
  { id: "hard-rock", label: "Hard Rock", parent: "rock", aliases: ["hard rock"], fashionSeeds: ["leather", "boots", "hardware", "black"] },
  { id: "punk", label: "Punk", parent: "rock", aliases: ["punk", "punk rock"], fashionSeeds: ["distressed", "moto jacket", "studded belt", "boots"] },
  { id: "pop-punk", label: "Pop Punk", parent: "rock", aliases: ["pop punk"], fashionSeeds: ["graphic baby tee", "plaid", "low-rise denim", "sneakers"] },
  { id: "metal", label: "Metal", parent: "rock", aliases: ["metal", "heavy metal"], fashionSeeds: ["black", "hardware", "boots", "leather"] },
  { id: "emo", label: "Emo", parent: "rock", aliases: ["emo", "emo pop"], fashionSeeds: ["skinny silhouette", "black", "stripe", "worn knit"] },
  { id: "shoegaze", label: "Shoegaze", parent: "alternative-indie", aliases: ["shoegaze"], fashionSeeds: ["hazy", "mesh", "fuzzy knit", "slouchy"] },
  { id: "dream-pop", label: "Dream Pop", parent: "alternative-indie", aliases: ["dream pop"], fashionSeeds: ["soft color", "slip dress", "silver", "layered"] },
  { id: "folk", label: "Folk", parent: "country-folk", aliases: ["folk", "indie folk"], fashionSeeds: ["cotton", "scarf", "relaxed", "cream"] },
  { id: "americana", label: "Americana", parent: "country-folk", aliases: ["americana", "roots rock"], fashionSeeds: ["denim", "suede", "western belt", "boots"] },
  { id: "country", label: "Country", parent: "country-folk", aliases: ["country", "contemporary country"], fashionSeeds: ["western boot", "denim", "leather belt", "plaid"] },
  { id: "bluegrass", label: "Bluegrass", parent: "country-folk", aliases: ["bluegrass"], fashionSeeds: ["heritage", "cotton", "clogs", "patterned scarf"] },
  { id: "blues", label: "Blues", parent: "country-folk", aliases: ["blues", "electric blues"], fashionSeeds: ["worn denim", "suede", "straight silhouette", "camel"] },
  { id: "edm", label: "EDM", parent: "dance-electronic", aliases: ["edm", "pop edm"], fashionSeeds: ["club", "metallic", "mini skirt", "platform"] },
  { id: "house", label: "House", parent: "dance-electronic", aliases: ["house", "deep house"], fashionSeeds: ["sleek", "wide-leg trouser", "satin", "silver"] },
  { id: "techno", label: "Techno", parent: "dance-electronic", aliases: ["techno", "minimal techno"], fashionSeeds: ["black", "utility", "mesh", "boots"] },
  { id: "drum-and-bass", label: "Drum and Bass", parent: "dance-electronic", aliases: ["drum and bass", "dnb"], fashionSeeds: ["technical", "nylon", "sneakers", "utility bag"] },
  { id: "dubstep", label: "Dubstep", parent: "dance-electronic", aliases: ["dubstep", "brostep"], fashionSeeds: ["oversized", "black", "neon accent", "sneakers"] },
  { id: "reggaeton", label: "Reggaeton", parent: "latin", aliases: ["reggaeton", "urbano latino"], fashionSeeds: ["body-skimming", "gold", "denim", "statement bag"] },
  { id: "latin-pop", label: "Latin Pop", parent: "latin", aliases: ["latin pop"], fashionSeeds: ["vibrant color", "fitted", "satin", "heeled sandal"] },
  { id: "latin-hip-hop", label: "Latin Hip-Hop", parent: "latin", aliases: ["latin hip hop", "latin rap"], fashionSeeds: ["street", "baggy denim", "gold jewelry", "sneakers"] },
  { id: "regional-mexican", label: "Regional Mexican", parent: "latin", aliases: ["regional mexican", "musica mexicana", "corridos tumbados"], fashionSeeds: ["western boot", "denim", "silver belt", "structured jacket"] },
  { id: "bachata", label: "Bachata", parent: "latin", aliases: ["bachata"], fashionSeeds: ["romantic", "body-skimming", "soft drape", "gold"] },
  { id: "afrobeats", label: "Afrobeats", parent: "global", aliases: ["afrobeats", "afropop"], fashionSeeds: ["warm color", "print", "relaxed trouser", "statement jewelry"] },
  { id: "amapiano", label: "Amapiano", parent: "global", aliases: ["amapiano"], fashionSeeds: ["fluid", "silky", "wide-leg", "bright accent"] },
  { id: "dancehall", label: "Dancehall", parent: "global", aliases: ["dancehall"], fashionSeeds: ["bold", "body-skimming", "bright color", "statement accessory"] },
  { id: "reggae", label: "Reggae", parent: "global", aliases: ["reggae", "roots reggae"], fashionSeeds: ["earth tone", "linen", "relaxed", "crochet"] },
  { id: "jazz", label: "Jazz", parent: "jazz-classical", aliases: ["jazz", "vocal jazz"], fashionSeeds: ["tailored", "silk", "black", "structured trouser"] },
  { id: "classical", label: "Classical", parent: "jazz-classical", aliases: ["classical", "orchestral"], fashionSeeds: ["elegant", "minimal", "cream", "midi dress"] },
];

export const popularSpotifyGenreAliases = new Map(
  popularSpotifyGenreMap.flatMap((genre) => [
    [genre.id, genre],
    ...genre.aliases.map((alias) => [alias, genre] as const),
  ]),
);
