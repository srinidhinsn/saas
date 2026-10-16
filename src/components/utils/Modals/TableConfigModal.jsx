import React, { useState, useEffect } from "react";
import axios from "axios";
import {
    FaTimes, FaPlus, FaCheckCircle, FaExclamationTriangle,
    FaTimesCircle, FaQuestionCircle
} from "react-icons/fa";
import { IoSettingsOutline } from "react-icons/io5";

const BASE_URL = import.meta.env.VITE_API_TABLE_SERVICE_URL;

const normalize = (str = "") =>
    str
        .trim()
        .split(/[\s_]+/)
        .filter(Boolean)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");

const isSame = (a, b) => normalize(a) === normalize(b);

/* shared style tokens */
const inputBase =
    "w-full px-3 py-2 border border-border-default rounded-lg text-sm bg-bg-primary text-text-primary " +
    "placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-slate-400/60 " +
    "focus:border-slate-500 transition disabled:opacity-50 disabled:cursor-not-allowed";
const labelBase =
    "block text-[11px] font-semibold uppercase tracking-wide mb-1 text-text-secondary";
const btnGreen =
    "flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-buttons-add hover:bg-buttonsHover-add text-text-white " +
    "font-semibold text-sm shadow-sm transition-colors disabled:bg-gray-200 disabled:text-gray-400 " +
    "disabled:shadow-none disabled:cursor-not-allowed";

/* ─────────────────────────────────────────────
   Popup
───────────────────────────────────────────── */
const Popup = ({ popup, closePopup }) => {
    if (!popup.show) return null;

    const styles = {
        success: { Icon: FaCheckCircle,         ring: "bg-green-100 text-green-600", title: "Success" },
        error:   { Icon: FaTimesCircle,         ring: "bg-red-100 text-red-600",     title: "Error" },
        warning: { Icon: FaExclamationTriangle, ring: "bg-amber-100 text-amber-600", title: "Warning" },
        confirm: { Icon: FaQuestionCircle,      ring: "bg-red-100 text-red-600",     title: "Confirm" },
    }[popup.type] || { Icon: FaQuestionCircle, ring: "bg-gray-100 text-gray-600", title: "Notice" };

    const { Icon } = styles;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[70]">
            <div className="bg-bg-primary rounded-xl w-full max-w-sm shadow-2xl border border-border-default overflow-hidden">
                <div className="p-5 text-center">
                    <div className={`w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center ${styles.ring}`}>
                        <Icon size={22} />
                    </div>
                    <h3 className="text-lg font-bold text-text-primary mb-1">{styles.title}</h3>
                    <p className="text-sm text-text-secondary break-words">{popup.message}</p>
                </div>

                <div className="flex gap-2 px-5 pb-5">
                    {popup.type === "confirm" ? (
                        <>
                            <button
                                className="flex-1 py-2 rounded-lg bg-bg-tertiary text-text-primary border border-border-default hover:bg-bg-secondary font-semibold text-sm transition-colors"
                                onClick={closePopup}
                            >
                                Cancel
                            </button>
                            <button
                                className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-sm shadow-sm transition-colors"
                                onClick={popup.onConfirm}
                            >
                                Yes, Delete
                            </button>
                        </>
                    ) : (
                        <button
                            className="w-full py-2 rounded-lg bg-slate-500 hover:bg-slate-600 text-white font-semibold text-sm shadow-sm transition-colors"
                            onClick={closePopup}
                        >
                            OK
                        </button>
                    )}
                </div>
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
            const res = await axios.get(`${BASE_URL}/${clientId}/tables/table-types`,
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

        const val = normalize(raw);

        if (values.some(v => isSame(v, val))) {
            showPopup("warning", `"${val}" already exists in ${label}s`);
            return;
        }

        setAdding(true);
        try {
            await axios.post(`${BASE_URL}/${clientId}/tables/table-types`, null,
                { params: { category_id: categoryId, value: val }, headers: auth });

            setValues(prev => [...prev, val]);
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
                await axios.delete(`${BASE_URL}/${clientId}/tables/table-types`,
                    { params: { category_id: categoryId, value: val }, headers: auth });
                setValues(prev => prev.filter(v => v !== val));
                onChanged?.();
            } catch (err) {
                console.error(err);
                showPopup("error", `Failed to delete "${val}"`);
            } finally {
                setDeletingVal(null);
            }
        });
    };

    const preview = input.trim() ? normalize(input) : "";
    const showPreview = preview && preview !== input.trim();

    return (
        <div className="border border-border-default rounded-xl bg-bg-tertiary p-3 sm:p-4">
            <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-bold text-text-primary">{label}s</h4>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                    {values.length}
                </span>
            </div>

            {/* Input row */}
            <div className="flex gap-2">
                <div className="flex-1 relative min-w-0">
                    <input
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && addValue()}
                        placeholder={`Add ${label.toLowerCase()}… (e.g. First Floor)`}
                        className={`${inputBase} ${showPreview ? "sm:pr-28" : ""}`}
                        disabled={adding}
                    />
                    {showPreview && (
                        <span className="hidden sm:block absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-full pointer-events-none whitespace-nowrap max-w-[7rem] truncate">
                            → {preview}
                        </span>
                    )}
                </div>
                <button
                    onClick={addValue}
                    disabled={adding || !input.trim()}
                    className={`${btnGreen} shrink-0`}
                >
                    {adding
                        ? <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        : <FaPlus size={11} />}
                    <span className="hidden xs:inline sm:inline">Add</span>
                </button>
            </div>

            {/* Mobile preview (below input) */}
            {showPreview && (
                <p className="sm:hidden text-[11px] text-slate-600 mt-1">
                    Will save as <strong>{preview}</strong>
                </p>
            )}

            <p className="text-[11px] text-text-secondary mt-1.5 mb-3">
                Saved in Title Case: <em>first_floor</em> and <em>first floor</em> both become <strong>First Floor</strong>
            </p>

            {/* Chips */}
            <div className="flex flex-wrap gap-2 min-h-[32px]">
                {values.length === 0 ? (
                    <span className="text-xs text-text-secondary italic">No {label.toLowerCase()}s yet</span>
                ) : (
                    values.map(v => (
                        <span
                            key={v}
                            className="flex items-center gap-1.5 bg-bg-primary border border-border-default pl-3 pr-2 py-1 rounded-full text-sm text-text-primary shadow-sm"
                        >
                            {v}
                            <button
                                onClick={() => confirmDelete(v)}
                                disabled={deletingVal === v}
                                className="w-5 h-5 flex items-center justify-center rounded-full text-red-500 hover:bg-red-100 transition-colors disabled:opacity-40"
                                aria-label={`Delete ${v}`}
                            >
                                {deletingVal === v
                                    ? <span className="w-2.5 h-2.5 border border-red-300 border-t-red-500 rounded-full animate-spin inline-block" />
                                    : <FaTimes size={10} />}
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
const TableConfigModal = ({ show, onClose, clientId, token, refresh, realm }) => {
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
                axios.get(`${BASE_URL}/${clientId}/tables/table-types`, { params: { category_id: "zone"    }, headers: auth }),
                axios.get(`${BASE_URL}/${clientId}/tables/table-types`, { params: { category_id: "section" }, headers: auth }),
            ]);
            setZoneOptions(   zRes.data?.data || []);
            setSectionOptions(sRes.data?.data || []);
        } catch (err) { console.error("Error loading masters", err); }
    };

    useEffect(() => {
        if (show) { loadConfigs(); loadMasters(); }
    }, [show]);

    const addConfig = async () => {
        const section = sectionInput.trim();
        const zone    = zoneInput.trim();
        if (!section || !zone) { showPopup("warning", "Select both a section and a zone"); return; }

        if (configs.some(c => isSame(c.section, section) && isSame(c.zone, zone))) {
            showPopup("warning", `"${section} × ${zone}" already exists`);
            return;
        }

        setAddingConfig(true);
        try {
            const res = await axios.post(`${BASE_URL}/${clientId}/tables/config`,
                { client_id: clientId, section, zone, realm }, { headers: auth });

            const saved = res.data?.data || res.data;
            const newCfg = saved?.id ? saved : { id: Date.now(), section, zone };

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

    const tabClass = (id) =>
        `flex-1 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
            activeTab === id
                ? "bg-bg-primary text-text-primary shadow-sm"
                : "text-text-secondary hover:text-text-primary"
        }`;

    const noSections = sectionOptions.length === 0;
    const noZones    = zoneOptions.length    === 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4">
  <div className="bg-bg-primary w-full sm:max-w-lg max-h-[calc(100dvh-1.5rem)] sm:max-h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden border border-border-default">
                {/* HEADER */}
                <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 bg-slate-500 text-white shrink-0">
                    <div className="flex items-center gap-2 min-w-0">
                        <IoSettingsOutline className="w-5 h-5 shrink-0" />
                        <div className="min-w-0">
                            <h2 className="text-base sm:text-lg font-bold leading-tight truncate">Table Configuration</h2>
                            <p className="text-xs opacity-80 truncate">Sections, zones and their combinations</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors shrink-0"
                        aria-label="Close"
                    >
                        <FaTimes size={14} />
                    </button>
                </div>

                {/* TABS */}
                <div className="px-4 sm:px-6 pt-3 shrink-0">
                    <div className="flex gap-1 p-1 rounded-xl bg-bg-tertiary border border-border-default">
                        <button className={tabClass("config")}  onClick={() => setActiveTab("config")}>Configs</button>
                        <button className={tabClass("masters")} onClick={() => setActiveTab("masters")}>Manage</button>
                    </div>
                </div>

                {/* BODY */}
                <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">

                    {/* ════ CONFIG TAB ════ */}
                    {activeTab === "config" && (
                        <div className="space-y-5">
                            <div className="border border-border-default rounded-xl bg-bg-tertiary p-3 sm:p-4">
                                <h3 className="text-sm font-bold text-text-primary mb-3">Add Configuration</h3>

                                {(noSections || noZones) && (
                                    <div className="text-xs text-amber-800 mb-3 bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex gap-2">
                                        <FaExclamationTriangle className="shrink-0 mt-0.5 text-amber-500" />
                                        <span>
                                            No {noSections ? "sections" : "zones"} found. Go to the{" "}
                                            <button className="font-bold underline" onClick={() => setActiveTab("masters")}>
                                                Manage tab
                                            </button>{" "}
                                            to add them first.
                                        </span>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                                    <div>
                                        <label className={labelBase}>Section</label>
                                        <select
                                            value={sectionInput}
                                            onChange={e => setSectionInput(e.target.value)}
                                            className={inputBase}
                                            disabled={noSections}
                                        >
                                            <option value="">Select section</option>
                                            {sectionOptions.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                                        </select>
                                    </div>

                                    <div>
                                        <label className={labelBase}>Zone</label>
                                        <select
                                            value={zoneInput}
                                            onChange={e => setZoneInput(e.target.value)}
                                            className={inputBase}
                                            disabled={noZones}
                                        >
                                            <option value="">Select zone</option>
                                            {zoneOptions.map(z => <option key={z} value={z}>{z.toUpperCase()}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <button
                                    onClick={addConfig}
                                    disabled={addingConfig || !sectionInput || !zoneInput}
                                    className={`${btnGreen} w-full`}
                                >
                                    {addingConfig
                                        ? <span className="w-4 h-4 border-2 border-buttons-configure  rounded-full animate-spin" />
                                        : <FaPlus size={12} />}
                                    Add Config
                                </button>
                            </div>

                            {/* Existing configs */}
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <h4 className="text-sm font-bold text-text-primary">Existing Configs</h4>
                                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                        {configs.length}
                                    </span>
                                </div>

                                {configs.length === 0 ? (
                                    <div className="text-center py-8 border border-dashed border-border-default rounded-xl">
                                        <IoSettingsOutline className="w-8 h-8 mx-auto mb-2 text-text-secondary opacity-40" />
                                        <p className="text-sm text-text-secondary">No configs yet</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {configs.map(c => (
                                            <div
                                                key={c.id}
                                                className="flex items-center gap-2 bg-bg-primary border border-border-default pl-3 pr-2 py-1.5 rounded-full text-sm shadow-sm"
                                            >
                                                <span className="font-semibold text-text-primary">{c.section}</span>
                                                <span className="text-text-secondary">×</span>
                                                <span className="text-text-primary">{c.zone}</span>
                                                <button
                                                    onClick={() => deleteConfig(c)}
                                                    className="w-5 h-5 flex items-center justify-center rounded-full text-red-500 hover:bg-red-100 transition-colors"
                                                    aria-label={`Delete ${c.section} × ${c.zone}`}
                                                >
                                                    <FaTimes size={10} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ════ MASTERS TAB ════ */}
                    {activeTab === "masters" && (
                        <div className="space-y-3">
                            <p className="text-xs text-text-secondary">
                                Add or remove the values used in the dropdowns. Values are saved in Title Case automatically.
                            </p>

                            <MasterTagManager
                                label="Zone"
                                categoryId="zone"
                                clientId={clientId}
                                token={token}
                                showPopup={showPopup}
                                closePopup={closePopup}
                                onChanged={loadMasters}
                            />

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
                    )}
                </div>

                {/* FOOTER */}
                <div className="px-4 sm:px-6 py-3 bg-bg-tertiary border-t border-border-default shrink-0 ">
                    <button
                        className="w-full sm:w-auto sm:float-right px-6 py-2.5 rounded-lg bg-buttons-configure hover:bg-buttonsHover-configure text-white font-semibold text-sm shadow-md transition-colors"
                        onClick={onClose}
                    >
                        Close
                    </button>
                    <div className="clear-both" />
                </div>
            </div>

            <Popup popup={popup} closePopup={closePopup} />
        </div>
    );
};

export default TableConfigModal;