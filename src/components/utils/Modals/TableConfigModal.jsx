import React, { useState, useEffect } from "react";
import axios from "axios";
import { FaTimes } from "react-icons/fa";

const TableConfigModal = ({ show, onClose, clientId, token, refresh }) => {

    const [sectionInput, setSectionInput] = useState("");
    const [zoneInput, setZoneInput] = useState("");
    const [configs, setConfigs] = useState([]);

    const [popup, setPopup] = useState({
        show: false,
        type: "success",
        message: "",
        onConfirm: null
    });

    const showPopup = (type, message, onConfirm = null) => {
        setPopup({ show: true, type, message, onConfirm });
    };

    const closePopup = () => {
        setPopup({ show: false, message: "", onConfirm: null, type: "success" });
    };

    // ✅ LOAD CONFIGS
    const loadConfigs = async () => {
        try {
            const res = await axios.get(
                `${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/config`,
                {
                    params: { client_id: clientId },
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            setConfigs(res.data || []);
        } catch (err) {
            console.error("Error loading configs", err);
        }
    };

    useEffect(() => {
        if (show) loadConfigs();
    }, [show]);

    // ✅ ADD CONFIG (section + zone)
    const addConfig = async () => {
        const section = sectionInput.trim();
        const zone = zoneInput.trim();

        if (!section || !zone) {
            showPopup("warning", "Both section and zone required");
            return;
        }

        try {
            await axios.post(
                `${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/config`,
                {
                    client_id: clientId,
                    section,
                    zone
                },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            showPopup("success", "Config added successfully");
            setSectionInput("");
            setZoneInput("");
            loadConfigs();
            refresh();

        } catch (err) {
            if (err.response?.status === 409) {
                showPopup("warning", "Already exists");
            } else {
                showPopup("error", "Failed to add config");
                console.error(err);
            }
        }
    };

    // ✅ DELETE CONFIG
    const deleteConfig = async (config) => {
        showPopup("confirm", `Delete "${config.section} - ${config.zone}" ?`, async () => {
            try {
                await axios.delete(
                    `${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/config/${config.id}`,
                    {
                        headers: { Authorization: `Bearer ${token}` }
                    }
                );

                loadConfigs();
                refresh();
                closePopup();

            } catch (err) {
                showPopup("error", "Failed to delete");
                console.error(err);
            }
        });
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-[420px]">

                <h2 className="text-xl font-bold mb-4">Table Configuration</h2>

                {/* ADD CONFIG */}
                <div className="mb-5">
                    <h3 className="font-semibold mb-2">Add Configuration</h3>

                    <div className="flex flex-col gap-2">
                        <input
                            value={sectionInput}
                            onChange={e => setSectionInput(e.target.value)}
                            className="border px-3 py-2 rounded w-full"
                            placeholder="Section (AC,Non-AC)"
                        />

                        <input
                            value={zoneInput}
                            onChange={e => setZoneInput(e.target.value)}
                            className="border px-3 py-2 rounded w-full"
                            placeholder="Zone (Ground, Balcony)"
                        />

                        <button
                            className="bg-green-600 text-white py-2 rounded"
                            onClick={addConfig}
                        >
                            Add Config
                        </button>
                    </div>
                </div>

                {/* LIST CONFIGS */}
                <div>
                    <h4 className="font-semibold mb-2">Existing Configs</h4>

                    <div className="flex flex-wrap gap-2">
                        {configs.map((c) => (
                            <div
                                key={c.id}
                                className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full"
                            >
                                <span>{c.section} - {c.zone}</span>
                                <button
                                    onClick={() => deleteConfig(c)}
                                    className="text-red-500 hover:text-red-700"
                                >
                                    <FaTimes size={12} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <button
                    className="mt-4 w-full bg-gray-700 text-white py-2 rounded"
                    onClick={onClose}
                >
                    Close
                </button>
            </div>

            {/* POPUP */}
            {popup.show && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
                    <div className="bg-white rounded-xl w-[340px] p-5 shadow-2xl text-center">

                        <h3 className={`text-lg font-bold mb-3
                            ${popup.type === "success" ? "text-green-600" :
                                popup.type === "error" ? "text-red-600" :
                                    popup.type === "warning" ? "text-yellow-600" :
                                        "text-gray-800"}
                        `}>
                            {popup.type === "success" && "Success"}
                            {popup.type === "error" && "Error"}
                            {popup.type === "warning" && "Warning"}
                            {popup.type === "confirm" && "Confirmation"}
                        </h3>

                        <p className="text-gray-700 mb-5">{popup.message}</p>

                        {popup.type === "confirm" ? (
                            <div className="flex gap-3">
                                <button
                                    className="flex-1 bg-red-600 text-white py-2 rounded"
                                    onClick={popup.onConfirm}
                                >
                                    Yes
                                </button>
                                <button
                                    className="flex-1 bg-gray-300 py-2 rounded"
                                    onClick={closePopup}
                                >
                                    Cancel
                                </button>
                            </div>
                        ) : (
                            <button
                                className="w-full bg-gray-800 text-white py-2 rounded"
                                onClick={closePopup}
                            >
                                OK
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default TableConfigModal;