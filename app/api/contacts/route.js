import { NextResponse } from "next/server";
import { sql, ensureSchema, saveContacts } from "../../../lib/db";
import { parseContacts, nameKey, normalizePhone } from "../../../lib/identify.mjs";

export const dynamic = "force-dynamic";

// One-time (and occasional refresh) upload of the phone's contacts: { passcode, filename, content }
export async function POST(req) {
  let b;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "That file is not valid" }, { status: 400 }); }
  if (!process.env.UPLOAD_PASSCODE || b.passcode !== process.env.UPLOAD_PASSCODE) {
    return NextResponse.json({ error: "Wrong passcode" }, { status: 401 });
  }
  try {
    const cc = process.env.DEFAULT_COUNTRY_CODE || "91";
    const map = new Map();
    for (const c of parseContacts(b.content, b.filename)) {
      const key = nameKey(c.name);
      const phone = normalizePhone(c.phone, cc);
      if (key && phone) map.set(key, phone);
    }
    const list = [...map].map(([key, phone]) => ({ key, phone }));
    const q = sql();
    await ensureSchema(q);
    await saveContacts(q, list);
    return NextResponse.json({ saved: list.length });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
