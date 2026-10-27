// Reads the WhatsApp Web chat list. Read-only: it never clicks a chat or sends a message.
(function () {
  const TIME_RE = /^\d{1,2}:\d{2}(\s?[AaPp]\.?[Mm]\.?)?$/;
  const OLDER_RE = /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4})$/i;

  // lines = text lines of one chat row, e.g. ["Ramesh", "9:05 PM", "Need it by 12 Nov", "2"]
  function parseLines(lines, titleAttr) {
    const clean = lines.map((l) => String(l).trim()).filter(Boolean);
    const idx = clean.findIndex((l) => TIME_RE.test(l) || OLDER_RE.test(l) || /^(today|yesterday)$/i.test(l));
    if (idx < 1) return null;
    const label = clean[idx];
    const title = titleAttr && clean.includes(titleAttr) ? titleAttr : clean[0];
    const preview = clean.slice(idx + 1).filter((l) => !/^\d{1,4}\+?$/.test(l)).join(" ");
    const today = TIME_RE.test(label) || /^today$/i.test(label);
    const yesterday = /^yesterday$/i.test(label);
    // Today AND yesterday are kept, so a missed evening is caught the next day.
    // The 3-day rule on the server removes anything already captured.
    return { title, time: label, preview, recent: today || yesterday };
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function scanChatList() {
    const pane = document.querySelector("#pane-side");
    if (!pane) return { error: "WhatsApp chat list not found. Is WhatsApp Web logged in?" };
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
        const titleAttr = row.querySelector("span[title]")?.getAttribute("title") || "";
        const info = parseLines((row.innerText || "").split("\n"), titleAttr);
        if (!info || seen.has(info.title)) continue;
        seen.set(info.title, info);
        oldStreak = info.recent ? 0 : oldStreak + 1;
      }
      if (oldStreak >= 25) break; // pinned chats can be old, so stop only after a long run of older chats
      const before = scroller.scrollTop;
      scroller.scrollTop += Math.round(scroller.clientHeight * 0.8);
      await sleep(450);
      if (scroller.scrollTop === before) break; // end of the list
    }
    scroller.scrollTop = 0;

    const chats = [...seen.values()].filter((c) => c.recent).map(({ title, time, preview }) => ({ title, time, preview }));
    if (!seen.size) return { error: "No chats were read. WhatsApp may have changed its page." };
    return { chats };
  }

  globalThis.NPC_SCAN = { parseLines, scanChatList };
})();
