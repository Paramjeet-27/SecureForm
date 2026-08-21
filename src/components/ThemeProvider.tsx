"use client";

import { useEffect, useState, createContext, useContext } from "react";
import { themes, ThemeKey, Theme } from "@/themes";
import { defaultIcons, iconOptions, IconName } from "@/iconOptions";

const buildGradient = (colors: string[], angle: number) =>
  `linear-gradient(${angle}deg, ${colors.join(", ")})`;

export const ThemeContext = createContext<{
  icons: Record<string, IconName>;
}>({ icons: defaultIcons });

export const useThemeIcons = () => useContext(ThemeContext);

export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [css, setCss] = useState("");
  const [icons, setIcons] = useState<Record<string, IconName>>(defaultIcons);
  const [activeTheme, setActiveTheme] = useState<Theme>(themes.calm);

  useEffect(() => {
    fetch("/api/theme")
      .then((res) => res.json())
      .then((data) => {
        const theme = themes[data.theme as ThemeKey] || themes.calm;
        const bgAngle = data.gradientAngle ?? theme.background.angle;

        const vars = `
  :root {
    --bg-gradient: ${buildGradient(theme.background.colors, bgAngle)};
    --card-gradient: ${buildGradient(theme.card.colors, theme.card.angle)};
    --button-gradient: ${buildGradient(theme.button.colors, theme.button.angle)};
    --text-color: ${theme.text};
    --muted-text: ${theme.mutedText};
    --border-color: ${theme.border};
  }
  html, body {
    min-height: 100%;
    background: var(--bg-gradient);
    background-attachment: fixed;
    color: var(--text-color);
  }
`;
        setCss(vars);
        setActiveTheme(theme);
        if (data.icons) {
          setIcons(data.icons);
        }
      })
      .catch(() => {
        // Fail silently into default (unstyled) rather than breaking the page
      });
  }, []);

  // Dynamically update the browser favicon
  useEffect(() => {
    const timer = setTimeout(() => {
      const portal = document.getElementById("hidden-favicon-portal");
      const svg = portal?.querySelector("svg");
      if (svg) {
        svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        const svgString = new XMLSerializer().serializeToString(svg);
        const svgBlob = new Blob([svgString], { type: "image/svg+xml" });
        const newUrl = URL.createObjectURL(svgBlob);

        let link = document.querySelector(
          "link[rel*='icon']",
        ) as HTMLLinkElement;
        if (!link) {
          link = document.createElement("link");
          link.rel = "icon";
          document.head.appendChild(link);
        }

        const oldUrl = link.href;
        link.href = newUrl;

        if (oldUrl && oldUrl.startsWith("blob:")) {
          URL.revokeObjectURL(oldUrl);
        }
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [icons.favicon, activeTheme.text]);

  const faviconKey = icons.favicon || defaultIcons.favicon;
  const FaviconComponent = iconOptions[faviconKey] || iconOptions.Sparkles;

  return (
    <ThemeContext.Provider value={{ icons }}>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div id="hidden-favicon-portal" style={{ display: "none" }}>
        <FaviconComponent size={32} color={activeTheme.text} strokeWidth={2} />
      </div>
      {children}
    </ThemeContext.Provider>
  );
}
