-- Student Notes Platform - Database Schema for Supabase PostgreSQL
-- Focus: Clean, simple, and standard SQL with foreign keys and cascade rules.

-- 1. Create the classes table (Class 11, Class 12)
CREATE TABLE IF NOT EXISTS classes (
    id VARCHAR(10) PRIMARY KEY, -- '11' or '12'
    name VARCHAR(50) NOT NULL
);

-- 2. Create the streams table (Science, Commerce, Arts)
CREATE TABLE IF NOT EXISTS streams (
    id VARCHAR(50) PRIMARY KEY, -- 'science', 'commerce', 'arts'
    name VARCHAR(50) NOT NULL
);

-- 3. Create the subjects table (Physics, Math, History, etc.)
CREATE TABLE IF NOT EXISTS subjects (
    id VARCHAR(50) PRIMARY KEY, -- e.g. 'physics', 'math', 'chemistry', 'accounting'
    name VARCHAR(100) NOT NULL,
    stream_id VARCHAR(50) REFERENCES streams(id) ON DELETE CASCADE,
    class_id VARCHAR(10) REFERENCES classes(id) ON DELETE CASCADE
);

-- 4. Create the notes table
CREATE TABLE IF NOT EXISTS notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(150) NOT NULL,
    description TEXT,
    class_id VARCHAR(10) REFERENCES classes(id) ON DELETE RESTRICT,
    stream_id VARCHAR(50) REFERENCES streams(id) ON DELETE RESTRICT,
    subject_id VARCHAR(50) REFERENCES subjects(id) ON DELETE RESTRICT,
    file_name VARCHAR(255) NOT NULL,
    file_url VARCHAR(512) NOT NULL, -- Publicly accessible link to the Supabase Storage Bucket file
    file_size BIGINT, -- in bytes
    uploaded_by VARCHAR(100) DEFAULT 'Anonymous Student',
    rating NUMERIC(3, 2) DEFAULT 0.0,
    rating_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Insert initial base data for quick seeding
INSERT INTO classes (id, name) VALUES 
('11', 'Class 11'),
('12', 'Class 12')
ON CONFLICT (id) DO NOTHING;

INSERT INTO streams (id, name) VALUES 
('science', 'Science'),
('commerce', 'Commerce'),
('arts', 'Arts')
ON CONFLICT (id) DO NOTHING;

INSERT INTO subjects (id, name, stream_id, class_id) VALUES 
-- Class 11 Science
('physics-11', 'Physics', 'science', '11'),
('chemistry-11', 'Chemistry', 'science', '11'),
('maths-11', 'Mathematics', 'science', '11'),
('biology-11', 'Biology', 'science', '11'),

-- Class 11 Commerce
('accountancy-11', 'Accountancy', 'commerce', '11'),
('business-studies-11', 'Business Studies', 'commerce', '11'),
('economics-11', 'Economics', 'commerce', '11'),

-- Class 11 Arts
('history-11', 'History', 'arts', '11'),
('geography-11', 'Geography', 'arts', '11'),
('political-science-11', 'Political Science', 'arts', '11'),

-- Class 12 Science
('physics-12', 'Physics', 'science', '12'),
('chemistry-12', 'Chemistry', 'science', '12'),
('maths-12', 'Mathematics', 'science', '12'),
('biology-12', 'Biology', 'science', '12'),

-- Class 12 Commerce
('accountancy-12', 'Accountancy', 'commerce', '12'),
('business-studies-12', 'Business Studies', 'commerce', '12'),
('economics-12', 'Economics', 'commerce', '12'),

-- Class 12 Arts
('history-12', 'History', 'arts', '12'),
('geography-12', 'Geography', 'arts', '12'),
('political-science-12', 'Political Science', 'arts', '12')
ON CONFLICT (id) DO NOTHING;

-- 6. Storage Bucket setup instructions (SQL alternative to UI)
-- To enable public read access to your bucket files, configure a public storage policy in the Supabase Dashboard
-- or execute the storage helper commands. Keep reading instructions.md for details!
