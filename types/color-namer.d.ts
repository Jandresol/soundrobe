declare module "color-namer" {
  export type ColorNameMatch = {
    name: string;
    hex: string;
    distance: number;
  };

  export type ColorNamePalettes = {
    basic: ColorNameMatch[];
    html: ColorNameMatch[];
    ntc: ColorNameMatch[];
    pantone: ColorNameMatch[];
    roygbiv: ColorNameMatch[];
    x11: ColorNameMatch[];
  };

  export default function namer(color: string): ColorNamePalettes;
}
