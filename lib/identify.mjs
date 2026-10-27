// Turns a chat title from WhatsApp Web into a number (or a name) and a dedupe key.

export const nameKey = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");

// "+91 98400 12345" / "98400 12345" / "098400 12345" -> 919840012345
export function normalizePhone(raw, cc = "91") {
  let d = String(raw || "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  if (d.length === 10) d = cc + d;
  return d;
}

export const lastTen = (phone) => {
  const d = String(phone || "").replace(/\D/g, "");
  return d.length > 10 ? d.slice(-10) : d;
};

const LOOKS_LIKE_NUMBER = /^[+()\d\s-]{8,}$/;

// contacts: Map(nameKey -> phone)
export function identify(title, contacts, cc = "91") {
  const t = String(title || "").trim();
  if (!t || /^you$/i.test(t)) return null;
  if (LOOKS_LIKE_NUMBER.test(t)) {
    const phone = normalizePhone(t, cc);
    return { phone, key: phone, saved: false };
  }
  const found = contacts?.get(nameKey(t));
  if (found) return { phone: normalizePhone(found, cc), key: normalizePhone(found, cc), saved: true };
  return { phone: "", key: "name:" + nameKey(t), saved: true };
}

// Reads a phone-contacts export: .vcf (vCard) or a simple "name,phone" .csv
export function parseContacts(text, filename = "") {
  const out = [];
  const src = String(text || "");
  if (/BEGIN:VCARD/i.test(src) || /\.vcf$/i.test(filename)) {
    for (const card of src.split(/END:VCARD/i)) {
      const fn = card.match(/^FN[^:\r\n]*:(.+)$/im);
      const tel = card.match(/^TEL[^:\r\n]*:(.+)$/im);
      if (fn && tel) out.push({ name: fn[1].trim(), phone: tel[1].trim() });
    }
    return out;
  }
  for (const line of src.split(/\r?\n/)) {
    const i = line.lastIndexOf(",");
    if (i < 1) continue;
    const phone = line.slice(i + 1).trim().replace(/^"|"$/g, "");
    const name = line.slice(0, i).trim().replace(/^"|"$/g, "");
    if (phone.replace(/\D/g, "").length < 8 || !name) continue; // skips header rows too
    out.push({ name, phone });
  }
  return out;
}
