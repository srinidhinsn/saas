import React, { useState } from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    ResponsiveContainer,
} from "recharts";
// import "../styles/ChartStyles.css"; // Import custom styles (below)

const MyLineChart = () => {
    const [chartData, setChartData] = useState([
        { month: "Mar", income: 10000, expense: 5000 },
        { month: "Apr", income: 11000, expense: 6000 },
        { month: "May", income: 12000, expense: 7000 },
        { month: "Jun", income: 13000, expense: 8000 },
        { month: "Jul", income: 16580, expense: 9000 },
        { month: "Aug", income: 15000, expense: 8500 },
        { month: "Sep", income: 14000, expense: 8000 },
        { month: "Oct", income: 16000, expense: 9500 },
    ]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editMonth, setEditMonth] = useState("");
    const [editIncome, setEditIncome] = useState("");
    const [editExpense, setEditExpense] = useState("");

    const handleEditClick = () => setIsModalOpen(true);

    const handleSaveEdit = () => {
        const updated = chartData.map((item) =>
            item.month === editMonth
                ? {
                    ...item,
                    income: parseFloat(editIncome),
                    expense: parseFloat(editExpense),
                }
                : item
        );
        setChartData(updated);
        setIsModalOpen(false);
        setEditMonth("");
        setEditIncome("");
        setEditExpense("");
    };

    return (
        <div  >
            {/* <button style={{ padding: '5px 10px', background: 'green', margin: 'auto' }} onClick={handleEditClick}>Edit</button> */}

            <ResponsiveContainer width="95%" height={200}>
                <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="income" stroke="#ff7300" strokeWidth={2} />
                    <Line type="monotone" dataKey="expense" stroke="#000000" strokeWidth={2} />
                </LineChart>
            </ResponsiveContainer>

            {/* Modal Overlay */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Edit Chart Data</h3>
                        <select
                            value={editMonth}
                            onChange={(e) => {
                                const selected = chartData.find((d) => d.month === e.target.value);
                                if (selected) {
                                    setEditMonth(selected.month);
                                    setEditIncome(selected.income);
                                    setEditExpense(selected.expense);
                                }
                            }}
                        >
                            <option value="">-- Select Month --</option>
                            {chartData.map((item) => (
                                <option key={item.month} value={item.month}>
                                    {item.month}
                                </option>
                            ))}
                        </select>
                        <input
                            type="number"
                            placeholder="New Income"
                            value={editIncome}
                            onChange={(e) => setEditIncome(e.target.value)}
                        />
                        <input
                            type="number"
                            placeholder="New Expense"
                            value={editExpense}
                            onChange={(e) => setEditExpense(e.target.value)}
                        />
                        <div className="modal-buttons">
                            <button onClick={handleSaveEdit}>Save</button>
                            <button onClick={() => setIsModalOpen(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyLineChart;
