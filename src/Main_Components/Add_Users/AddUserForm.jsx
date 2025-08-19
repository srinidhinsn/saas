import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import userServicesPort from "../../Backend_Port_Files/UserServices";

const AddUserForm = ({ onCancel, onSave }) => {
    const [formData, setFormData] = useState({
        username: "",
        email: "",
        firstName: "",
        lastName: "",
        dob: "",
        phone: "",
        password: "",
        role: "Admin",
    });

    const { clientId } = useParams();
    const token = localStorage.getItem("access_token");

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const payload = {
            username: formData.username,
            email: formData.email,
            first_name: formData.firstName,
            last_name: formData.lastName,
            dob: formData.dob || null,
            phone: formData.phone || null,
            password: formData.password,
            // roles: [formData.role], // backend expects an array
            // grants: [], // you can add UI to set these
        };

        try {
            const res = await userServicesPort.post(`/${clientId}/users/add`, payload, 
                {
                headers: { Authorization: `Bearer ${token}` },
            });

            console.log("User added successfully:", data);

            if (onSave) onSave();
        } catch (error) {
            console.error("Failed to add user:", error);
        }
    };

    return (
        <div className="Add-userform-container">
            <div className="wp-add-user-container">
                <h1>Add New User</h1>

                <form onSubmit={handleSubmit} className="wp-add-user-form">
                    {/* Username */}
                    <div className="form-row">
                        <label htmlFor="username">
                            Username <span className="required">*</span>
                        </label>
                        <input
                            id="username"
                            name="username"
                            type="text"
                            value={formData.username}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    {/* Email */}
                    <div className="form-row">
                        <label htmlFor="email">
                            Email <span className="required">*</span>
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    {/* First Name */}
                    <div className="form-row">
                        <label htmlFor="firstName">First Name</label>
                        <input
                            id="firstName"
                            name="firstName"
                            type="text"
                            value={formData.firstName}
                            onChange={handleChange}
                        />
                    </div>

                    {/* Last Name */}
                    <div className="form-row">
                        <label htmlFor="lastName">Last Name</label>
                        <input
                            id="lastName"
                            name="lastName"
                            type="text"
                            value={formData.lastName}
                            onChange={handleChange}
                        />
                    </div>

                    {/* DOB */}
                    <div className="form-row">
                        <label htmlFor="dob">Date of Birth</label>
                        <input
                            id="dob"
                            name="dob"
                            type="date"
                            value={formData.dob}
                            onChange={handleChange}
                        />
                    </div>

                    {/* Phone */}
                    <div className="form-row">
                        <label htmlFor="phone">Phone</label>
                        <input
                            id="phone"
                            name="phone"
                            type="text"
                            value={formData.phone}
                            onChange={handleChange}
                        />
                    </div>

                    {/* Password */}
                    <div className="form-row">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    {/* Role */}
                    <div className="form-row">
                        <label htmlFor="role">Role</label>
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
        </div>
    );
};

export default AddUserForm;
