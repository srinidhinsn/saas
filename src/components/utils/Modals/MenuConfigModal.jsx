import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { FaTimes } from "react-icons/fa";
import { menuCache } from "../../utils/Menu-utils/menuCache";

const INV_URL = import.meta.env.VITE_API_INVENTORY_SERVICE_URL;

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

  const [saving, setSaving] = useState(false);

  const dietaryOriginalRef = useRef([]);
  const timingOriginalRef = useRef([]);
  const unitOriginalRef = useRef([]);

  const auth = { Authorization: `Bearer ${token}` };

  // ================= FETCH =================
  const fetchMasters = async () => {
    try {
      const cachedUnits = menuCache.get('units', clientId);

      const [dietRes, timeRes, unitRes] = await Promise.all([
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
      ]);

      const freshDietary = dietRes.data?.data || [];
      const freshTimings = timeRes.data?.data || [];
      const freshUnits = cachedUnits || unitRes?.data?.data || [];

      setDietaryOptions(freshDietary);
      setTimingOptions(freshTimings);
      setUnitOptions(freshUnits);

      dietaryOriginalRef.current = freshDietary;
      timingOriginalRef.current = freshTimings;
      unitOriginalRef.current = freshUnits;

      if (!cachedUnits) menuCache.set('units', clientId, freshUnits);
    } catch (err) {
      console.error("Fetch masters error", err);
    }
  };

  useEffect(() => {
    if (show) fetchMasters();
  }, [show]);

  // ================= API CALLS (used only on Save) =================
  const callAdd = async (category, value) => {
    await axios.post(
      `${INV_URL}/${clientId}/inventory/item-types`,
      null,
      {
        params: {
          category_id: category,
          value,
        },
        headers: auth,
      }
    );
  };

  const callDelete = async (category, value) => {
    await axios.delete(
      `${INV_URL}/${clientId}/inventory/item-types`,
      {
        params: { category_id: category, value },
        headers: auth,
      }
    );
  };

  // ================= LOCAL ADD (no API call) =================
  const addLocalValue = (value, setter) => {
    setter((prev) => [...prev, value]);
  };

  // ================= LOCAL DELETE (no API call) =================
  const removeLocalValue = (value, setter) => {
    setter((prev) => prev.filter((v) => v !== value));
  };

  // ================= SAVE =================
  const saveAll = async () => {
    setSaving(true);
    try {
      const diffs = [
        { category: "dietary_type", current: dietaryOptions, original: dietaryOriginalRef.current },
        { category: "available_timings", current: timingOptions, original: timingOriginalRef.current },
        { category: "units", current: unitOptions, original: unitOriginalRef.current },
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

      menuCache.set('units', clientId, unitOptions);
      onClose();
    } catch (err) {
      console.error("Save failed", err);
    } finally {
      setSaving(false);
    }
  };

  if (!show) return null;

  const tabClass = (id) =>
    `px-4 py-2 text-sm font-semibold ${activeTab === id
      ? "bg-black text-white"
      : "text-gray-500 hover:text-gray-700"
    }`;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-bg-primary rounded-xl p-6 w-[450px] shadow-xl">

        {/* HEADER */}
        <div className="flex justify-between mb-4">
          <h2 className="text-lg font-bold">Menu Config</h2>
          <FaTimes onClick={onClose} className="cursor-pointer" />
        </div>

        {/* TABS */}
        <div className="flex gap-2 border-b mb-4">
          <button
            className={tabClass("masters")}
            onClick={() => setActiveTab("masters")}
          >
            Manage
          </button>
        </div>

        {/* ================= MASTERS ================= */}
        {activeTab === "masters" && (
          <div className="flex flex-col gap-5">

            {/* ===== DIETARY ===== */}
            <div className="border p-3 rounded bg-gray-50">
              <h4 className="font-semibold mb-2">Dietary Types</h4>

              <div className="flex gap-2 mb-2">
                <input
                  value={dietInput}
                  onChange={(e) => setDietInput(e.target.value)}
                  placeholder="Add dietary type"
                  className="border px-2 py-1 rounded w-full"
                />
                <button
                  onClick={() => {
                    const value = dietInput.trim().toLowerCase();
                    if (!value || dietaryOptions.includes(value)) return;

                    addLocalValue(value, setDietaryOptions);

                    setDietInput("");
                  }}
                  className="bg-green-600 text-white px-3 rounded"
                >
                  Add
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {dietaryOptions.map((v) => (
                  <span
                    key={v}
                    className="bg-gray-200 px-2 py-1 rounded-full text-sm flex gap-1"
                  >
                    {v}
                    <button
                      onClick={() =>
                        removeLocalValue(v, setDietaryOptions)
                      }
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* ===== TIMINGS ===== */}
            <div className="border p-3 rounded bg-gray-50">
              <h4 className="font-semibold mb-2">
                Availability Timings (24hr)
              </h4>
              <div className="flex gap-2 mb-3">
                <input
                  value={timeInput}
                  onChange={(e) => setTimeInput(e.target.value)}
                  placeholder="Name (morning)"
                  className="border px-2 py-1 rounded w-1/3"
                />

                <input
                  type="time"
                  value={timeStart}
                  onChange={(e) => setTimeStart(e.target.value)}
                  className="border px-2 py-1 rounded w-1/3"
                />

                <input
                  type="time"
                  value={timeEnd}
                  onChange={(e) => setTimeEnd(e.target.value)}
                  className="border px-2 py-1 rounded w-1/3"
                />

                <button
                  onClick={() => {
                    if (!timeInput || !timeStart || !timeEnd) return;

                    const value = `${timeInput.trim().toLowerCase()}(${timeStart}-${timeEnd})`;

                    addLocalValue(value, setTimingOptions);

                    setTimeInput("");
                    setTimeStart("");
                    setTimeEnd("");
                  }}
                  className="bg-green-600 text-white px-3 rounded"
                >
                  Add
                </button>
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1">
                  Available Timings
                </p>

                <div className="flex flex-wrap gap-2">
                  {timingOptions.length === 0 && (
                    <span className="text-gray-400 text-sm">
                      No timings available
                    </span>
                  )}

                  {timingOptions.map((v) => {
                    const match = v.match(/^(.+)\((.+)-(.+)\)$/);
                    const name = match?.[1] ?? v;
                    const start = match?.[2] ?? null;
                    const end = match?.[3] ?? null;

                    return (
                      <span
                        key={v}
                        className="bg-gray-200 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                      >
                        <span className="font-semibold">{name}</span>

                        {start && end && (
                          <span className="text-gray-600">
                            ({start} - {end})
                          </span>
                        )}

                        <button
                          onClick={() =>
                            removeLocalValue(
                              v,
                              setTimingOptions
                            )
                          }
                        >
                          ✕
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ===== UNITS ===== */}
            <div className="border p-3 rounded bg-gray-50">
              <h4 className="font-semibold mb-2">Units</h4>

              <div className="flex gap-2 mb-2">
                <input
                  value={unitInput}
                  onChange={(e) => setUnitInput(e.target.value)}
                  placeholder="Add unit (e.g. g, kg, pcs)"
                  className="border px-2 py-1 rounded w-full"
                />
                <button
                  onClick={() => {
                    const value = unitInput.trim().toLowerCase();
                    if (!value || unitOptions.includes(value)) return;

                    addLocalValue(value, setUnitOptions);

                    setUnitInput("");
                  }}
                  className="bg-green-600 text-white px-3 rounded"
                >
                  Add
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {unitOptions.length === 0 && (
                  <span className="text-gray-400 text-sm">No units available</span>
                )}

                {unitOptions.map((v) => (
                  <span
                    key={v}
                    className="bg-gray-200 px-2 py-1 rounded-full text-sm flex gap-1"
                  >
                    {v}
                    <button onClick={() => removeLocalValue(v, setUnitOptions)}>✕</button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SAVE / CLOSE */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-700 text-white py-2 rounded"
          >
            Close
          </button>
          <button
            onClick={saveAll}
            disabled={saving}
            className="flex-1 bg-action-primary text-white py-2 rounded disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MenuConfigModal;