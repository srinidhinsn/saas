import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import userServicesPort from "../../Backend_Port_Files/UserServices";

const AddUserForm = ({ onCancel, onSave }) => {
    const { clientId } = useParams();

    const [formData, setFormData] = useState({
        first_name: "",
        last_name: "",
        dob: "",
        email: "",
        phone: "",
        username: "",
        password: "",
    });

    const [loading, setLoading] = useState(false);
    const [showPwd, setShowPwd] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const requiredMissing =
        !formData.first_name.trim() ||
        !formData.username.trim() ||
        !formData.password.trim();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (requiredMissing) {
            toast.error("First name, Username, and Password are required");
            return;
        }

        setLoading(true);
        try {
            const payload = {
                first_name: formData.first_name,
                last_name: formData.last_name || null,
                dob: formData.dob || null,
                email: formData.email || null,
                phone: formData.phone || null,
                username: formData.username,
                password: formData.password,
                roles: ["staff"],
                grants: [],
            };

            const res = await userServicesPort.post(
                `/users/add`,
                payload,
                { params: { client_id: clientId } } // ✅ client_id sent as query param
            );

            toast.success(res.data?.message || "User added successfully");

            setFormData({
                first_name: "",
                last_name: "",
                dob: "",
                email: "",
                phone: "",
                username: "",
                password: "",
            });

            if (onSave) onSave();
        } catch (error) {
            console.error(error);
            const msg = error?.response?.data?.detail || "Failed to add user";
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4 bg-white shadow-md rounded-md max-w-lg mx-auto">
            <h1 className="text-xl font-bold mb-4">Add New User</h1>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* First Name */}
                <div>
                    <label className="block font-medium">
                        First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                        name="first_name"
                        type="text"
                        value={formData.first_name}
                        onChange={handleChange}
                        className="border rounded w-full p-2"
                        required
                    />
                </div>

                {/* Last Name */}
                <div>
                    <label className="block font-medium">Last Name</label>
                    <input
                        name="last_name"
                        type="text"
                        value={formData.last_name}
                        onChange={handleChange}
                        className="border rounded w-full p-2"
                    />
                </div>

                {/* DOB */}
                <div>
                    <label className="block font-medium">Date of Birth</label>
                    <input
                        name="dob"
                        type="date"
                        value={formData.dob}
                        onChange={handleChange}
                        className="border rounded w-full p-2"
                    />
                </div>

                {/* Email */}
                <div>
                    <label className="block font-medium">Email</label>
                    <input
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="border rounded w-full p-2"
                    />
                </div>

                {/* Phone */}
                <div>
                    <label className="block font-medium">Phone</label>
                    <input
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleChange}
                        className="border rounded w-full p-2"
                    />
                </div>

                {/* Username */}
                <div>
                    <label className="block font-medium">
                        Username <span className="text-red-500">*</span>
                    </label>
                    <input
                        name="username"
                        type="text"
                        value={formData.username}
                        onChange={handleChange}
                        className="border rounded w-full p-2"
                        required
                    />
                </div>

                {/* Password */}
                <div>
                    <label className="block font-medium">
                        Password <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                        <input
                            name="password"
                            type={showPwd ? "text" : "password"}
                            value={formData.password}
                            onChange={handleChange}
                            className="border rounded w-full p-2"
                            required
                            minLength={6}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPwd((s) => !s)}
                            className="px-3 py-1 border rounded"
                        >
                            {showPwd ? "Hide" : "Show"}
                        </button>
                    </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-2">
                    <button
                        type="submit"
                        disabled={loading || requiredMissing}
                        className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
                    >
                        {loading ? "Adding..." : "Add User"}
                    </button>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="border px-4 py-2 rounded"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AddUserForm;
