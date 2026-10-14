import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { FaTimes, FaPlus } from "react-icons/fa";
import { IoSettingsOutline } from "react-icons/io5";
import { menuCache } from "../../utils/Menu-utils/menuCache";

const INV_URL = import.meta.env.VITE_API_INVENTORY_SERVICE_URL;

/* shared style tokens */
const inputBase =
  "w-full px-3 py-2 border border-border-default rounded-lg text-sm bg-bg-primary text-text-primary " +
  "placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-slate-400/60 " +
  "focus:border-slate-500 transition";
const labelBase =
  "block text-[11px] font-semibold uppercase tracking-wide mb-1 text-text-secondary";
const btnGreen =
  "flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white " +
  "font-semibold text-sm shadow-sm transition-colors disabled:bg-gray-200 disabled:text-gray-400 " +
  "disabled:shadow-none disabled:cursor-not-allowed shrink-0";
const chipBase =
  "flex items-center gap-1.5 bg-bg-primary border border-border-default pl-3 pr-2 py-1 rounded-full text-sm text-text-primary shadow-sm";
const chipRemove =
  "w-5 h-5 flex items-center justify-center rounded-full text-red-500 hover:bg-red-100 transition-colors";

/* small reusable card wrapper */
const Card = ({ title, count, children }) => (
  <div className="border border-border-default rounded-xl bg-bg-tertiary p-3 sm:p-4">
    <div className="flex items-center justify-between mb-3">
      <h4 className="text-sm font-bold text-text-primary">{title}</h4>
      {count !== undefined && (
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
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
    `flex-1 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
      activeTab === id
        ? "bg-bg-primary text-text-primary shadow-sm"
        : "text-text-secondary hover:text-text-primary"
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4">
      <div className="bg-bg-primary w-full sm:max-w-lg max-h-[calc(100dvh-1.5rem)] sm:max-h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden border border-border-default">

        {/* HEADER */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 bg-slate-500 text-white shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <IoSettingsOutline className="w-5 h-5 shrink-0" />
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold leading-tight truncate">Menu Configuration</h2>
              <p className="text-xs opacity-80 truncate">Dietary types, timings, units and price display</p>
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
                    <span className="text-xs text-text-secondary italic">No dietary types yet</span>
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
                    <span className="text-xs text-text-secondary italic">No timings available</span>
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
                          <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
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
                    <span className="text-xs text-text-secondary italic">No units available</span>
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
                  <span className="text-xs text-text-secondary italic">No price mode configured</span>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {priceRoundingOptions.map((v) => {
                      const active = selectedPriceRounding === v;
                      return (
                        <label
                          key={v}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border-2 cursor-pointer transition-all select-none ${
                            active
                              ? "border-slate-500 bg-slate-50"
                              : "border-border-default bg-bg-primary hover:border-slate-300"
                          }`}
                        >
                          <input
                            type="radio"
                            name="price_rounding"
                            checked={active}
                            onChange={() => selectPriceRounding(v)}
                            className="w-4 h-4 accent-slate-500 cursor-pointer"
                          />
                          <span className="text-sm font-medium capitalize text-text-primary">
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
        <div className="px-4 sm:px-6 py-3 bg-bg-tertiary border-t border-border-default shrink-0 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-bg-primary text-text-primary border border-border-default hover:bg-bg-secondary font-semibold text-sm transition-colors"
          >
            Close
          </button>
          <button
            onClick={saveAll}
            disabled={saving}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-slate-500 hover:bg-slate-600 text-white font-semibold text-sm shadow-md transition-colors disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none disabled:cursor-not-allowed"
          >
            {saving && (
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            )}
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MenuConfigModal;