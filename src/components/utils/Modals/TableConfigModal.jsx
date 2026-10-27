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

/* ─────────────────────────────────────────────
   Popup  (success / error / warning / confirm)
───────────────────────────────────────────── */
const Popup = ({ popup, closePopup }) => {
    if (!popup.show) return null;

    // full class strings so Tailwind keeps them
    const styles = {
        success: { Icon: FaCheckCircle,         ring: "bg-state-vacant-bg text-state-vacant",       title: "Success" },
        error:   { Icon: FaTimesCircle,         ring: "bg-danger-bg text-danger",                   title: "Error" },
        warning: { Icon: FaExclamationTriangle, ring: "bg-state-reserved-bg text-state-reserved",   title: "Warning" },
        confirm: { Icon: FaQuestionCircle,      ring: "bg-danger-bg text-danger",                   title: "Confirm" },
    }[popup.type] || { Icon: FaQuestionCircle, ring: "bg-brand-light text-brand-dark", title: "Notice" };

    const { Icon } = styles;

    return (
        <div className="ui-backdrop ui-backdrop-top">
            <div className="ui-modal text-center animate-scale-in" role="dialog" aria-modal="true" aria-label={styles.title}>
                <div className={`h-12 w-12 mx-auto mb-item rounded-badge grid place-items-center ${styles.ring}`}>
                    <Icon size={22} />
                </div>
                <h3 className="text-panel-title text-ink mb-1">{styles.title}</h3>
                <p className="text-ui text-ink-muted break-words mb-card">{popup.message}</p>

                <div className="flex gap-item-sm">
                    {popup.type === "confirm" ? (
                        <>
                            <button className="ui-btn flex-1" onClick={closePopup}>Cancel</button>
                            <button className="ui-btn ui-btn-danger flex-1" onClick={popup.onConfirm}>Yes, Delete</button>
                        </>
                    ) : (
                        <button className="ui-btn ui-btn-primary w-full" onClick={closePopup}>OK</button>
                    )}
                </div>
            </div>
        </div>
    );
};

/* ─────────────────────────────────────────────
   MasterTagManager  (add / remove zone or section values)
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
        <div className="rounded-panel border border-line bg-canvas p-panel">
            <div className="flex items-center justify-between mb-item-sm">
                <h4 className="text-panel-title text-brand-dark">{label}s</h4>
                <span className="ui-count">{values.length}</span>
            </div>

            {/* Input row */}
            <div className="flex gap-item-sm">
                <div className="flex-1 relative min-w-0">
                    <input
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && addValue()}
                        placeholder={`Add ${label.toLowerCase()}… (e.g. First Floor)`}
                        className={`ui-field ${showPreview ? "sm:pr-28" : ""}`}
                        disabled={adding}
                    />
                    {showPreview && (
                        <span className="hidden sm:block absolute right-2 top-1/2 -translate-y-1/2 text-micro text-brand-dark bg-brand-light border border-brand-line px-1.5 py-0.5 rounded-badge pointer-events-none whitespace-nowrap max-w-[7rem] truncate">
                            → {preview}
                        </span>
                    )}
                </div>
                <button
                    onClick={addValue}
                    disabled={adding || !input.trim()}
                    className="ui-btn ui-btn-add shrink-0"
                >
                    {adding
                        ? <span className="h-3.5 w-3.5 rounded-badge border-2 border-white/40 border-t-white animate-spin-slow" />
                        : <FaPlus size={11} />}
                    <span className="hidden sm:inline">Add</span>
                </button>
            </div>

            {/* Mobile preview (below input) */}
            {showPreview && (
                <p className="sm:hidden text-micro text-brand-dark mt-1">
                    Will save as <strong>{preview}</strong>
                </p>
            )}

            <p className="text-micro text-ink-muted mt-1.5 mb-item">
                Saved in Title Case: <em>first_floor</em> and <em>first floor</em> both become <strong>First Floor</strong>
            </p>

            {/* Chips */}
            <div className="flex flex-wrap gap-item-sm">
                {values.length === 0 ? (
                    <span className="text-ui text-ink-muted italic">No {label.toLowerCase()}s yet</span>
                ) : (
                    values.map(v => (
                        <span
                            key={v}
                            className="inline-flex items-center gap-1.5 bg-surface border border-brand-line pl-3 pr-1.5 py-1 rounded-badge text-ui text-ink shadow-button"
                        >
                            {v}
                            <button
                                onClick={() => confirmDelete(v)}
                                disabled={deletingVal === v}
                                className="grid place-items-center h-5 w-5 rounded-badge text-danger hover:bg-danger-bg transition-colors disabled:opacity-40"
                                aria-label={`Delete ${v}`}
                            >
                                {deletingVal === v
                                    ? <span className="h-2.5 w-2.5 rounded-badge border border-danger-border border-t-danger animate-spin-slow inline-block" />
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

    const noSections = sectionOptions.length === 0;
    const noZones    = zoneOptions.length    === 0;

    return (
        <div className="ui-backdrop">
            <div className="ui-dialog max-w-modal-md animate-scale-in" role="dialog" aria-modal="true" aria-label="Table configuration">

                {/* HEADER */}
                <div className="ui-dialog-head">
                    <div className="flex items-center gap-item min-w-0">
                        <span className="grid place-items-center h-9 w-9 rounded-button-sm bg-surface border border-brand-line text-brand shrink-0">
                            <IoSettingsOutline className="h-5 w-5" />
                        </span>
                        <div className="min-w-0">
                            <h2 className="text-panel-title text-brand-dark truncate">Table Configuration</h2>
                            <p className="text-micro text-ink-muted truncate">Sections, zones and their combinations</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="ui-icon-btn" aria-label="Close">
                        <FaTimes size={13} />
                    </button>
                </div>

                {/* TABS */}
                <div className="px-modal pt-item shrink-0">
                    <div className="ui-toggle w-full" role="tablist">
                        {[["config", "Configs"], ["masters", "Manage"]].map(([id, text]) => (
                            <button
                                key={id}
                                role="tab"
                                aria-selected={activeTab === id}
                                className={`ui-toggle-btn flex-1 ${activeTab === id ? "ui-toggle-btn-active" : ""}`}
                                onClick={() => setActiveTab(id)}
                            >
                                {text}
                            </button>
                        ))}
                    </div>
                </div>

                {/* BODY */}
                <div className="ui-dialog-body">

                    {/* ════ CONFIG TAB ════ */}
                    {activeTab === "config" && (
                        <div className="space-y-card">
                            <div className="rounded-panel border border-line bg-canvas p-panel">
                                <h3 className="text-panel-title text-brand-dark mb-item">Add Configuration</h3>

                                {(noSections || noZones) && (
                                    <div className="flex gap-item-sm mb-item p-2.5 rounded-button border border-state-reserved/30 bg-state-reserved-bg text-state-reserved text-ui">
                                        <FaExclamationTriangle className="shrink-0 mt-0.5" />
                                        <span>
                                            No {noSections ? "sections" : "zones"} found. Go to the{" "}
                                            <button className="font-bold underline" onClick={() => setActiveTab("masters")}>
                                                Manage tab
                                            </button>{" "}
                                            to add them first.
                                        </span>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-item mb-item">
                                    <div>
                                        <label className="ui-label">Section</label>
                                        <select
                                            value={sectionInput}
                                            onChange={e => setSectionInput(e.target.value)}
                                            className="ui-field"
                                            disabled={noSections}
                                        >
                                            <option value="">Select section</option>
                                            {sectionOptions.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="ui-label">Zone</label>
                                        <select
                                            value={zoneInput}
                                            onChange={e => setZoneInput(e.target.value)}
                                            className="ui-field"
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
                                    className="ui-btn ui-btn-add w-full"
                                >
                                    {addingConfig
                                        ? <span className="h-4 w-4 rounded-badge border-2 border-white/40 border-t-white animate-spin-slow" />
                                        : <FaPlus size={12} />}
                                    Add Config
                                </button>
                            </div>

                            {/* Existing configs */}
                            <div>
                                <div className="flex items-center gap-item-sm mb-item-sm">
                                    <h4 className="text-panel-title text-brand-dark">Existing Configs</h4>
                                    <span className="ui-count">{configs.length}</span>
                                </div>

                                {configs.length === 0 ? (
                                    <div className="text-center py-8 border border-dashed border-line rounded-panel">
                                        <IoSettingsOutline className="h-8 w-8 mx-auto mb-2 text-brand-soft" />
                                        <p className="text-ui text-ink-muted">No configs yet</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap gap-item-sm">
                                        {configs.map(c => (
                                            <div
                                                key={c.id}
                                                className="inline-flex items-center gap-item-sm bg-surface border border-brand-line pl-3 pr-1.5 py-1.5 rounded-badge text-ui shadow-button"
                                            >
                                                <span className="font-semibold text-brand-dark">{c.section}</span>
                                                <span className="text-ink-muted">×</span>
                                                <span className="text-ink">{c.zone}</span>
                                                <button
                                                    onClick={() => deleteConfig(c)}
                                                    className="grid place-items-center h-5 w-5 rounded-badge text-danger hover:bg-danger-bg transition-colors"
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
                        <div className="space-y-item">
                            <p className="text-ui text-ink-muted">
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
                <div className="ui-dialog-foot">
                    <button className="ui-btn ui-btn-primary" onClick={onClose}>Close</button>
                </div>
            </div>

            <Popup popup={popup} closePopup={closePopup} />
        </div>
    );
};

export default TableConfigModal;