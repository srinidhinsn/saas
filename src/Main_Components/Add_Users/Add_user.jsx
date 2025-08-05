import React, { useState } from "react";

const AddUserPage = () => {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        role: "",
        status: "active",
        password: "",
        confirmPassword: "",
    });

    const [users, setUsers] = useState([]);
    const [editIndex, setEditIndex] = useState(null);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editIndex !== null) {
            const updated = [...users];
            updated[editIndex] = formData;
            setUsers(updated);
            setEditIndex(null);
        } else {
            setUsers([{ ...formData }, ...users]);
        }
        resetForm();
    };

    const handleEdit = (index) => {
        setFormData(users[index]);
        setEditIndex(index);
    };

    const handleDelete = (index) => {
        if (window.confirm("Are you sure you want to delete this user?")) {
            const updated = users.filter((_, i) => i !== index);
            setUsers(updated);
            resetForm();
        }
    };

    const resetForm = () => {
        setFormData({
            name: "",
            email: "",
            role: "",
            status: "active",
            password: "",
            confirmPassword: "",
        });
        setEditIndex(null);
    };

    return (
        <div className="user-page-container">
            <h2>{editIndex !== null ? "Edit User" : "Add User"}</h2>
            <form className="user-form" onSubmit={handleSubmit}>
                <div className="form-row">
                    <input
                        type="text"
                        name="name"
                        placeholder="Name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                    />
                    <input
                        type="email"
                        name="email"
                        placeholder="Email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                    />
                </div>
                <div className="form-row">
                    <select name="role" value={formData.role} onChange={handleChange} required>
                        <option value="">Role</option>
                        <option value="admin">Admin</option>
                        <option value="manager">Manager</option>
                        <option value="staff">Staff</option>
                    </select>
                    <select name="status" value={formData.status} onChange={handleChange}>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </div>
                <div className="form-row">
                    <input
                        type="password"
                        name="password"
                        placeholder="Password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                    />
                    <input
                        type="password"
                        name="confirmPassword"
                        placeholder="Confirm Password"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        required
                    />
                </div>
                <div className="form-actions">
                    <button type="submit">{editIndex !== null ? "Save Changes" : "Add User"}</button>
                    {editIndex !== null && <button type="button" onClick={resetForm}>Cancel</button>}
                </div>
            </form>

            {users.length > 0 && (
                <div className="user-list">
                    <h3>Existing Users</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((u, i) => (
                                <tr key={i}>
                                    <td>{u.name}</td>
                                    <td>{u.email}</td>
                                    <td>{u.role}</td>
                                    <td>{u.status}</td>
                                    <td className="action-cell">
                                        <button className="edit-btn" onClick={() => handleEdit(i)}>Edit</button>
                                        <button className="delete-btn" onClick={() => handleDelete(i)}>Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default AddUserPage;
