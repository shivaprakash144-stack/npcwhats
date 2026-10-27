import { NextResponse } from "next/server";
import { sql, ensureSchema, claimNumber, releaseNumber } from "../../../lib/db";
import { appendRow } from "../../../lib/gsheet";
import { verifySignature, extractIncoming, lastTen } from "../../../lib/parse.mjs";

export const dynamic = "force-dynamic";

// Meta calls this once when you save the webhook in the developer dashboard.
export async function GET(req) {
  const p = new URL(req.url).searchParams;
  if (p.get("hub.mode") === "subscribe" && p.get("hub.verify_token") === process.env.WEBHOOK_VERIFY_TOKEN) {
    return new Response(p.get("hub.challenge"), { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

// Meta calls this for every incoming customer message.
export async function POST(req) {
  const raw = await req.text();
  // Accept either Meta's signature (direct connection) or the secret key in the URL
  // (when a messaging provider forwards the messages to us).
  const secret = process.env.WEBHOOK_VERIFY_TOKEN;
  const keyOk = !!secret && new URL(req.url).searchParams.get("key") === secret;
  const sigOk = verifySignature(raw, req.headers.get("x-hub-signature-256"), process.env.META_APP_SECRET);
  if (!sigOk && !keyOk) {
    return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  }

  let payload;
  try { payload = JSON.parse(raw); } catch { return NextResponse.json({ ok: true }); }

  const messages = extractIncoming(payload);
  if (!messages.length) return NextResponse.json({ ok: true });

  const q = sql();
  await ensureSchema(q);

  const done = new Set();
  for (const m of messages) {
    if (done.has(m.phone)) continue;
    done.add(m.phone);

    // 3-day rule: skip if this number was captured within the last 3 days
    const isNew = await claimNumber(q, m.phone);
    if (!isNew) continue;

    try {
      await appendRow([
        m.at.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
        m.phone,
        lastTen(m.phone),
        m.name,
        m.text,
      ]);
    } catch (e) {
      // Undo the claim and ask Meta to retry, so no number is lost
      await releaseNumber(q, m.phone);
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
  }
  return NextResponse.json({ ok: true });
}
