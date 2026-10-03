import countries from "i18n-iso-countries";
import de from "i18n-iso-countries/langs/de.json";
import { CITIES, CITIES_MULTI, RIVERS, RIVERS_MULTI, splitList } from "./wordlists";

countries.registerLocale(de);

export type Hint = "known" | "unknown";

/** Vergleichsform für Listen: Umlaute ausgeschrieben, damit Köln und Koeln passen */
export function listKey(word: string): string {
  return word
    .trim()
    .toLowerCase()
    .replace(/ß/g, "ss")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

const countryNames = Object.values(countries.getNames("de", { select: "all" })).flat();
// Gängige Kurzformen, die nicht in der ISO-Liste stehen
const countryExtra = ["Holland", "England", "Schottland", "Wales", "Nordirland", "Amerika", "Russland", "Tschechien", "Vatikan", "Kosovo"];

const LISTS: { match: RegExp; words: Set<string> }[] = [
  { match: /^(haupt)?st(a|ä)dt/i, words: new Set(splitList(CITIES, CITIES_MULTI).map(listKey)) },
  { match: /^(land|länder|staat)/i, words: new Set([...countryNames, ...countryExtra].map(listKey)) },
  { match: /^(fluss|flüsse|fluß)/i, words: new Set(splitList(RIVERS, RIVERS_MULTI).map(listKey)) },
];

/** Liste für eine Kategorie, oder null wenn es keine gibt */
function listFor(category: string): Set<string> | null {
  return LISTS.find((l) => l.match.test(category.trim()))?.words ?? null;
}

export function hasList(category: string): boolean {
  return listFor(category) !== null;
}

export function checkWord(category: string, word: string): Hint | null {
  const list = listFor(category);
  if (!list || !word.trim()) return null;
  return list.has(listKey(word)) ? "known" : "unknown";
}
