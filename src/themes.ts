export type GradientDef = {
  colors: string[];
  angle: number;
  type: "simple" | "rich";
};

export type Theme = {
  label: string;
  background: GradientDef;
  card: GradientDef;
  button: GradientDef;
  text: string;
  mutedText: string;
  border: string;
};

export const themes: Record<string, Theme> = {
  calm: {
    label: "Calm",
    background: {
      colors: ["#FDF6F0", "#F3E8DC", "#EBD9C8"],
      angle: 135,
      type: "rich",
    },
    card: {
      colors: ["#FFFFFF", "#FBF3EC"],
      angle: 135,
      type: "simple",
    },
    button: {
      colors: ["#E8A87C", "#D8836B"],
      angle: 90,
      type: "simple",
    },
    text: "#2B2320",
    mutedText: "#7A6F68",
    border: "#E4D6C9",
  },
  midnight: {
    label: "Midnight",
    background: {
      colors: ["#0F0C29", "#302B63", "#24243E"],
      angle: 135,
      type: "rich",
    },
    card: {
      colors: ["#1B1735", "#211C42"],
      angle: 135,
      type: "simple",
    },
    button: {
      colors: ["#6D4FC2", "#9B59B6"],
      angle: 90,
      type: "simple",
    },
    text: "#F1EEFA",
    mutedText: "#A69DC7",
    border: "#3A3564",
  },
  forest: {
    label: "Forest",
    background: {
      colors: ["#0B1F17", "#1A3D2E", "#2E5941", "#3E7256"],
      angle: 145,
      type: "rich",
    },
    card: { colors: ["#132B21", "#193527"], angle: 135, type: "simple" },
    button: { colors: ["#4C9A6E", "#3C7C58"], angle: 90, type: "simple" },
    text: "#E9F5EE",
    mutedText: "#9BC4AB",
    border: "#2C5240",
  },

  blush: {
    label: "Blush",
    background: {
      colors: ["#FFF0F3", "#FFDDE4", "#FFC2D1"],
      angle: 135,
      type: "rich",
    },
    card: { colors: ["#FFFFFF", "#FFF5F7"], angle: 135, type: "simple" },
    button: { colors: ["#E8607B", "#D14D68"], angle: 90, type: "simple" },
    text: "#3A1620",
    mutedText: "#8A5B66",
    border: "#F5C6D0",
  },

  ocean: {
    label: "Ocean",
    background: {
      colors: ["#001E2E", "#00415A", "#0A6E8C", "#1CA3AD"],
      angle: 150,
      type: "rich",
    },
    card: { colors: ["#012B3D", "#023B52"], angle: 135, type: "simple" },
    button: { colors: ["#1CA3AD", "#0A6E8C"], angle: 90, type: "simple" },
    text: "#E5F6F9",
    mutedText: "#8FC4CE",
    border: "#054B63",
  },

  amber: {
    label: "Amber",
    background: {
      colors: ["#1A1103", "#3D2408", "#6B3E0F", "#A6631A"],
      angle: 140,
      type: "rich",
    },
    card: { colors: ["#2A1B06", "#33210A"], angle: 135, type: "simple" },
    button: { colors: ["#D98A2B", "#B5701D"], angle: 90, type: "simple" },
    text: "#FBF0DE",
    mutedText: "#CBA36F",
    border: "#553811",
  },

  lavender: {
    label: "Lavender",
    background: {
      colors: ["#F5F0FF", "#E4D9FA", "#D3C1F5"],
      angle: 135,
      type: "rich",
    },
    card: { colors: ["#FFFFFF", "#F8F4FE"], angle: 135, type: "simple" },
    button: { colors: ["#9B7FE8", "#7C5CD1"], angle: 90, type: "simple" },
    text: "#2B2340",
    mutedText: "#7A6E96",
    border: "#DDD0F5",
  },
};

export type ThemeKey = keyof typeof themes;
