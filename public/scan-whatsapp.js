// NPC evening scan. Paste into the browser console on web.whatsapp.com (chat list set to "All").
// It only READS the chat list on your screen, then downloads a file. It sends nothing anywhere.
(function () {
  const TIME_RE = /^\d{1,2}:\d{2}(\s?[AaPp]\.?[Mm]\.?)?$/;
  const OLDER_RE = /^(yesterday|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4})$/i;

  // lines = the text lines of one chat row, e.g. ["Ramesh", "9:05 PM", "Need it by 12 Nov", "2"]
  function parseLines(lines, titleAttr) {
    const clean = lines.map((l) => String(l).trim()).filter(Boolean);
    const idx = clean.findIndex((l) => TIME_RE.test(l) || OLDER_RE.test(l) || /^today$/i.test(l));
    if (idx < 1) return null;
    const label = clean[idx];
    const title = titleAttr && clean.includes(titleAttr) ? titleAttr : clean[0];
    const preview = clean.slice(idx + 1).filter((l) => !/^\d{1,4}\+?$/.test(l)).join(" ");
    return { title, time: label, preview, today: TIME_RE.test(label) || /^today$/i.test(label) };
  }

  if (typeof document === "undefined") { globalThis.__npcScan = { parseLines }; return; }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function run() {
    const pane = document.querySelector("#pane-side");
    if (!pane) { alert("Open WhatsApp Web with the chat list visible first."); return; }
    let scroller = pane;
    if (pane.scrollHeight <= pane.clientHeight + 5) {
      scroller = [...pane.querySelectorAll("*")].find(
        (e) => e.scrollHeight > e.clientHeight + 5 && getComputedStyle(e).overflowY !== "visible"
      ) || pane;
    }
    scroller.scrollTop = 0;
    await sleep(600);

    const seen = new Map();
    let oldStreak = 0;
    for (let step = 0; step < 600; step++) {
      const rows = [...pane.querySelectorAll('[role="listitem"], [role="row"]')]
        .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
      for (const row of rows) {
        const lines = (row.innerText || "").split("\n");
        const titleAttr = row.querySelector("span[title]")?.getAttribute("title") || "";
        const info = parseLines(lines, titleAttr);
        if (!info || seen.has(info.title)) continue;
        seen.set(info.title, info);
        oldStreak = info.today ? 0 : oldStreak + 1;
      }
      // pinned chats can be old, so stop only after a long run of older chats
      if (oldStreak >= 25) break;
      const before = scroller.scrollTop;
      scroller.scrollTop += Math.round(scroller.clientHeight * 0.8);
      await sleep(450);
      if (scroller.scrollTop === before) break; // reached the end of the list
    }
    scroller.scrollTop = 0;

    const chats = [...seen.values()].filter((c) => c.today).map(({ title, time, preview }) => ({ title, time, preview }));
    const stamp = new Date().toISOString().slice(0, 10);
    const json = JSON.stringify({ scannedAt: new Date().toISOString(), chats }, null, 1);
    try { if (typeof copy === "function") copy(json); } catch (e) {}
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([json], { type: "application/json" }));
    a.download = "whatsapp-scan-" + stamp + ".json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    console.log("NPC scan finished: " + chats.length + " chats with activity today. File downloaded.");
    alert("Scan finished: " + chats.length + " chats active today.\nUpload the downloaded file on the capture page.");
  }
  run();
})();
