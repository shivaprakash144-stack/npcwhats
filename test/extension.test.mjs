import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const ctx = { globalThis: null };
ctx.globalThis = ctx;
vm.runInNewContext(readFileSync(new URL("../extension/scan-core.js", import.meta.url), "utf8"), ctx);
const { parseLines } = ctx.NPC_SCAN;

assert.equal(parseLines(["Ramesh", "9:05 PM", "hello", "2"], "Ramesh").recent, true);      // today
assert.equal(parseLines(["+91 98400 12345", "21:05", "photo"], "").recent, true);           // today, 24h
assert.equal(parseLines(["Priya", "Yesterday", "ok thanks"], "Priya").recent, true);        // yesterday is kept
assert.equal(parseLines(["Sagar", "Monday", "bye"], "").recent, false);                     // older
assert.equal(parseLines(["Old", "24/10/2026", "bye"], "").recent, false);
assert.equal(parseLines(["Just a title"], ""), null);

// config and manifest sanity
const manifest = JSON.parse(readFileSync(new URL("../extension/manifest.json", import.meta.url), "utf8"));
assert.equal(manifest.manifest_version, 3);
assert.deepEqual(manifest.content_scripts[0].js, ["config.js", "scan-core.js", "content.js"]);
console.log("Extension tests passed");
