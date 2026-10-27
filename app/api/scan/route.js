import { NextResponse } from "next/server";
import { sql, ensureSchema, claimNumber, releaseNumber, loadContacts } from "../../../lib/db";
import { appendRows } from "../../../lib/gsheet";
import { identify, lastTen } from "../../../lib/identify.mjs";

export const dynamic = "force-dynamic";

// Receives the evening WhatsApp Web scan: { passcode, chats: [{ title, time, preview }] }
export async function POST(req) {
  let b;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "That file is not valid" }, { status: 400 }); }
  if (!process.env.UPLOAD_PASSCODE || b.passcode !== process.env.UPLOAD_PASSCODE) {
    return NextResponse.json({ error: "Wrong passcode" }, { status: 401 });
  }
  const chats = Array.isArray(b.chats) ? b.chats : [];
  const cc = process.env.DEFAULT_COUNTRY_CODE || "91";

  try {
    const q = sql();
    await ensureSchema(q);
    const contacts = await loadContacts(q);
    const stamp = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

    const claimed = [];
    const rows = [];
    const seen = new Set();
    let skipped = 0;
    let nameOnly = 0;

    for (const c of chats) {
      const id = identify(c.title, contacts, cc);
      if (!id || seen.has(id.key)) continue;
      seen.add(id.key);

      // 3-day rule: skip if this number was captured within the last 3 days
      if (!(await claimNumber(q, id.key))) { skipped++; continue; }

      claimed.push(id.key);
      if (!id.phone) nameOnly++;
      rows.push([
        stamp,
        id.phone,
        lastTen(id.phone),
        String(c.title || ""),
        String(c.preview || "").slice(0, 500),
        id.phone ? "" : "Number not found (saved name only)",
      ]);
    }

    if (rows.length) {
      try {
        await appendRows(rows);
      } catch (e) {
        for (const k of claimed) await releaseNumber(q, k); // nothing is lost; upload again
        return NextResponse.json({ error: e.message }, { status: 500 });
      }
    }
    return NextResponse.json({ scanned: chats.length, added: rows.length, skipped, nameOnly });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
