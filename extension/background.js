importScripts("config.js");

// The content script hands the scanned chats here; this sends them to the app.
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || msg.type !== "scan") return;
  fetch(NPC_CONFIG.APP_URL.replace(/\/$/, "") + "/api/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ passcode: NPC_CONFIG.PASSCODE, chats: msg.chats }),
  })
    .then(async (r) => {
      const d = await r.json().catch(() => ({}));
      sendResponse(r.ok ? { ok: true, data: d } : { ok: false, error: d.error || "HTTP " + r.status });
    })
    .catch((e) => sendResponse({ ok: false, error: e.message }));
  return true; // reply is sent asynchronously
});
