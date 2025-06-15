import React from 'react';
import '../styles/Button.css'

const Button = ({ text, onClick, type = 'button', variant = 'primary', disabled = false }) => {
    return (
        <button
            type={type}
            className={`btn ${variant}`}
            onClick={onClick}
            disabled={disabled}
        >
            {text}
        </button>
    );
};

export default Button;
