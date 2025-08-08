import React, { useState } from 'react';


const initialUser = {
    name: '',
    email: '',
    phone: '',
    address: '',
    role: '',
    gender: '',
    dob: '',
    password: '',
    confirmPassword: '',
};

const AddUsers = () => {
    const [user, setUser] = useState(initialUser);
    const [users, setUsers] = useState([]);
    const [editIndex, setEditIndex] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setUser((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editIndex !== null) {
            const updatedUsers = [...users];
            updatedUsers[editIndex] = user;
            setUsers(updatedUsers);
            setEditIndex(null);
        } else {
            setUsers([...users, user]);
        }
        setUser(initialUser);
    };

    const handleDelete = (index) => {
        const updatedUsers = users.filter((_, i) => i !== index);
        setUsers(updatedUsers);
    };

    const openEditModal = (user, index) => {
        setSelectedUser({ ...user, index });
        setShowModal(true);
    };

    const updateUser = () => {
        const updatedUsers = [...users];
        updatedUsers[selectedUser.index] = selectedUser;
        setUsers(updatedUsers);
        setShowModal(false);
    };

    return (
        <div className="add-user-page">
            <form className="user-form" onSubmit={handleSubmit}>
                <div className="form-grid">
                    <input name="name" placeholder="Name" value={user.name} onChange={handleChange} required />
                    <input name="email" placeholder="Email" value={user.email} onChange={handleChange} required />
                    <input name="phone" placeholder="Phone" value={user.phone} onChange={handleChange} required />
                    <input name="address" placeholder="Address" value={user.address} onChange={handleChange} />

                    <select name="role" value={user.role} onChange={handleChange} required>
                        <option value="">Select Role</option>
                        <option value="Admin">Admin</option>
                        <option value="Editor">Editor</option>
                        <option value="Viewer">Viewer</option>
                    </select>

                    <select name="gender" value={user.gender} onChange={handleChange} required>
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                    </select>

                    <input name="dob" type="date" placeholder="DOB" value={user.dob} onChange={handleChange} required />
                    <input name="password" type="password" placeholder="Password" value={user.password} onChange={handleChange} required />
                    <input name="confirmPassword" type="password" placeholder="Confirm Password" value={user.confirmPassword} onChange={handleChange} required />
                </div>
                <button type="submit" className="submit-btn">
                    {editIndex !== null ? 'Update User' : 'Add User'}
                </button>
            </form>

            <div className="user-grid">
                {users.map((u, index) => (
                    <div key={index} className="user-card" onClick={() => openEditModal(u, index)}>
                        <div className="user-name">{u.name}</div>
                        <div className="user-role">{u.role}</div>
                    </div>
                ))}
            </div>

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal animated-modal">
                        <h3>Edit User</h3>
                        <div className="modal-grid">
                            {Object.keys(initialUser).map((field) => (
                                field === 'role' || field === 'gender' ? (
                                    <select
                                        key={field}
                                        name={field}
                                        value={selectedUser[field] || ''}
                                        onChange={(e) => setSelectedUser((prev) => ({ ...prev, [field]: e.target.value }))}
                                    >
                                        <option value="">Select {field[0].toUpperCase() + field.slice(1)}</option>
                                        {field === 'role' ? (
                                            ['Admin', 'Editor', 'Viewer']
                                        ) : (
                                            ['Male', 'Female', 'Other']
                                        ).map((opt) => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        key={field}
                                        type={field.includes('password') ? 'password' : field === 'dob' ? 'date' : 'text'}
                                        name={field}
                                        value={selectedUser[field] || ''}
                                        onChange={(e) =>
                                            setSelectedUser((prev) => ({ ...prev, [field]: e.target.value }))
                                        }
                                    />
                                )
                            ))}
                        </div>
                        <div className="modal-actions">
                            <button onClick={updateUser}>Save</button>
                            <button onClick={() => handleDelete(selectedUser.index)}>Delete</button>
                            <button onClick={() => setShowModal(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AddUsers;
