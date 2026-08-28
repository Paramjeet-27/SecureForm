import fs from "fs";
import path from "path";

const INDEX_FILE = path.join(process.cwd(), "data", "forms-index.json");

export interface FormIndexEntry {
  id: string;
  title: string;
  createdAt: string;
}

interface FormsIndex {
  forms: FormIndexEntry[];
}

const ensureIndexFile = (): void => {
  if (!fs.existsSync(INDEX_FILE)) {
    fs.mkdirSync(path.dirname(INDEX_FILE), { recursive: true });
    fs.writeFileSync(INDEX_FILE, JSON.stringify({ forms: [] }, null, 2));
  }
};

export const readFormsIndex = (): FormsIndex => {
  ensureIndexFile();
  const raw = fs.readFileSync(INDEX_FILE, "utf8");
  return JSON.parse(raw);
};

const writeFormsIndex = (index: FormsIndex): void => {
  fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));
};

export const addFormToIndex = (entry: FormIndexEntry): void => {
  const index = readFormsIndex();
  index.forms.push(entry);
  writeFormsIndex(index);
};

export const renameFormInIndex = (id: string, title: string): boolean => {
  const index = readFormsIndex();
  const entry = index.forms.find((f) => f.id === id);
  if (!entry) return false;
  entry.title = title;
  writeFormsIndex(index);
  return true;
};

export const removeFormFromIndex = (id: string): boolean => {
  const index = readFormsIndex();
  const before = index.forms.length;
  index.forms = index.forms.filter((f) => f.id !== id);
  if (index.forms.length === before) return false;
  writeFormsIndex(index);
  return true;
};
