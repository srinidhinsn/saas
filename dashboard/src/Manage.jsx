// import React, { useState, useEffect } from "react";
// import './styles/ManageServices.css';
// import { useSearchParams } from "react-router-dom";
// import api from './PortChangingComponent/api';
// import siteApi from './PortChangingComponent/siteApi';

// function Manage() {
//     const [searchParams] = useSearchParams();
//     const clientId = searchParams.get("clientId");

//     const ALL_FEATURES = [
//         "Dashboard", "Order", "Table Management", "Table Selection",
//         "Menu", "Combos", "KDS", "Invoice", "Transaction", "Customer Reviews", "KOT bill "
//     ];

//     const [enabledFeatures, setEnabledFeatures] = useState([]);
//     const [startDate, setStartDate] = useState('');
//     const [endDate, setEndDate] = useState('');
//     const [duration, setDuration] = useState("1");
//     const [reviewData, setReviewData] = useState(null);

//     useEffect(() => {
//         if (!startDate) return;
//         const start = new Date(startDate);
//         start.setMonth(start.getMonth() + parseInt(duration));
//         setEndDate(start.toISOString().split('T')[0]);
//     }, [startDate, duration]);

//     useEffect(() => {
//         if (clientId) refreshReviewPanel();
//     }, [clientId]);

//     const toggleFeature = (feature) => {
//         setEnabledFeatures(prev =>
//             prev.includes(feature)
//                 ? prev.filter(f => f !== feature)
//                 : [...prev, feature]
//         );
//     };

//     const applyServices = async () => {
//         if (!startDate || enabledFeatures.length === 0) {
//             alert("Please select at least one feature and a valid start date.");
//             return;
//         }

//         // 🧼 Clean and deduplicate features before sending
//         const cleanedFeatures = Array.from(
//             new Set(enabledFeatures.map(f => f.trim()))
//         );

//         const payload = {
//             client_id: clientId,
//             services: cleanedFeatures,
//             features: cleanedFeatures,
//             start_date: startDate,
//             end_date: endDate,
//             duration: `${duration}`
//         };

//         try {
//             console.log("🚀 Sending cleaned features to Admin & Website:", cleanedFeatures);

//             await api.post("/clients/assign-services", payload);
//             await siteApi.post("/client/sync-assigned-services", payload);

//             alert("✅ Features assigned and synced successfully!");
//             refreshReviewPanel();
//         } catch (err) {
//             console.error("❌ Error assigning features:", err);
//             alert("Something went wrong while saving.");
//         }
//     };

//     const refreshReviewPanel = async () => {
//         try {
//             const res = await siteApi.get(`/client/${clientId}/assigned-services`);
//             const data = res.data;
//             if (!data) return;

//             const cleaned = Array.from(
//                 new Set((data.features || []).map(f => f.trim()))
//             );

//             setReviewData(data);
//             setEnabledFeatures(cleaned);
//             setStartDate(data.start_date || '');
//             setEndDate(data.end_date || '');
//             setDuration(data.duration?.toString() || "1");
//         } catch (err) {
//             console.error("❌ Error fetching assigned features:", err);
//         }
//     };

//     return (
//         <div className="manage-wrapper">
//             <h1 className="manage-title">Manage Client Website Features</h1>

//             <div className="feature-config">
//                 <h3>Enable Website Features</h3>
//                 <div className="feature-checkboxes">
//                     {ALL_FEATURES.map((feature, index) => (
//                         <label
//                             key={index}
//                             className={`feature-item ${enabledFeatures.includes(feature) ? 'checked' : ''}`}
//                             onClick={() => toggleFeature(feature)}
//                         >
//                             {feature}
//                         </label>
//                     ))}
//                 </div>
//             </div>

//             <div className="service-config">
//                 <div className="date-config">
//                     <div>
//                         <label>Start Date</label>
//                         <input
//                             type="date"
//                             value={startDate}
//                             onChange={(e) => setStartDate(e.target.value)}
//                         />
//                     </div>
//                     <div>
//                         <label>Duration</label>
//                         <select value={duration} onChange={(e) => setDuration(e.target.value)}>
//                             <option value="1">1 Month</option>
//                             <option value="3">3 Months</option>
//                             <option value="6">6 Months</option>
//                             <option value="12">12 Months</option>
//                             <option value="24">24 Months</option>
//                         </select>
//                     </div>
//                     <div>
//                         <label>End Date</label>
//                         <input
//                             type="date"
//                             value={endDate}
//                             readOnly
//                             style={{ backgroundColor: '#eee' }}
//                         />
//                     </div>
//                 </div>

//                 <button className="apply-btn" onClick={applyServices}>Apply Features</button>
//             </div>

//             <div className="review-panel">
//                 <h3>Previously Assigned</h3>
//                 {reviewData ? (
//                     <>
//                         <p><strong>Features:</strong> {reviewData.features?.join(", ") || "None"}</p>
//                         <p><strong>Start Date:</strong> {reviewData.start_date}</p>
//                         <p><strong>End Date:</strong> {reviewData.end_date}</p>
//                         <p><strong>Duration:</strong> {reviewData.duration} Month(s)</p>
//                     </>
//                 ) : (
//                     <p>No features assigned yet.</p>
//                 )}
//             </div>
//         </div>
//     );
// }

// export default Manage;



// 

import React, { useState, useEffect } from "react";
import './styles/ManageServices.css';
import { useSearchParams } from "react-router-dom";
import { RiArrowRightLine, RiArrowLeftLine } from "react-icons/ri";
import api from './PortChangingComponent/api';
import siteApi from './PortChangingComponent/siteApi';

function Manage() {
    const [searchParams] = useSearchParams();
    const clientId = searchParams.get("clientId");

    const ALL_FEATURES = [
        "Dashboard", "Order", "Table Management", "Table Selection",
        "Menu", "Combos", "KDS", "Invoice", "Transaction",
        "Customer Reviews", "KOT bill", "Add Users"
    ];

    const COMPULSORY_FEATURES = [
        "Dashboard", "Table Management", "Table Selection",
        "Menu", "Combos", "KDS", "Add Users"
    ];

    const [enabledFeatures, setEnabledFeatures] = useState([]);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [duration, setDuration] = useState("1");
    const [reviewData, setReviewData] = useState(null);
    const [customDays, setCustomDays] = useState("");

    useEffect(() => {
        if (!startDate) return;
        const start = new Date(startDate);
        if (duration === "custom" && customDays) {
            start.setDate(start.getDate() + parseInt(customDays));
        } else if (duration !== "custom") {
            start.setMonth(start.getMonth() + parseInt(duration));
        }
        if (!isNaN(start.getTime())) {
            setEndDate(start.toISOString().split("T")[0]);
        }
    }, [startDate, duration, customDays]);

    useEffect(() => {
        if (clientId) refreshReviewPanel();
    }, [clientId]);

    const assignFeature = (feature) => {
        if (!enabledFeatures.includes(feature)) {
            setEnabledFeatures(prev => [...prev, feature]);
        }
    };

    const unassignFeature = (feature) => {
        setEnabledFeatures(prev => prev.filter(f => f !== feature));
    };

    const applyServices = async () => {
        if (!startDate || enabledFeatures.length === 0) {
            alert("Please select at least one feature and a valid start date.");
            return;
        }

        const cleanedFeatures = Array.from(new Set([
            ...COMPULSORY_FEATURES,
            ...enabledFeatures.map(f => f.trim())
        ]));

        const payload = {
            client_id: clientId,
            services: cleanedFeatures,
            features: cleanedFeatures,
            start_date: startDate,
            end_date: endDate,
            duration: `${duration}`
        };

        try {
            await api.post("/clients/assign-services", payload);
            console.log("🔍 SYNC PAYLOAD", JSON.stringify(payload, null, 2));

            await siteApi.post("/client/sync-assigned-services", payload);
            alert("✅ Features assigned and synced successfully!");
            refreshReviewPanel();
        } catch (err) {
            console.error("❌ Error assigning features:", err);
            alert("Something went wrong while saving.");
        }
    };

    const refreshReviewPanel = async () => {
        try {
            const res = await siteApi.get(`/client/${clientId}/assigned-services`);
            const data = res.data;
            if (!data) return;
            const cleaned = Array.from(new Set((data.features || []).map(f => f.trim())));
            setReviewData(data);
            setEnabledFeatures(cleaned);
            setStartDate(data.start_date || '');
            setEndDate(data.end_date || '');
            setDuration(data.duration?.toString() || "1");
        } catch (err) {
            console.error("❌ Error fetching assigned features:", err);
        }
    };

    return (
        <div className="manage-wrapper">
            <h1 className="manage-title">Manage Client Website Features</h1>

            <div className="feature-config">
                <h3>Assign Features to Client</h3>
                <div className="feature-table-wrapper">
                    <table className="feature-table">
                        <thead>
                            <tr>
                                <th>All Features</th>
                                <th>Action</th>
                                <th>Assigned</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ALL_FEATURES.map((feature) => {
                                const isAssigned = enabledFeatures.includes(feature);
                                const isCompulsory = COMPULSORY_FEATURES.includes(feature);
                                return (
                                    <tr key={feature}>
                                        <td>{feature}</td>
                                        {isCompulsory ? (
                                            <>
                                                <td style={{ textAlign: "center", color: "#888" }}>—</td>
                                                <td><span className="auto-assigned-label">Auto-assigned </span></td>
                                            </>
                                        ) : (
                                            <>
                                                <td style={{ textAlign: "center" }}>
                                                    {isAssigned ? (
                                                        <RiArrowLeftLine
                                                            size={20}
                                                            className="table-icon unassign"
                                                            onClick={() => unassignFeature(feature)}
                                                            title="Unassign"
                                                        />
                                                    ) : (
                                                        <RiArrowRightLine
                                                            size={20}
                                                            className="table-icon assign"
                                                            onClick={() => assignFeature(feature)}
                                                            title="Assign"
                                                        />
                                                    )}
                                                </td>
                                                <td>
                                                    {isAssigned ? (
                                                        <span className="assigned-label">✔ Assigned</span>
                                                    ) : (
                                                        <span className="not-assigned-label">❌ Not Assigned</span>
                                                    )}
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="service-config">
                <div className="date-config">
                    <div>
                        <label>Start Date</label>
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    </div>
                    <div>
                        <label>Duration</label>
                        <select value={duration} onChange={(e) => setDuration(e.target.value)}>
                            <option value="1">1 Month</option>
                            <option value="3">3 Months</option>
                            <option value="6">6 Months</option>
                            <option value="12">12 Months</option>
                            <option value="24">24 Months</option>
                            <option value="custom">Custom (Free Trial)</option>
                        </select>
                        {duration === "custom" && (
                            <input
                                type="number"
                                min="1"
                                placeholder="Enter days (e.g. 7)"
                                value={customDays}
                                onChange={(e) => setCustomDays(e.target.value)}
                                style={{ marginTop: "6px" }}
                            />
                        )}
                    </div>
                    <div>
                        <label>End Date</label>
                        <input
                            type="date"
                            value={endDate}
                            readOnly
                            style={{ backgroundColor: '#eee' }}
                        />
                    </div>
                </div>
                <button className="apply-btn" onClick={applyServices}>Apply Features</button>
            </div>

            <div className="review-panel">
                <h3>Previously Assigned</h3>
                {reviewData ? (
                    <>
                        <p><strong>Features:</strong> {reviewData.features?.join(", ") || "None"}</p>
                        <p><strong>Start Date:</strong> {reviewData.start_date}</p>
                        <p><strong>End Date:</strong> {reviewData.end_date}</p>
                        <p><strong>Duration:</strong> {reviewData.duration} Month(s)</p>
                    </>
                ) : (
                    <p>No features assigned yet.</p>
                )}
            </div>
        </div>
    );
}

export default Manage;
