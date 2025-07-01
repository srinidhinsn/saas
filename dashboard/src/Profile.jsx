// import "./styles/Profile.css";
// import React, { useEffect, useState } from "react";
// import axios from "axios";
// import { useNavigate } from "react-router-dom";
// import { FiSearch, FiFilter, FiEye, FiMoreVertical } from "react-icons/fi";
// import { MdSort } from "react-icons/md";
// import { FaPlus } from "react-icons/fa";
// import api from './PortChangingComponent/api'

// const Profile = () => {
//     const [data, setData] = useState([]);
//     const [filteredData, setFilteredData] = useState([]);
//     const [loading, setLoading] = useState(true);
//     const [searchTerm, setSearchTerm] = useState("");
//     const [sortAsc, setSortAsc] = useState(true);
//     const [layout, setLayout] = useState("table");
//     const [showFilterInput, setShowFilterInput] = useState(false);
//     const [modalClient, setModalClient] = useState(null);
//     const [updatedStatus, setUpdatedStatus] = useState("false");
//     const today = new Date();
//     const navigate = useNavigate();
//     const parseDate = (str) => {
//         if (!str || !str.includes("/")) return null;
//         const parts = str.split("/");
//         if (parts.length !== 3) return null;
//         const [day, month, year] = parts;
//         return new Date(`20${year}`, month - 1, day);
//     };


//     useEffect(() => {
//         fetchTickets();
//     }, []);

//     const fetchTickets = () => {
//         setLoading(true);
//         api
//             .get("/tickets")
//             .then((res) => {
//                 setData(res.data);
//                 setFilteredData(res.data);
//                 setLoading(false);
//             })
//             .catch((err) => {
//                 console.error("Error fetching tickets", err);
//                 setLoading(false);
//             });
//     };

//     useEffect(() => {
//         const filtered = data.filter((item) =>
//             item.assigned?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//             item.ticket?.toLowerCase().includes(searchTerm.toLowerCase())
//         );
//         setFilteredData(filtered);
//     }, [searchTerm, data]);

//     const handleSort = () => {
//         const sorted = [...filteredData].sort((a, b) =>
//             sortAsc
//                 ? a.assigned.localeCompare(b.assigned)
//                 : b.assigned.localeCompare(a.assigned)
//         );
//         setFilteredData(sorted);
//         setSortAsc(!sortAsc);
//     };

//     const handleRowClick = (clientId) => {
//         navigate(`/clientsUser?clientId=${clientId}`);
//     };

//     const openModal = (client) => {
//         setModalClient(client);
//         setUpdatedStatus(client.status === "Paid" ? "true" : "false");
//     };

//     const closeModal = () => {
//         setModalClient(null);
//         setUpdatedStatus("false");
//     };

//     const updatePaymentStatus = async () => {
//         if (!modalClient) return;
//         await api.put(
//             `/clients/${modalClient.client_id}/payment-status`,
//             null,
//             {
//                 params: { bill_paid: updatedStatus === "true" },
//             }
//         );
//         closeModal();
//         fetchTickets();
//     };
//     const exportClients = async () => {
//         try {
//             const response = await api.get("/export_clients", {
//                 responseType: "blob",
//             });

//             const url = window.URL.createObjectURL(new Blob([response.data]));
//             const link = document.createElement("a");
//             link.href = url;
//             link.setAttribute("download", "clients_export.csv");
//             document.body.appendChild(link);
//             link.click();
//             link.remove();
//         } catch (err) {
//             console.error("Error exporting clients:", err);
//         }
//     };


//     return (
//         <div className="profile-page">
//             <div className="profile-header">
//                 <div className="search-bar">
//                     <FiSearch />
//                     <input
//                         type="text"
//                         placeholder="Search for anything"
//                         value={searchTerm}
//                         onChange={(e) => setSearchTerm(e.target.value)}
//                         style={{ display: showFilterInput ? "block" : "none" }}
//                     />
//                 </div>

//                 <div className="action-buttons">
//                     <button onClick={() => setShowFilterInput(!showFilterInput)}>
//                         <FiFilter /> Filter
//                     </button>
//                     <button onClick={handleSort}>
//                         <MdSort /> Sort {sortAsc ? "↑" : "↓"}
//                     </button>
//                     <button className="primary" onClick={() => navigate("/register")}>
//                         <FaPlus /> Register
//                     </button>
//                     <button onClick={exportClients}>Export</button>

//                     <button onClick={() => setLayout(layout === "table" ? "grid" : "table")}>
//                         Layout: {layout === "table" ? "Grid" : "Table"}
//                     </button>
//                 </div>
//             </div>

//             <div className="profile-content">
//                 {layout === "table" ? (
//                     <div className="profile-table">
//                         <table>
//                             <thead>
//                                 <tr>
//                                     <th>Client ID</th>
//                                     <th>Client Name</th>
//                                     <th>Priority</th>
//                                     <th>Status</th>
//                                     <th>Last Invoice</th>
//                                     <th>Action</th>
//                                 </tr>
//                             </thead>
//                             <tbody>
//                                 {loading ? (
//                                     <tr><td colSpan="6">Loading...</td></tr>
//                                 ) : filteredData.length === 0 ? (
//                                     <tr><td colSpan="6">No clients found.</td></tr>
//                                 ) : (
//                                     filteredData.map((row, idx) => {
//                                         const end = parseDate(row.date);
//                                         const diff = end ? Math.ceil((end - today) / (1000 * 60 * 60 * 24)) : null;
//                                         const isExpired = diff !== null && diff < 0;
//                                         const badge = diff === null
//                                             ? null
//                                             : isExpired
//                                                 ? <span className="tag expired">Expired</span>
//                                                 : <span className="tag days-left">{diff} days left</span>;


//                                         return (
//                                             <tr key={idx}>
//                                                 <td onClick={() => handleRowClick(row.client_id)}>{row.client_id}</td>
//                                                 <td onClick={() => handleRowClick(row.client_id)}>{row.assigned}</td>
//                                                 <td><span className={`tag ${row.priority.toLowerCase()}`}>{row.priority}</span></td>
//                                                 <td>
//                                                     <span className={`tag ${row.status.toLowerCase()}`}>{row.status}</span>
//                                                     {badge}
//                                                 </td>
//                                                 <td>{row.date || "N/A"}</td>
//                                                 <td>
//                                                     <FiEye
//                                                         style={{ marginRight: "8px", cursor: "pointer" }}
//                                                         onClick={() => handleRowClick(row.client_id)}
//                                                     />
//                                                     <FiMoreVertical
//                                                         style={{ cursor: "pointer" }}
//                                                         onClick={() => openModal(row)}
//                                                     />
//                                                 </td>
//                                             </tr>
//                                         );
//                                     })
//                                 )}
//                             </tbody>
//                         </table>
//                     </div>
//                 ) : (
//                     <div className="profile-cards">
//                         {loading ? (
//                             <p>Loading...</p>
//                         ) : filteredData.length === 0 ? (
//                             <p>No clients found.</p>
//                         ) : (
//                             filteredData.map((row, idx) => {
//                                 const end = row.date ? new Date(row.date) : null;
//                                 const diff = end ? Math.ceil((end - today) / (1000 * 60 * 60 * 24)) : null;
//                                 const isExpired = diff !== null && diff < 0;
//                                 const badge = diff === null
//                                     ? null
//                                     : isExpired
//                                         ? <span className="tag expired">Expired</span>
//                                         : <span className="tag days-left">{diff} days left</span>;

//                                 return (
//                                     <div className="profile-card" key={idx}>
//                                         <div className="card-header" onClick={() => handleRowClick(row.client_id)}>
//                                             <strong>ID #{row.client_id}</strong>
//                                             <span className={`tag ${row.priority.toLowerCase()}`}>{row.priority}</span>
//                                         </div>
//                                         <div className="card-body" onClick={() => handleRowClick(row.client_id)}>
//                                             <p><strong>Name:</strong> {row.assigned}</p>
//                                             <p>
//                                                 <strong>Status:</strong>{" "}
//                                                 <span className={`tag ${row.status.toLowerCase()}`}>{row.status}</span>{" "}
//                                                 {badge}
//                                             </p>
//                                             <p><strong>Last Invoice:</strong> {row.date || "N/A"}</p>
//                                         </div>
//                                         <div className="card-actions">
//                                             <FiEye style={{ marginRight: "8px", cursor: "pointer" }} onClick={() => handleRowClick(row.client_id)} />
//                                             <FiMoreVertical style={{ cursor: "pointer" }} onClick={() => openModal(row)} />
//                                         </div>
//                                     </div>
//                                 );
//                             })
//                         )}
//                     </div>
//                 )}
//             </div>

//             {modalClient && (
//                 <div className="modal-overlay" onClick={closeModal}>
//                     <div className="modal-box" onClick={(e) => e.stopPropagation()}>
//                         <h3>Edit Payment Status</h3>
//                         <p><strong>Client:</strong> {modalClient.assigned}</p>
//                         <label>Status</label>
//                         <select
//                             value={updatedStatus}
//                             onChange={(e) => setUpdatedStatus(e.target.value)}
//                         >
//                             <option value="true">Paid</option>
//                             <option value="false">Unpaid</option>
//                         </select>
//                         <div className="modal-actions">
//                             <button onClick={updatePaymentStatus}>Update</button>
//                             <button onClick={closeModal} className="cancel-btn">Cancel</button>
//                         </div>
//                     </div>
//                 </div>
//             )}
//         </div>
//     );
// };

// export default Profile;



// 



import React, { useEffect, useState } from "react";
import './styles/Profile.css';
import { useNavigate } from "react-router-dom";
import { FiEye, FiMoreVertical } from "react-icons/fi";
import { FaPlus } from "react-icons/fa";
import api from './PortChangingComponent/api';

const Profile = () => {
    const [data, setData] = useState([]);
    const [sortedData, setSortedData] = useState([]);
    const [modalClient, setModalClient] = useState(null);
    const [sortBy, setSortBy] = useState('');
    const [sortAsc, setSortAsc] = useState(true);
    const navigate = useNavigate();
    const [passwordMismatch, setPasswordMismatch] = useState(false);

    const today = new Date();

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = () => {
        api.get("/tickets")
            .then((res) => {
                const unique = Array.from(
                    new Map(res.data.map(item => [item.client_id, item])).values()
                );
                setData(unique);
                setSortedData(unique);
            })
            .catch((err) => {
                console.error("Error fetching clients", err);
            });
    };


    const getDaysLeft = (row) => {
        const parts = (row.date || "").split("/");
        if (parts.length !== 3) return null;
        const d = new Date(`20${parts[2]}`, parts[1] - 1, parts[0]);
        return Math.ceil((d - today) / (1000 * 60 * 60 * 24));
    };

    const sortData = (key) => {
        const sorted = [...data];

        if (key === "client_id") {
            sorted.sort((a, b) =>
                sortAsc
                    ? b.priority?.localeCompare(a.priority)
                    : a.priority?.localeCompare(b.priority)
            );
        } else if (key === "assigned") {
            sorted.sort((a, b) =>
                sortAsc
                    ? a.assigned?.localeCompare(b.assigned)
                    : b.assigned?.localeCompare(a.assigned)
            );
        } else if (key === "days") {
            sorted.sort((a, b) => {
                const daysA = getDaysLeft(a) ?? 9999;
                const daysB = getDaysLeft(b) ?? 9999;
                return sortAsc ? daysA - daysB : daysB - daysA;
            });
        } else if (key === "status") {
            sorted.sort((a, b) => {
                const aPaid = a.status === "Paid" ? 1 : 0;
                const bPaid = b.status === "Paid" ? 1 : 0;
                return sortAsc ? bPaid - aPaid : aPaid - bPaid;
            });
        }

        setSortedData(sorted);
        setSortAsc(!sortAsc);
        setSortBy(key);
    };

    const handleRowClick = (clientId) => {
        navigate(`/clientsUser?clientId=${clientId}`);
    };

    const openModal = async (row) => {
        try {
            const res = await api.get(`/clients/${row.client_id}`);
            setModalClient(res.data);
        } catch (err) {
            console.error("❌ Failed to load client details", err);
            setModalClient(row);
        }
    };

    const closeModal = () => {
        setModalClient(null);
    };

    const handleInputChange = (key, value) => {
        setModalClient((prev) => ({ ...prev, [key]: value }));
        if (key === "password" || key === "confirm_password") {
            setPasswordMismatch(
                key === "password"
                    ? value !== modalClient.confirm_password
                    : modalClient.password !== value
            );
        }
    };

    const saveClientChanges = async () => {
        try {
            await api.put(`/clients/${modalClient.id}`, modalClient);
            alert("✅ Client details updated.");
            closeModal();
            fetchClients();
        } catch (err) {
            console.error("❌ Failed to update client", err);
            alert("Something went wrong.");
        }
    };

    return (
        <div className="profile-page">
            <div className="profile-header">
                <h2>Clients Overview</h2>
                <div className="action-buttons">
                    <button className="primary" onClick={() => navigate("/register")}>
                        <FaPlus /> Register
                    </button>
                </div>
            </div>

            <div className="profile-table">
                <table>
                    <thead>
                        <tr>
                            <th onClick={() => sortData("client_id")}>Client ID</th>
                            <th onClick={() => sortData("assigned")}>Client Name</th>
                            <th>Start Date</th>
                            <th>End Date</th>
                            <th onClick={() => sortData("days")}>Days Left</th>
                            <th onClick={() => sortData("status")}>Bill Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedData.map((row, idx) => {
                            const daysLeft = getDaysLeft(row);
                            return (
                                <tr key={idx}>
                                    <td onClick={() => sortData("client_id")}>{row.client_id}</td>
                                    <td>{row.assigned}</td>
                                    <td>{row.start || "—"}</td>
                                    <td>{row.date || "—"}</td>
                                    <td>
                                        {row.status !== "Paid" ? (
                                            <span className="expired">Expired</span>
                                        ) : daysLeft === null ? "—" :
                                            daysLeft < 0 ? <span className="expired">Expired</span> :
                                                <span>{daysLeft} days</span>}

                                    </td>
                                    <td>
                                        <span className={row.status === "Paid" ? "active" : "inactive"}>
                                            {row.status === "Paid" ? "Active" : "Inactive"}
                                        </span>
                                    </td>
                                    <td>
                                        <FiEye onClick={() => handleRowClick(row.client_id)} style={{ marginRight: 8, cursor: "pointer" }} />
                                        <FiMoreVertical onClick={() => openModal(row)} style={{ cursor: "pointer" }} />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {modalClient && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                        <h3>Client Details</h3>
                        <div className="modal-content">
                            {[
                                { label: "First Name", key: "name" },
                                { label: "Last Name", key: "last_name" },
                                { label: "Company", key: "company_name" },
                                { label: "Contact", key: "contact_number" },
                                { label: "Email", key: "email" },
                                { label: "FSSAI", key: "fssai_number" },
                                { label: "License", key: "license_number" },
                                { label: "GSTIN", key: "gst_number" },
                                { label: "PAN", key: "pan_number" },
                                { label: "Address", key: "client_address" },
                                { label: "Website", key: "website" },
                                { label: "DOB", key: "dob", type: "date" },
                                { label: "Gender", key: "gender", type: "select" },
                                { label: "City", key: "city" },
                                { label: "State", key: "state" },
                                { label: "Country", key: "country" },
                                { label: "Country Code", key: "country_code", type: "dialcode" }
                            ].map((field) => (
                                <div key={field.key} className="field-row copyable">
                                    <label>{field.label}:</label>
                                    <div className="input-with-copy">
                                        {field.type === "select" ? (
                                            <select
                                                value={modalClient[field.key] || ""}
                                                onChange={(e) => handleInputChange(field.key, e.target.value)}
                                            >
                                                <option value="">--Select--</option>
                                                <option value="Male">Male</option>
                                                <option value="Female">Female</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        ) : field.type === "dialcode" ? (
                                            <select
                                                value={modalClient[field.key] || ""}
                                                onChange={(e) => handleInputChange(field.key, e.target.value)}
                                            >
                                                <option value="">--Select--</option>
                                                <option value="+91">+91 (India)</option>
                                                <option value="+1">+1 (USA)</option>
                                                <option value="+44">+44 (UK)</option>
                                                <option value="+81">+81 (Japan)</option>
                                                <option value="+61">+61 (Australia)</option>
                                                <option value="+971">+971 (UAE)</option>
                                                <option value="+880">+880 (Bangladesh)</option>
                                            </select>
                                        ) : (
                                            <input
                                                type={field.type || "text"}
                                                value={modalClient[field.key] || ""}
                                                onChange={(e) => handleInputChange(field.key, e.target.value)}
                                            />
                                        )}
                                        <button
                                            className="copy-btn"
                                            title="Copy to clipboard"
                                            onClick={() =>
                                                navigator.clipboard.writeText(modalClient[field.key] || "")
                                            }
                                        >
                                            📋
                                        </button>
                                    </div>
                                </div>
                            ))}

                            <div className="field-row">
                                <label>Payment Status:</label>
                                <select
                                    value={modalClient.bill_paid ? "Paid" : "Unpaid"}
                                    onChange={(e) => handleInputChange("bill_paid", e.target.value === "Paid")}
                                >
                                    <option value="Paid">Paid</option>
                                    <option value="Unpaid">Unpaid</option>
                                </select>
                            </div>

                            {/* Password */}
                            <div className="field-row">
                                <label>Password:</label>
                                <input
                                    type="password"
                                    placeholder="Password"
                                    value={modalClient.password || ""}
                                    onChange={(e) => handleInputChange("password", e.target.value)}
                                />
                            </div>

                            {/* Confirm Password */}
                            <div className="field-row">
                                <label>Confirm Password:</label>
                                <input
                                    type="password"
                                    placeholder="Confirm Password"
                                    value={modalClient.confirm_password || ""}
                                    onChange={(e) => handleInputChange("confirm_password", e.target.value)}
                                    style={{
                                        border:
                                            modalClient.password &&
                                                modalClient.confirm_password &&
                                                modalClient.password !== modalClient.confirm_password
                                                ? "1px solid red"
                                                : undefined,
                                        backgroundColor:
                                            modalClient.password &&
                                                modalClient.confirm_password &&
                                                modalClient.password !== modalClient.confirm_password
                                                ? "#ffe6e6"
                                                : undefined
                                    }}
                                />
                                {modalClient.password &&
                                    modalClient.confirm_password &&
                                    modalClient.password !== modalClient.confirm_password && (
                                        <span style={{ color: "red", fontSize: "0.75em" }}>
                                            Passwords do not match
                                        </span>
                                    )}
                            </div>
                        </div>

                        <div className="modal-actions">
                            <button onClick={saveClientChanges} className="save-btn">
                                Save
                            </button>
                            <button onClick={closeModal} className="cancel-btn">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}


        </div>
    );
};

export default Profile;
