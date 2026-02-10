import React, { useState, useEffect } from "react";
import axios from "axios";
import { FaTimes } from "react-icons/fa";

const TableConfigModal = ({ show, onClose, clientId, token, refresh }) => {

    const [zoneInput, setZoneInput] = useState("");
    const [sectionInput, setSectionInput] = useState("");
    const [zones, setZones] = useState([]);
    const [sections, setSections] = useState([]);
    const [popup, setPopup] = useState({
        show: false,
        type: "success", // success | error | warning | confirm
        message: "",
        onConfirm: null
    });
    const showPopup = (type, message, onConfirm = null) => {
        setPopup({
            show: true,
            type,
            message,
            onConfirm
        });
    };

    const closePopup = () => {
        setPopup({ show: false, message: "", onConfirm: null, type: "success" });
    };

    const addValue = async (category, value) => {
        const clean = value.trim();

        if (!clean) return;

        try {
            await axios.post(
                `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/inventory/roles`,
                null,
                {
                    params: {
                        client_id: clientId,
                        category_id: category,
                        value: clean
                    },
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            showPopup("success", `${clean} added successfully`);
            setZoneInput("");
            setSectionInput("");
            refresh();

        } catch (err) {
            if (err.response?.status === 409) {
                showPopup("warning", `${clean} already exists`);
            } else {
                showPopup("error", "Failed to add value");
                console.error(err);
            }
        }
    };
    const loadMasters = async () => {
        const fetch = async (cat, setter) => {
            const res = await axios.get(
                `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/inventory/masters`,
                {
                    params: { category_id: cat },
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            setter(res.data.data || []);
        };

        await Promise.all([
            fetch("zone", setZones),
            fetch("section", setSections)
        ]);
    };
    useEffect(() => {
        if (show) loadMasters();
    }, [show]);
    const deleteValue = async (category, value) => {
        showPopup("confirm", `Delete "${value}" ?`, async () => {
            try {
                await axios.delete(
                    `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/inventory/roles`,
                    {
                        params: {
                            client_id: clientId,
                            category_id: category,
                            value: value
                        },
                        headers: { Authorization: `Bearer ${token}` }
                    }
                );

                await loadMasters();
                refresh();
                closePopup();

            } catch (err) {
                showPopup("error", "Failed to delete");
                console.error(err);
            }
        });
        return;

        try {
            await axios.delete(
                `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/inventory/roles`,
                {
                    params: {
                        client_id: clientId,
                        category_id: category,
                        value: value
                    },
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            await loadMasters();
            refresh();

        } catch (err) {
            alert("Failed to delete");
            console.error(err);
        }
    };


    if (!show) return null;

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-[420px]">

                <h2 className="text-xl font-bold mb-4">Table Configuration</h2>

                {/* Zone */}
                <div className="mb-5">
                    <h3 className="font-semibold mb-2">Add Zone</h3>
                    <div className="flex gap-2">
                        <input
                            value={zoneInput}
                            onChange={e => setZoneInput(e.target.value)}
                            className="border px-3 py-2 rounded w-full"
                            placeholder="Ground / First Floor"
                        />

                        <button
                            className="bg-green-600 text-white px-4 rounded"
                            onClick={() => addValue("zone", zoneInput)}
                        >
                            Add
                        </button>
                    </div>
                    <div className="mt-4">
                        <h4 className="font-semibold mb-2">Existing Zones</h4>

                        <div className="flex flex-wrap gap-2">
                            {zones.map((z, i) => (
                                <div
                                    key={i}
                                    className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full"
                                >
                                    <span>{z}</span>
                                    <button
                                        onClick={() => deleteValue("zone", z)}
                                        className="text-red-500 hover:text-red-700"
                                    >
                                        <FaTimes size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Section */}
                <div className="mb-5">
                    <h3 className="font-semibold mb-2">Add Section</h3>
                    <div className="flex gap-2">
                        <input
                            value={sectionInput}
                            onChange={e => setSectionInput(e.target.value)}
                            className="border px-3 py-2 rounded w-full"
                            placeholder="AC / Non AC / Family"
                        />

                        <button
                            className="bg-green-600 text-white px-4 rounded"
                            onClick={() => addValue("section", sectionInput)}
                        >
                            Add
                        </button>
                    </div>
                    <div className="mt-4">
                        <h4 className="font-semibold mb-2">Existing Sections</h4>

                        <div className="flex flex-wrap gap-2">
                            {sections.map((s, i) => (
                                <div
                                    key={i}
                                    className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full"
                                >
                                    <span>{s}</span>
                                    <button
                                        onClick={() => deleteValue("section", s)}
                                        className="text-red-500 hover:text-red-700"
                                    >
                                        <FaTimes size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <button
                    className="mt-4 w-full bg-gray-700 text-white py-2 rounded"
                    onClick={onClose}
                >
                    Close
                </button>

            </div>

            {popup.show && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
                    <div className="bg-white rounded-xl w-[340px] p-5 shadow-2xl animate-scale-in text-center">

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
                                    className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700"
                                    onClick={popup.onConfirm}
                                >
                                    Yes
                                </button>
                                <button
                                    className="flex-1 bg-gray-300 py-2 rounded-lg hover:bg-gray-400"
                                    onClick={closePopup}
                                >
                                    Cancel
                                </button>
                            </div>
                        ) : (
                            <button
                                className="w-full bg-gray-800 text-white py-2 rounded-lg hover:bg-gray-900"
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
