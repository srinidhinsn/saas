import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../PortChangingComponent/api";

const ClientsTable = () => {
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [searchParams] = useSearchParams();
    const clientId = searchParams.get("clientId");

    useEffect(() => {
        if (clientId) {
            api
                .get(`/clients/${clientId}/users`)
                .then((res) => setUsers(res.data))
                .catch((err) => console.error("Failed to fetch client users", err));
        }
    }, [clientId]);

    return (
        <div style={{ padding: "20px" }}>
            <h2>Users of Client #{clientId}</h2>

            {users.length === 0 ? (
                <p>No users found.</p>
            ) : (
                <table border="1" cellPadding="10" style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                        <tr>
                            <th>Client ID</th>
                            <th>Name</th>
                            <th>Customer Number</th>
                            <th>Email</th>
                            <th>Address</th>
                            <th>Review</th>
                            <th>Rating</th>
                            <th>More</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user) => (
                            <tr key={user.id}>
                                <td>{clientId}</td>
                                <td>{user.name}</td>
                                <td>{user.customer_number}</td>
                                <td>{user.email}</td>
                                <td>{user.address}</td>
                                <td>{user.review}</td>
                                <td>{user.rating}</td>
                                <td>
                                    <button
                                        onClick={() => setSelectedUser(user)}
                                        style={{
                                            background: "none",
                                            border: "none",
                                            fontSize: "18px",
                                            cursor: "pointer"
                                        }}
                                        aria-label="View more details"
                                    >
                                        ⋯
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {/* Modal UI */}
            {selectedUser && (
                <>
                    <div className="modal-backdrop" onClick={() => setSelectedUser(null)} />
                    <div className="modal-container">
                        <h3>User Details</h3>
                        <ul>
                            {Object.entries(selectedUser).map(([key, value]) => (
                                <li key={key}>
                                    <strong>{key}:</strong> {String(value ?? "—")}
                                </li>
                            ))}
                        </ul>
                        <button onClick={() => setSelectedUser(null)}>Close</button>
                    </div>
                </>
            )}
        </div>
    );
};

export default ClientsTable;
