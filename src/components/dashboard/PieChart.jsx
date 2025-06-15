import React, { useState } from "react";
import {
    PieChart,
    Pie,
    Cell,
    Legend,
    Tooltip,
    ResponsiveContainer,
} from "recharts";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#A28AFF"];

const PieCharts = () => {
    const [data, setData] = useState([
        { name: "Breakfast", value: 400 },
        { name: "Soups", value: 300 },
        { name: "Pasta", value: 300 },
        { name: "Burgers", value: 200 },
        { name: "Table Services", value: 100 },
    ]);

    const [editMode, setEditMode] = useState(false);
    const [editData, setEditData] = useState([...data]);

    const handleEditChange = (index, newValue) => {
        const updated = [...editData];
        updated[index].value = parseInt(newValue || 0);
        setEditData(updated);
    };

    const saveChanges = () => {
        setData(editData);
        setEditMode(false);
    };

    return (
        <div style={{ textAlign: "center" }}>
            {/* <button
                onClick={() => {
                    setEditData([...data]);
                    setEditMode(true);
                }}
                style={{
                    padding: "4px 8px",
                    backgroundColor: "#1976d2",
                    color: "#fff",
                    border: "none",
                    borderRadius: "5px",
                    cursor: "pointer",
                }}
            >
                Edit
            </button> */}

            <ResponsiveContainer width={350} height={230}>
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        label
                    >
                        {data.map((entry, index) => (
                            <Cell key={index} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                </PieChart>
            </ResponsiveContainer>



            {editMode && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        width: "100vw",
                        height: "100vh",
                        backgroundColor: "rgba(0,0,0,0.6)",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        zIndex: 1000,
                    }}
                >
                    <div
                        style={{
                            background: "#fff",
                            padding: "20px",
                            borderRadius: "10px",
                            width: "90%",
                            maxWidth: "400px",
                        }}
                    >
                        <h3 style={{ marginBottom: "15px" }}>Edit Chart Data</h3>
                        {editData.map((item, index) => (
                            <div key={index} style={{ marginBottom: "10px" }}>
                                <label style={{ fontSize: "14px", display: "block" }}>
                                    {item.name}
                                </label>
                                <input
                                    type="number"
                                    value={item.value}
                                    onChange={(e) => handleEditChange(index, e.target.value)}
                                    style={{
                                        width: "100%",
                                        padding: "8px",
                                        borderRadius: "5px",
                                        border: "1px solid #ccc",
                                        fontSize: "14px",
                                    }}
                                />
                            </div>
                        ))}
                        <div
                            style={{ display: "flex", justifyContent: "space-between", marginTop: "1rem" }}
                        >
                            <button
                                onClick={saveChanges}
                                style={{
                                    padding: "8px 16px",
                                    backgroundColor: "#4caf50",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "5px",
                                    cursor: "pointer",
                                }}
                            >
                                Save
                            </button>
                            <button
                                onClick={() => setEditMode(false)}
                                style={{
                                    padding: "8px 16px",
                                    backgroundColor: "#f44336",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "5px",
                                    cursor: "pointer",
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PieCharts;
