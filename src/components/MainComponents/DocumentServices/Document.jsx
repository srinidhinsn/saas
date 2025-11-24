import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";

/*
  Premium DocumentManager (two-panel layout)
  - Theme: white + orange
  - Uses fetch + BASE_URL from env
  - Adds search, sidebar filters, upload modal, and polished cards
  - Keeps original endpoints and logic intact
*/

export default function DocumentManager() {
    const { clientId } = useParams();
    const token = localStorage.getItem("access_token") || null;
    const userId = localStorage.getItem("user_id") || "system";
    const BASE_URL = import.meta.env.VITE_API_DOCUMENT_SERVICE_URL || "";

    // data + ui state
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [query, setQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [selectedRealm, setSelectedRealm] = useState("All");
    const [categories, setCategories] = useState([]);
    const [realms, setRealms] = useState([]);

    // upload modal state
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [file, setFile] = useState(null);
    const [description, setDescription] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [realm, setRealm] = useState("");
    const [selectedDocId, setSelectedDocId] = useState(null);
    const [uploading, setUploading] = useState(false);

    const fileInputRef = useRef(null);

    // helper: build headers for auth + client-id
    const buildAuthHeaders = (extra = {}) => {
        const base = {};
        if (token) base["Authorization"] = `Bearer ${token}`;
        if (clientId) base["client-id"] = clientId;
        return { ...base, ...extra };
    };

    useEffect(() => {
        // whenever clientId or token changes, fetch documents
        if (clientId && token) fetchDocuments();
        else setDocuments([]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clientId, token]);

    // Fetch the documents
    const fetchDocuments = async () => {
        setLoading(true);
        setErrorMsg("");
        try {
            const res = await fetch(`${BASE_URL}/${clientId}/document/read`, {
                method: "GET",
                headers: buildAuthHeaders({ Accept: "application/json" }),
            });

            if (res.status === 401) {
                setErrorMsg("Unauthorized — your session may have expired. Please log in.");
                setDocuments([]);
                setLoading(false);
                return;
            }

            if (!res.ok) {
                setErrorMsg(`Failed to fetch documents (${res.status})`);
                setDocuments([]);
                setLoading(false);
                return;
            }

            const data = await res.json();
            const docs = data?.data || [];
            setDocuments(docs);

            // derive categories & realms for sidebar filters
            const cats = Array.from(new Set(docs.map((d) => d.category_id).filter(Boolean)));
            const rms = Array.from(new Set(docs.map((d) => d.realm).filter(Boolean)));
            setCategories(cats);
            setRealms(rms);
        } catch (err) {
            console.error("Fetch documents error:", err);
            setErrorMsg("Unable to fetch documents. Check console for details.");
            setDocuments([]);
        } finally {
            setLoading(false);
        }
    };

    // Upload document
    const handleUpload = async () => {
        if (!file) {
            alert("Select a file to upload.");
            return;
        }
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("description", description);
            formData.append("category_id", categoryId);
            formData.append("realm", realm);
            formData.append("created_by", userId);

            const res = await fetch(`${BASE_URL}/${clientId}/document/upload`, {
                method: "POST",
                headers: buildAuthHeaders(), // DO NOT set Content-Type for FormData
                body: formData,
            });

            if (res.status === 401) {
                alert("Upload unauthorized. Please login again.");
                setUploading(false);
                return;
            }
            if (!res.ok) {
                const txt = await res.text().catch(() => "");
                console.error("Upload failed:", res.status, txt);
                alert("Upload failed. See console.");
                setUploading(false);
                return;
            }

            alert("Upload successful.");
            await fetchDocuments();
            closeUploadModal();
        } catch (err) {
            console.error("Upload error:", err);
            alert("Upload failed. See console.");
        } finally {
            setUploading(false);
        }
    };

    // Replace existing document
    const handleReplace = async () => {
        if (!file || !selectedDocId) {
            alert("Select a file and a document to replace.");
            return;
        }
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("description", description);
            formData.append("category_id", categoryId);
            formData.append("realm", realm);
            formData.append("updated_by", userId);

            const res = await fetch(`${BASE_URL}/${clientId}/document/replace?doc_id=${selectedDocId}`, {
                method: "POST",
                headers: buildAuthHeaders(),
                body: formData,
            });

            if (res.status === 401) {
                alert("Replace unauthorized. Please login again.");
                setUploading(false);
                return;
            }
            if (!res.ok) {
                const txt = await res.text().catch(() => "");
                console.error("Replace failed:", res.status, txt);
                alert("Replace failed. See console.");
                setUploading(false);
                return;
            }

            alert("Document replaced successfully.");
            await fetchDocuments();
            closeUploadModal();
        } catch (err) {
            console.error("Replace error:", err);
            alert("Replace failed. See console.");
        } finally {
            setUploading(false);
        }
    };

    // Download document
    const handleDownload = async (docId, filename) => {
        try {
            const res = await fetch(`${BASE_URL}/${clientId}/document/download?doc_id=${docId}`, {
                method: "GET",
                headers: buildAuthHeaders(),
            });

            if (res.status === 401) {
                alert("Download unauthorized. Please login again.");
                return;
            }
            if (!res.ok) {
                console.error("Download failed:", res.status, res.statusText);
                alert("Download failed. See console.");
                return;
            }

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", filename || `document_${docId}`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Download error:", err);
            alert("Download failed. See console.");
        }
    };

    const openUploadModal = () => {
        setIsUploadOpen(true);
        // reset fields for new upload
        setFile(null);
        setDescription("");
        setCategoryId("");
        setRealm("");
        setSelectedDocId(null);
        setTimeout(() => fileInputRef.current?.focus?.(), 50);
    };

    const closeUploadModal = () => {
        setIsUploadOpen(false);
        setFile(null);
        setDescription("");
        setCategoryId("");
        setRealm("");
        setSelectedDocId(null);
    };

    // Derived & filtered docs
    const filteredDocuments = (documents || []).filter((d) => {
        if (!d) return false;
        if (selectedCategory !== "All" && d.category_id !== selectedCategory) return false;
        if (selectedRealm !== "All" && d.realm !== selectedRealm) return false;
        if (query && !`${d.name} ${d.description} ${d.category_id}`.toLowerCase().includes(query.toLowerCase())) return false;
        return true;
    });

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Topbar */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-20 m-4">
                <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-8 rounded bg-gradient-to-b from-orange-400 to-orange-600" />
                        <div>
                            <h1 className="text-xl font-semibold text-gray-900">Documents</h1>
                            <p className="text-xs text-gray-500">Manage files, uploads and replacements</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 w-full">

                        {/* Search Box */}
                        <div className="flex items-center bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm w-full sm:w-auto">
                            <input
                                aria-label="Search documents"
                                className="outline-none text-sm w-full sm:w-72"
                                placeholder="Search documents, categories..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                            />
                        </div>

                        {/* Add Document Button */}
                        <button
                            onClick={openUploadModal}
                            className="px-4 py-2 w-full sm:w-auto bg-gradient-to-r from-orange-500 to-orange-400 text-white rounded-lg shadow hover:from-orange-600 text-center"
                            title="Add document"
                        >
                            + Add Document
                        </button>

                    </div>
                    </div>

                </div>

                {/* Main content */}
                <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Left Sidebar (filters) */}
                    <aside className="lg:col-span-1">
                        <div className="sticky top-24 space-y-4">
                            <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                                <h3 className="text-sm font-medium text-gray-700 mb-2">Filters</h3>

                                <div className="mb-3">
                                    <label className="block text-xs text-gray-500 mb-1">Category</label>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            onClick={() => setSelectedCategory("All")}
                                            className={`px-2 py-1 text-xs rounded-full ${selectedCategory === "All" ? "bg-orange-100 text-orange-600" : "bg-gray-100 text-gray-600"}`}
                                        >
                                            All
                                        </button>
                                        {categories.map((c) => (
                                            <button
                                                key={c}
                                                onClick={() => setSelectedCategory(c)}
                                                className={`px-2 py-1 text-xs rounded-full ${selectedCategory === c ? "bg-orange-100 text-orange-600" : "bg-gray-100 text-gray-600"}`}
                                            >
                                                {c}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <label className="block text-xs text-gray-500 mb-1">Realm</label>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            onClick={() => setSelectedRealm("All")}
                                            className={`px-2 py-1 text-xs rounded-full ${selectedRealm === "All" ? "bg-orange-100 text-orange-600" : "bg-gray-100 text-gray-600"}`}
                                        >
                                            All
                                        </button>
                                        {realms.map((r) => (
                                            <button
                                                key={r}
                                                onClick={() => setSelectedRealm(r)}
                                                className={`px-2 py-1 text-xs rounded-full ${selectedRealm === r ? "bg-orange-100 text-orange-600" : "bg-gray-100 text-gray-600"}`}
                                            >
                                                {r}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-2 border-t border-gray-100 mt-3">
                                    <button
                                        onClick={() => { setSelectedCategory("All"); setSelectedRealm("All"); setQuery(""); }}
                                        className="w-full px-3 py-2 text-sm rounded-lg bg-white border border-gray-200 hover:shadow"
                                    >
                                        Reset filters
                                    </button>
                                </div>
                            </div>

                            <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                                <h3 className="text-sm font-medium text-gray-700 mb-2">Quick Stats</h3>
                                <div className="text-xs text-gray-500">Showing</div>
                                <div className="mt-2 text-lg font-semibold text-gray-900">{filteredDocuments.length}</div>
                                <div className="text-xs text-gray-400 mt-1">documents</div>
                            </div>
                        </div>
                    </aside>

                    {/* Right content (grid) */}
                    <section className="lg:col-span-3">
                        {/* upload modal (glass card) */}
                        {isUploadOpen && (
                            <div className="fixed inset-0 z-40 flex items-start justify-center pt-24 px-4">
                                <div
                                    className="absolute inset-0 bg-black/30 backdrop-blur-sm"
                                    onClick={closeUploadModal}
                                    aria-hidden
                                />
                                <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden transform transition-transform">
                                    <div className="p-6">
                                        <div className="flex items-center justify-between gap-4">
                                            <div>
                                                <h2 className="text-lg font-semibold text-gray-900">{selectedDocId ? "Replace Document" : "Upload Document"}</h2>
                                                <p className="text-xs text-gray-500 mt-1">Drag & drop or choose a file. Allowed types: any</p>
                                            </div>
                                            <button onClick={closeUploadModal} className="text-gray-400 hover:text-gray-600">✕</button>
                                        </div>

                                        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="md:col-span-2">
                                                <div
                                                    onClick={() => fileInputRef.current?.click?.()}
                                                    className="h-36 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50 flex items-center justify-center text-center cursor-pointer hover:bg-gray-100 transition"
                                                >
                                                    {file ? (
                                                        <div className="text-sm">
                                                            <div className="font-medium text-gray-800">{file.name}</div>
                                                            <div className="text-xs text-gray-500 mt-1">{Math.round((file.size || 0) / 1024)} KB</div>
                                                        </div>
                                                    ) : (
                                                        <div className="text-sm text-gray-500">Click to choose file or drag here</div>
                                                    )}
                                                    <input
                                                        ref={fileInputRef}
                                                        type="file"
                                                        className="hidden"
                                                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                                                    />
                                                </div>

                                                <div className="mt-3 space-y-2">
                                                    <input
                                                        value={description}
                                                        onChange={(e) => setDescription(e.target.value)}
                                                        placeholder="Description"
                                                        className="w-full border p-2 rounded-md"
                                                    />
                                                    <div className="flex gap-2">
                                                        <input
                                                            value={categoryId}
                                                            onChange={(e) => setCategoryId(e.target.value)}
                                                            placeholder="Category ID"
                                                            className="w-1/2 border p-2 rounded-md"
                                                        />
                                                        <input
                                                            value={realm}
                                                            onChange={(e) => setRealm(e.target.value)}
                                                            placeholder="Realm"
                                                            className="w-1/2 border p-2 rounded-md"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="md:col-span-1 flex flex-col gap-3">
                                                <div className="bg-gray-50 rounded-lg p-3">
                                                    <div className="text-xs text-gray-500">Selected</div>
                                                    <div className="text-sm font-medium text-gray-800 mt-1">{file ? file.name : "No file"}</div>
                                                </div>

                                                <div className="bg-gray-50 rounded-lg p-3">
                                                    <div className="text-xs text-gray-500">Actions</div>
                                                    <div className="mt-3 flex flex-col gap-2">
                                                        <button
                                                            onClick={() => {
                                                                if (selectedDocId) handleReplace();
                                                                else handleUpload();
                                                            }}
                                                            className="px-3 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-orange-400 text-white"
                                                            disabled={uploading}
                                                        >
                                                            {uploading ? "Working..." : selectedDocId ? "Replace" : "Upload"}
                                                        </button>
                                                        <button onClick={closeUploadModal} className="px-3 py-2 rounded-lg border border-gray-200 bg-white">Cancel</button>
                                                    </div>
                                                </div>

                                                <div className="text-xs text-gray-400">Tip: You can pre-fill fields by clicking Replace on any document card.</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* error / loader */}
                        {errorMsg && (
                            <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg border border-red-100">
                                {errorMsg}
                            </div>
                        )}

                        {loading ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {Array.from({ length: 6 }).map((_, i) => (
                                    <div key={i} className="animate-pulse bg-white rounded-xl p-6 h-40" />
                                ))}
                            </div>
                        ) : (
                            <>
                                {filteredDocuments.length === 0 ? (
                                    <div className="bg-white rounded-xl p-10 text-center text-gray-500 border border-gray-100">
                                        No documents found. Try another search or upload a document.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {filteredDocuments.map((doc) => (
                                            <article
                                                key={doc.id}
                                                className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100 hover:shadow-lg transition group"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-orange-50 text-orange-600">
                                                        {/* simple file icon */}
                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                                    </div>

                                                    <div className="flex-1">
                                                        <h4 className="text-md font-semibold text-gray-900 truncate">{doc.name}</h4>
                                                        <div className="text-xs text-gray-500 mt-1">{doc.description || "—"}</div>

                                                        <div className="mt-3 flex items-center gap-2 flex-wrap">
                                                            <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">{doc.category_id || "Uncategorized"}</span>
                                                            {doc.realm && <span className="text-xs px-2 py-1 rounded-full bg-orange-50 text-orange-600">{doc.realm}</span>}
                                                            <span className="text-xs text-gray-400 ml-auto">{doc.size_kb ? `${doc.size_kb} KB` : "-"}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="mt-4 flex gap-2">
                                                    <button
                                                        onClick={() => handleDownload(doc.id, doc.name)}
                                                        className="flex-1 px-3 py-2 rounded-lg bg-gradient-to-r from-green-600 to-green-500 text-white text-sm"
                                                    >
                                                        Download
                                                    </button>

                                                    <button
                                                        onClick={() => {
                                                            // prefill replace modal and open
                                                            setSelectedDocId(doc.id);
                                                            setDescription(doc.description || "");
                                                            setCategoryId(doc.category_id || "");
                                                            setRealm(doc.realm || "");
                                                            setIsUploadOpen(true);
                                                            setTimeout(() => fileInputRef.current?.focus?.(), 200);
                                                        }}
                                                        className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm hover:bg-gray-50"
                                                    >
                                                        Replace
                                                    </button>
                                                </div>
                                            </article>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </section>
                </div>

                {/* Floating add button (mobile friendly) */}
                <div className="fixed right-6 bottom-6 z-30">
                    <button
                        onClick={openUploadModal}
                        className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-500 to-orange-400 text-white shadow-lg flex items-center justify-center hover:scale-105 transform transition"
                        aria-label="Add document"
                    >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                </div>
            </div>
            );
}
