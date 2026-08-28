import fs from "fs";
import path from "path";

const APP_DATA_FILE = path.join(process.cwd(), "data", "app-data.json");

export interface AppData {
  version: number;
  createdAt: string;
  adminPassphraseSalt: string;
  serverKeySalt: string;
  respondentPassphraseHash: string;
  adminWrappedDEK: string;
  serverWrappedDEK: string;
  theme: string;
  gradientAngle: number | null;
  icons: Record<string, string>;
}

export const appDataFileExists = (): boolean => fs.existsSync(APP_DATA_FILE);

export const readAppData = (): AppData => {
  const raw = fs.readFileSync(APP_DATA_FILE, "utf8");
  return JSON.parse(raw);
};

export const writeAppData = (contents: AppData): void => {
  fs.mkdirSync(path.dirname(APP_DATA_FILE), { recursive: true });
  fs.writeFileSync(APP_DATA_FILE, JSON.stringify(contents, null, 2));
};
