import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { FaTimes, FaPlus } from "react-icons/fa";
import { IoSettingsOutline } from "react-icons/io5";
import { menuCache } from "../../utils/Menu-utils/menuCache";

const INV_URL = import.meta.env.VITE_API_INVENTORY_SERVICE_URL;

/* shared style tokens */
const inputBase =
  "w-full h-control px-item rounded-button-sm border border-brand-line bg-surface text-ui text-ink " +
  "placeholder:text-ink-faint outline-none transition-colors " +
  "focus:border-brand-ring focus:shadow-focus-ring";
const labelBase =
  "block text-micro font-bold uppercase tracking-wide mb-1 text-ink-muted";
const btnGreen =
  "ui-btn ui-btn-add shrink-0";
const chipBase =
  "flex items-center gap-1.5 bg-surface border border-brand-line pl-3 pr-2 py-1 rounded-badge text-ui text-ink shadow-button";
const chipRemove =
  "w-5 h-5 flex items-center justify-center rounded-badge text-ink-muted hover:bg-brand-soft hover:text-brand-dark transition-colors";

/* small reusable card wrapper */
const Card = ({ title, count, children }) => (
  <div className="border border-brand-line rounded-panel bg-brand-tint p-3 sm:p-4">
    <div className="flex items-center justify-between mb-3">
      <h4 className="text-panel-title text-brand-dark">{title}</h4>
      {count !== undefined && (
        <span className="text-micro font-bold px-2 py-0.5 rounded-badge bg-brand-light text-brand-dark border border-brand-line">
          {count}
        </span>
      )}
    </div>
    {children}
  </div>
);

const MenuConfigModal = ({ show, onClose, clientId, token }) => {
  const [activeTab, setActiveTab] = useState("masters");

  const [dietaryOptions, setDietaryOptions] = useState([]);
  const [timingOptions, setTimingOptions] = useState([]);

  const [dietInput, setDietInput] = useState("");

  const [timeInput, setTimeInput] = useState("");
  const [timeStart, setTimeStart] = useState("");
  const [timeEnd, setTimeEnd] = useState("");
  const [unitOptions, setUnitOptions] = useState([]);
  const [unitInput, setUnitInput] = useState("");

  // Price display: the master list (exact/round_up/round_down/...) is
  // fetched read-only from the same "price_rounding" category as everything
  // else here. It is NEVER added-to/deleted-from — we don't want the first
  // save to wipe out unselected options. The actual user choice is a single
  // value, cached client-side, so it can be freely switched any time.
  const [priceRoundingOptions, setPriceRoundingOptions] = useState([]);
  const [selectedPriceRounding, setSelectedPriceRounding] = useState("");

  const [saving, setSaving] = useState(false);

  const dietaryOriginalRef = useRef([]);
  const timingOriginalRef = useRef([]);
  const unitOriginalRef = useRef([]);

  const auth = { Authorization: `Bearer ${token}` };

  // ================= FETCH =================
  const fetchMasters = async () => {
    try {
      const cachedUnits = menuCache.get("units", clientId);

      const [dietRes, timeRes, unitRes, priceRoundingRes] = await Promise.all([
        axios.get(`${INV_URL}/${clientId}/inventory/item-types`, {
          params: { category_id: "dietary_type" },
          headers: auth,
        }),
        axios.get(`${INV_URL}/${clientId}/inventory/item-types`, {
          params: { category_id: "available_timings" },
          headers: auth,
        }),
        cachedUnits
          ? Promise.resolve(null)
          : axios.get(`${INV_URL}/${clientId}/inventory/item-types`, {
              params: { category_id: "units" },
              headers: auth,
            }),
        axios.get(`${INV_URL}/${clientId}/inventory/item-types`, {
          params: { category_id: "price_rounding" },
          headers: auth,
        }),
      ]);

      const freshDietary = dietRes.data?.data || [];
      const freshTimings = timeRes.data?.data || [];
      const freshUnits = cachedUnits || unitRes?.data?.data || [];
      const freshPriceRounding = priceRoundingRes.data?.data || [];

      setDietaryOptions(freshDietary);
      setTimingOptions(freshTimings);
      setUnitOptions(freshUnits);
      setPriceRoundingOptions(freshPriceRounding);

      dietaryOriginalRef.current = freshDietary;
      timingOriginalRef.current = freshTimings;
      unitOriginalRef.current = freshUnits;

      if (!cachedUnits) menuCache.set("units", clientId, freshUnits);

      // Selected mode comes from cache (not the server) so it can be
      // switched freely without ever mutating the DB row's value list.
      const cachedSelection = menuCache.get("selected_price_rounding", clientId);
      setSelectedPriceRounding(cachedSelection || freshPriceRounding[0] || "");
    } catch (err) {
      console.error("Fetch masters error", err);
    }
  };

  useEffect(() => {
    if (show) fetchMasters();
  }, [show]);

  // ================= API CALLS (used only on Save) =================
  const callAdd = async (category, value) => {
    await axios.post(`${INV_URL}/${clientId}/inventory/item-types`, null, {
      params: { category_id: category, value },
      headers: auth,
    });
  };

  const callDelete = async (category, value) => {
    await axios.delete(`${INV_URL}/${clientId}/inventory/item-types`, {
      params: { category_id: category, value },
      headers: auth,
    });
  };

  // ================= LOCAL ADD / DELETE (no API call) =================
  const addLocalValue = (value, setter) => setter((prev) => [...prev, value]);
  const removeLocalValue = (value, setter) =>
    setter((prev) => prev.filter((v) => v !== value));

  const addDietary = () => {
    const value = dietInput.trim().toLowerCase();
    if (!value || dietaryOptions.includes(value)) return;
    addLocalValue(value, setDietaryOptions);
    setDietInput("");
  };

  const addUnit = () => {
    const value = unitInput.trim().toLowerCase();
    if (!value || unitOptions.includes(value)) return;
    addLocalValue(value, setUnitOptions);
    setUnitInput("");
  };

  const addTiming = () => {
    if (!timeInput || !timeStart || !timeEnd) return;
    const value = `${timeInput.trim().toLowerCase()}(${timeStart}-${timeEnd})`;
    addLocalValue(value, setTimingOptions);
    setTimeInput("");
    setTimeStart("");
    setTimeEnd("");
  };

  // ================= PRICE ROUNDING SELECT (client-side only) =========
  const selectPriceRounding = (value) => setSelectedPriceRounding(value);

  // ================= SAVE =================
  const saveAll = async () => {
    setSaving(true);
    try {
      const diffs = [
        { category: "dietary_type", current: dietaryOptions, original: dietaryOriginalRef.current },
        { category: "available_timings", current: timingOptions, original: timingOriginalRef.current },
        { category: "units", current: unitOptions, original: unitOriginalRef.current },
        // NOTE: price_rounding is intentionally NOT in this diff list.
        // Its DB row is a fixed, read-only menu of options — only the
        // selection (cached below) changes.
      ];

      for (const { category, current, original } of diffs) {
        const added = current.filter((v) => !original.includes(v));
        const removed = original.filter((v) => !current.includes(v));

        for (const v of added) await callAdd(category, v);
        for (const v of removed) await callDelete(category, v);
      }

      dietaryOriginalRef.current = dietaryOptions;
      timingOriginalRef.current = timingOptions;
      unitOriginalRef.current = unitOptions;

      menuCache.set("units", clientId, unitOptions);
      menuCache.set("selected_price_rounding", clientId, selectedPriceRounding);
      onClose();
    } catch (err) {
      console.error("Save failed", err);
    } finally {
      setSaving(false);
    }
  };

  if (!show) return null;

  const tabClass = (id) =>
    `ui-toggle-btn flex-1 ${
      activeTab === id
        ? "ui-toggle-btn-active"
        : ""
    }`;

  return (
    <div className="ui-backdrop font-sans">
      <div className="flex flex-col w-full sm:max-w-lg max-h-[calc(100dvh-1.5rem)] sm:max-h-[90vh] overflow-hidden bg-surface border border-line border-t-panel border-t-line-panel rounded-modal-lg shadow-modal-lg text-ink animate-scale-in" role="dialog" aria-modal="true" aria-label="Menu configuration">

        {/* HEADER */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 bg-brand-light border-b border-brand-line shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <IoSettingsOutline className="w-5 h-5 shrink-0 text-brand" />
            <div className="min-w-0">
              <h2 className="text-panel-title text-brand-dark truncate">Menu Configuration</h2>
              <p className="text-micro text-ink-muted truncate">Dietary types, timings, units and price display</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid place-items-center h-7 w-7 shrink-0 rounded-button-sm border border-brand-line bg-surface text-ink-muted hover:bg-brand-soft hover:text-brand-dark transition-colors"
            aria-label="Close"
          >
            <FaTimes size={14} />
          </button>
        </div>

        {/* TABS */}
        <div className="px-4 sm:px-6 pt-3 shrink-0">
          <div className="ui-toggle w-full">
            <button className={tabClass("masters")} onClick={() => setActiveTab("masters")}>
              Manage
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
          {activeTab === "masters" && (
            <div className="space-y-3">

              {/* ===== DIETARY ===== */}
              <Card title="Dietary Types" count={dietaryOptions.length}>
                <div className="flex gap-2 mb-3">
                  <input
                    value={dietInput}
                    onChange={(e) => setDietInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addDietary()}
                    placeholder="Add dietary type"
                    className={inputBase}
                  />
                  <button
                    onClick={addDietary}
                    disabled={!dietInput.trim()}
                    className={btnGreen}
                  >
                    <FaPlus size={11} />
                    <span>Add</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 min-h-[32px]">
                  {dietaryOptions.length === 0 ? (
                    <span className="text-ui-sm text-ink-muted italic">No dietary types yet</span>
                  ) : (
                    dietaryOptions.map((v) => (
                      <span key={v} className={chipBase}>
                        {v}
                        <button
                          onClick={() => removeLocalValue(v, setDietaryOptions)}
                          className={chipRemove}
                          aria-label={`Remove ${v}`}
                        >
                          <FaTimes size={10} />
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </Card>

              {/* ===== TIMINGS ===== */}
              <Card title="Availability Timings (24hr)" count={timingOptions.length}>
                <div className="grid grid-cols-2 sm:grid-cols-[1fr_auto_auto_auto] gap-2 mb-3 items-end">
                  <div className="col-span-2 sm:col-span-1">
                    <label className={labelBase}>Name</label>
                    <input
                      value={timeInput}
                      onChange={(e) => setTimeInput(e.target.value)}
                      placeholder="e.g. morning"
                      className={inputBase}
                    />
                  </div>
                  <div>
                    <label className={labelBase}>From</label>
                    <input
                      type="time"
                      value={timeStart}
                      onChange={(e) => setTimeStart(e.target.value)}
                      className={inputBase}
                    />
                  </div>
                  <div>
                    <label className={labelBase}>To</label>
                    <input
                      type="time"
                      value={timeEnd}
                      onChange={(e) => setTimeEnd(e.target.value)}
                      className={inputBase}
                    />
                  </div>
                  <button
                    onClick={addTiming}
                    disabled={!timeInput || !timeStart || !timeEnd}
                    className={`${btnGreen} col-span-2 sm:col-span-1`}
                  >
                    <FaPlus size={11} />
                    <span>Add</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 min-h-[32px]">
                  {timingOptions.length === 0 && (
                    <span className="text-ui-sm text-ink-muted italic">No timings available</span>
                  )}

                  {timingOptions.map((v) => {
                    const match = v.match(/^(.+)\((.+)-(.+)\)$/);
                    const name = match?.[1] ?? v;
                    const start = match?.[2] ?? null;
                    const end = match?.[3] ?? null;

                    return (
                      <span key={v} className={chipBase}>
                        <span className="font-semibold capitalize">{name}</span>
                        {start && end && (
                          <span className="text-micro px-1.5 py-0.5 rounded-badge bg-brand-light text-brand-dark border border-brand-line">
                            {start} – {end}
                          </span>
                        )}
                        <button
                          onClick={() => removeLocalValue(v, setTimingOptions)}
                          className={chipRemove}
                          aria-label={`Remove ${name}`}
                        >
                          <FaTimes size={10} />
                        </button>
                      </span>
                    );
                  })}
                </div>
              </Card>

              {/* ===== UNITS ===== */}
              <Card title="Units" count={unitOptions.length}>
                <div className="flex gap-2 mb-3">
                  <input
                    value={unitInput}
                    onChange={(e) => setUnitInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addUnit()}
                    placeholder="Add unit (e.g. g, kg, pcs)"
                    className={inputBase}
                  />
                  <button
                    onClick={addUnit}
                    disabled={!unitInput.trim()}
                    className={btnGreen}
                  >
                    <FaPlus size={11} />
                    <span>Add</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 min-h-[32px]">
                  {unitOptions.length === 0 ? (
                    <span className="text-ui-sm text-ink-muted italic">No units available</span>
                  ) : (
                    unitOptions.map((v) => (
                      <span key={v} className={chipBase}>
                        {v}
                        <button
                          onClick={() => removeLocalValue(v, setUnitOptions)}
                          className={chipRemove}
                          aria-label={`Remove ${v}`}
                        >
                          <FaTimes size={10} />
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </Card>

              {/* ===== PRICE DISPLAY ===== */}
              <Card title="Price Display">
                {priceRoundingOptions.length === 0 ? (
                  <span className="text-ui-sm text-ink-muted italic">No price mode configured</span>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {priceRoundingOptions.map((v) => {
                      const active = selectedPriceRounding === v;
                      return (
                        <label
                          key={v}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-panel border cursor-pointer transition-colors select-none ${
                            active
                              ? "border-brand-ring bg-surface shadow-focus-ring"
                              : "border-line bg-surface hover:border-brand-line"
                          }`}
                        >
                          <input
                            type="radio"
                            name="price_rounding"
                            checked={active}
                            onChange={() => selectPriceRounding(v)}
                            className="w-4 h-4 accent-brand cursor-pointer"
                          />
                          <span className="text-ui font-semibold capitalize text-ink">
                            {v.replace(/_/g, " ")}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="px-4 sm:px-6 py-3 bg-canvas border-t border-line shrink-0 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button
            onClick={onClose}
            className="ui-btn w-full sm:w-auto"
          >
            Close
          </button>
          <button
            onClick={saveAll}
            disabled={saving}
            className="ui-btn ui-btn-add w-full sm:w-auto"
          >
            {saving && (
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-badge animate-spin-slow" />
            )}
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MenuConfigModal;