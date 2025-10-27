// Add this new component in your BillingPage.jsx file or create a separate file

import React, { useState, useEffect, useRef } from "react";

// Customer Autocomplete Component
export default function CustomerAutocomplete({ 
  value, 
  onChange, 
  onSelectCustomer, 
  customers, 
  placeholder = "Enter customer ID" 
}) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (value && value.length > 0) {
      const filtered = customers.filter(customer =>
        customer.customer_id?.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredCustomers(filtered);
    } else {
      setFilteredCustomers([]);
    }
  }, [value, customers]);

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    onChange(newValue);
    setShowSuggestions(true);
  };

  const handleSelectSuggestion = (customer) => {
    onChange(customer.customer_id);
    onSelectCustomer(customer);
    setShowSuggestions(false);
  };

  return (
    <div ref={wrapperRef} style={{ position: "relative", width: "100%" }}>
      <input
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={() => value && setShowSuggestions(true)}
        className="inv--input"
        placeholder={placeholder}
        autoComplete="off"
      />
      
      {showSuggestions && filteredCustomers.length > 0 && (
        <div className="customer-suggestions-dropdown">
          {filteredCustomers.map((customer, idx) => (
            <div
              key={idx}
              className="customer-suggestion-item"
              onClick={() => handleSelectSuggestion(customer)}
            >
              <div className="suggestion-id">
                <strong>{customer.customer_id}</strong>
              </div>
              <div className="suggestion-details">
                {customer.contact_email && (
                  <span className="suggestion-email">{customer.contact_email}</span>
                )}
                {customer.contact_phone && (
                  <span className="suggestion-phone">{customer.contact_phone}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Add these styles to your CSS file
const styles = `
.customer-suggestions-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  max-height: 250px;
  overflow-y: auto;
  z-index: 1000;
  margin-top: 4px;
}

.customer-suggestion-item {
  padding: 12px;
  cursor: pointer;
  border-bottom: 1px solid #f0f0f0;
  transition: background-color 0.2s;
}

.customer-suggestion-item:last-child {
  border-bottom: none;
}

.customer-suggestion-item:hover {
  background-color: #f5f5f5;
}

.suggestion-id {
  margin-bottom: 4px;
  color: #333;
  font-size: 14px;
}

.suggestion-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
  color: #666;
}

.suggestion-email,
.suggestion-phone {
  display: block;
}

.suggestion-email::before {
  content: "📧 ";
  margin-right: 4px;
}

.suggestion-phone::before {
  content: "📱 ";
  margin-right: 4px;
}
`;