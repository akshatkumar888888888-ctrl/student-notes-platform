import { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(req: VercelRequest, res: VercelResponse) {
  const supabaseUrl = process.env.SUPABASE_URL || "";
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";
  const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

  res.json({
    supabaseConfigured: isSupabaseConfigured,
    supabaseUrl: isSupabaseConfigured ? supabaseUrl : null,
    mode: isSupabaseConfigured ? "Supabase Live Mode" : "Local Prototype Mode",
  });
}
