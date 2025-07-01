import React, { useEffect, useState } from "react";
import "./styles/ModernClients.css";
import { useNavigate } from "react-router-dom";
import { FiSearch, FiEye } from "react-icons/fi";
import { MdSort } from "react-icons/md";
import { FaUserPlus } from "react-icons/fa";
import api from './PortChangingComponent/api'

function Clients() {
    const navigate = useNavigate();
    const [clients, setClients] = useState([]);
    const [filteredClients, setFilteredClients] = useState([]);
    const [search, setSearch] = useState("");
    const [sortAsc, setSortAsc] = useState(true);

    useEffect(() => {
        const fetchClients = async () => {
            try {
                const res = await api.get("/clients/full-details");
                setClients(res.data);
                setFilteredClients(res.data);
            } catch (err) {
                console.error("Error fetching clients:", err);
                setClients([]);
            }
        };

        fetchClients();
    }, []);


    useEffect(() => {
        const filtered = clients.filter(client =>
            client.name.toLowerCase().includes(search.toLowerCase()) ||
            client.services.toLowerCase().includes(search.toLowerCase())
        );
        setFilteredClients(filtered);
    }, [search, clients]);

    const handleSort = () => {
        const sorted = [...filteredClients].sort((a, b) =>
            sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
        );
        setFilteredClients(sorted);
        setSortAsc(!sortAsc);
    };

    const handleNavigate = (clientId) => {
        navigate(`/manage?clientId=${clientId}`);
    };

    return (
        <div className="client-page">
            <header className="client-header">
                <h2>Client Service Dashboard</h2>
                <div className="client-tools">
                    <div className="search-box">
                        <FiSearch />
                        <input
                            type="text"
                            placeholder="Search by name or service"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <button className="sort-btn" onClick={handleSort}>
                        <MdSort /> Sort {sortAsc ? "▲" : "▼"}
                    </button>
                    {/* <button className="add-client-btn" onClick={() => navigate("/register")}>
                        <FaUserPlus /> Add Client
                    </button> */}
                </div>
            </header>

            <section className="client-grid">
                {filteredClients.length === 0 ? (
                    <p className="empty-msg">No clients match your search.</p>
                ) : (
                    filteredClients.map((client, index) => (
                        <div
                            key={index}
                            className="client-card"
                            onClick={() => handleNavigate(client.id)}
                        >
                            <div className="client-info">
                                <h3>{client.name}</h3>
                                <p className="services">{client.services}</p>
                            </div>
                            <div className="client-meta">
                                <span>📅 {client.startDate} → {client.endDate}</span>
                                <span className="badge">{client.notify}</span>
                            </div>
                            <div className="client-action">
                                <FiEye className="view-icon" />
                            </div>
                        </div>
                    ))
                )}
            </section>
        </div>
    );
}

export default Clients;
