import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { verifySignature, extractIncoming, lastTen } from "../lib/parse.mjs";

const payload = {
  entry: [{
    changes: [{
      field: "messages",
      value: {
        metadata: { display_phone_number: "914412345678" },
        contacts: [{ wa_id: "919840012345", profile: { name: "Ramesh" } }],
        messages: [
          { from: "919840012345", timestamp: "1761600000", type: "text", text: { body: "Name: Priya, date 12 Nov" } },
          { from: "919840012345", timestamp: "1761600060", type: "image" },
          { from: "914412345678", timestamp: "1761600100", type: "text", text: { body: "our own number" } },
        ],
      },
    }, {
      field: "smb_message_echoes",
      value: { message_echoes: [{ from: "914412345678", to: "919840012345", type: "text" }] },
    }],
  }],
};

const got = extractIncoming(payload);
assert.equal(got.length, 2, "own number and echoes are ignored");
assert.equal(got[0].phone, "919840012345");
assert.equal(got[0].name, "Ramesh");
assert.equal(got[0].text, "Name: Priya, date 12 Nov");
assert.equal(got[1].text, "[image]");
assert.equal(lastTen("919840012345"), "9840012345");
assert.equal(lastTen("9840012345"), "9840012345");

const body = JSON.stringify(payload);
const sig = "sha256=" + createHmac("sha256", "secret").update(body).digest("hex");
assert.equal(verifySignature(body, sig, "secret"), true);
assert.equal(verifySignature(body, sig, "wrong"), false);
assert.equal(verifySignature(body, null, "secret"), false);
assert.equal(verifySignature(body, sig, ""), false);
assert.equal(extractIncoming({}).length, 0);

console.log("All parse tests passed");
