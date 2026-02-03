import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FaLock, FaUser, FaEnvelope, FaPhone, FaCalendar, FaUserShield } from "react-icons/fa";
import { Search, Plus, Edit, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import axios from 'axios';
const ConfirmModal = ({
  open,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  danger = false,
  onConfirm,
  onClose,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative animate-fadeIn">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X size={18} />
        </button>

        {/* Title */}
        <h3 className="text-xl font-semibold text-gray-900">
          {title}
        </h3>

        {/* Description */}
        <p className="text-gray-600 mt-2">
          {description}
        </p>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            {cancelText}
          </button>

          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-white ${danger
              ? "bg-red-600 hover:bg-red-700"
              : "bg-blue-600 hover:bg-blue-700"
              }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

const usePermissions = (token, clientId) => {
  const [permissions, setPermissions] = useState({});

  useEffect(() => {
    const fetchPerms = async () => {
      const realm = JSON.parse(atob(token.split(".")[1])).realm;

      const res = await axios.get(
        `${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users/permissions/catalog?realm=${realm}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const perms = {};
      (res.data?.data?.modules || []).forEach(m => {
        perms[m.module] = m.operations || [];
      });

      console.log("FINAL PERMISSIONS MAP ✅", perms);
      setPermissions(perms);
    };

    if (token && clientId) fetchPerms();
  }, [token, clientId]);

  return permissions;
};



const UserManagement = ({ token, clientId }) => {
  const [activeView, setActiveView] = useState('list');
  const [selectedUser, setSelectedUser] = useState(null);

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Content */}
      <div className="max-w-7xl mx-auto p-4">
        {activeView === 'list' && (
          <UsersList
            clientId={clientId}
            token={token}
            onAddNew={() => setActiveView('add')}
            onEdit={(user) => {
              setSelectedUser(user);
              setActiveView('add');
            }}
          />
        )}
        {activeView === 'add' && (
          <AddUserForm
            isEdit={!!selectedUser}
            editUser={selectedUser}
            clientId={clientId}
            token={token}
            onCancel={() => {
              setSelectedUser(null);
              setActiveView('list');
            }}
            onSave={() => {
              setSelectedUser(null);
              setActiveView('list');
            }}
          />
        )}
      </div>
    </div>
  );
};

// Users List Component
const UsersList = ({ onAddNew, clientId, token, onEdit }) => {

  const [users, setUsers] = useState([]);
  const [filterRole, setFilterRole] = useState("all");
  const [selectionModel, setSelectionModel] = useState([]);
  const [roles, setRoles] = useState([]);
  const [changeRoleValue, setChangeRoleValue] = useState("");
  const [isChangeRoleConfirmOpen, setIsChangeRoleConfirmOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const permissions = usePermissions(token, clientId);

  const canAddRole = permissions.roles?.includes("create") ?? false;
  const canDeleteRole = permissions.roles?.includes("delete") ?? false;
  const canDeleteUser = permissions.users?.includes("delete") ?? false;
  const [showAddRole, setShowAddRole] = useState(false);
  const [showDeleteRole, setShowDeleteRole] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState(null);

  const nav = useNavigate()
  function navigator() {
    nav('../role-config');

  }
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
    console.log("PERMISSIONS 🔥", permissions);
  }, [permissions]);

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
    } catch (error) {
      console.error("Failed to update role:", error);
    }
  };
  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Delete this user?")) return;

    try {
      await axios.delete(
        `${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (e) {
      console.error("Delete failed", e);
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
          <div className="flex items-center gap-2">
            <button
              onClick={onAddNew}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-action-primary text-text-white"
            >
              <Plus size={18} />
              Add New User
            </button>
            {/* <button
              onClick={() => setShowAddRole(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg border"
            >
              <Plus size={16} />
              Add Role
            </button>


            <button
              onClick={() => setShowDeleteRole(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg border text-red-600"
            >
              <Trash2 size={16} />
              Delete Role
            </button> */}



            <button
              onClick={navigator}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border-default"
            >
              <FaUserShield />
              Role Config
            </button>
          </div>

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
                <th className="px-4 py-3 text-xs font-semibold text-text-secondary uppercase">
                  Actions
                </th>

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

                  <td className="px-4 py-3 flex gap-3">
                    <button
                      onClick={() => onEdit(user)}
                      className="text-action-primary hover:text-action-danger"
                      title="Edit user"
                    >
                      <Edit size={16} />
                    </button>

                    <button
                      onClick={() => setDeleteUserId(user.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 size={16} />
                    </button>


                  </td>


                </tr>

              ))}
            </tbody>
          </table>
        </div>
        <ConfirmModal
          open={showAddRole}
          title="Add New Role"
          description="Are you sure you want to create a new role? You can configure its permissions later."
          confirmText="Create Role"
          onClose={() => setShowAddRole(false)}
          onConfirm={() => {
            if (!canAddRole) {
              alert("You don't have permission to add roles");
              return;
            }
            setShowAddRole(false);
            nav("../roles/add");
          }}
        />
        <ConfirmModal
          open={showDeleteRole}
          title="Delete Role"
          description="This will permanently delete the role and its configurations. This action cannot be undone."
          confirmText="Delete Role"
          danger
          onClose={() => setShowDeleteRole(false)}
          onConfirm={() => {
            if (!canDeleteRole) {
              alert("You don't have permission to delete roles");
              return;
            }
            setShowDeleteRole(false);
            nav("../roles");
          }}
        />
        <ConfirmModal
          open={!!deleteUserId}
          title="Delete User"
          description="This user will be permanently removed from the system."
          confirmText="Delete User"
          danger
          onClose={() => setDeleteUserId(null)}
          onConfirm={() => {
            if (!canDeleteUser) {
              alert("You don't have permission to delete users");
              return;
            }
            handleDeleteUser(deleteUserId);
            setDeleteUserId(null);
          }}
        />

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
                    className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${currentPage === i + 1
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
    </div>
  );
};

// Add User Form Component
const AddUserForm = ({ onCancel, onSave, clientId, token, editUser = null, isEdit = false }) => {
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
    if (isEdit && editUser) {
      setFormData({
        username: editUser.username || "",
        email: editUser.email || "",
        firstName: editUser.first_name || "",
        lastName: editUser.last_name || "",
        dob: editUser.dob || "",
        phone: editUser.phone || "",
        password: "",
        role: editUser.role || "",
      });
    }
  }, [isEdit, editUser]);

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
      const url = isEdit
        ? `${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users/person-details`
        : `${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users/add`;

      const finalPayload = isEdit
        ? {
          user_id: editUser.id,
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          roles: [formData.role],
        }
        : payload;

      await axios.post(url, finalPayload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (onSave) onSave();
    } catch (error) {
      console.error(`Failed to ${isEdit ? 'update' : 'add'} user:`, error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-bg-primary rounded-lg shadow-card p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-text-primary">
          {isEdit ? "Edit User" : "Add New User"}
        </h2>
        <p className="text-text-secondary text-sm mt-1">
          {isEdit ? "Update user account details and role assignment" : "Create a new user account with role assignment"}
        </p>
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
              disabled={isEdit}
              value={formData.username}
              onChange={handleChange}
              required
              className={`w-full px-4 py-2.5 rounded-lg border border-border-default focus:border-action-success focus:outline-none transition-colors text-text-primary placeholder-text-secondary ${isEdit ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
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

          {/* Password - Only show for new users */}
          {!isEdit && (
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
                required={!isEdit}
                className="w-full px-4 py-2.5 rounded-lg border border-border-default focus:border-action-success focus:outline-none transition-colors text-text-primary placeholder-text-secondary"
                placeholder="Enter password"
              />
            </div>
          )}

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
            {loading
              ? (isEdit ? "Updating User..." : "Adding User...")
              : (isEdit ? "Update User" : "Add New User")
            }
          </button>
        </div>
      </form>
    </div>
  );
};


export default UserManagement;
