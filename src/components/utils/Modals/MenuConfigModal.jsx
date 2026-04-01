import React, { useState, useEffect } from "react";
import axios from "axios";
import { FaTimes } from "react-icons/fa";

const INV_URL = import.meta.env.VITE_API_INVENTORY_SERVICE_URL;

const MenuConfigModal = ({ show, onClose, clientId, token }) => {
  const [activeTab, setActiveTab] = useState("masters");

  const [dietaryOptions, setDietaryOptions] = useState([]);
  const [timingOptions, setTimingOptions] = useState([]);

  const [dietInput, setDietInput] = useState("");

  const [timeInput, setTimeInput] = useState("");
  const [timeStart, setTimeStart] = useState("");
  const [timeEnd, setTimeEnd] = useState("");

  const auth = { Authorization: `Bearer ${token}` };

  // ================= FETCH =================
  const fetchMasters = async () => {
    try {
      const [dietRes, timeRes] = await Promise.all([
        axios.get(`${INV_URL}/${clientId}/inventory/masters`, {
          params: { category_id: "dietary_type" },
          headers: auth,
        }),
        axios.get(`${INV_URL}/${clientId}/inventory/masters`, {
          params: { category_id: "available_timings" },
          headers: auth,
        }),
      ]);

      setDietaryOptions(dietRes.data?.data || []);
      setTimingOptions(timeRes.data?.data || []);
    } catch (err) {
      console.error("Fetch masters error", err);
    }
  };

  useEffect(() => {
    if (show) fetchMasters();
  }, [show]);

  // ================= ADD =================
  const addValue = async (category, value, setter) => {
    try {
      await axios.post(
        `${INV_URL}/${clientId}/inventory/roles`,
        null,
        {
          params: {
            category_id: category,
            value,
          },
          headers: auth,
        }
      );

      setter((prev) => [...prev, value]);
    } catch (err) {
      console.error("Add failed", err);
    }
  };

  // ================= DELETE =================
  const deleteValue = async (category, value, setter) => {
    try {
      await axios.delete(
        `${INV_URL}/${clientId}/inventory/roles`,
        {
          params: { category_id: category, value },
          headers: auth,
        }
      );

      setter((prev) => prev.filter((v) => v !== value));
    } catch (err) {
      console.error("Delete failed", err);
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
                    if (!dietInput.trim()) return;

                    addValue(
                      "dietary_type",
                      dietInput.trim().toLowerCase(),
                      setDietaryOptions
                    );

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
                        deleteValue("dietary_type", v, setDietaryOptions)
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

                    const value = `${timeInput
                      .trim()
                      .toLowerCase()}|${timeStart}|${timeEnd}`;

                    addValue("available_timings", value, setTimingOptions);

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
                    const parts = v.split("|");

                    const name = parts[0];
                    const start = parts[1];
                    const end = parts[2];

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
                            deleteValue(
                              "available_timings",
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
          </div>
        )}

        {/* CLOSE */}
        <button
          onClick={onClose}
          className="mt-4 w-full bg-gray-700 text-white py-2 rounded"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default MenuConfigModal;