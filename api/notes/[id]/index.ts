import { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// Real admin secret lives only in the server environment now — it is never
// sent to or stored in the client bundle. Set ADMIN_SECRET in your Vercel /
// .env project settings.
const ADMIN_SECRET = process.env.ADMIN_SECRET || "";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;

  // POST - increment view count
  if (req.method === "POST") {
    try {
      const { data: note, error: fetchError } = await supabase
        .from("notes")
        .select("views")
        .eq("id", id)
        .single();

      if (fetchError || !note) {
        return res.status(404).json({ error: "Note not found." });
      }

      const { data: updated, error: updateError } = await supabase
        .from("notes")
        .update({ views: (note.views || 0) + 1 })
        .eq("id", id)
        .select()
        .single();

      if (updateError) {
        return res.status(500).json({ error: updateError.message });
      }

      return res.json({ success: true, note: updated });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // If a caller is trying to delete as admin (sends the header), the code
  // must match the real server-side secret. Requests with no admin header
  // fall through as a normal "delete my own upload" request (unchanged
  // behavior from before), but a WRONG admin code is now rejected outright
  // instead of silently doing nothing.
  const adminHeader = req.headers["x-admin-secret"];
  if (adminHeader && adminHeader !== ADMIN_SECRET) {
    return res.status(403).json({ error: "Invalid admin code." });
  }

  try {
    // Get the note to find the file name
    const { data: note, error: fetchError } = await supabase
      .from("notes")
      .select("file_name, file_url")
      .eq("id", id)
      .single();

    if (fetchError || !note) {
      return res.status(404).json({ error: "Note not found." });
    }

    // Extract filename from the file_url
    const fileUrl = note.file_url as string;
    const fileName = fileUrl.split("/").pop();

    // Delete from Supabase Storage
    if (fileName) {
      await supabase.storage.from("notes").remove([fileName]);
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from("notes")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return res.status(500).json({ error: deleteError.message });
    }

    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
