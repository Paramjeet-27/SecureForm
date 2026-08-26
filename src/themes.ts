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
  crimson: {
    label: "Crimson",
    background: {
      colors: ["#0a0002", "#1a0006", "#3d0011", "#1a0006"],
      angle: 135,
      type: "rich",
    },
    card: {
      colors: ["#1a0008", "#2b0010"],
      angle: 135,
      type: "simple",
    },
    button: {
      colors: ["#8c1531", "#5c0d1f"],
      angle: 90,
      type: "simple",
    },
    text: "#f5e6e8",
    mutedText: "#a8757e",
    border: "#4a0d1f",
  },
  onyx: {
    label: "Onyx",
    background: {
      colors: ["#020202", "#0d0d0f", "#1a1a1e", "#0d0d0f"],
      angle: 135,
      type: "rich",
    },
    card: {
      colors: ["#111113", "#1c1c20"],
      angle: 135,
      type: "simple",
    },
    button: {
      colors: ["#4a4a52", "#2a2a30"],
      angle: 90,
      type: "simple",
    },
    text: "#ececee",
    mutedText: "#9a9aa2",
    border: "#2e2e34",
  },

  obsidian: {
    label: "Obsidian",
    background: {
      colors: ["#040007", "#0f0518", "#1c0a2e", "#0f0518"],
      angle: 140,
      type: "rich",
    },
    card: {
      colors: ["#150a22", "#1e0f30"],
      angle: 135,
      type: "simple",
    },
    button: {
      colors: ["#6b2fa0", "#3d1866"],
      angle: 90,
      type: "simple",
    },
    text: "#f0e6fa",
    mutedText: "#9e85b8",
    border: "#3a1c56",
  },

  noir: {
    label: "Noir",
    background: {
      colors: ["#050505", "#12100e", "#26201a", "#12100e"],
      angle: 135,
      type: "rich",
    },
    card: {
      colors: ["#161310", "#221c17"],
      angle: 135,
      type: "simple",
    },
    button: {
      colors: ["#9c7a3f", "#5c451f"],
      angle: 90,
      type: "simple",
    },
    text: "#f2ece0",
    mutedText: "#b3a385",
    border: "#3a2f20",
  },
  scarlet: {
    label: "Scarlet",
    background: {
      colors: ["#FF1B6B", "#FF0844", "#C21858", "#FF1B6B"],
      angle: 135,
      type: "rich",
    },
    card: {
      colors: ["#FF3D7F", "#E01458"],
      angle: 135,
      type: "simple",
    },
    button: {
      colors: ["#2B0512", "#1A0209"],
      angle: 90,
      type: "simple",
    },
    text: "#1A0209",
    mutedText: "#5C1228",
    border: "#C21858",
  },
  ivoryScarlet: {
    label: "Ivory Rose",
    background: {
      colors: ["#FFFFFF", "#FFF0F3", "#FFD6E0", "#FFFFFF"],
      angle: 135,
      type: "rich",
    },
    card: {
      colors: ["#FFFFFF", "#FFE8ED"],
      angle: 135,
      type: "simple",
    },
    button: {
      colors: ["#E01458", "#A80F42"],
      angle: 90,
      type: "simple",
    },
    text: "#2B0512",
    mutedText: "#8C4A5E",
    border: "#F5B8C6",
  },

  blackAndWhite: {
    label: "Monochrome",
    background: {
      colors: ["#FFFFFF", "#F2F2F2", "#0A0A0A", "#FFFFFF"],
      angle: 135,
      type: "rich",
    },
    card: {
      colors: ["#FFFFFF", "#F5F5F5"],
      angle: 135,
      type: "simple",
    },
    button: {
      colors: ["#0A0A0A", "#1F1F1F"],
      angle: 90,
      type: "simple",
    },
    text: "#0A0A0A",
    mutedText: "#666666",
    border: "#D9D9D9",
  },
};

export type ThemeKey = keyof typeof themes;
