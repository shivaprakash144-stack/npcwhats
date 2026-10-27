import { createHmac, timingSafeEqual } from "crypto";

// Meta signs every webhook call with the app secret. Reject anything else.
export function verifySignature(rawBody, header, appSecret) {
  if (!appSecret || !header || !header.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const got = header.slice(7);
  const a = Buffer.from(expected);
  const b = Buffer.from(got);
  return a.length === b.length && timingSafeEqual(a, b);
}

// 919840012345 -> 9840012345 (last 10 digits, to match the Amazon sheet)
export function lastTen(phone) {
  const d = String(phone || "").replace(/\D/g, "");
  return d.length > 10 ? d.slice(-10) : d;
}

// Pulls INCOMING customer messages out of a Meta webhook payload.
// Messages sent from the business app arrive on a different field
// (smb_message_echoes) and are ignored here.
export function extractIncoming(payload) {
  const out = [];
  for (const entry of payload?.entry || []) {
    for (const change of entry?.changes || []) {
      if (change?.field !== "messages") continue;
      const v = change.value || {};
      const own = String(v.metadata?.display_phone_number || "").replace(/\D/g, "");
      const names = {};
      for (const c of v.contacts || []) names[c.wa_id] = c?.profile?.name || "";
      for (const m of v.messages || []) {
        if (!m?.from) continue;
        const phone = String(m.from).replace(/\D/g, "");
        if (own && phone === own) continue; // never capture our own number
        const ts = Number(m.timestamp);
        out.push({
          phone,
          name: names[m.from] || "",
          at: ts ? new Date(ts * 1000) : new Date(),
          text: m.type === "text" ? String(m.text?.body || "").slice(0, 500) : `[${m.type || "message"}]`,
        });
      }
    }
  }
  return out;
}
