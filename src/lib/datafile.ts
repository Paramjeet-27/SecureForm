import fs from "fs";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "data.json");

export const dataFileExists = (): boolean => fs.existsSync(DATA_FILE);

export const readDataFile = (): { meta: any; encrypted: string } => {
  const raw = fs.readFileSync(DATA_FILE, "utf8");
  return JSON.parse(raw);
};

export const writeDataFile = (contents: { meta: any; encrypted: string }) => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(contents, null, 2));
};
