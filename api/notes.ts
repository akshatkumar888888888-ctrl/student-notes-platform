import { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import formidable from "formidable";
import fs from "fs";

export const config = {
  api: {
    bodyParser: false,
  },
};

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";
const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // GET - fetch notes
  if (req.method === "GET") {
    try {
      const { class_id, stream_id, subject_id } = req.query;

      if (!supabase) {
        return res.status(500).json({ error: "Supabase not configured" });
      }

      let query = supabase.from("notes").select("*");
      if (class_id) query = query.eq("class_id", class_id);
      if (stream_id) query = query.eq("stream_id", stream_id);
      if (subject_id) query = query.eq("subject_id", subject_id);
      query = query.order("created_at", { ascending: false });

      const { data, error } = await query;
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  // POST - upload note
  if (req.method === "POST") {
    try {
      if (!supabase) {
        return res.status(500).json({ error: "Supabase not configured" });
      }

      const form = formidable({ maxFileSize: 10 * 1024 * 1024 });

      const [fields, files] = await new Promise<[formidable.Fields, formidable.Files]>((resolve, reject) => {
        form.parse(req as any, (err, fields, files) => {
          if (err) reject(err);
          else resolve([fields, files]);
        });
      });

      const title = Array.isArray(fields.title) ? fields.title[0] : fields.title;
      const description = Array.isArray(fields.description) ? fields.description[0] : fields.description;
      const class_id = Array.isArray(fields.class_id) ? fields.class_id[0] : fields.class_id;
      const stream_id = Array.isArray(fields.stream_id) ? fields.stream_id[0] : fields.stream_id;
      const subject_id = Array.isArray(fields.subject_id) ? fields.subject_id[0] : fields.subject_id;
      const uploaded_by = Array.isArray(fields.uploaded_by) ? fields.uploaded_by[0] : fields.uploaded_by;

      if (!title || !class_id || !stream_id || !subject_id) {
        return res.status(400).json({ error: "Missing required metadata fields." });
      }

      const fileArray = files.file;
      const file = Array.isArray(fileArray) ? fileArray[0] : fileArray;

      if (!file) {
        return res.status(400).json({ error: "Please attach a file to upload." });
      }

      const fileBuffer = fs.readFileSync(file.filepath);
      const fileExt = (file.originalFilename || "file").split(".").pop();
      const sanitizedName = (file.originalFilename || "file").replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
      const uniqueFilename = `${Date.now()}-${sanitizedName}.${fileExt}`;

      const { error: storageError } = await supabase.storage
        .from("notes")
        .upload(uniqueFilename, fileBuffer, {
          contentType: file.mimetype || "application/octet-stream",
          upsert: false,
        });

      if (storageError) {
        return res.status(500).json({ error: `Storage upload failed: ${storageError.message}` });
      }

      const { data: publicUrlObject } = supabase.storage.from("notes").getPublicUrl(uniqueFilename);
      const fileUrl = publicUrlObject.publicUrl;

      const { data: noteRecord, error: dbError } = await supabase
        .from("notes")
        .insert({
          title,
          description: description || "",
          class_id,
          stream_id,
          subject_id,
          file_name: file.originalFilename || uniqueFilename,
          file_url: fileUrl,
          file_size: file.size,
          uploaded_by: uploaded_by || "Anonymous Student",
          rating: 0.0,
          rating_count: 0,
        })
        .select()
        .single();

      if (dbError) {
        await supabase.storage.from("notes").remove([uniqueFilename]);
        return res.status(500).json({ error: `Database entry failed: ${dbError.message}` });
      }

      return res.json({ success: true, note: noteRecord });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || "Upload failed" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
