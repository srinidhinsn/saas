import React from "react";


const salesData = [
    { channel: "Dine-In", percentage: 45, total: 900, icon: "🍜" },
    { channel: "Takeaway", percentage: 30, total: 600, icon: "🥡" },
    { channel: "Online", percentage: 25, total: 500, icon: "📦" },
];

const SalesDistribution = () => {
    return (
        <div className="sales-container">
            {salesData.map((data, index) => (
                <div key={index} className="sales-item">
                    <span className="icon">{data.icon}</span>
                    <div className="details">
                        <p className="channel">{data.channel}</p>
                        <p className="percentage">{data.percentage}%</p>
                        <p className="total">{data.total} sales</p>
                        <div className="progress-bar">
                            <div
                                className="progress"
                                style={{ width: `${data.percentage}%` }}
                            ></div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default SalesDistribution;