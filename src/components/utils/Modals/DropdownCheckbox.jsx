import React, { useState, useEffect, useRef } from 'react';

const DropdownCheckbox = ({ selected = [], options = [], onChange, label = "Select Add-ons" }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleSelect = (id) => {
    const newSelected = selected.includes(id)
      ? selected.filter(val => val !== id)
      : [...selected, id];
    onChange(newSelected);
  };

  return (
    <div ref={ref} className="relative w-full">
      <div
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-2 rounded-lg bg-bg-primary border border-border-default text-text-primary cursor-pointer flex items-center justify-between"
      >
        <span className="text-sm">
          {selected.length > 0 ? `${selected.length} ${label} selected` : label}
        </span>
        <span className="text-text-secondary">▾</span>
      </div>
      {open && (
        <div className="absolute z-10 w-full mt-1 bg-bg-primary border border-border-default rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {options.map(option => (
            <label key={option.id} className="flex items-center px-4 py-2 hover:bg-bg-secondary cursor-pointer text-text-primary">
              <input
                type="checkbox"
                checked={selected.includes(option.id)}
                onChange={() => toggleSelect(option.id)}
                className="mr-3"
              />
              <span className="text-sm">{option.name}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

export default DropdownCheckbox;