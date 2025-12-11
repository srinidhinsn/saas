import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { FaLock, FaUser, FaEnvelope, FaPhone, FaCalendar, FaUserShield } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Search, Plus, Edit, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import axios from 'axios';

// Main Component
const UserManagement = ({token,clientId}) => {
  const [activeView, setActiveView] = useState('list');

  return (
    <div className="min-h-screen bg-bg-primary">
      <ToastContainer position="top-right" autoClose={3000} />
      
      {/* Navigation Header */}
      {/* <div className="bg-bg-primary shadow-card sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex  space-x-1 py-3">
            <button 
              className={`px-8 py-2.5 font-medium transition-all ${
                activeView === 'list' 
                  ? 'bg-action-primary text-text-white rounded-lg' 
                  : 'text-text-primary hover:text-text-secondary'
              }`}
              onClick={() => setActiveView('list')}
            >
              View Users
            </button>
            <button 
              className={`px-8 py-2.5 font-medium transition-all ${
                activeView === 'add' 
                  ? 'bg-action-primary text-text-white rounded-lg' 
                  : 'text-text-primary hover:text-text-secondary'
              }`}
              onClick={() => setActiveView('add')}
            >
              Add User
            </button>
            <button 
              className={`px-8 py-2.5 font-medium transition-all ${
                activeView === 'reset' 
                  ? 'bg-action-primary text-text-white rounded-lg' 
                  : 'text-text-primary hover:text-text-secondary'
              }`}
              onClick={() => setActiveView('reset')}
            >
              Reset Password
            </button>
          </div>
        </div>
      </div> */}

      {/* Content */}
      <div className="max-w-7xl mx-auto p-4">
        {activeView === 'list' && <UsersList clientId={clientId} token={token} onAddNew={() => setActiveView('add')} />}
        {activeView === 'add' && <AddUserForm  clientId={clientId} token={token}  onCancel={() => setActiveView('list')} onSave={() => setActiveView('list')} />}
        {/* {activeView === 'reset' && <ResetPassword  clientId={clientId} token={token} />} */}
      </div>
    </div>
  );
};

// Users List Component
const UsersList = ({ onAddNew ,clientId,token}) => {

  const [users, setUsers] = useState([]);
  const [filterRole, setFilterRole] = useState("all");
  const [selectionModel, setSelectionModel] = useState([]);
  const [roles, setRoles] = useState([]);
  const [changeRoleValue, setChangeRoleValue] = useState("");
  const [isChangeRoleConfirmOpen, setIsChangeRoleConfirmOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/inventory/read_category?category_id=roles`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.data?.data?.length) {
          const rolesCategory = res.data.data[0];
          setRoles(rolesCategory.subCategories || []);
        }
      } catch (err) {
        console.error("Error fetching roles:", err);
      }
    };
    if (clientId && token) fetchRoles();
  }, [clientId, token]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users/persons`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.data?.data?.persons) {
          const persons = res.data.data.persons.map((person) => ({
            id: person.id,
            username: person.username,
            name: `${person.first_name || ""} ${person.last_name || ""}`.trim(),
            email: person.email,
            phone: person.phone || "",
            role: person.role || "Subscriber",
            avatar: person.avatar || "",
          }));
          setUsers(persons);
        }
      } catch (error) {
        console.error("Error fetching users:", error);
        toast.error("Failed to fetch users");
      }
    };
    if (clientId && token) fetchUsers();
  }, [clientId, token]);

  const filteredUsers = useMemo(() => {
    let filtered = users;
    
    if (filterRole === "admin") {
      filtered = filtered.filter((u) => u.role === "admin");
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((u) => 
        u.username?.toLowerCase().includes(query) ||
        u.name?.toLowerCase().includes(query) ||
        u.email?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [users, filterRole, searchQuery]);

  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredUsers, currentPage]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  const confirmChangeRole = async () => {
    try {
      await Promise.all(
        selectionModel.map(async (userId) => {
          const user = users.find((u) => u.id === userId);
          if (user) {
            await axios.post(
              `${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users/update-role`,
              null,
              {
                params: { username: user.username, new_role: changeRoleValue },
                headers: { Authorization: `Bearer ${token}` },
              }
            );
          }
        })
      );
      const updatedUsers = users.map((user) =>
        selectionModel.includes(user.id) ? { ...user, role: changeRoleValue } : user
      );
      setUsers(updatedUsers);
      setSelectionModel([]);
      setChangeRoleValue("");
      setIsChangeRoleConfirmOpen(false);
      toast.success("Roles updated successfully!");
    } catch (error) {
      console.error("Failed to update role:", error);
      toast.error("Failed to update roles");
    }
  };

  const toggleSelection = (userId) => {
    setSelectionModel(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleSelectAll = () => {
    if (selectionModel.length === paginatedUsers.length) {
      setSelectionModel([]);
    } else {
      setSelectionModel(paginatedUsers.map(u => u.id));
    }
  };

  return (
    <div className="space-y-2">
      {/* Header Section */}
      <div className="bg-bg-primary rounded-lg shadow-sm p-2">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-text-primary">Users Management</h2>
            <p className="text-text-secondary text-sm mt-1">Manage user accounts and permissions</p>
          </div>
          <button
            onClick={onAddNew}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-action-primary text-text-white font-medium hover:bg-bulkActionsHover-addingHover transition-colors"
          >
            <Plus size={18} />
            Add New User
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-text-secondary" size={20} />
          <input
            type="text"
            placeholder="Search by name, username, or email..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-12 pr-4 py-2.5 rounded-lg border border-border-default transition-colors text-text-primary placeholder-text-secondary"
          />
        </div>

        {/* Filter Buttons */}
        {/* <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => {
              setFilterRole("all");
              setSelectionModel([]);
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filterRole === "all"
                ? "bg-action-danger text-text-white"
                : "bg-bg-tertiary text-text-primary hover:bg-gray-200"
            }`}
          >
            All Users ({users.length})
          </button>
          <button
            onClick={() => {
              setFilterRole("admin");
              setSelectionModel([]);
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filterRole === "admin"
                ? "bg-action-danger text-text-white"
                : "bg-bg-tertiary text-text-primary hover:bg-gray-200"
            }`}
          >
            Admins ({users.filter((u) => u.role === "Admin").length})
          </button>
        </div> */}

        {/* Table */}
        <div className="overflow-x-auto rounded-lg border-default border-border-default">
          <table className="w-full">
            <thead className="bg-bg-tertiary border-b-default border-default">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectionModel.length === paginatedUsers.length && paginatedUsers.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-border-default text-action-primary cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-text-secondary bg-bg-primary">
              {paginatedUsers.map((user) => (
                <tr 
                  key={user.id} 
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectionModel.includes(user.id)}
                      onChange={() => toggleSelection(user.id)}
                      className="w-4 h-4 rounded border-border-default text-text-primary focus:ring-action-primary cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-bg-tertiary flex items-center justify-center text-action-primary font-semibold">
                        {user.username?.[0]?.toUpperCase() || "U"}
                      </div>
                      <div>
                        <div className="font-medium text-text-primary text-sm">{user.username || "(no username)"}</div>
                        <div className="text-xs text-text-secondary">{user.name || "-"}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <a href={`mailto:${user.email}`} className="text-text-secondary hover:text-action-danger text-sm hover:underline">
                      {user.email}
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-text-secondary text-sm">{user.phone || "-"}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-bulkActionsHover-updateHover text-text-white">
                      {user.role}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-text-secondary">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredUsers.length)} of {filteredUsers.length} results
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg bg-bg-tertiary text-text-secondary hover:bg-bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="flex gap-1">
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                      currentPage === i + 1
                        ? "bg-action-primary text-text-white"
                        : "bg-bg-tertiary text-text-secondary hover:bg-text-secondary"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <div className="text-text-secondary mb-2">
              <FaUser className="text-5xl mx-auto" />
            </div>
            <p className="text-text-primary">No users found</p>
          </div>
        )}
      </div>

      {/* Role Change Section */}
      {/* {selectionModel.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 w-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Change Role for {selectionModel.length} selected user{selectionModel.length > 1 ? 's' : ''}
              </label>
              <select
                value={changeRoleValue}
                onChange={(e) => setChangeRoleValue(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-700 focus:border-purple-500 focus:outline-none transition-colors"
              >
                <option value="">Select New Role</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.name}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => {
                if (!changeRoleValue) {
                  toast.error("Please select a role");
                  return;
                }
                setIsChangeRoleConfirmOpen(true);
              }}
              className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-purple-600 text-white font-medium hover:bg-purple-700 transition-colors"
            >
              Update Roles
            </button>
          </div>
        </div>
      )} */}

      {/* Confirmation Modal */}
      {/* {isChangeRoleConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-purple-100 flex items-center justify-center">
              <FaUserShield className="text-2xl text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-3 text-center">Confirm Role Change</h3>
            <p className="text-gray-600 mb-6 text-center text-sm">
              You are about to change the role of <strong className="text-purple-600">{selectionModel.length}</strong> user
              {selectionModel.length > 1 ? "s" : ""} to <strong className="text-purple-600">{changeRoleValue}</strong>.
              This action will update their permissions immediately.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setIsChangeRoleConfirmOpen(false)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmChangeRole}
                className="flex-1 px-4 py-2.5 rounded-lg bg-purple-600 text-white font-medium hover:bg-purple-700 transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )} */}
    </div>
  );
};

// Add User Form Component
const AddUserForm = ({ onCancel, onSave,clientId,token }) => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    firstName: "",
    lastName: "",
    dob: "",
    phone: "",
    password: "",
    role: "",
  });

  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/inventory/read_category?category_id=roles`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.data?.data?.length) {
          const rolesCategory = res.data.data[0];
          setRoles(rolesCategory.subCategories || []);
        }
      } catch (err) {
        console.error("Error fetching roles:", err);
      }
    };
    fetchRoles();
  }, [clientId, token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      username: formData.username,
      email: formData.email,
      first_name: formData.firstName,
      last_name: formData.lastName,
      dob: formData.dob || null,
      phone: formData.phone || null,
      password: formData.password,
      roles: [formData.role],
    };

    try {
      await axios.post(
        `${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users/add`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("User added successfully!");
      if (onSave) onSave();
    } catch (error) {
      console.error("Failed to add user:", error);
      toast.error(error?.response?.data?.detail || "Failed to add user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-bg-primary rounded-lg shadow-card p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-text-primary">Add New User</h2>
        <p className="text-text-secondary text-sm mt-1">Create a new user account with role assignment</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Username */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-text-primary mb-1.5">
              <FaUser className="text-action-danger text-xs" />
              Username <span className="text-action-danger">*</span>
            </label>
            <input
              name="username"
              type="text"
              value={formData.username}
              onChange={handleChange}
              required
              className="w-full px-4 py-2.5 rounded-lg border border-border-default focus:border-action-success focus:outline-none transition-colors text-text-primary placeholder-text-secondary"
              placeholder="Enter username"
            />
          </div>

          {/* Email */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-text-primary mb-1.5">
              <FaEnvelope className="text-action-danger text-xs" />
              Email <span className="text-action-danger">*</span>
            </label>
            <input
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-action-success focus:outline-none transition-colors text-text-primary placeholder-text-secondary"
              placeholder="Enter email"
            />
          </div>

          {/* First Name */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-text-primary mb-1.5">
              <FaUser className="text-action-danger text-xs" />
              First Name
            </label>
            <input
              name="firstName"
              type="text"
              value={formData.firstName}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-lg border border-border-default focus:border-action-success focus:outline-none transition-colors text-text-primary placeholder-text-secondary"
              placeholder="Enter first name"
            />
          </div>

          {/* Last Name */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-text-primary mb-1.5">
              <FaUser className="text-action-danger text-xs" />
              Last Name
            </label>
            <input
              name="lastName"
              type="text"
              value={formData.lastName}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-lg border border-border-default focus:border-action-success focus:outline-none transition-colors text-text-primary placeholder-text-secondary"
              placeholder="Enter last name"
            />
          </div>

          {/* Date of Birth */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-text-primary mb-1.5">
              <FaCalendar className="text-action-danger text-xs" />
              Date of Birth
            </label>
            <input
              name="dob"
              type="date"
              value={formData.dob}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-lg border border-border-default focus:border-action-success focus:outline-none transition-colors text-text-primary"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-text-primary mb-1.5">
              <FaPhone className="text-action-danger text-xs" />
              Phone
            </label>
            <input
              name="phone"
              type="text"
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-lg border border-border-default focus:border-action-success focus:outline-none transition-colors text-text-primary placeholder-gray-400"
              placeholder="Enter phone number"
            />
          </div>

          {/* Password */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-text-primary mb-1.5">
              <FaLock className="text-action-danger text-xs" />
              Password <span className="text-action-danger">*</span>
            </label>
            <input
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full px-4 py-2.5 rounded-lg border border-border-default focus:border-action-success focus:outline-none transition-colors text-text-primary placeholder-text-secondary"
              placeholder="Enter password"
            />
          </div>

          {/* Role */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-text-primary mb-1.5">
              <FaUserShield className="text-action-danger text-xs" />
              Role <span className="text-action-danger">*</span>
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              required
              className="w-full px-4 py-2.5 rounded-lg border border-border-default focus:border-action-success focus:outline-none transition-colors text-text-primary"
            >
              <option value="">Select Role</option>
              {roles.map((role) => (
                <option key={role.id} value={role.name}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-4 border-t-default border-border-default">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-lg border border-border-default text-text-primary hover:bg-bg-tertiary transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-lg bg-action-primary text-text-white hover:bg-action-danger hover:text-text-primary transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Adding User..." : "Add New User"}
          </button>
        </div>
      </form>
    </div>
  );
};

// Reset Password Component
const ResetPassword = ({clientId,token}) => {
  const [form, setForm] = useState({
    username: "",
    otp: "",
    old_password: "",
    new_password: "",
    confirm_password: "",
  });

  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetMethod, setResetMethod] = useState("otp");

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleMethodChange = (e) => {
    setResetMethod(e.target.value);
    setForm((prev) => ({ ...prev, otp: "", old_password: "" }));
    if (e.target.value === "old_password") setOtpSent(true);
    else setOtpSent(false);
  };

  const handleSendOtp = async () => {
    if (!form.username) {
      toast.error("Enter username first");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users/reset-password`,
        {
          username: form.username,
          otp: "",
          old_password: "",
          new_password: "",
          confirm_password: "",
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(res.data.message || "OTP sent successfully");
      setOtpSent(true);
    } catch (err) {
      const detail = err?.response?.data?.detail || "Failed to send OTP";
      toast.error(detail);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (!form.new_password || !form.confirm_password) {
      toast.error("Enter new password and confirm password");
      return;
    }

    if (form.new_password !== form.confirm_password) {
      toast.error("Passwords do not match");
      return;
    }

    if (resetMethod === "otp" && !form.otp) {
      toast.error("Enter OTP");
      return;
    }

    if (resetMethod === "old_password" && !form.old_password) {
      toast.error("Enter old password");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        username: form.username,
        new_password: form.new_password,
        confirm_password: form.confirm_password,
        otp: resetMethod === "otp" ? form.otp : "",
        old_password: resetMethod === "old_password" ? form.old_password : "",
      };

      const res = await axios.post(
        `${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users/reset-password`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(res.data.message || "Password reset successfully");
      
      // Reset form
      setForm({
        username: "",
        otp: "",
        old_password: "",
        new_password: "",
        confirm_password: "",
      });
      setOtpSent(false);
    } catch (err) {
      const detail = err?.response?.data?.detail || "Failed to reset password";
      toast.error(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-bg-primary rounded-lg shadow-card p-6">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-bg-tertiary flex items-center justify-center">
            <FaLock className="text-action-primary text-2xl" />
          </div>
          <h2 className="text-2xl font-semibold text-text-primary">Reset Password</h2>
          <p className="text-text-secondary text-sm mt-1">Choose your preferred method to reset password</p>
        </div>

        {/* Reset Method Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-text-primary mb-1.5">Reset Method</label>
          <select
            value={resetMethod}
            onChange={handleMethodChange}
            className="w-full px-4 py-2.5 rounded-lg border border-border-default bg-bg-tertiary text-text-primary focus:outline-none focus:border-action-success transition-colors"
          >
            <option value="otp">Reset via OTP</option>
            <option value="old_password">Reset via Old Password</option>
          </select>
        </div>

        {/* Form */}
        <form onSubmit={handleResetPassword} className="space-y-4">
          {/* Username */}
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-text-primary mb-1.5">
              Username <span className="text-action-danger">*</span>
            </label>
            <div className="relative">
              <FaUser className="absolute left-4 top-1/2 transform -translate-y-1/2 text-text-secondary text-sm" />
              <input
                type="text"
                name="username"
                placeholder="Enter username"
                value={form.username}
                onChange={handleChange}
                required
                className="w-full pl-11 pr-4 py-2.5 rounded-lg border-default border-border-default bg-bg-tertiary text-text-primary focus:outline-none focus:border-action-success transition-colors"
              />
            </div>
          </div>

          {/* OTP Flow */}
          {resetMethod === "otp" && (
            <>
              {!otpSent ? (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={loading}
                  className="w-full py-2.5 rounded-lg bg-action-primary text-white font-medium hover:bg-action-danger transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Sending OTP..." : "Send OTP"}
                </button>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">
                    OTP <span className="text-action-danger">*</span>
                  </label>
                  <div className="relative">
                    <FaLock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-text-secondary text-sm" />
                    <input
                      type="text"
                      name="otp"
                      placeholder="Enter OTP"
                      value={form.otp}
                      onChange={handleChange}
                      className="w-full pl-11 pr-4 py-2.5 rounded-lg border border-border-default bg-bg-tertiary text-text-secondary focus:outline-none focus:border-action-success transition-colors"
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {/* Old Password Flow */}
          {resetMethod === "old_password" && (
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Old Password <span className="text-action-danger">*</span>
              </label>
              <div className="relative">
                <FaLock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-text-secondary text-sm" />
                <input
                  type="password"
                  name="old_password"
                  placeholder="Enter old password"
                  value={form.old_password}
                  onChange={handleChange}
                  className="w-full pl-11 pr-4 py-2.5 rounded-lg border-default border-border-default bg-bg-tertiary text-text-primary focus:outline-none focus:border-action-success transition-colors"
                />
              </div>
            </div>
          )}

          {/* New Password */}
          {(otpSent || resetMethod === "old_password") && (
            <>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  New Password <span className="text-action-danger">*</span>
                </label>
                <div className="relative">
                  <FaLock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-text-secondary text-sm" />
                  <input
                    type="password"
                    name="new_password"
                    placeholder="Enter new password"
                    value={form.new_password}
                    onChange={handleChange}
                    required
                    className="w-full pl-11 pr-4 py-2.5 rounded-lg border-default border-border-default bg-bg-tertiary text-text-primary focus:outline-none focus:border-action-success transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  Confirm Password <span className="text-action-danger">*</span>
                </label>
                <div className="relative">
                  <FaLock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-text-secondary text-sm" />
                  <input
                    type="password"
                    name="confirm_password"
                    placeholder="Confirm new password"
                    value={form.confirm_password}
                    onChange={handleChange}
                    required
                    className="w-full pl-11 pr-4 py-2.5 rounded-lg border-default border-border-default bg-bg-tertiary text-text-primary focus:outline-none focus:border-action-success transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-action-primary text-text-white font-medium hover:bg-action-danger hover:text-text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Resetting Password..." : "Reset Password"}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
};

export default UserManagement;