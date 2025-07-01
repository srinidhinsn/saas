import React from "react";
import './App.css'
import { useNavigate } from "react-router-dom";

function Database() {

    const navigate = useNavigate()

    return (
        <>
            <section id="databaseMgmt" className="section">
                <h1>Database Management</h1>
                <div className="services-grid">
                    <div className="service-card">
                        <h3>Client Database</h3>
                        <p>Manage client records and service subscriptions.</p>
                    </div>
                    <div className="service-card">
                        <h3>User Database</h3>
                        <p>Store and manage platform user information.</p>
                    </div>
                </div>
            </section>
        </>
    )
}

export default Database