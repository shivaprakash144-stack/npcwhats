"use client";

import { useState } from "react";

const box = { border: "1px solid #ddd", borderRadius: 12, padding: 16, marginTop: 16 };
const btn = { padding: "10px 16px", borderRadius: 10, border: "none", background: "#111", color: "#fff", cursor: "pointer", marginTop: 10 };

export default function Home() {
  const [passcode, setPasscode] = useState("");
  const [scan, setScan] = useState("");
  const [scanMsg, setScanMsg] = useState("");
  const [conMsg, setConMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function readFile(e, setter) {
    const f = e.target.files?.[0];
    if (!f) return;
    setter({ name: f.name, text: await f.text() });
  }
  const [conFile, setConFile] = useState(null);

  async function copyScript() {
    const t = await (await fetch("/scan-whatsapp.js")).text();
    await navigator.clipboard.writeText(t);
    setScanMsg("Script copied. Paste it in the console on web.whatsapp.com.");
  }

  async function sendScan() {
    setBusy(true); setScanMsg("");
    try {
      const parsed = JSON.parse(scan.text || scan);
      const res = await fetch("/api/scan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passcode, chats: parsed.chats }) });
      const d = await res.json();
      setScanMsg(res.ok
        ? `Chats today: ${d.scanned}. Added to the sheet: ${d.added}. Skipped (already captured in last 3 days): ${d.skipped}.${d.nameOnly ? ` ${d.nameOnly} added with a name only (number not found).` : ""}`
        : `Error: ${d.error}`);
    } catch { setScanMsg("Error: choose the downloaded scan file first."); }
    setBusy(false);
  }

  async function sendContacts() {
    if (!conFile) return setConMsg("Choose a contacts file first.");
    setBusy(true); setConMsg("");
    const res = await fetch("/api/contacts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passcode, filename: conFile.name, content: conFile.text }) });
    const d = await res.json();
    setConMsg(res.ok ? `Saved ${d.saved} contacts.` : `Error: ${d.error}`);
    setBusy(false);
  }

  return (
    <main style={{ fontFamily: "sans-serif", maxWidth: 640, margin: "0 auto", padding: 20 }}>
      <h1 style={{ fontSize: 22 }}>WhatsApp evening capture</h1>
      <input type="password" placeholder="Passcode" value={passcode} onChange={(e) => setPasscode(e.target.value)} style={{ padding: 10, width: "100%", boxSizing: "border-box" }} />

      <section style={box}>
        <b>1. Scan WhatsApp Web</b>
        <p style={{ margin: "8px 0" }}>Open web.whatsapp.com, make sure the chat list shows All chats, press F12, open Console, paste the script and press Enter. Wait for the finished message.</p>
        <button style={btn} onClick={copyScript}>Copy scan script</button>
      </section>

      <section style={box}>
        <b>2. Upload the scan file</b>
        <p style={{ margin: "8px 0" }}>Choose the whatsapp-scan file that was downloaded.</p>
        <input type="file" accept=".json" onChange={(e) => readFile(e, setScan)} />
        <br />
        <button style={btn} disabled={busy} onClick={sendScan}>{busy ? "Working…" : "Add to sheet"}</button>
        {scanMsg && <p>{scanMsg}</p>}
      </section>

      <section style={box}>
        <b>Saved contacts (one time, then occasionally)</b>
        <p style={{ margin: "8px 0" }}>Export the phone's contacts as a .vcf file and upload it, so saved names can be matched to their numbers.</p>
        <input type="file" accept=".vcf,.csv" onChange={(e) => readFile(e, setConFile)} />
        <br />
        <button style={btn} disabled={busy} onClick={sendContacts}>Save contacts</button>
        {conMsg && <p>{conMsg}</p>}
      </section>
    </main>
  );
}
