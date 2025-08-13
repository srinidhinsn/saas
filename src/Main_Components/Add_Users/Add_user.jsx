import React, { useState } from 'react';
import UsersList from './UserList';
import UserForm from './AddUserForm';

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
    const [users, setUsers] = useState([]);
    const [editingUser, setEditingUser] = useState(null);
    const [showForm, setShowForm] = useState(false);

    const handleAddNew = () => {
        setEditingUser(null);
        setShowForm(true);
    };

    const handleSave = (user) => {
        if (editingUser !== null) {
            const updatedUsers = [...users];
            updatedUsers[editingUser] = user;
            setUsers(updatedUsers);
        } else {
            setUsers([...users, user]);
        }
        setShowForm(false);
    };

    const handleEdit = (index) => {
        setEditingUser(index);
        setShowForm(true);
    };

    const handleDelete = (index) => {
        setUsers(users.filter((_, i) => i !== index));
    };

    return (
        <div className="add-users-container">
            {showForm ? (
                <UserForm
                    initialData={editingUser !== null ? users[editingUser] : initialUser}
                    onSave={handleSave}
                    onCancel={() => setShowForm(false)}
                />
            ) : (
                <UsersList
                    users={users}
                    onAddNew={handleAddNew}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                />
            )}
        </div>
    );
};

export default AddUsers;
