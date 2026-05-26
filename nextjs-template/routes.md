# Next.js API Routes for Supabase Notes Platform

If you are deploying this template using **Next.js**, we recommend using the standard **App Router** (introduced in Next.js 13/14/15). Below is the minimal, well-commented Next.js code for the API routes.

First install the Supabase client:
`npm install @supabase/supabase-js`

---

## 1. Supabase Client Initializer (`lib/supabase.ts`)

Create a helper file to instantiate the Supabase SDK:

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase credentials are missing from your environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

---

## 2. API Route to Fetch Notes (`app/api/notes/route.ts`)

This route handles `GET` requests to retrieve notes, optionally filtered by `class_id`, `stream_id`, and `subject_id`.

```typescript
// app/api/notes/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('class_id');
    const streamId = searchParams.get('stream_id');
    const subjectId = searchParams.get('subject_id');

    // Start building query
    let query = supabase.from('notes').select('*');

    // Apply optional filters if they are provided
    if (classId) {
      query = query.eq('class_id', classId);
    }
    if (streamId) {
      query = query.eq('stream_id', streamId);
    }
    if (subjectId) {
      query = query.eq('subject_id', subjectId);
    }

    // Sort by most recent notes
    query = query.order('created_at', { ascending: false });

    const { data: notes, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(notes);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
```

---

## 3. API Route for Uploading Notes (`app/api/notes/upload/route.ts`)

This route handles `POST` requests containing file uploads (PDF, photos, images). It parses the file stream, uploads it raw to Supabase Storage, and registers the note inline in the PostgreSQL database.

```typescript
// app/api/notes/upload/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    // 1. Parse Multipart Form Data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string || '';
    const classId = formData.get('class_id') as string;
    const streamId = formData.get('stream_id') as string;
    const subjectId = formData.get('subject_id') as string;
    const uploadedBy = formData.get('uploaded_by') as string || 'Anonymous Student';

    if (!file || !title || !classId || !streamId || !subjectId) {
      return NextResponse.json(
        { error: 'Missing required fields. Please fill in all parts of the upload form.' },
        { status: 400 }
      );
    }

    // 2. Format a unique file name to avoid collisions in the storage bucket
    const fileExtension = file.name.split('.').pop();
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const randomizedFileName = `${Date.now()}_${cleanFileName}.${fileExtension}`;

    // 3. Convert Next.js file object to arrayBuffer or buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 4. Upload file raw to Supabase 'notes' bucket
    const { data: bucketData, error: bucketError } = await supabase.storage
      .from('notes')
      .upload(randomizedFileName, buffer, {
        contentType: file.type,
        upsert: false
      });

    if (bucketError) {
      return NextResponse.json(
        { error: `Storage Upload Failed: ${bucketError.message}` },
        { status: 500 }
      );
    }

    // 5. Generate the direct public URL for the file
    const { data: publicUrlData } = supabase.storage
      .from('notes')
      .getPublicUrl(randomizedFileName);

    const publicUrl = publicUrlData.publicUrl;

    // 6. DB Entry Creation in 'notes' table
    const { data: noteRecord, error: dbError } = await supabase
      .from('notes')
      .insert({
        title,
        description,
        class_id: classId,
        stream_id: streamId,
        subject_id: subjectId,
        file_name: file.name,
        file_url: publicUrl,
        file_size: file.size,
        uploaded_by: uploadedBy
      })
      .select()
      .single();

    if (dbError) {
      // Cleanup uploaded storage file if writing to database failed
      await supabase.storage.from('notes').remove([randomizedFileName]);
      return NextResponse.json(
        { error: `Database entry failed: ${dbError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Note uploaded and recorded successfully!',
      note: noteRecord
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Error occurred handling the upload.' },
      { status: 500 }
    );
  }
}
```
