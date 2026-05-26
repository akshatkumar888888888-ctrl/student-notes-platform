/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Note {
  id: string;
  title: string;
  description?: string;
  class_id: string; // "11" or "12"
  stream_id: string; // "Science", "Commerce", "Arts"
  subject_id: string; // e.g. "Physics", "Math", "Chemistry", "Accountancy", "History"
  file_name: string;
  file_url: string;
  file_size?: number; // in bytes
  file_type?: string; // mime type
  uploaded_by?: string;
  created_at: string;
  rating?: number;
  rating_count?: number;
}

export interface ClassOption {
  id: string;
  name: string;
}

export interface StreamOption {
  id: string;
  name: string;
}

export interface SubjectOption {
  id: string;
  name: string;
  stream_id: string; // maps to the stream (or "All" if applicable to multiple streams)
  class_id?: string; // "11", "12" or "both"
}
