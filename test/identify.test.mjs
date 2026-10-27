import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { identify, normalizePhone, parseContacts, nameKey, lastTen } from "../lib/identify.mjs";

// --- numbers ---
assert.equal(normalizePhone("+91 98400 12345"), "919840012345");
assert.equal(normalizePhone("98400 12345"), "919840012345");
assert.equal(normalizePhone("098400 12345"), "919840012345");
assert.equal(normalizePhone("+1 415 555 2671"), "14155552671");
assert.equal(lastTen("919840012345"), "9840012345");

// --- contacts export ---
const vcf = `BEGIN:VCARD\nVERSION:3.0\nFN:Ramesh Kumar\nTEL;TYPE=CELL:+91 98400 12345\nEND:VCARD\nBEGIN:VCARD\nFN;CHARSET=UTF-8:Priya S\nTEL;CELL:98410 55555\nEND:VCARD\n`;
const list = parseContacts(vcf, "contacts.vcf");
assert.equal(list.length, 2);
assert.equal(list[1].name, "Priya S");
const csv = `Name,Phone\n"Sagar, Photo Studio",98765 43210\nbad,abc\n`;
const c2 = parseContacts(csv, "c.csv");
assert.equal(c2.length, 1);
assert.equal(c2[0].name, "Sagar, Photo Studio");

const contacts = new Map(list.map((c) => [nameKey(c.name), normalizePhone(c.phone)]));

// --- identify chat titles ---
assert.deepEqual(identify("+91 98765 43210", contacts), { phone: "919876543210", key: "919876543210", saved: false });
assert.equal(identify("ramesh  KUMAR", contacts).phone, "919840012345");   // saved name -> number
assert.equal(identify("Someone Unknown", contacts).phone, "");              // name not in contacts
assert.equal(identify("Someone Unknown", contacts).key, "name:someone unknown");
assert.equal(identify("You", contacts), null);
// saved name and the same number typed as a number give the SAME key (3-day rule works across both)
assert.equal(identify("Ramesh Kumar", contacts).key, identify("+91 98400 12345", contacts).key);

// --- console script row parsing (runs the real file outside a browser) ---
const ctx = {};
vm.runInNewContext(readFileSync(new URL("../public/scan-whatsapp.js", import.meta.url), "utf8"), ctx);
ctx.globalThis = ctx;
const { parseLines } = ctx.__npcScan || vm.runInNewContext("globalThis", ctx).__npcScan || {};
assert.ok(parseLines, "script exposes parseLines for testing");
const a = parseLines(["Ramesh", "9:05 PM", "Need it by 12 Nov", "2"], "Ramesh");
assert.deepEqual([a.title, a.time, a.preview, a.today], ["Ramesh", "9:05 PM", "Need it by 12 Nov", true]);
const b = parseLines(["+91 98400 12345", "21:05", "photo", "12"], "");
assert.equal(b.today, true);
assert.equal(b.title, "+91 98400 12345");
const c = parseLines(["Priya", "Yesterday", "ok thanks"], "Priya");
assert.equal(c.today, false);
const d = parseLines(["Old chat", "24/10/2026", "bye"], "");
assert.equal(d.today, false);
assert.equal(parseLines(["Just a title"], ""), null);

console.log("All identify and scan-script tests passed");
