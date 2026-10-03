import { test } from "node:test";
import assert from "node:assert/strict";
import { checkWord, listKey } from "./wordcheck";

test("listKey faltet Umlaute ausgeschrieben", () => {
  assert.equal(listKey("Köln"), listKey("Koeln"));
  assert.equal(listKey("Straßburg"), "strassburg");
});

test("Städte, Länder, Flüsse werden erkannt", () => {
  assert.equal(checkWord("Stadt", "berlin"), "known");
  assert.equal(checkWord("Stadt", "Frankfurt"), "known");
  assert.equal(checkWord("Stadt", "New York"), "known");
  assert.equal(checkWord("Land", "Deutschland"), "known");
  assert.equal(checkWord("Land", "Elfenbeinküste"), "known");
  assert.equal(checkWord("Fluss", "Saale"), "known");
  assert.equal(checkWord("Fluss", "Rio Grande"), "known");
  assert.equal(checkWord("Stadt", "Blablabla"), "unknown");
});

test("Kategorien ohne Liste liefern null", () => {
  assert.equal(checkWord("Tier", "Bär"), null);
  assert.equal(checkWord("Stadt", ""), null);
});
