import { test } from "node:test";
import assert from "node:assert/strict";
import { normalize, scoreRound, startsWithLetter, voteKey, pickLetter } from "./scoring";

test("normalize faltet Umlaute und Großschreibung", () => {
  assert.equal(normalize("  Äpfel  "), "apfel");
  assert.equal(normalize("Straße"), "strasse");
});

test("startsWithLetter prüft Anfangsbuchstaben und Mindestlänge", () => {
  assert.ok(startsWithLetter("Berlin", "B"));
  assert.ok(startsWithLetter("Ägypten", "A"));
  assert.ok(!startsWithLetter("B", "B"));
  assert.ok(!startsWithLetter("Hamburg", "B"));
});

test("Punkte: allein 20, einzigartig 10, doppelt 5, ungültig 0", () => {
  const players = ["a", "b", "c"];
  const answers = {
    a: ["Berlin", "Belgien"],
    b: ["berlin", "Brasilien"],
    c: ["Bonn", ""],
  };
  const s = scoreRound("B", 2, players, answers, {});
  assert.deepEqual(s.points.a, [5, 10]);
  assert.deepEqual(s.points.b, [5, 10]);
  assert.deepEqual(s.points.c, [10, 0]);
});

test("Mehrheit lehnt ab -> ungültig, dadurch 20 für den Rest", () => {
  const players = ["a", "b", "c"];
  const answers = { a: ["Bxyz"], b: ["Bonn"], c: [""] };
  const votes = { [voteKey("a", 0)]: new Set(["b", "c"]) };
  const s = scoreRound("B", 1, players, answers, votes);
  assert.equal(s.points.a[0], 0);
  assert.equal(s.points.b[0], 20);
});

test("Gleichstand bei Abstimmung zählt als gültig", () => {
  const s = scoreRound("B", 1, ["a", "b", "c"], { a: ["Bonn"], b: ["Bremen"], c: [""] }, {
    [voteKey("a", 0)]: new Set(["b"]),
  });
  assert.ok(s.valid.a[0]);
});

test("pickLetter respektiert Ausschlüsse", () => {
  for (let i = 0; i < 50; i++) {
    const l = pickLetter(["Q", "X", "Y"], ["A"]);
    assert.ok(!["Q", "X", "Y", "A"].includes(l));
  }
});
