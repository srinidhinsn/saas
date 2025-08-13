import React, { useState } from "react";

const AddUserForm = ({ onCancel, onSave }) => {
    const [formData, setFormData] = useState({
        username: "",
        email: "",
        firstName: "",
        lastName: "",
        website: "",
        password: "",
        role: "",
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Save user logic (example: localStorage)
        const savedUsers = JSON.parse(localStorage.getItem("users")) || [];
        savedUsers.push({
            username: formData.username,
            name: `${formData.firstName} ${formData.lastName}`.trim(),
            email: formData.email,
            role: formData.role,
            posts: 0,
            avatar: "",
        });
        localStorage.setItem("users", JSON.stringify(savedUsers));

        if (onSave) onSave();
    };

    return (
        <div className="wp-add-user-container">
            <h1>Add New User</h1>

            <form onSubmit={handleSubmit} className="wp-add-user-form">
                {/* Username */}
                <div className="form-row">
                    <label htmlFor="username">
                        Username <span className="required">*</span>
                    </label>
                    <div>
                        <input
                            id="username"
                            name="username"
                            type="text"
                            value={formData.username}
                            onChange={handleChange}
                            required
                        />
                        <p className="description">Required. The username cannot be changed.</p>
                    </div>
                </div>

                {/* Email */}
                <div className="form-row">
                    <label htmlFor="email">
                        Email <span className="required">*</span>
                    </label>
                    <div>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                    </div>
                </div>

                {/* First Name */}
                <div className="form-row">
                    <label htmlFor="firstName">First Name</label>
                    <div>
                        <input
                            id="firstName"
                            name="firstName"
                            type="text"
                            value={formData.firstName}
                            onChange={handleChange}
                        />
                    </div>
                </div>

                {/* Last Name */}
                <div className="form-row">
                    <label htmlFor="lastName">Last Name</label>
                    <div>
                        <input
                            id="lastName"
                            name="lastName"
                            type="text"
                            value={formData.lastName}
                            onChange={handleChange}
                        />
                    </div>
                </div>

                {/* Website */}
                <div className="form-row">
                    <label htmlFor="website">Website</label>
                    <div>
                        <input
                            id="website"
                            name="website"
                            type="url"
                            value={formData.website}
                            onChange={handleChange}
                        />
                    </div>
                </div>

                {/* Password */}
                <div className="form-row">
                    <label htmlFor="password">Password</label>
                    <div>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                        />
                        <p className="description">
                            A password will be generated automatically if you leave this blank.
                        </p>
                    </div>
                </div>

                {/* Role */}
                <div className="form-row">
                    <label htmlFor="role">Role</label>
                    <div>
                        <select
                            id="role"
                            name="role"
                            value={formData.role}
                            onChange={handleChange}
                        >
                            <option value="Admin">Admin</option>
                            <option value="Receptionist">Receptionist</option>
                            <option value="Manager">Manager</option>
                            <option value="Waiter">Waiter</option>
                            <option value="Chef">Chef</option>
                        </select>
                    </div>
                </div>

                {/* Buttons */}
                <div className="form-buttons">
                    <button type="submit" className="button button-primary">
                        Add New User
                    </button>
                    <button type="button" className="button" onClick={onCancel}>
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AddUserForm;
