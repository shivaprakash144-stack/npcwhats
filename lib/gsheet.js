import { SignJWT, importPKCS8 } from "jose";

async function accessToken() {
  const email = process.env.GOOGLE_CLIENT_EMAIL;
  const key = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  if (!email || !key) throw new Error("Google credentials are not set");
  const pk = await importPKCS8(key, "RS256");
  const now = Math.floor(Date.now() / 1000);
  const jwt = await new SignJWT({ scope: "https://www.googleapis.com/auth/spreadsheets" })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(email)
    .setSubject(email)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(pk);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Google auth failed: ${data.error_description || data.error || res.status}`);
  return data.access_token;
}

// Adds rows at the bottom of the tab. Columns: A..F
export async function appendRows(rows) {
  const token = await accessToken();
  const tab = process.env.GOOGLE_SHEET_TAB || "WhatsApp Numbers";
  const range = encodeURIComponent(`${tab}!A:F`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${process.env.GOOGLE_SHEET_ID}/values/${range}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ values: rows.map((r) => r.map((v) => (v === null || v === undefined ? "" : String(v)))) }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Sheet append failed (${res.status}): ${t.slice(0, 200)}`);
  }
}

export const appendRow = (values) => appendRows([values]);
