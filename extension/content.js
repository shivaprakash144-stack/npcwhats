(function () {
  let lastActivity = Date.now();
  let lastAttempt = 0;
  let running = false;
  for (const ev of ["mousemove", "keydown", "click"]) {
    window.addEventListener(ev, () => { lastActivity = Date.now(); }, { passive: true, capture: true });
  }

  const btn = document.createElement("button");
  btn.textContent = "Send today's numbers";
  btn.style.cssText = "position:fixed;left:16px;bottom:16px;z-index:99999;padding:10px 14px;border:none;border-radius:20px;background:#111;color:#fff;font:13px sans-serif;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.3)";
  document.body.appendChild(btn);

  let resetTimer;
  function setStatus(text, ms) {
    btn.textContent = text;
    clearTimeout(resetTimer);
    if (ms) resetTimer = setTimeout(() => { btn.textContent = "Send today's numbers"; }, ms);
  }

  async function run() {
    if (running) return false;
    running = true;
    try {
      setStatus("Scanning… please wait");
      const res = await NPC_SCAN.scanChatList();
      if (res.error) { setStatus(res.error, 10000); return false; }
      const reply = await chrome.runtime.sendMessage({ type: "scan", chats: res.chats });
      if (!reply || !reply.ok) { setStatus("Failed: " + ((reply && reply.error) || "no reply"), 12000); return false; }
      setStatus(`Done: ${reply.data.added} new numbers added, ${reply.data.skipped} already captured`, 15000);
      return true;
    } finally {
      running = false;
    }
  }

  btn.addEventListener("click", run);

  const todayStr = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD, local time

  // Automatic evening run: once a day, after RUN_AFTER_HOUR, when nobody is using the screen.
  // If the computer was off in the evening, it runs the next time WhatsApp Web is open.
  setInterval(async () => {
    if (new Date().getHours() < NPC_CONFIG.RUN_AFTER_HOUR) return;
    if (Date.now() - lastActivity < 60000) return;      // someone is working: wait
    if (Date.now() - lastAttempt < 10 * 60000) return;  // after a failure, retry every 10 minutes
    if (!document.querySelector("#pane-side")) return;  // not logged in yet
    const { npcLastAutoRun } = await chrome.storage.local.get("npcLastAutoRun");
    if (npcLastAutoRun === todayStr()) return;
    lastAttempt = Date.now();
    if (await run()) await chrome.storage.local.set({ npcLastAutoRun: todayStr() });
  }, 60000);
})();
