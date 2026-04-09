import React, { useState, useEffect } from "react";
import axios from "axios";
import { FaTimes, FaPlus } from "react-icons/fa";

const BASE_URL = import.meta.env.VITE_API_TABLE_SERVICE_URL;
const INV_URL  = import.meta.env.VITE_API_INVENTORY_SERVICE_URL;

const normalize = (str = "") =>
    str
        .trim()
        .split(/[\s_]+/)
        .filter(Boolean)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");

const isSame = (a, b) => normalize(a) === normalize(b);

const Popup = ({ popup, closePopup }) => {
    if (!popup.show) return null;
    const color =
        popup.type === "success" ? "text-green-600" :
        popup.type === "error"   ? "text-red-600"   :
        popup.type === "warning" ? "text-yellow-600" : "text-gray-800";

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[70]">
            <div className="bg-white rounded-xl w-[340px] p-5 shadow-2xl text-center">
                <h3 className={`text-lg font-bold mb-3 ${color}`}>
                    {popup.type === "success" && "Success"}
                    {popup.type === "error"   && "Error"}
                    {popup.type === "warning" && "Warning"}
                    {popup.type === "confirm" && "Confirm"}
                </h3>
                <p className="text-gray-700 mb-5">{popup.message}</p>
                {popup.type === "confirm" ? (
                    <div className="flex gap-3">
                        <button className="flex-1 bg-red-600 text-white py-2 rounded font-semibold" onClick={popup.onConfirm}>Yes, Delete</button>
                        <button className="flex-1 bg-gray-200 py-2 rounded font-semibold" onClick={closePopup}>Cancel</button>
                    </div>
                ) : (
                    <button className="w-full bg-gray-800 text-white py-2 rounded" onClick={closePopup}>OK</button>
                )}
            </div>
        </div>
    );
};

/* ─────────────────────────────────────────────
   MasterTagManager
───────────────────────────────────────────── */
const MasterTagManager = ({ label, categoryId, clientId, token, showPopup, closePopup, onChanged }) => {
    const [values,      setValues]      = useState([]);
    const [input,       setInput]       = useState("");
    const [adding,      setAdding]      = useState(false);
    const [deletingVal, setDeletingVal] = useState(null);

    const auth = { Authorization: `Bearer ${token}` };

    const fetchValues = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/table-types`,
                { params: { category_id: categoryId }, headers: auth });
            setValues(res.data?.data || []);
        } catch (err) {
            console.error(`Fetch ${label} error`, err);
            setValues([]);
        }
    };

    useEffect(() => { fetchValues(); }, [clientId, categoryId]);

    const addValue = async () => {
        const raw = input.trim();
        if (!raw) return;

        // ✅ Normalize FIRST — this is the value that goes to the DB
        const val = normalize(raw);

        // ✅ Duplicate check against already-normalized stored values
        if (values.some(v => isSame(v, val))) {
            showPopup("warning", `"${val}" already exists in ${label}s`);
            return;
        }

        setAdding(true);
        try {
            // ✅ Send the normalized value — DB stores "First Floor" not "first floor"
            await axios.post(`${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/table-types`, null,
                { params: { category_id: categoryId, value: val }, headers: auth });

            setValues(prev => [...prev, val]);  // local update with normalized val
            setInput("");
            onChanged?.();
        } catch (err) {
            if (err.response?.status === 409) {
                showPopup("warning", `"${val}" already exists`);
            } else {
                console.error(err);
                showPopup("error", `Failed to add ${label}`);
            }
        } finally {
            setAdding(false);
        }
    };

    const confirmDelete = (val) => {
        showPopup("confirm", `Delete "${val}" from ${label}s?`, async () => {
            closePopup();
            setDeletingVal(val);
            try {
                await axios.delete(`${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/table-types`,
                    { params: { category_id: categoryId, value: val }, headers: auth });
                setValues(prev => prev.filter(v => v !== val));  // local update
                onChanged?.();
            } catch (err) {
                console.error(err);
                showPopup("error", `Failed to delete "${val}"`);
            } finally {
                setDeletingVal(null);
            }
        });
    };

    // Live preview only shown when normalization would change the raw input
    const preview = input.trim() ? normalize(input) : "";
    const showPreview = preview && preview !== input.trim();

    return (
        <div className="mb-1">
            <h4 className="font-semibold text-gray-700 mb-2">{label}s</h4>

            {/* Input row */}
            <div className="flex gap-2 mb-1">
                <div className="flex-1 relative">
                    <input
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && addValue()}
                        placeholder={`Add ${label.toLowerCase()}… (e.g. First Floor)`}
                        className="border px-3 py-1.5 rounded w-full text-sm pr-24"
                        disabled={adding}
                    />
                    {/* Live preview badge — only when normalization changes the text */}
                    {showPreview && (
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-blue-500 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-full pointer-events-none whitespace-nowrap">
                            → {preview}
                        </span>
                    )}
                </div>
                <button
                    onClick={addValue}
                    disabled={adding || !input.trim()}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-sm flex items-center gap-1 disabled:opacity-50 shrink-0"
                >
                    {adding
                        ? <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        : <FaPlus size={11} />
                    }
                    Add
                </button>
            </div>

            {/* Hint */}
            <p className="text-[11px] text-gray-400 mb-2">
                Stored as Title Case — <em>first_floor</em> or <em>first floor</em> both save as <strong>First Floor</strong>
            </p>

            {/* Tag chips */}
            <div className="flex flex-wrap gap-2 min-h-[32px]">
                {values.length === 0 ? (
                    <span className="text-xs text-gray-400 italic">No {label.toLowerCase()}s yet</span>
                ) : (
                    values.map(v => (
                        <span key={v}
                            className="flex items-center gap-1.5 bg-gray-100 border border-gray-200 px-2.5 py-1 rounded-full text-sm"
                        >
                            {v}
                            <button
                                onClick={() => confirmDelete(v)}
                                disabled={deletingVal === v}
                                className="text-red-400 hover:text-red-600 transition disabled:opacity-40"
                            >
                                {deletingVal === v
                                    ? <span className="w-2.5 h-2.5 border border-red-300 border-t-red-500 rounded-full animate-spin inline-block" />
                                    : <FaTimes size={10} />
                                }
                            </button>
                        </span>
                    ))
                )}
            </div>
        </div>
    );
};

/* ─────────────────────────────────────────────
   Main Modal
───────────────────────────────────────────── */
const TableConfigModal = ({ show, onClose, clientId, token, refresh,realm }) => {
    const [activeTab,      setActiveTab]      = useState("config");
    const [sectionInput,   setSectionInput]   = useState("");
    const [zoneInput,      setZoneInput]      = useState("");
    const [configs,        setConfigs]        = useState([]);
    const [zoneOptions,    setZoneOptions]    = useState([]);
    const [sectionOptions, setSectionOptions] = useState([]);
    const [addingConfig,   setAddingConfig]   = useState(false);
    const [popup, setPopup] = useState({ show: false, type: "success", message: "", onConfirm: null });

    const auth       = { Authorization: `Bearer ${token}` };
    const showPopup  = (type, message, onConfirm = null) => setPopup({ show: true, type, message, onConfirm });
    const closePopup = () => setPopup({ show: false, type: "success", message: "", onConfirm: null });

    const loadConfigs = async () => {
        try {
            const res = await axios.get(`${BASE_URL}/${clientId}/tables/config`,
                { params: { client_id: clientId }, headers: auth });
            setConfigs(res.data || []);
        } catch (err) { console.error("Error loading configs", err); }
    };

    const loadMasters = async () => {
        try {
            const [zRes, sRes] = await Promise.all([
                axios.get(`${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/table-types`, { params: { category_id: "zone"    }, headers: auth }),
                axios.get(`${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/table-types`, { params: { category_id: "section" }, headers: auth }),
            ]);
            setZoneOptions(   zRes.data?.data || []);
            setSectionOptions(sRes.data?.data || []);
        } catch (err) { console.error("Error loading masters", err); }
    };

    useEffect(() => {
        if (show) { loadConfigs(); loadMasters(); }
    }, [show]);

    /* add config */
    const addConfig = async () => {
        const section = sectionInput.trim();
        const zone    = zoneInput.trim();
        if (!section || !zone) { showPopup("warning", "Select both a section and a zone"); return; }

        // ✅ Duplicate check on config pairs
        if (configs.some(c => isSame(c.section, section) && isSame(c.zone, zone))) {
            showPopup("warning", `"${section} × ${zone}" already exists`);
            return;
        }

        setAddingConfig(true);
        try {
            const res = await axios.post(`${BASE_URL}/${clientId}/tables/config`,
                { client_id: clientId, section, zone,realm }, { headers: auth });

            // ✅ Use returned data if available, else construct locally
            const saved = res.data?.data || res.data;
            const newCfg = saved?.id
                ? saved
                : { id: Date.now(), section, zone };

            setConfigs(prev => [...prev, newCfg]);
            setSectionInput("");
            setZoneInput("");
            showPopup("success", `"${section} × ${zone}" added`);
        } catch (err) {
            if (err.response?.status === 409) showPopup("warning", "This combination already exists");
            else { showPopup("error", "Failed to add config"); console.error(err); }
        } finally {
            setAddingConfig(false);
        }
    };

    /* delete config */
    const deleteConfig = (config) => {
        showPopup("confirm", `Delete "${config.section} × ${config.zone}"?`, async () => {
            closePopup();
            try {
                await axios.delete(`${BASE_URL}/${clientId}/tables/config/${config.id}`, { headers: auth });
                setConfigs(prev => prev.filter(c => c.id !== config.id)); 
            } catch (err) {
                showPopup("error", "Failed to delete config");
                console.error(err);
            }
        });
    };

    if (!show) return null;

    const tab = (id) =>
        `px-4 py-2 text-sm font-semibold rounded-t-lg transition border-b-2 ${
            activeTab === id
                ? "text-white bg-action-primary border-action-primary"
                : "border-transparent text-gray-500 hover:text-gray-700"
        }`;

    const noSections = sectionOptions.length === 0;
    const noZones    = zoneOptions.length    === 0;

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-[480px] max-h-[90vh] overflow-y-auto shadow-2xl">

                {/* Header */}
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Table Configuration</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <FaTimes />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 border-b mb-5">
                    <button className={tab("config")}  onClick={() => setActiveTab("config")}>Configs</button>
                    <button className={tab("masters")} onClick={() => setActiveTab("masters")}>Manage</button>
                </div>

                {/* ════ CONFIG TAB ════ */}
                {activeTab === "config" && (
                    <>
                        <div className="mb-5">
                            <h3 className="font-semibold mb-3 text-gray-700">Add Configuration</h3>

                            {(noSections || noZones) && (
                                <div className="text-xs text-amber-600 mb-3 bg-amber-50 border border-amber-200 rounded p-2">
                                    ⚠ No {noSections ? "sections" : "zones"} found.
                                    Go to <button className="font-bold underline" onClick={() => setActiveTab("masters")}>Manage tab</button> to add them first.
                                </div>
                            )}

                            <div className="flex flex-col gap-2">
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Section</label>
                                    <select
                                        value={sectionInput}
                                        onChange={e => setSectionInput(e.target.value)}
                                        className="border px-3 py-2 rounded w-full text-sm bg-white"
                                        disabled={noSections}
                                    >
                                        <option value="">-- Select Section --</option>
                                        {sectionOptions.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Zone</label>
                                    <select
                                        value={zoneInput}
                                        onChange={e => setZoneInput(e.target.value)}
                                        className="border px-3 py-2 rounded w-full text-sm bg-white"
                                        disabled={noZones}
                                    >
                                        <option value="">-- Select Zone --</option>
                                        {zoneOptions.map(z => <option key={z} value={z}>{z.toUpperCase()}</option>)}
                                    </select>
                                </div>

                                <button
                                    onClick={addConfig}
                                    disabled={addingConfig || !sectionInput || !zoneInput}
                                    className="bg-green-600 hover:bg-green-700 text-white py-2 rounded text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {addingConfig
                                        ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                        : <FaPlus size={12} />
                                    }
                                    Add Config
                                </button>
                            </div>
                        </div>

                        {/* Existing configs */}
                        <div>
                            <h4 className="font-semibold mb-2 text-gray-700">
                                Existing Configs
                                <span className="ml-2 text-xs font-normal text-gray-400">({configs.length})</span>
                            </h4>
                            {configs.length === 0 ? (
                                <p className="text-sm text-gray-400 italic">No configs yet.</p>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {configs.map(c => (
                                        <div key={c.id}
                                            className="flex items-center gap-2 bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-full text-sm"
                                        >
                                            <span className="font-medium">{c.section}</span>
                                            <span className="text-gray-400">×</span>
                                            <span>{c.zone}</span>
                                            <button
                                                onClick={() => deleteConfig(c)}
                                                className="text-red-400 hover:text-red-600 transition ml-1"
                                            >
                                                <FaTimes size={11} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* ════ MASTERS TAB ════ */}
                {activeTab === "masters" && (
                    <div className="flex flex-col gap-1">
                        <p className="text-xs text-gray-400 mb-3">
                            Add or remove values used in the dropdowns. Values are stored in Title Case automatically.
                        </p>

                        <div className="border rounded-lg p-4 bg-gray-50 mb-3">
                            <MasterTagManager
                                label="Zone"
                                categoryId="zone"
                                clientId={clientId}
                                token={token}
                                showPopup={showPopup}
                                closePopup={closePopup}
                                onChanged={loadMasters}
                            />
                        </div>

                        <div className="border rounded-lg p-4 bg-gray-50">
                            <MasterTagManager
                                label="Section"
                                categoryId="section"
                                clientId={clientId}
                                token={token}
                                showPopup={showPopup}
                                closePopup={closePopup}
                                onChanged={loadMasters}
                            />
                        </div>
                    </div>
                )}

                <button
                    className="mt-5 w-full bg-gray-700 hover:bg-gray-800 text-white py-2 rounded text-sm font-semibold"
                    onClick={onClose}
                >
                    Close
                </button>
            </div>

            <Popup popup={popup} closePopup={closePopup} />
        </div>
    );
};

export default TableConfigModal;
