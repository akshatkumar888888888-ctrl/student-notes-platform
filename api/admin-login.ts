import { VercelRequest, VercelResponse } from "@vercel/node";

// The real secret is only ever read from the server environment.
// Set ADMIN_SECRET in your Vercel project settings (and in your local .env
// for `npm run dev`). Never hardcode it in source or ship it to the client.
const ADMIN_SECRET = process.env.ADMIN_SECRET || "";

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!ADMIN_SECRET) {
    return res.status(500).json({ error: "Admin login is not configured on the server." });
  }

  const { code } = req.body || {};

  if (typeof code === "string" && code === ADMIN_SECRET) {
    return res.json({ success: true });
  }

  return res.status(401).json({ success: false, error: "Wrong secret code! Try again." });
}
