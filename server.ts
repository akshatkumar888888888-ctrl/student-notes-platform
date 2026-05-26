import express from "express";
import path from "path";
import multer from "multer";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import fs from "fs";

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Enable JSON parse middleware
app.use(express.json());

// Setup a folder for local uploads fallback (to preview without Supabase configuration)
const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Enable serving local uploaded files statically so they can be viewed
app.use("/public/uploads", express.static(UPLOADS_DIR));

// Configure Multer for processing file uploads in-memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Initialize Supabase Client if keys are present
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";
const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

let supabase: any = null;
if (isSupabaseConfigured) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log("🔌 Connected to live Supabase Backend successfully!");
  } catch (error) {
    console.warn("⚠️ Failed to initialize Supabase client:", error);
  }
} else {
  console.log("💻 Running in Local Mode: No Supabase keys found in environment variables.");
}

// Local In-Memory Fallback Store (Starts empty)
const mockNotes: any[] = [];

// ==========================================
// API ENDPOINTS
// ==========================================

// Endpoint to check connection configurations from UI
app.get("/api/config", (req, res) => {
  res.json({
    supabaseConfigured: isSupabaseConfigured,
    supabaseUrl: isSupabaseConfigured ? supabaseUrl : null,
    mode: isSupabaseConfigured ? "Supabase Live Mode" : "Local Prototype Mode",
  });
});

// Endpoint to fetch notes (delegates to Supabase or Mock Data)
app.get("/api/notes", async (req, res) => {
  try {
    const { class_id, stream_id, subject_id } = req.query;

    if (isSupabaseConfigured && supabase) {
      console.log("Fetching notes from Supabase...");
      let query = supabase.from("notes").select("*");

      if (class_id) query = query.eq("class_id", class_id);
      if (stream_id) query = query.eq("stream_id", stream_id);
      if (subject_id) query = query.eq("subject_id", subject_id);

      // Order by recent
      query = query.order("created_at", { ascending: false });

      const { data, error } = await query;
      if (error) {
        throw new Error(error.message);
      }
      return res.json(data);
    } else {
      // Local fallback filtration
      let results = [...mockNotes];
      if (class_id) {
        results = results.filter((n) => n.class_id === class_id);
      }
      if (stream_id) {
        results = results.filter((n) => n.stream_id === stream_id);
      }
      if (subject_id) {
        results = results.filter((n) => n.subject_id === subject_id);
      }
      // Sort desc
      results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      return res.json(results);
    }
  } catch (error: any) {
    console.error("Error fetching notes:", error);
    res.status(500).json({ error: error.message || "Failed to load notes" });
  }
});

// Endpoint to upload note file and register model
app.post("/api/notes", upload.single("file"), async (req, res) => {
  try {
    const { title, description, class_id, stream_id, subject_id, uploaded_by } = req.body;
    const file = req.file;

    if (!title || !class_id || !stream_id || !subject_id) {
      return res.status(400).json({ error: "Missing required metadata fields." });
    }

    if (!file) {
      return res.status(400).json({ error: "Please attach a file (PDF, image, or document) to upload." });
    }

    let fileUrl = "";
    let finalFileName = file.originalname;

    if (isSupabaseConfigured && supabase) {
      console.log("Processing upload to Supabase Storage inside 'notes' bucket...");
      
      // Compute unique filename
      const fileExt = file.originalname.split(".").pop();
      const sanitizedBaseName = file.originalname.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
      const uniqueFilename = `${Date.now()}-${sanitizedBaseName}.${fileExt}`;

      // Upload file directly to Supabase storage
      const { data: bucketData, error: storageError } = await supabase.storage
        .from("notes")
        .upload(uniqueFilename, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (storageError) {
        return res.status(500).json({ error: `Supabase Storage upload failed: ${storageError.message}` });
      }

      // Generate Public URL to reach this resource
      const { data: publicUrlObject } = supabase.storage
        .from("notes")
        .getPublicUrl(uniqueFilename);

      fileUrl = publicUrlObject.publicUrl;
      finalFileName = uniqueFilename;

      // Create row in Supabase Postgres notes table
      const { data: noteRecord, error: dbError } = await supabase
        .from("notes")
        .insert({
          title,
          description: description || "",
          class_id,
          stream_id,
          subject_id,
          file_name: file.originalname,
          file_url: fileUrl,
          file_size: file.size,
          uploaded_by: uploaded_by || "Anonymous Student",
          rating: 0.0,
          rating_count: 0,
        })
        .select()
        .single();

      if (dbError) {
        // Rollback uploaded file if DB record insertion fails
        await supabase.storage.from("notes").remove([uniqueFilename]);
        return res.status(500).json({ error: `Database entry failed: ${dbError.message}` });
      }

      console.log("Successfully uploaded to Supabase!");
      return res.json({ success: true, note: noteRecord });

    } else {
      // Local Prototype Upload Fallback: Save file to public/uploads
      const fileExt = file.originalname.split(".").pop();
      const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const savePath = path.join(UPLOADS_DIR, uniqueFilename);

      // Write standard Node FS file
      fs.writeFileSync(savePath, file.buffer);
      console.log(`Saved file locally to ${savePath}`);

      // The file url will point to the local server route
      fileUrl = `/public/uploads/${uniqueFilename}`;

      const newNote = {
        id: `mock-${Date.now()}`,
        title,
        description: description || "",
        class_id,
        stream_id,
        subject_id,
        file_name: file.originalname,
        file_url: fileUrl,
        file_size: file.size,
        uploaded_by: uploaded_by || "Anonymous Student",
        created_at: new Date().toISOString(),
        rating: 0.0,
        rating_count: 0,
      };

      // Store in memory
      mockNotes.unshift(newNote);

      return res.json({
        success: true,
        message: "Note successfully saved to local mock preview storage!",
        note: newNote,
      });
    }
  } catch (error: any) {
    console.error("Upload error:", error);
    res.status(500).json({ error: error.message || "Something went wrong during upload" });
  }
});

// Endpoint to submit user ratings for a study note
app.post("/api/notes/:id/rate", async (req, res) => {
  try {
    const { id } = req.params;
    const { rating } = req.body;

    if (typeof rating !== "number" || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating must be a valid number between 1 and 5." });
    }

    if (isSupabaseConfigured && supabase) {
      // Retrieve current note state
      const { data: note, error: fetchError } = await supabase
        .from("notes")
        .select("rating, rating_count")
        .eq("id", id)
        .single();

      if (fetchError || !note) {
        return res.status(404).json({ error: "Note record not found in Supabase database." });
      }

      const currentCount = note.rating_count || 0;
      const currentRating = Number(note.rating) || 0;

      const newCount = currentCount + 1;
      const newRating = parseFloat((((currentRating * currentCount) + rating) / newCount).toFixed(1));

      const { data: updatedRecord, error: updateError } = await supabase
        .from("notes")
        .update({
          rating: newRating,
          rating_count: newCount,
        })
        .eq("id", id)
        .select()
        .single();

      if (updateError) {
        return res.status(500).json({ error: `Failed to register rating update: ${updateError.message}` });
      }

      return res.json({ success: true, note: updatedRecord });
    } else {
      // Local fallback in-memory update
      const noteIndex = mockNotes.findIndex((n) => n.id === id);
      if (noteIndex === -1) {
        return res.status(404).json({ error: "Note record not found in local memory store." });
      }

      const note = mockNotes[noteIndex];
      const currentCount = note.rating_count || 0;
      const currentRating = note.rating || 0;

      const newCount = currentCount + 1;
      const newRating = parseFloat((((currentRating * currentCount) + rating) / newCount).toFixed(1));

      mockNotes[noteIndex] = {
        ...note,
        rating: newRating,
        rating_count: newCount,
      };

      return res.json({ success: true, note: mockNotes[noteIndex] });
    }
  } catch (error: any) {
    console.error("Rating submission error:", error);
    res.status(500).json({ error: error.message || "Something went wrong during rating" });
  }
});


// Endpoint to delete a study note (supports cleanup of storage + db)
app.delete("/api/notes/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (isSupabaseConfigured && supabase) {
      // First, fetch the note to get the filename if we need to clean up storage
      const { data: note, error: fetchError } = await supabase
        .from("notes")
        .select("file_url")
        .eq("id", id)
        .single();

      if (note && note.file_url) {
        // Try to delete the file from Supabase storage if we can extract the path
        try {
          // The public URL looks like: https://[project].supabase.co/storage/v1/object/public/notes/[filename]
          const parts = note.file_url.split("/notes/");
          if (parts.length > 1) {
            const filename = parts[1];
            await supabase.storage.from("notes").remove([filename]);
          }
        } catch (storageErr) {
          console.warn("Storage deletion error during note delete:", storageErr);
        }
      }

      const { error: deleteError } = await supabase
        .from("notes")
        .delete()
        .eq("id", id);

      if (deleteError) {
        return res.status(500).json({ error: `Failed to delete from database: ${deleteError.message}` });
      }

      return res.json({ success: true, message: "Note permanently deleted successfully." });
    } else {
      // Local fallback in-memory delete
      const noteIndex = mockNotes.findIndex((n) => n.id === id);
      if (noteIndex === -1) {
        return res.status(404).json({ error: "Note record not found." });
      }

      const note = mockNotes[noteIndex];
      // Try local file delete if exists
      if (note.file_url && note.file_url.startsWith("/public/uploads/")) {
        try {
          const filename = note.file_url.replace("/public/uploads/", "");
          const filePath = path.join(UPLOADS_DIR, filename);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (fsErr) {
          console.warn("Local storage FS cleanup failed:", fsErr);
        }
      }

      // Remove from memory
      mockNotes.splice(noteIndex, 1);
      return res.json({ success: true, message: "Note permanently deleted successfully." });
    }
  } catch (error: any) {
    console.error("Deletion error:", error);
    res.status(500).json({ error: error.message || "Something went wrong during deletion" });
  }
});


// ==========================================
// VITE DEV SERVER & STATAIC FILES
// ==========================================
import { createServer as createViteServer } from "vite";

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Notes Server is running on http://localhost:${PORT}`);
  });
}

startServer();
