import fs from "fs";
import path from "path";

const FORMS_DIR = path.join(process.cwd(), "data", "forms");

export interface FormFile {
  version: number;
  createdAt: string;
  encrypted: string;
}

const formPath = (id: string): string => path.join(FORMS_DIR, `${id}.json`);

export const formFileExists = (id: string): boolean =>
  fs.existsSync(formPath(id));

export const readFormFile = (id: string): FormFile => {
  const raw = fs.readFileSync(formPath(id), "utf8");
  return JSON.parse(raw);
};

export const writeFormFile = (id: string, contents: FormFile): void => {
  fs.mkdirSync(FORMS_DIR, { recursive: true });
  fs.writeFileSync(formPath(id), JSON.stringify(contents, null, 2));
};

export const deleteFormFile = (id: string): void => {
  const p = formPath(id);
  if (fs.existsSync(p)) fs.unlinkSync(p);
};
