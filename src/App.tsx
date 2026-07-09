/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  Upload, 
  Download, 
  FileText, 
  Filter, 
  CheckCircle, 
  X, 
  Database, 
  Clock, 
  ChevronRight,
  Info,
  Search,
  Eye,
  ExternalLink,
  Star,
  Trash2,
  Share2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Note, ClassOption, StreamOption, SubjectOption } from "./types";

// Class static options
const classes: ClassOption[] = [
  { id: "11", name: "Class 11" },
  { id: "12", name: "Class 12" },
];

// Stream static options
const streams: StreamOption[] = [
  { id: "science", name: "Science Stream" },
  { id: "commerce", name: "Commerce Stream" },
  { id: "arts", name: "Humanities / Arts" },
];

// Subject mapping corresponding to combinations of Class and Stream
const subjects: SubjectOption[] = [
  // Class 11 - Science
  { id: "physics-11", name: "Physics", stream_id: "science", class_id: "11" },
  { id: "chemistry-11", name: "Chemistry", stream_id: "science", class_id: "11" },
  { id: "maths-11", name: "Mathematics", stream_id: "science", class_id: "11" },
  { id: "biology-11", name: "Biology", stream_id: "science", class_id: "11" },

  // Class 11 - Commerce
  { id: "accountancy-11", name: "Accountancy", stream_id: "commerce", class_id: "11" },
  { id: "business-studies-11", name: "Business Studies", stream_id: "commerce", class_id: "11" },
  { id: "economics-11", name: "Economics", stream_id: "commerce", class_id: "11" },

  // Class 11 - Arts
  { id: "history-11", name: "History", stream_id: "arts", class_id: "11" },
  { id: "geography-11", name: "Geography", stream_id: "arts", class_id: "11" },
  { id: "political-science-11", name: "Political Science", stream_id: "arts", class_id: "11" },

  // Class 12 - Science
  { id: "physics-12", name: "Physics", stream_id: "science", class_id: "12" },
  { id: "chemistry-12", name: "Chemistry", stream_id: "science", class_id: "12" },
  { id: "maths-12", name: "Mathematics", stream_id: "science", class_id: "12" },
  { id: "biology-12", name: "Biology", stream_id: "science", class_id: "12" },

  // Class 12 - Commerce
  { id: "accountancy-12", name: "Accountancy", stream_id: "commerce", class_id: "12" },
  { id: "business-studies-12", name: "Business Studies", stream_id: "commerce", class_id: "12" },
  { id: "economics-12", name: "Economics", stream_id: "commerce", class_id: "12" },

  // Class 12 - Arts
  { id: "history-12", name: "History", stream_id: "arts", class_id: "12" },
  { id: "geography-12", name: "Geography", stream_id: "arts", class_id: "12" },
  { id: "political-science-12", name: "Political Science", stream_id: "arts", class_id: "12" },
];

export default function App() {
  // PWA Install prompt
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState<boolean>(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
      setShowInstallBanner(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstallApp = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") {
      setInstallPrompt(null);
      setShowInstallBanner(false);
    }
  };

  // Filtering state
  const [selectedClass, setSelectedClass] = useState<string>("12");
  const [selectedStream, setSelectedStream] = useState<string>("science");
  const [selectedSubject, setSelectedSubject] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showMobileFilters, setShowMobileFilters] = useState<boolean>(false);
  const [previewNote, setPreviewNote] = useState<Note | null>(null);

  // Interactive Notes Rating State
  const [ratedNotesIds, setRatedNotesIds] = useState<string[]>([]);
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [submittingRatingId, setSubmittingRatingId] = useState<string | null>(null);

  // Submits user rating vote to the server
  const handleRateNote = async (noteId: string, ratingValue: number) => {
    if (submittingRatingId) return;
    setSubmittingRatingId(noteId);
    try {
      const res = await fetch(`/api/notes/${noteId}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: ratingValue }),
      });
      if (res.ok) {
        const result = await res.json();
        if (result.success && result.note) {
          const updated = result.note;
          // Synchronize locally list state and active preview node structure
          setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
          setPreviewNote(updated);
          setRatedNotesIds((prev) => [...prev, noteId]);
        }
      } else {
        console.error("HTTP Error submitting note rating to backend.");
      }
    } catch (err) {
      console.error("Error submitting rating:", err);
    } finally {
      setSubmittingRatingId(null);
    }
  };

  // Increment view count when a note is previewed
  const handleViewNote = async (note: Note) => {
    setPreviewNote(note);
    try {
      const res = await fetch(`/api/notes/${note.id}`, {
        method: "POST",
      });
      if (res.ok) {
        const result = await res.json();
        if (result.note) {
          setNotes((prev) => prev.map((n) => n.id === result.note.id ? result.note : n));
        }
      }
    } catch (err) {
      console.error("Error incrementing view count:", err);
    }
  };

  // Notes state
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Uploader tracking states for deleting notes
  const [myUploadedNotes, setMyUploadedNotes] = useState<string[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteNoteId, setConfirmDeleteNoteId] = useState<string | null>(null);

  // Admin panel state
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);
  const [showAdminLogin, setShowAdminLogin] = useState<boolean>(false);
  const [adminCodeInput, setAdminCodeInput] = useState<string>("");
  const [adminLoginError, setAdminLoginError] = useState<string>("");
  const [adminDeletingId, setAdminDeletingId] = useState<string | null>(null);
  const [adminConfirmId, setAdminConfirmId] = useState<string | null>(null);
  // The real secret never lives in client code anymore — it's checked
  // server-side via /api/admin-login. We only remember the code the user
  // typed in this session so we can re-send it with delete requests.
  const [adminSessionCode, setAdminSessionCode] = useState<string>("");
  const [isAdminLoggingIn, setIsAdminLoggingIn] = useState<boolean>(false);

  const handleAdminLogin = async () => {
    setIsAdminLoggingIn(true);
    setAdminLoginError("");
    try {
      const res = await fetch("/api/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: adminCodeInput }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsAdminMode(true);
        setShowAdminLogin(false);
        setAdminSessionCode(adminCodeInput);
        setAdminCodeInput("");
        setAdminLoginError("");
      } else {
        setAdminLoginError(data.error || "Wrong secret code! Try again.");
      }
    } catch (err) {
      setAdminLoginError("Could not reach the server. Try again.");
    } finally {
      setIsAdminLoggingIn(false);
    }
  };

  const handleAdminDelete = async (noteId: string) => {
    setAdminDeletingId(noteId);
    try {
      const res = await fetch(`/api/notes/${noteId}`, {
        method: "DELETE",
        headers: { "x-admin-secret": adminSessionCode },
      });
      if (res.ok) {
        setNotes((prev) => prev.filter((n) => n.id !== noteId));
        if (previewNote?.id === noteId) setPreviewNote(null);
        setAdminConfirmId(null);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete note");
      }
    } catch (err) {
      alert("Something went wrong while deleting.");
    } finally {
      setAdminDeletingId(null);
    }
  };

  // Supabase Backend configurations info
  const [backendConfig, setBackendConfig] = useState<{
    supabaseConfigured: boolean;
    supabaseUrl: string | null;
    mode: string;
  }>({
    supabaseConfigured: false,
    supabaseUrl: null,
    mode: "Loading Backend Mode...",
  });

  // Upload modal state
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState<string | null>(null);
  
  // Upload form state
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadClass, setUploadClass] = useState("12");
  const [uploadStream, setUploadStream] = useState("science");
  const [uploadSubject, setUploadSubject] = useState("");
  const [uploadedBy, setUploadedBy] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter subject options list dynamically based on active class/stream selected
  const availableSubjectsForSearch = subjects.filter(
    (sub) => sub.class_id === selectedClass && sub.stream_id === selectedStream
  );

  const availableSubjectsForUpload = subjects.filter(
    (sub) => sub.class_id === uploadClass && sub.stream_id === uploadStream
  );

  // Filter notes locally by keyboard query search matching the note title
  const filteredNotes = notes.filter((note) =>
    note.title.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  // Initialize selected subject if the search filters change
  useEffect(() => {
    setSelectedSubject("All");
    setSearchQuery("");
  }, [selectedClass, selectedStream]);

  // Reset search query when subject changes
  useEffect(() => {
    setSearchQuery("");
  }, [selectedSubject]);

  // Handle defaulting the upload form subject selection
  useEffect(() => {
    if (availableSubjectsForUpload.length > 0) {
      setUploadSubject(availableSubjectsForUpload[0].id);
    } else {
      setUploadSubject("");
    }
  }, [uploadClass, uploadStream]);

  // Fetch connection status and initial list of notes
  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/config");
      if (res.ok) {
        const data = await res.json();
        setBackendConfig(data);
      }
    } catch (e) {
      console.error("Failed to read server configuration", e);
    }
  };

  const fetchNotes = async () => {
    setIsLoading(true);
    setErrorText(null);
    try {
      let url = `/api/notes?class_id=${selectedClass}&stream_id=${selectedStream}`;
      if (selectedSubject !== "All") {
        url += `&subject_id=${selectedSubject}`;
      }
      
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Server returned HTTP Error ${res.status}`);
      }
      const data = await res.json();
      setNotes(data);
    } catch (e: any) {
      setErrorText(e.message || "Failed to retrieve student notes.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
    try {
      const stored = JSON.parse(localStorage.getItem("my_uploaded_notes") || "[]");
      setMyUploadedNotes(stored);
    } catch (err) {
      console.error("Local storage read error:", err);
    }
  }, []);

  const handleDeleteNote = async (noteId: string) => {
    setDeletingId(noteId);
    try {
      const res = await fetch(`/api/notes/${noteId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        // Remove locally from state list
        setNotes((prev) => prev.filter((n) => n.id !== noteId));
        // Remove from local state and localStorage array
        const updated = myUploadedNotes.filter((id) => id !== noteId);
        setMyUploadedNotes(updated);
        localStorage.setItem("my_uploaded_notes", JSON.stringify(updated));
        
        // If the note being removed is open as preview, reset
        if (previewNote?.id === noteId) {
          setPreviewNote(null);
        }
        setConfirmDeleteNoteId(null);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to remove notes");
      }
    } catch (err) {
      console.error("Delete note error:", err);
      alert("Something went wrong while deleting this note. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [selectedClass, selectedStream, selectedSubject]);

  // Handles drag and drop uploads
  const [isDragActive, setIsDragActive] = useState(false);
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  // Process Form Upload Submission
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!uploadTitle.trim()) {
      alert("Please provide an elegant title for the notes.");
      return;
    }
    if (!selectedFile) {
      alert("Please attach a document or PDF file.");
      return;
    }
    if (!uploadSubject) {
      alert("Please select a subject.");
      return;
    }

    setIsUploading(true);
    setUploadSuccessMsg(null);

    const formData = new FormData();
    formData.append("title", uploadTitle);
    formData.append("description", uploadDescription);
    formData.append("class_id", uploadClass);
    formData.append("stream_id", uploadStream);
    formData.append("subject_id", uploadSubject);
    formData.append("uploaded_by", uploadedBy || "Class 12 Student");
    formData.append("file", selectedFile);

    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "File upload transaction failed.");
      }

      // Record this upload in localStorage to permit deletion later
      if (data.note && data.note.id) {
        try {
          const list = JSON.parse(localStorage.getItem("my_uploaded_notes") || "[]");
          const updatedList = [...list, data.note.id];
          localStorage.setItem("my_uploaded_notes", JSON.stringify(updatedList));
          setMyUploadedNotes(updatedList);
        } catch (storageErr) {
          console.error("Failed to save draft upload trace in localStorage", storageErr);
        }
      }

      setUploadSuccessMsg(data.message || "Note uploaded successfully! Thank you for helping fellow students.");
      
      // Reset form variables
      setUploadTitle("");
      setUploadDescription("");
      setUploadedBy("");
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // Refresh the notes filter matches
      fetchNotes();

      // Autoclose success notification after 4 seconds
      setTimeout(() => {
        setUploadSuccessMsg(null);
        setIsUploadOpen(false);
      }, 3500);

    } catch (err: any) {
      alert(err.message || "An error occurred during submission.");
    } finally {
      setIsUploading(false);
    }
  };

  // Convert size bytes to readable text
  const formatBytes = (bytes?: number) => {
    if (!bytes) return "Unknown Size";
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="min-h-screen bg-[#FEF9C3] text-black font-sans flex flex-col antialiased comic-halftone-purple relative">
      
      {/* HEADER BANNER */}
      <nav className="sticky top-0 z-40 bg-[#FACC15] border-b-4 border-black px-4 py-3.5 sm:px-8 shrink-0 shadow-[0_4px_0_0_#000]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Logo Brand matching NoteFlow style */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-purple-600 border-3 border-black flex items-center justify-center text-white font-display text-2xl shadow-[3px_3px_0_0_#000] rotate-[-3deg] hover:rotate-[3deg] transition-transform">
              <span>N</span>
            </div>
            <div>
              <h1 className="text-xl font-display uppercase tracking-wider text-black flex items-center gap-2">
                NoteFlow <span className="bg-orange-500 text-white px-2 py-0.5 rounded-md border-2 border-black rotate-[2deg] inline-block text-xs font-action tracking-wide shadow-[2px_2px_0_0_#000]">Edu</span>
                <span className="hidden sm:inline-block text-[10px] font-action tracking-widest bg-white text-black font-bold px-2.5 py-1 rounded-full border-2 border-black shadow-[2px_2px_0_0_#000]">
                  Class 11 &amp; Class 12
                </span>
              </h1>
              <p className="text-xs text-black font-semibold uppercase tracking-tight">Board Exam &amp; Syllabus Prep Guides</p>
            </div>
          </div>

          {/* Connected indicators & Profiles */}
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-center sm:justify-end">
            {/* Install App Button */}
            {showInstallBanner && (
              <button
                onClick={handleInstallApp}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-black uppercase px-3 py-2 rounded-xl border-2 border-black shadow-[2px_2px_0_0_#000] cursor-pointer transition-all"
              >
                <Share2 className="w-3.5 h-3.5" />
                Install App
              </button>
            )}
            {/* Hidden Admin Button */}
            <button
              onClick={() => isAdminMode ? setIsAdminMode(false) : setShowAdminLogin(true)}
              className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-lg border-2 border-black shadow-[2px_2px_0_0_#000] transition-all cursor-pointer ${isAdminMode ? "bg-red-500 text-white animate-pulse" : "bg-black text-yellow-400"}`}
              title="Admin Panel"
            >
              {isAdminMode ? "🔓 Admin ON" : "🔒"}
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-8 flex flex-col">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* SIDE FILTER MATRIX CONTROL (4 columns on Large Screens) */}
            <div className="lg:col-span-4 bg-white border-3 border-black rounded-3xl shadow-[6px_6px_0px_0px_#000] overflow-hidden lg:sticky lg:top-24 shrink-0 transition-all">
              <div 
                onClick={() => setShowMobileFilters(!showMobileFilters)}
                className="p-5 border-b-3 border-black bg-purple-100 flex items-center justify-between cursor-pointer lg:cursor-default select-none group"
              >
                <div>
                  <h3 className="font-display text-sm tracking-wider uppercase text-black flex items-center gap-2">
                    <Filter className="w-4 h-4 text-purple-600" />
                    Syllabus Navigation
                  </h3>
                  <p className="text-[11px] text-purple-950 font-bold mt-1 lg:block hidden">Select class stream to navigate specific prep chapters</p>
                  <p className="text-[11px] text-purple-950 font-bold mt-1 lg:hidden block">Tap here to filter by Class &amp; Stream</p>
                </div>
                <div className="flex items-center gap-2 lg:hidden">
                  <span className="text-[10px] font-black bg-purple-600 border-2 border-black text-white px-2 py-0.5 rounded capitalize shadow-[1.5px_1.5px_0_0_#000]">
                    Cl. {selectedClass} • {selectedStream}
                  </span>
                  <ChevronRight className={`w-4 h-4 text-black transition-transform duration-200 ${showMobileFilters ? "rotate-90 text-purple-600" : ""}`} />
                </div>
              </div>

              <div className={`${showMobileFilters ? "block" : "hidden lg:block"} p-5 space-y-6`}>
                
                {/* 1. Class selector */}
                <div>
                  <label className="block text-xs font-black text-black uppercase tracking-widest mb-2.5">
                    Select Class
                  </label>
                  <div className="grid grid-cols-2 gap-2.5" id="class-select-group">
                    {classes.map((cls) => {
                      const isActive = selectedClass === cls.id;
                      return (
                        <button
                          key={cls.id}
                          id={`btn-class-${cls.id}`}
                          onClick={() => setSelectedClass(cls.id)}
                          className={`py-2 px-3 rounded-xl text-xs font-black border-2 border-black text-center transition-all cursor-pointer ${
                            isActive
                              ? "bg-purple-600 text-white shadow-[2px_2px_0px_0px_#000]"
                              : "bg-yellow-100 hover:bg-yellow-200 text-black shadow-[2px_2px_0px_0px_#000] active:translate-y-0.5"
                          }`}
                        >
                          {cls.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Stream Selector */}
                <div>
                  <label className="block text-xs font-black text-black uppercase tracking-widest mb-2.5">
                    Syllabus Stream
                  </label>
                  <div className="space-y-2" id="stream-select-group">
                    {streams.map((st) => {
                      const isActive = selectedStream === st.id;
                      return (
                        <button
                          key={st.id}
                          id={`btn-stream-${st.id}`}
                          onClick={() => setSelectedStream(st.id)}
                          className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold border-2 border-black flex items-center justify-between transition-all cursor-pointer ${
                            isActive
                              ? "bg-purple-200 text-black shadow-[2px_2px_0px_0px_#000]"
                              : "bg-white text-black hover:bg-slate-50 shadow-[2px_2px_0px_0px_#000] active:translate-y-0.5"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className={`w-3.5 h-3.5 rounded-full border-2 border-black flex items-center justify-center shrink-0 ${
                              isActive ? "bg-purple-600" : "bg-white"
                            }`}>
                              {isActive && <span className="w-1.5 h-1.5 bg-white rounded-full"></span>}
                            </span>
                            <span className="uppercase tracking-wide text-[11px]">{st.name}</span>
                          </div>
                          {isActive && (
                            <span className="text-[9px] font-black uppercase bg-purple-600 text-white px-2 py-0.5 rounded border border-black shadow-[1px_1px_0_0_#000]">
                              Active
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Subject Lineup Selector */}
                <div>
                  <label className="block text-xs font-black text-black uppercase tracking-widest mb-2">
                    Subject Lineup
                  </label>
                  <select
                    id="subject-dropdown"
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="w-full bg-white border-2 border-black text-black rounded-xl py-2.5 px-3 text-xs focus:outline-hidden focus:ring-2 focus:ring-purple-500 font-bold transition-all"
                  >
                    <option value="All">📓 All Academic Subjects</option>
                    {availableSubjectsForSearch.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-2 border-t-2 border-black border-dashed">
                  <button
                    id="btn-trigger-upload-modal"
                    onClick={() => {
                      setUploadSuccessMsg(null);
                      setIsUploadOpen(true);
                    }}
                    className="w-full comic-btn-yellow text-xs font-black py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
                  >
                    <Upload className="w-4 h-4" />
                    Share Study Notes
                  </button>
                </div>

                {/* Elegant Free Storage Tier Widget */}
                <div className="bg-purple-100 rounded-2xl p-4 border-2 border-black mt-4 font-sans shadow-[3px_3px_0px_#000]">
                  <p className="text-[10px] font-black text-black uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Database className="w-3.5 h-3.5 text-purple-600" />
                    Cloud Storage Allocation
                  </p>
                  <div className="h-4 bg-white border-2 border-black rounded-full overflow-hidden mb-1.5 p-0.5">
                    <div className="h-full bg-orange-500 rounded-full border-r-2 border-black" style={{ width: "24%" }}></div>
                  </div>
                  <p className="text-[9px] text-purple-950 font-black tracking-tight uppercase">
                    0.48 GB / 2.0 GB Used (Free Tier Bucket Limit)
                  </p>
                </div>

              </div>
            </div>

            {/* MAIN NOTES DISPLAY GRID (8 columns on Large Screens) */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Unified Active Filtering and Keyword Search Panel */}
              <div className="bg-white border-3 border-black rounded-3xl p-5 shadow-[5px_5px_0_0_#000] flex flex-col gap-4 font-sans">
                {/* Top Row: Selection breadcrumbs and search status */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-black uppercase text-black">Viewing:</span>
                    <span className="px-3 py-1 rounded bg-purple-600 border-2 border-black text-white text-xs font-black uppercase shadow-[1.5px_1.5px_0_0_#000]">
                      Class {selectedClass}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-black" />
                    <span className="px-3 py-1 rounded bg-orange-500 border-2 border-black text-white text-xs font-black uppercase shadow-[1.5px_1.5px_0_0_#000] capitalize">
                      {selectedStream}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-black" />
                    <span className="px-3 py-1 rounded bg-amber-400 border-2 border-black text-black text-xs font-black uppercase shadow-[1.5px_1.5px_0_0_#000]">
                      {selectedSubject === "All" ? "All Subjects" : subjects.find(s=>s.id === selectedSubject)?.name}
                    </span>
                  </div>

                  <div className="text-xs text-black font-black uppercase tracking-wider bg-yellow-100 border-2 border-black px-2.5 py-1 rounded-lg shrink-0 shadow-[1.5px_1.5px_0_0_#000]">
                    {searchQuery ? (
                      <span>Filtered: <strong className="text-purple-600">{filteredNotes.length}</strong> of {notes.length}</span>
                    ) : (
                      <span>Found: <strong className="text-purple-600">{notes.length} notes</strong></span>
                    )}
                  </div>
                </div>

                {/* Bottom Row / Integrated Search Input (Anchored naturally) */}
                <div className="pt-3.5 border-t-2 border-dashed border-black">
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                      <Search className="w-4 h-4 text-black" />
                    </span>
                    <input
                      type="text"
                      id="search-bar-notes"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search notes instantly by keyword (e.g. Electrostatics, National Income, Chapter 1)..."
                      className="w-full bg-slate-50 hover:bg-white border-2 border-black text-black placeholder-slate-500 rounded-xl py-3.5 pl-10 pr-10 text-xs font-bold focus:outline-hidden focus:ring-4 focus:ring-purple-300 transition-all shadow-[2px_2px_0_0_#2b2b2b]"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-black hover:text-purple-600 cursor-pointer"
                        title="Clear Search"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Advanced Horizontal Scrolling Subject Filter Chips (From layout request) */}
              <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none scroll-smooth">
                <button
                  onClick={() => setSelectedSubject("All")}
                  className={`px-4 py-2 border-2 border-black rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer ${
                    selectedSubject === "All"
                      ? "bg-purple-600 text-white shadow-[2.5px_2.5px_0_0_#000] translate-y-[-1px]"
                      : "bg-white text-black hover:bg-purple-50 shadow-[2px_2px_0_0_#000] active:translate-y-0.5"
                  }`}
                >
                  ⚡ All Subjects
                </button>
                {availableSubjectsForSearch.map((sub) => {
                  const isSelected = selectedSubject === sub.id;
                  return (
                    <button
                      key={sub.id}
                      onClick={() => setSelectedSubject(sub.id)}
                      className={`px-4 py-2 border-2 border-black rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer ${
                        isSelected
                          ? "bg-purple-600 text-white shadow-[2.5px_2.5px_0_0_#000] translate-y-[-1px]"
                          : "bg-white text-black hover:bg-purple-50 shadow-[2px_2px_0_0_#000] active:translate-y-0.5"
                      }`}
                    >
                      📓 {sub.name}
                    </button>
                  );
                })}
              </div>

              {/* Loader */}
              {isLoading ? (
                <div className="bg-white border-3 border-black rounded-3xl p-16 flex flex-col items-center justify-center gap-4 text-center shadow-[6px_6px_0_0_#000]">
                  <div className="w-12 h-12 border-4 border-black border-t-purple-600 rounded-full animate-spin"></div>
                  <p className="text-sm text-black font-extrabold uppercase tracking-wide">Fetching board syllabus notes files...</p>
                </div>
              ) : errorText ? (
                <div className="bg-red-50 border border-red-200 text-red-900 rounded-2xl p-6 text-center space-y-2">
                  <p className="text-sm font-bold">An error occurred while connecting to backend:</p>
                  <p className="text-xs font-mono bg-red-100/50 p-2 rounded max-w-lg mx-auto">{errorText}</p>
                  <button 
                    onClick={fetchNotes} 
                    className="mt-2 bg-white text-red-800 border border-red-200 text-xs font-bold px-4 py-2 rounded-lg hover:bg-neutral-50 shadow-xs"
                  >
                    Retry Query
                  </button>
                </div>
              ) : notes.length === 0 ? (
                
                /* EMPTY STATE */
                <div className="bg-white border border-slate-200 border-dashed rounded-2xl p-12 sm:p-20 text-center flex flex-col items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center mb-4">
                    <FileText className="w-8 h-8 text-slate-400" />
                  </div>
                  <h4 className="text-base font-bold text-slate-800">No Notes Uploaded Yet</h4>
                  <p className="text-sm text-slate-500 max-w-sm mt-2">
                    Be the first to upload outstanding exam guides or handwritten notes for{" "}
                    <strong>Class {selectedClass} {selectedStream}</strong>! Help make study simpler for everybody.
                  </p>
                  <button
                    onClick={() => setIsUploadOpen(true)}
                    className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 px-5 rounded-xl shadow-xs flex items-center gap-2"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Share Notes Here
                  </button>
                </div>

              ) : filteredNotes.length === 0 ? (

                /* NO SEARCH MATCHES STATE */
                <div className="bg-white border border-slate-200 border-dashed rounded-2xl p-12 sm:p-20 text-center flex flex-col items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center mb-4 text-slate-400">
                    <Search className="w-7 h-7" />
                  </div>
                  <h4 className="text-base font-bold text-slate-800">No Search Matches Found</h4>
                  <p className="text-sm text-slate-500 max-w-sm mt-2">
                    We couldn't find any notes matching <span className="font-bold text-indigo-600">&quot;{searchQuery}&quot;</span>. Try checking for typos or clear the search query.
                  </p>
                  <button
                    onClick={() => setSearchQuery("")}
                    className="mt-6 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 hover:border-slate-300 text-xs font-bold py-2.5 px-5 rounded-xl flex items-center gap-2 transition-all cursor-pointer"
                  >
                    Clear Search Query
                  </button>
                </div>

              ) : (

                /* NOTES DISPLAY CONTAINER */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredNotes.map((note) => {
                    const subjectObj = subjects.find(s => s.id === note.subject_id);
                    const streamObj = streams.find(s => s.id === note.stream_id);
                    const ext = note.file_name.split(".").pop()?.toLowerCase() || "pdf";
                    let fileTypeLabel = ext.toUpperCase();
                    let cardIconBg = "bg-red-50 text-red-650 group-hover:bg-red-100";
                    let circleAvatarBg = "bg-amber-50 text-amber-850 border-amber-100";

                    if (ext === "pdf") {
                      cardIconBg = "bg-red-50 text-red-650 group-hover:bg-red-100";
                      circleAvatarBg = "bg-amber-50 text-amber-850 border-amber-100";
                    } else if (["doc", "docx", "zip"].includes(ext)) {
                      cardIconBg = "bg-blue-50 text-blue-650 group-hover:bg-blue-100";
                      circleAvatarBg = "bg-indigo-50 text-indigo-850 border-indigo-100";
                    } else {
                      cardIconBg = "bg-emerald-50 text-emerald-650 group-hover:bg-emerald-100";
                      circleAvatarBg = "bg-sky-50 text-sky-855 text-sky-810 border-sky-100";
                    }

                    // Obtain proper formatted initials
                    const authorName = note.uploaded_by || "Anonymous Student";
                    const cleanAuthor = authorName.replace(/[^a-zA-Z\s]/g, "").trim().split(" ");
                    const initials = cleanAuthor.length >= 2
                      ? (cleanAuthor[0][0] + cleanAuthor[1][0]).toUpperCase().slice(0, 2)
                      : authorName.slice(0, 2).toUpperCase();

                    return (
                      <motion.div
                        layout
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        key={note.id}
                        className="bg-white border-3 border-black rounded-2xl p-5 shadow-[4px_4px_0_0_#000] hover:shadow-[6px_6px_0_0_#7C3AED] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all flex flex-col justify-between group"
                      >
                        <div className="space-y-3">
                          {/* File wrapper layout */}
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[9px] font-black uppercase tracking-wider bg-purple-200 border border-black text-purple-950 px-2 py-0.5 rounded font-mono shadow-[1px_1px_0_0_#000]">
                              {fileTypeLabel}
                            </span>
                            
                            {/* Star Rating & Clock info */}
                            <div className="flex items-center gap-2.5">
                              {note.rating !== undefined && (
                                <div 
                                  onClick={() => handleViewNote(note)}
                                  className="flex items-center gap-1 bg-amber-200 hover:bg-amber-300 text-black px-2 py-0.5 rounded-full text-[10px] font-black border-2 border-black cursor-pointer shadow-[1.5px_1.5px_0_0_#000] transition-all"
                                  title={`Average rating: ${Number(note.rating).toFixed(1)} stars. Click to read and submit rating.`}
                                >
                                  <Star className="w-3 h-3 fill-amber-500 text-black shrink-0" />
                                  <span>{note.rating > 0 ? Number(note.rating).toFixed(1) : "0.0"}</span>
                                  {note.rating_count !== undefined && (
                                    <span className="text-[8px] font-bold">({note.rating_count})</span>
                                  )}
                                </div>
                              )}

                              {/* View count badge */}
                              <div className="flex items-center gap-1 bg-blue-200 text-black px-2 py-0.5 rounded-full text-[10px] font-black border-2 border-black shadow-[1.5px_1.5px_0_0_#000]">
                                <Eye className="w-3 h-3 shrink-0" />
                                <span>{(note as any).views || 0}</span>
                              </div>
                              
                              <span className="text-[10px] text-black font-black uppercase font-mono flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(note.created_at).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                            </div>
                          </div>

                          {/* Notes name */}
                          <div>
                            <h4 className="font-black text-black text-sm leading-snug line-clamp-1 uppercase tracking-wide group-hover:text-purple-650 transition-colors">
                              {note.title}
                            </h4>
                            
                            {/* Academic Context Badges / Chips */}
                            <div className="flex flex-wrap items-center gap-1.5 mt-2 mb-1.5">
                              {streamObj && (
                                <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-black shadow-[1px_1px_0_0_#000] ${
                                  note.stream_id === 'science' 
                                    ? 'bg-cyan-200 text-black' 
                                    : note.stream_id === 'commerce' 
                                    ? 'bg-emerald-200 text-black' 
                                    : 'bg-rose-200 text-black'
                                }`}>
                                  {streamObj.name.replace(" Stream", "")}
                                </span>
                              )}
                              {subjectObj && (
                                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-black bg-amber-200 text-black shadow-[1px_1px_0_0_#000]">
                                  {subjectObj.name}
                                </span>
                              )}
                              <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-black bg-purple-200 text-black shadow-[1px_1px_0_0_#000]">
                                Class {note.class_id}
                              </span>
                            </div>

                            <p className="text-xs text-black/85 line-clamp-2 mt-1 leading-relaxed font-semibold">
                              {note.description || "No supplemental descriptions attached. Available for download immediately."}
                            </p>
                          </div>
                        </div>

                        {/* File detail footer segment */}
                        <div className="mt-4 pt-4 border-t-2 border-black border-dashed flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            <div className={`w-8 h-8 rounded-lg border-2 border-black flex items-center justify-center shrink-0 transition-all ${cardIconBg} shadow-[1.5px_1.5px_0_0_#000]`}>
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="overflow-hidden">
                              <p className="text-[11px] font-black text-black truncate" title={note.file_name}>
                                {note.file_name}
                              </p>
                              <p className="text-[10px] text-zinc-700 font-bold uppercase tracking-wide">
                                {formatBytes(note.file_size)} • {subjectObj ? subjectObj.name : "Note"}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Bottom uploader initials row */}
                        <div className="mt-3 pt-3 border-t-2 border-black border-dashed flex items-center justify-between gap-2 z-10">
                          <div className="flex items-center gap-2 text-black text-[10px] font-bold overflow-hidden uppercase">
                            <div className={`w-6 h-6 rounded-full text-[9px] flex items-center justify-center font-black border-2 border-black ${circleAvatarBg} shadow-[1px_1px_0_0_#000] shrink-0`}>
                              {initials}
                            </div>
                            <span className="truncate">By {authorName.split("(")[0]}</span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Admin Delete Button - visible only in admin mode */}
                            {isAdminMode && (
                              <div className="flex items-center gap-1 z-20">
                                {adminConfirmId === note.id ? (
                                  <>
                                    <button
                                      onClick={() => handleAdminDelete(note.id)}
                                      disabled={adminDeletingId === note.id}
                                      className="bg-red-600 hover:bg-red-700 text-white border-2 border-black px-2 py-1 rounded-lg text-[9px] font-black uppercase transition-all shadow-[1.5px_1.5px_0_0_#000] cursor-pointer disabled:opacity-50"
                                    >
                                      {adminDeletingId === note.id ? "..." : "DELETE"}
                                    </button>
                                    <button
                                      onClick={() => setAdminConfirmId(null)}
                                      className="bg-white text-black border-2 border-black w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black shadow-[1.5px_1.5px_0_0_#000] cursor-pointer"
                                    >X</button>
                                  </>
                                ) : (
                                  <button
                                    onClick={() => setAdminConfirmId(note.id)}
                                    className="bg-red-600 hover:bg-red-500 text-white border-2 border-black w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all shadow-[2px_2px_0_0_#000] cursor-pointer"
                                    title="Admin Delete"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            )}
                            {/* Delete Note Option: Visible only to the original uploader */}
                            {myUploadedNotes.includes(note.id) && (
                              <div className="flex items-center gap-1 z-20">
                                {confirmDeleteNoteId === note.id ? (
                                  <>
                                    <button
                                      onClick={() => handleDeleteNote(note.id)}
                                      disabled={deletingId === note.id}
                                      className="bg-red-500 hover:bg-red-600 text-white border-2 border-black px-2 py-1 rounded-lg text-[9px] font-black uppercase transition-all shadow-[1.5px_1.5px_0_0_#000] active:translate-y-0.5 cursor-pointer disabled:opacity-50"
                                      title="Confirm Deletion"
                                    >
                                      {deletingId === note.id ? "..." : "CONFIRM"}
                                    </button>
                                    <button
                                      onClick={() => setConfirmDeleteNoteId(null)}
                                      className="bg-white hover:bg-zinc-100 text-black border-2 border-black w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black transition-all shadow-[1.5px_1.5px_0_0_#000] active:translate-y-0.5 cursor-pointer"
                                      title="Cancel Deletion"
                                    >
                                      X
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    onClick={() => setConfirmDeleteNoteId(note.id)}
                                    className="bg-red-500 hover:bg-red-400 text-white border-2 border-black w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all shadow-[2px_2px_0_0_#000] active:translate-y-0.5 cursor-pointer"
                                    title="Delete Your Note File"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            )}

                            {/* Preview Button */}
                            <button
                              onClick={() => handleViewNote(note)}
                              className="bg-yellow-400 hover:bg-yellow-300 text-black border-2 border-black w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all shadow-[2px_2px_0_0_#000] active:translate-y-0.5 cursor-pointer"
                              title="Preview Document"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Action Button: Handles files */}
                            <a
                              href={note.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-purple-600 hover:bg-purple-500 text-white border-2 border-black w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all shadow-[2px_2px_0_0_#000] active:translate-y-0.5 cursor-pointer"
                              title="Download document file"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </main>

      {/* UPLOAD NOTES DIALOG COMPONENT */}
      <AnimatePresence>
        {isUploadOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
            
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isUploading) setIsUploadOpen(false);
              }}
              className="fixed inset-0 bg-black"
            ></motion.div>

            {/* Modal Dialog Content Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-[8px_8px_0px_0px_#000] relative z-10 border-4 border-black max-h-[90vh] flex flex-col"
            >
              
              {/* Modal title */}
              <div className="bg-[#FACC15] border-b-4 border-black text-black p-5 flex justify-between items-center shrink-0">
                <div>
                  <h3 className="font-action text-sm uppercase tracking-widest text-black/80">NoteFlow Edu</h3>
                  <h2 className="text-xl font-display uppercase tracking-wider mt-0.5 text-black">Share Notes File</h2>
                </div>
                <button
                  onClick={() => setIsUploadOpen(false)}
                  disabled={isUploading}
                  className="rounded-xl w-8 h-8 bg-black hover:bg-zinc-800 text-white flex items-center justify-center transition-all font-semibold cursor-pointer shadow-[2px_2px_0_0_#fff]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Success Notification Inline */}
              <div className="p-6 overflow-y-auto flex-1 font-sans">
                {uploadSuccessMsg ? (
                  <div className="text-center py-6 space-y-4">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-xs">
                      <CheckCircle className="w-8 h-8 animate-bounce" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-base font-bold text-slate-950">Awesome Work!</h4>
                      <p className="text-xs text-slate-550 px-4">{uploadSuccessMsg}</p>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleUploadSubmit} className="space-y-4">
                    
                    {/* Title */}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5" htmlFor="uploadTitle">
                        Document Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="uploadTitle"
                        required
                        value={uploadTitle}
                        onChange={(e) => setUploadTitle(e.target.value)}
                        placeholder="e.g. Chapter 4 - Electrostatic Potential Handwritten Notes"
                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg py-2 px-3 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                      />
                    </div>

                    {/* Desc */}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5" htmlFor="uploadDescription">
                        Short Description
                      </label>
                      <textarea
                        id="uploadDescription"
                        value={uploadDescription}
                        onChange={(e) => setUploadDescription(e.target.value)}
                        placeholder="Highlight important subtopics, topics skipped, or textbook matches (NCERT, CBSE etc.)"
                        rows={2}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg py-1.5 px-3 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                      />
                    </div>

                    {/* Class & Stream Selections */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-black text-black uppercase tracking-wider mb-1.5" htmlFor="uploadClass">
                          Class <span className="text-red-500">*</span>
                        </label>
                        <select
                          id="uploadClass"
                          value={uploadClass}
                          onChange={(e) => setUploadClass(e.target.value)}
                          className="w-full bg-white border-2 border-black text-black rounded-lg py-1.5 px-2 text-xs font-bold focus:ring-4 focus:ring-purple-300 focus:outline-hidden"
                        >
                          <option value="11">Class 11</option>
                          <option value="12">Class 12</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-black text-black uppercase tracking-wider mb-1.5" htmlFor="uploadStream">
                          Stream <span className="text-red-500">*</span>
                        </label>
                        <select
                          id="uploadStream"
                          value={uploadStream}
                          onChange={(e) => setUploadStream(e.target.value)}
                          className="w-full bg-white border-2 border-black text-black rounded-lg py-1.5 px-2 text-xs font-bold focus:ring-4 focus:ring-purple-300 focus:outline-hidden"
                        >
                          <option value="science">Science</option>
                          <option value="commerce">Commerce</option>
                          <option value="arts">Arts</option>
                        </select>
                      </div>
                    </div>

                    {/* Subject Selector */}
                    <div>
                      <label className="block text-xs font-black text-black uppercase tracking-wider mb-1.5" htmlFor="uploadSubject">
                        Subject <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="uploadSubject"
                        value={uploadSubject}
                        onChange={(e) => setUploadSubject(e.target.value)}
                        className="w-full bg-white border-2 border-black text-black rounded-lg py-2 px-3 text-xs font-bold focus:ring-4 focus:ring-purple-300 focus:outline-hidden"
                      >
                        {availableSubjectsForUpload.map((sub) => (
                          <option key={sub.id} value={sub.id}>
                            {sub.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Author uploaded by */}
                    <div>
                      <label className="block text-xs font-black text-black uppercase tracking-wider mb-1.5" htmlFor="uploadedBy">
                        Uploaded By Name (Optional)
                      </label>
                      <input
                        type="text"
                        id="uploadedBy"
                        value={uploadedBy}
                        onChange={(e) => setUploadedBy(e.target.value)}
                        placeholder="e.g. Priyanjali Sen (XII-B)"
                        className="w-full bg-white border-2 border-black text-black rounded-lg py-2 px-3 text-xs font-bold focus:ring-4 focus:ring-purple-300 focus:outline-hidden"
                      />
                    </div>

                    {/* File Drop Drag Area */}
                    <div>
                      <label className="block text-xs font-black text-black uppercase tracking-wider mb-1.5" htmlFor="fileInput">
                        Choose File (PDF, DOCX, PNG, JPG) <span className="text-red-500">*</span>
                      </label>
                      
                      <div
                        onDragEnter={handleDrag}
                        onDragOver={handleDrag}
                        onDragLeave={handleDrag}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-3 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                          isDragActive
                            ? "border-purple-600 bg-purple-100 text-black"
                            : selectedFile
                            ? "border-emerald-500 bg-emerald-50"
                            : "border-black bg-yellow-50 hover:bg-yellow-105"
                        }`}
                      >
                        <input
                          id="fileInput"
                          type="file"
                          ref={fileInputRef}
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setSelectedFile(e.target.files[0]);
                            }
                          }}
                          className="hidden"
                          accept=".pdf,.docx,.doc,.jpg,.jpeg,.png"
                        />
                        
                        {selectedFile ? (
                          <div className="space-y-1">
                            <CheckCircle className="w-8 h-8 text-black fill-emerald-400 mx-auto" />
                            <p className="text-xs font-black text-black truncate px-4">
                              {selectedFile.name}
                            </p>
                            <p className="text-[10px] text-zinc-700 font-bold">
                              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Clear file selection
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <Upload className="w-8 h-8 text-black mx-auto" />
                            <p className="text-xs font-black text-black">
                              Drag and drop your file here, or <span className="text-purple-600 underline">browse</span>
                            </p>
                            <p className="text-[10px] text-zinc-750 font-bold uppercase">PDF, Documents, or diagrams up to 10MB</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-2 flex gap-3">
                      <button
                        type="button"
                        onClick={() => setIsUploadOpen(false)}
                        disabled={isUploading}
                        className="w-1/2 border-2 border-black text-black font-black py-2.5 px-4 rounded-xl text-xs bg-white hover:bg-zinc-100 transition-all shadow-[2px_2px_0_0_#000] active:translate-y-0.5 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isUploading}
                        id="btn-upload-submit"
                        className="w-1/2 bg-purple-600 font-extrabold text-white py-2.5 px-4 rounded-xl text-xs border-2 border-black hover:bg-purple-500 disabled:bg-purple-300 flex items-center justify-center gap-2 transition-all shadow-[2px_2px_0_0_#000] active:translate-y-0.5 cursor-pointer"
                      >
                        {isUploading ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Uploading...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-3.5 h-3.5" />
                            Submit Notes
                          </>
                        )}
                      </button>
                    </div>

                    {/* Trash Delete tip helper badge */}
                    <div className="bg-rose-50 border-2 border-black rounded-xl p-3 text-[11px] font-semibold text-rose-950 flex gap-2 mt-4 shadow-[1.5px_1.5px_0_0_#000]">
                      <span className="text-sm shrink-0">💡</span>
                      <div>
                        <p className="font-black uppercase tracking-wide text-rose-900 text-[10px] mb-0.5">Note Custody Control</p>
                        Any materials you upload will instantly feature a <span className="underline font-black text-rose-700">Trash Icon</span> so you can delete them anytime you want.
                      </div>
                    </div>

                  </form>
                )}
              </div>
            </motion.div>

          </div>
        )}
      </AnimatePresence>

      {/* DOCUMENT PREVIEW DIALOG */}
      <AnimatePresence>
        {previewNote && (
          <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-2 sm:p-4">
            
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewNote(null)}
              className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs"
            ></motion.div>

            {/* Preview Modal Panel Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="bg-white w-full max-w-5xl h-[90vh] sm:h-[85vh] rounded-3xl overflow-hidden shadow-[8px_8px_0px_0px_#000] relative z-10 border-4 border-black flex flex-col"
            >
              
              {/* Header */}
              <div className="bg-[#FACC15] border-b-4 border-black px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0 font-sans">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-10 h-10 rounded-xl bg-white border-2 border-black text-black flex items-center justify-center shrink-0 shadow-[1.5px_1.5px_0_0_#000]">
                    <FileText className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="overflow-hidden">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-purple-600 text-white px-2 py-0.5 rounded border-2 border-black shadow-[1px_1px_0_0_#000]">
                        {subjects.find(s => s.id === previewNote.subject_id)?.name || "Academic Notes"}
                      </span>
                      <span className="text-[9px] sm:text-[10px] text-black font-black uppercase">
                        Class {previewNote.class_id} • {previewNote.stream_id.toUpperCase()}
                      </span>
                    </div>
                    <h3 className="text-xs sm:text-base font-black text-black truncate mt-0.5" title={previewNote.title}>
                      {previewNote.title}
                    </h3>
                  </div>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-1.5 sm:gap-2 justify-between sm:justify-end shrink-0">
                  {/* Open in New Tab */}
                  <a
                    href={previewNote.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-zinc-50 text-black rounded-xl text-xs font-black border-2 border-black transition-all cursor-pointer shadow-[2px_2px_0_0_#000] active:translate-y-0.5"
                    title="Open document in a new tab"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open External</span>
                  </a>

                  {/* Download Direct */}
                  <a
                    href={previewNote.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-black border-2 border-black transition-all cursor-pointer shadow-[2px_2px_0_0_#000] active:translate-y-0.5"
                    title="Download document file"
                  >
                    <Download className="w-3.5 h-3.5 border-r border-purple-500/50 pr-1.5" />
                    <span>Download</span>
                  </a>

                  {/* Divider */}
                  <span className="w-0.5 h-6 bg-black mx-1 sm:inline hidden"></span>

                  {/* Close button icon */}
                  <button
                    onClick={() => setPreviewNote(null)}
                    className="rounded-xl w-8 h-8 sm:w-9 sm:h-9 bg-black text-white hover:bg-zinc-800 flex items-center justify-center transition-all cursor-pointer shrink-0 animate-none"
                    title="Close Preview Window"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Informative Help Alert Bar */}
              <div className="bg-purple-100 border-b-3 border-black px-4 sm:px-6 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-[10px] sm:text-[11.5px] text-black font-bold shrink-0 select-none">
                <div className="flex items-center gap-2">
                  <Info className="w-4.5 h-4.5 text-purple-600 shrink-0" />
                  <span>
                    Loading preview file. If blank or doesn&apos;t load, click <strong className="font-black underline">Open External</strong> to preview via browser native viewer.
                  </span>
                </div>
                
                {/* Dynamic star rating bar integration */}
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border-2 border-black shadow-[2px_2px_0_0_#000] text-black font-sans shrink-0">
                  <span className="font-display text-[10px] text-black uppercase tracking-wider">
                    Rate:
                  </span>
                  {ratedNotesIds.includes(previewNote.id) ? (
                    <span className="text-black font-black text-[10px] flex items-center gap-1 bg-yellow-300 px-2.5 py-0.5 rounded-lg border-2 border-black shadow-[1.5px_1.5px_0_0_#000] animate-pulse">
                      <CheckCircle className="w-3.5 h-3.5 text-black" /> Rated! Max thanks!
                    </span>
                  ) : (
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((starVal) => {
                        const isLit = hoveredStar !== null ? starVal <= hoveredStar : false;
                        return (
                          <button
                            key={starVal}
                            onClick={() => handleRateNote(previewNote.id, starVal)}
                            onMouseEnter={() => setHoveredStar(starVal)}
                            onMouseLeave={() => setHoveredStar(null)}
                            disabled={submittingRatingId === previewNote.id}
                            className="text-amber-500 hover:scale-120 active:scale-95 transition-all cursor-pointer p-0.5 disabled:opacity-50"
                            title={`Rate ${starVal} Star${starVal > 1 ? "s" : ""}`}
                          >
                            <Star className={`w-4 h-4 transition-colors ${isLit ? "fill-amber-400 text-black stroke-2" : "text-zinc-300"}`} />
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <span className="font-extrabold text-[10px] ml-1 text-black font-mono">
                    Avg: {previewNote.rating ? Number(previewNote.rating).toFixed(1) : "0.0"} ({previewNote.rating_count || 0} votes)
                  </span>
                </div>

                <span className="hidden lg:inline font-mono font-black uppercase text-[10px] bg-white border-2 border-black px-2 py-0.5 rounded shadow-[1.5px_1.5px_0_0_#000] select-none">Size: {formatBytes(previewNote.file_size)}</span>
              </div>

              {/* Body viewer viewport area */}
              <div className="grow bg-slate-100 overflow-hidden relative flex flex-col items-center justify-center">
                {(() => {
                  const ext = previewNote.file_name.split(".").pop()?.toLowerCase() || "";
                  const isPdf = ext === "pdf";
                  const isImage = ["jpg", "jpeg", "png", "gif", "svg", "webp"].includes(ext);

                  if (isPdf) {
                    return (
                      <iframe
                        src={`https://docs.google.com/viewer?url=${encodeURIComponent(previewNote.file_url)}&embedded=true`}
                        className="w-full h-full bg-slate-100 border-0"
                        title={`PDF Viewer - ${previewNote.title}`}
                      />
                    );
                  } else if (isImage) {
                    return (
                      <div className="w-full h-full overflow-auto p-4 flex items-center justify-center bg-slate-100">
                        <img
                          src={previewNote.file_url}
                          alt={previewNote.title}
                          className="max-w-full max-h-full object-contain rounded-lg shadow-md"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    );
                  } else {
                    return (
                      <div className="max-w-md p-8 text-center bg-white border-3 border-black rounded-3xl shadow-[5px_5px_0_0_#000] flex flex-col items-center justify-center space-y-4 m-4">
                        <div className="w-16 h-16 rounded-full bg-yellow-300 border-2 border-black flex items-center justify-center text-black shadow-[2px_2px_0_0_#000]">
                          <FileText className="w-8 h-8" />
                        </div>
                        <div>
                          <h4 className="text-base font-black text-black uppercase tracking-wide">Preview Unsupported for .{ext.toUpperCase()}</h4>
                          <p className="text-xs text-zinc-900 mt-1.5 leading-relaxed font-semibold">
                            To ensure high-fidelity reading, files with the extension <b>.{ext}</b> should be downloaded to your machine. 
                          </p>
                        </div>
                        <a
                          href={previewNote.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs py-3 px-6 rounded-xl border-2 border-black shadow-[3px_3px_0_0_#000] inline-flex items-center gap-2 transition-all cursor-pointer active:translate-y-0.5"
                        >
                          <Download className="w-4 h-4" />
                          Download &amp; View Document
                        </a>
                      </div>
                    );
                  }
                })()}
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADMIN LOGIN MODAL */}
      <AnimatePresence>
        {showAdminLogin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowAdminLogin(false); setAdminCodeInput(""); setAdminLoginError(""); }}
              className="fixed inset-0 bg-black"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-[8px_8px_0px_0px_#000] relative z-10 border-4 border-black"
            >
              <div className="bg-black text-yellow-400 p-5 flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-yellow-300">Restricted Access</p>
                  <h2 className="text-lg font-black uppercase tracking-wider">Admin Panel</h2>
                </div>
                <button onClick={() => { setShowAdminLogin(false); setAdminCodeInput(""); setAdminLoginError(""); }} className="w-8 h-8 bg-yellow-400 text-black rounded-lg flex items-center justify-center border-2 border-yellow-300 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider mb-1.5">Enter Secret Code</label>
                  <input
                    type="password"
                    value={adminCodeInput}
                    onChange={(e) => setAdminCodeInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
                    placeholder="Enter admin secret..."
                    className="w-full bg-slate-50 border-2 border-black text-black rounded-xl py-2.5 px-3 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-yellow-300"
                    autoFocus
                  />
                  {adminLoginError && (
                    <p className="text-red-600 text-xs font-black mt-1.5">{adminLoginError}</p>
                  )}
                </div>
                <button
                  onClick={handleAdminLogin}
                  disabled={isAdminLoggingIn}
                  className="w-full bg-black text-yellow-400 font-black py-3 rounded-xl border-2 border-black text-sm uppercase tracking-wider shadow-[3px_3px_0_0_#666] cursor-pointer hover:bg-zinc-800 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isAdminLoggingIn ? "Checking..." : "Unlock Admin Mode"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FOOTER */}
      <footer className="mt-auto bg-black text-white p-4 flex flex-col md:flex-row items-center justify-between px-8 py-5 gap-4 border-t-4 border-black font-sans shrink-0">
        <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono font-black text-yellow-300 uppercase">
          <span className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-700 px-3 py-1.5 rounded">
            ⚡ NoteFlow Edu — Class 11 &amp; 12
          </span>
        </div>
        <div className="flex items-center gap-3">
          {showInstallBanner && (
            <button
              onClick={handleInstallApp}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-black uppercase px-3 py-2 rounded-lg border-2 border-black shadow-[2px_2px_0_0_#000] cursor-pointer transition-all"
            >
              <Share2 className="w-3.5 h-3.5" />
              Add to Home Screen
            </button>
          )}
          <div className="text-[10px] uppercase font-black tracking-widest text-[#FACC15] bg-zinc-900 border-2 border-black px-3 py-1.5 rounded shadow-[2px_2px_0_0_#000]">
            Board Exam Prep Hub
          </div>
        </div>
      </footer>

    </div>
  );
}