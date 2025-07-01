import React, { useState } from 'react'

const Input = () => {
    const [clientId, setClientId] = useState(() => localStorage.getItem("clientId") || "");
    const handleClientIdChange = (e) => {
        const newClientId = e.target.value;
        setClientId(newClientId);
        // setSelectedTableId("");
        localStorage.setItem("clientId", newClientId);
    }
    return (
        <div>
            <input
                type="text"
                placeholder="Enter client ID"
                value={clientId}
                onChange={handleClientIdChange} />

        </div>
    )
}

export default Input
