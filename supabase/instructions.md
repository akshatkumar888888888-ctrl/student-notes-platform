# Supabase Setup Guide for Student Notes Platform

This guide helps you set up a free **Supabase** backend (Postgres Database + Object Storage) to store and retrieve note files. 

Follow these simple steps:

---

## Step 1: Create a Supabase Project

1. Go to [Supabase](https://supabase.com) and sign up/log in.
2. Click **New Project** and choose a name (e.g., `student-notes-platform`).
3. Set a strong Database Password and select a Region closest to your target users.
4. Wait for the project initialization to complete (usually takes 1-2 minutes).

---

## Step 2: Initialize physical tables in the database

1. In the Supabase Dashboard, click on **SQL Editor** in the left sidebar (it looks like a `>_` terminal icon or the SQL symbol).
2. Click **New query**.
3. Copy-paste the entire contents of `/supabase/schema.sql` into the SQL editor.
4. Click **Run** (at the bottom right).
5. Verify that it says **Success**! Your tables (`classes`, `streams`, `subjects`, and `notes`) are now ready and pre-seeded.

---

## Step 3: Set up Supabase Storage Bucket for Files

To store PDFs, DOCX, and JPG notes, you must configure a Storage Bucket:

1. Click on **Storage** in the left sidebar of the Supabase Dashboard (represented by an open-box or database bucket icon).
2. Click **New Bucket**.
3. Set the **Bucket Name** to `notes`.
4. Make sure to toggle **Public Bucket** to **ON**. This allows any student to view or download notes using a direct hyperlink.
5. Click **Create bucket**.

### Configure Custom Upload Permissions (Bucket Policy):
To let anonymous users or your frontend upload files to this bucket without authentication during testing:
1. In the Storage section, click on **Policies** (or configuration settings for files) under the `notes` bucket.
2. Click **New Policy** under **Bucket policies** and select **For full customization** (or select a template like "Enable uploads/inserts for anonymous users").
3. Set the policy name to `Allow Public Uploads`.
4. Select the **INSERT** and **SELECT** checkboxes.
5. Set the Allowed Roles to `public` or leave as placeholder.
6. For the policy rule, set `true` to allow unrestricted access (or choose the dashboard wizard's public-preset so any student can upload files).
7. Save the policy.

---

## Step 4: Obtain API Credentials & Environment Variables

Get the credentials needed to connect your Next.js or Node.js server to Supabase:

1. Click on the **Project Settings** (gear icon) in the left sidebar.
2. Click **API**.
3. Under **Project API keys**, you will find two values:
   - **Project URL**: Start with `https://...` (Labelled **URL**)
   - **Anon Key**: A long string (Labelled **`anon` / `public`**)

---

## Step 5: Environment Variables for Deployment on Vercel

When deploying your app to **Vercel**, go to your Project Settings on Vercel, navigate to **Environment Variables**, and add the following keys with the values from **Step 4**:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL="https://your-project-ref.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-public-key"
```

---

## Local Development Configuration
For testing locally, create a file named `.env` in the root of your project:
```env
SUPABASE_URL="https://your-project-ref.supabase.co"
SUPABASE_ANON_KEY="your-anon-public-key"
```
Our Node Express backend automatically picks these up to query Supabase directly!
