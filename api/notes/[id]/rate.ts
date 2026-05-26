import { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { id } = req.query;
    const { rating } = req.body;

    if (typeof rating !== "number" || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating must be a number between 1 and 5." });
    }

    const { data: note, error: fetchError } = await supabase
      .from("notes")
      .select("rating, rating_count")
      .eq("id", id)
      .single();

    if (fetchError || !note) {
      return res.status(404).json({ error: "Note not found." });
    }

    const currentCount = note.rating_count || 0;
    const currentRating = Number(note.rating) || 0;
    const newCount = currentCount + 1;
    const newRating = parseFloat((((currentRating * currentCount) + rating) / newCount).toFixed(1));

    const { data: updatedRecord, error: updateError } = await supabase
      .from("notes")
      .update({ rating: newRating, rating_count: newCount })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    return res.json({ success: true, note: updatedRecord });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
