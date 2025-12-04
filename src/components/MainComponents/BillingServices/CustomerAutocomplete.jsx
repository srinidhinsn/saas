import React, { useState, useEffect, useRef } from "react";

export default function CustomerAutocomplete({
  value,
  onChange,
  onSelectCustomer,
  customers,
  placeholder = "Enter customer ID",
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
      const filtered = customers.filter((customer) =>
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
    <div ref={wrapperRef} className="relative w-full">
      <input
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={() => value && setShowSuggestions(true)}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition"
      />

      {showSuggestions && filteredCustomers.length > 0 && (
        <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto mt-1 z-50">
          {filteredCustomers.map((customer, idx) => (
            <div
              key={idx}
              onClick={() => handleSelectSuggestion(customer)}
              className="px-3 py-2 cursor-pointer hover:bg-orange-50 transition"
            >
              <div className="text-sm font-semibold text-orange-600 mb-1">
                {customer.customer_id}
              </div>
              <div className="flex flex-col text-xs text-gray-600 gap-0.5">
                {customer.contact_email && (
                  <span>
                    📧 {customer.contact_email}
                  </span>
                )}
                {customer.contact_phone && (
                  <span>
                    📱 {customer.contact_phone}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
