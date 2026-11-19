import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FaLock, FaUser, FaEnvelope, FaPhone, FaCalendar, FaUserShield } from "react-icons/fa";
import { Plus, Edit, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import AgGridTable from '../../../utils/AgGridTable';
import axios from 'axios';

// Shared theme class strings (standardized purple design)
const FIELD =
  "w-full h-control px-item rounded-button-sm border border-brand-line bg-surface text-ui text-ink " +
  "outline-none placeholder:text-ink-faint transition-colors " +
  "focus:border-brand-ring focus:shadow-focus-ring disabled:opacity-50 disabled:cursor-not-allowed";
const LABEL =
  "flex items-center gap-2 mb-1 text-micro font-bold uppercase tracking-wide text-ink-muted";

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
    <div className="ui-backdrop font-sans">
      <div className="flex flex-col w-full max-w-modal max-h-[calc(100dvh-1.5rem)] overflow-hidden bg-surface border border-line border-t-panel border-t-line-panel rounded-modal-lg shadow-modal-lg text-ink animate-scale-in" role="dialog" aria-modal="true" aria-label={typeof title === "string" ? title : undefined}>
        {/* Title + Close */}
        <div className="flex items-center justify-between gap-item px-modal py-item bg-brand-light border-b border-brand-line shrink-0">
          <h3 className="text-panel-title text-brand-dark">
            {title}
          </h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid place-items-center h-7 w-7 shrink-0 rounded-button-sm border border-brand-line bg-surface text-ink-muted hover:bg-brand-soft hover:text-brand-dark transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Description */}
        <div className="flex-1 overflow-y-auto px-modal py-card text-ui text-ink-muted">
          {description}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap justify-end gap-item-sm px-modal py-item bg-canvas border-t border-line shrink-0">
          <button
            onClick={onClose}
            className="ui-btn"
          >
            {cancelText}
          </button>

          <button
            onClick={onConfirm}
            className={`ui-btn ${danger
              ? "ui-btn-danger"
              : "ui-btn-add"
              }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
const getLoggedInUserId = (token) => {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.user_id || payload.sub || null;
  } catch {
    return null;
  }
};
const getLoginClientId = (token) => {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.client_id || null;
  } catch {
    return null;
  }
};
const normalizeRoles = (data) => {
  if (!Array.isArray(data)) return [];

  return data.map((r) => {
    if (typeof r === "string") return r;
    if (typeof r === "object" && r !== null) return r.id || r.name;
    return "";
  }).filter(Boolean);
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

      setPermissions(perms);
    };

    if (token && clientId) fetchPerms();
  }, [token, clientId]);

  return permissions;
};



const UserManagement = ({ token, clientId, screenIds = [] }) => {
  const [activeView, setActiveView] = useState('list');
  const [selectedUser, setSelectedUser] = useState(null);
  const loginClientId = useMemo(() => getLoginClientId(token), [token]);
  const isSuperAdmin = screenIds?.includes("super_admin_v1");
  return (
    <div className="ui-page">
      {/* Content */}
      <div className="mx-auto">
        <UsersList
          clientId={clientId}
          isSuperAdminScreen={isSuperAdmin}
          token={token}
          onAddNew={() => setActiveView('add')}
          onEdit={(user) => {
            setSelectedUser(user);
            setActiveView('add');
          }}
        />

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
const UsersList = ({ onAddNew, clientId, token, onEdit, isSuperAdminScreen }) => {

  const [users, setUsers] = useState([]);
  const [filterRole, setFilterRole] = useState("all");
  const [selectionModel, setSelectionModel] = useState([]);
  const [roles, setRoles] = useState([]);
  const [changeRoleValue, setChangeRoleValue] = useState("");
  const [isChangeRoleConfirmOpen, setIsChangeRoleConfirmOpen] = useState(false);
  const itemsPerPage = 10;
  const permissions = usePermissions(token, clientId);

  const canAddRole = permissions.users?.includes("add") ?? false;
  const canDeleteRole = permissions.users?.includes("add") ?? false;
  const canDeleteUser = permissions.users?.includes("delete") ?? false;
  const [showAddRole, setShowAddRole] = useState(false);
  const [showDeleteRole, setShowDeleteRole] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState(null);
  const [newRoleName, setNewRoleName] = useState("");
  const [deleteRoleName, setDeleteRoleName] = useState("");

  const nav = useNavigate()
  function navigator() {
    nav('../role-config');

  }

  const loggedInUserId = useMemo(
    () => getLoggedInUserId(token),
    [token]
  );


  // In UsersList - Fetch roles
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/inventory/read_category?category_id=roles`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        // console.log("Full API response:", res.data);

        if (res.data?.data?.length) {
          const rolesCategory = res.data.data[0];
          // console.log("Roles category object:", rolesCategory);

          const category = res.data?.data?.[0];
          setRoles(normalizeRoles(category?.subCategories));



        }
      } catch (err) {
        console.error("Error fetching roles:", err);
        setRoles([]);
      }
    };
    if (clientId && token) fetchRoles();
  }, [clientId, token]);
  // ✅ Now roles is an array of strings like: ["admin", "waiter", "receptionist"]
  // useEffect(() => {
  //   console.log("PERMISSIONS 🔥", permissions);
  // }, [permissions]);

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
            first_name: person.first_name || "",
            last_name: person.last_name || "",
            dob: person.dob || "",
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
  const handleAddRole = async () => {
    const role = newRoleName.trim().toLowerCase();

    if (!role) {
      alert("Role name is required");
      return;
    }

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users/roles`,
        null,
        {
          params: {
            category_id: "roles",
            value: role,
          },
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setRoles(normalizeRoles(res.data?.data));

      setNewRoleName("");
      setShowAddRole(false);
    } catch (e) {
      console.error("Add role failed", e);
      alert(e.response?.data?.detail || "Failed to add role");
    }
  };

  const handleDeleteRole = async () => {
    if (!deleteRoleName) {
      alert("Select a role to delete");
      return;
    }

    try {
      const res = await axios.delete(
        `${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users/roles`,
        {
          params: {
            category_id: "roles",
            value: deleteRoleName,
          },
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setRoles(normalizeRoles(res.data?.data));

      setDeleteRoleName("");
      setShowDeleteRole(false);
    } catch (e) {
      console.error("Delete role failed", e);
      alert(e.response?.data?.detail || "Failed to delete role");
    }
  };



  const filteredUsers = useMemo(() => {
    let filtered = users;

    // 🚫 Remove logged-in user by ID (correct)
    if (loggedInUserId) {
      filtered = filtered.filter(
        (u) => u.id !== loggedInUserId
      );
    }

    if (filterRole === "admin") {
      filtered = filtered.filter((u) => u.role === "admin");
    }

    return filtered;
  }, [users, filterRole, loggedInUserId]);

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
    try {
      await axios.delete(
        `${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users/delete`,
        {
          params: { user_id: userId },
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // ✅ Remove user from UI immediately
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (e) {
      console.error("Delete failed", e);
      alert("Failed to delete user");
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
    if (selectionModel.length === filteredUsers.length) {
      setSelectionModel([]);
    } else {
      setSelectionModel(filteredUsers.map(u => u.id));
    }
  };

  const userColumnDefs = [
    {
      headerName: '',
      colId: 'select',
      minWidth: 50,
      maxWidth: 50,
      sortable: false,
      filter: false,
      floatingFilter: false,
      headerComponent: () => (
        <input
          type="checkbox"
          checked={selectionModel.length === filteredUsers.length && filteredUsers.length > 0}
          onChange={toggleSelectAll}
          className="w-4 h-4 rounded accent-brand cursor-pointer"
        />
      ),
      cellRenderer: (params) => (
        <input
          type="checkbox"
          checked={selectionModel.includes(params.data.id)}
          onChange={() => toggleSelection(params.data.id)}
          className="w-4 h-4 rounded accent-brand cursor-pointer"
        />
      ),
    },
    {
      headerName: 'User',
      field: 'username',
      minWidth: 220,
      cellRenderer: (params) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-brand-light border border-brand-line flex items-center justify-center text-brand-dark font-bold">
            {params.data.username?.[0]?.toUpperCase() || "U"}
          </div>
          <div>
            <div className="font-bold text-ink text-ui">{params.data.username || "(no username)"}</div>
            <div className="text-ui-sm text-ink-muted">{params.data.name || "-"}</div>
          </div>
        </div>
      ),
    },
    {
      headerName: 'Email',
      field: 'email',
      minWidth: 200,
      cellRenderer: (params) => (
        <a href={`mailto:${params.value}`} className="text-ink-muted hover:text-brand-dark text-ui hover:underline">
          {params.value}
        </a>
      ),
    },
    {
      headerName: 'Phone',
      field: 'phone',
      minWidth: 140,
      valueGetter: (params) => params.data?.phone || "-",
      cellRenderer: (params) => <span className="text-ink-soft text-ui">{params.value}</span>,
    },
    {
      headerName: 'Role',
      field: 'role',
      minWidth: 140,
      cellRenderer: (params) => (
        <span className="text-brand-dark text-ui font-bold">
          {params.value}
        </span>
      ),
    },
    {
      headerName: 'Actions',
      colId: 'actions',
      minWidth: 100,
      sortable: false,
      filter: false,
      floatingFilter: false,
      cellRenderer: (params) => (
        <div className="flex gap-3">
          <button
            onClick={() => onEdit(params.data)}
            className="text-brand-dark hover:text-brand"
            title="Edit user"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => setDeleteUserId(params.data.id)}
            className="text-ink-muted hover:text-brand-dark"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-2">
      {/* Header Section */}
      <div className="ui-panel">
        <div className="space-y-3 mb-item">

          {/* TOP ROW */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

            {/* Title */}
            {/* <div>
              <h2 className="text-page-title text-brand-dark">
                Users Management
              </h2>
              <p className="text-ink-muted text-ui">
                Manage user accounts and permissions
              </p>
            </div> */}

            {/* Primary action only on mobile */}
            {/* Mobile actions → 2 per row */}
            <div className="grid grid-cols-2 gap-2 sm:hidden">

              {isSuperAdminScreen && (
                <>
                  <button
                    onClick={() => setShowAddRole(true)}
                    className="ui-btn ui-btn-update w-full"
                  >
                    <Plus size={16} />
                    Role
                  </button>

                  <button
                    onClick={() => setShowDeleteRole(true)}
                    className="ui-btn ui-btn-delete w-full"
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </>)}
              {isSuperAdminScreen && (
                <button
                  onClick={navigator}
                  className="ui-btn ui-btn-config w-full"
                >
                  <FaUserShield />
                  Config
                </button>
              )}
            </div>

            {/* Desktop / Tablet actions */}
            <div className="hidden sm:flex flex-wrap items-center gap-2">
              {/* <button
                onClick={onAddNew}
                className="ui-btn ui-btn-add"
              >
                <Plus size={16} />
                Add User
              </button> */}
              {isSuperAdminScreen && (
                <>
                  <button
                    onClick={() => setShowAddRole(true)}
                    className="ui-btn ui-btn-update"
                  >
                    <Plus size={16} />
                    Add Role
                  </button>

                  <button
                    onClick={() => setShowDeleteRole(true)}
                    className="ui-btn ui-btn-delete"
                  >
                    <Trash2 size={16} />
                    Delete Role
                  </button> </>)}

              {isSuperAdminScreen && (
                <button
                  onClick={navigator}
                  className="ui-btn ui-btn-config"
                >
                  <FaUserShield />
                  Role Config
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <div className="overflow-x-auto rounded-panel border border-line">
            <AgGridTable
              columnDefs={userColumnDefs}
              rowData={filteredUsers}
              domLayout="normal"
              height={600}
              pagination={true}
              paginationPageSize={itemsPerPage}
              toolbarRight={
                <button
                  onClick={onAddNew}
                  className="ui-btn ui-btn-add"
                >
                  <Plus size={16} />
                  Add User
                </button>
              }
            />
          </div>
        </div>
        {/* Add Role Modal */}
        <ConfirmModal
          open={showAddRole}
          title="Add New Role"
          description={
            <input
              type="text"
              placeholder="Enter role name (e.g. cashier)"
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value.toLowerCase())}
              className={FIELD}
            />
          }
          confirmText="Create Role"
          onClose={() => {
            setShowAddRole(false);
            setNewRoleName("");
          }}
          onConfirm={() => {
            if (!canAddRole) {
              alert("You don't have permission to add roles");
              return;
            }
            handleAddRole();
          }}
        />

        {/* Delete Role Modal */}
        <ConfirmModal
          open={showDeleteRole}
          title="Delete Role"
          description={
            <select
              value={deleteRoleName}
              onChange={(e) => setDeleteRoleName(e.target.value)}
              className={FIELD}
            >
              <option value="">Select role to delete</option>
              {/* ✅ FIX: roles is now array of strings */}
              {roles.map(roleName => (
                <option key={roleName} value={roleName}>
                  {roleName}
                </option>
              ))}
            </select>
          }
          confirmText="Delete Role"
          danger
          onClose={() => {
            setShowDeleteRole(false);
            setDeleteRoleName("");
          }}
          onConfirm={() => {
            if (!canDeleteRole) {
              alert("You don't have permission to delete roles");
              return;
            }
            handleDeleteRole();
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

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <div className="text-brand-soft mb-2">
              <FaUser className="text-5xl mx-auto" />
            </div>
            <p className="text-ui text-ink-muted">No users found</p>
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
    password: "", confirmPassword: "",
    role: "",
  });
  const [resetPassword, setResetPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
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
        password: "", confirmPassword: "",
        role: editUser.role || "",
      });
    }
  }, [isEdit, editUser]);

  // In AddUserForm - Fetch roles
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/inventory/read_category?category_id=roles`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (res.data?.data?.length) {
          const rolesCategory = res.data.data[0];

          // ✅ FIX: Use camelCase and extract 'name' from each object
          if (res.data?.data?.length) {
            const category = res.data?.data?.[0];
            setRoles(normalizeRoles(category?.subCategories));


          }

        }
      } catch (err) {
        console.error("Error fetching roles:", err);
        setRoles([]);
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
    if ((!isEdit || formData.password) && formData.password !== formData.confirmPassword) {
      alert("Passwords do not match");
      return;
    }
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
          ...(formData.password ? { password: formData.password } : {}),
        }
        : payload;

      await axios.post(url, finalPayload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (onSave) onSave();
    } catch (error) {
      console.error(`Failed to ${isEdit ? 'update' : 'add'} user:`, error);
      const backendMessage = error.response?.data?.detail;
      setErrorMessage(
        backendMessage || `Failed to ${isEdit ? "update" : "add"} user. Please try again.`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="ui-backdrop font-sans">
        <div className="ui-modal max-w-3xl max-h-[calc(100dvh-2rem)] overflow-hidden flex flex-col p-0" role="dialog" aria-modal="true">
          <div className="flex items-center justify-between gap-item px-modal py-item bg-brand-light border-b border-brand-line shrink-0">
            <div>
              <h2 className="text-panel-title text-brand-dark">
                {isEdit ? "Edit User" : "Add New User"}
              </h2>
              <p className="text-ink-muted text-ui mt-1">
                {isEdit ? "Update user account details and role assignment" : "Create a new user account with role assignment"}
              </p>
            </div>
            <button
              type="button"
              onClick={onCancel}
              aria-label="Close"
              className="grid place-items-center h-7 w-7 shrink-0 rounded-button-sm border border-brand-line bg-surface text-ink-muted hover:bg-brand-soft hover:text-brand-dark transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0 overflow-y-auto px-modal py-card">
              {/* Username */}
              <div>
                <label className={LABEL}>
                  <FaUser className="text-brand text-ui-sm" />
                  Username <span className="text-state-occupied">*</span>
                </label>
                <input
                  name="username"
                  type="text"
                  disabled={isEdit}
                  value={formData.username}
                  onChange={handleChange}
                  required
                  className={FIELD}
                  placeholder="Enter username"
                />
              </div>

              {/* Email */}
              <div>
                <label className={LABEL}>
                  <FaEnvelope className="text-brand text-ui-sm" />
                  Email <span className="text-state-occupied">*</span>
                </label>
                <input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={FIELD}
                  placeholder="Enter email"
                />
              </div>

              {/* First Name */}
              <div>
                <label className={LABEL}>
                  <FaUser className="text-brand text-ui-sm" />
                  First Name
                </label>
                <input
                  name="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={handleChange}
                  className={FIELD}
                  placeholder="Enter first name"
                />
              </div>

              {/* Last Name */}
              <div>
                <label className={LABEL}>
                  <FaUser className="text-brand text-ui-sm" />
                  Last Name
                </label>
                <input
                  name="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={handleChange}
                  className={FIELD}
                  placeholder="Enter last name"
                />
              </div>

              {/* Date of Birth */}
              <div>
                <label className={LABEL}>
                  <FaCalendar className="text-brand text-ui-sm" />
                  Date of Birth
                </label>
                <input
                  name="dob"
                  type="date"
                  value={formData.dob}
                  onChange={handleChange}
                  className={FIELD}
                />
              </div>

              {/* Phone */}
              <div>
                <label className={LABEL}>
                  <FaPhone className="text-brand text-ui-sm" />
                  Phone
                </label>
                <input
                  name="phone"
                  type="text"
                  value={formData.phone}
                  onChange={handleChange}
                  className={FIELD}
                  placeholder="Enter phone number"
                />
              </div>

              {/* Password - Only show for new users */}
              {/* Password */}
              <div>
                <label className={LABEL}>
                  <FaLock className="text-brand text-ui-sm" />
                  {isEdit ? "New Password" : "Password"} {!isEdit && <span className="text-state-occupied">*</span>}
                </label>
                <input
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  required={!isEdit}
                  className={FIELD}
                  placeholder={isEdit ? "Leave blank to keep current password" : "Enter password"}
                />
              </div>

              {/* Confirm Password */}
              <div>
                <label className={LABEL}>
                  <FaLock className="text-brand text-ui-sm" />
                  Confirm Password {!isEdit && <span className="text-state-occupied">*</span>}
                </label>
                <input
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required={!isEdit || !!formData.password}
                  className={FIELD}
                  placeholder={isEdit ? "Confirm new password" : "Re-enter password"}
                />
              </div>


              {/* Role */}
              <div>
                <label className={LABEL}>
                  <FaUserShield className="text-brand text-ui-sm" />
                  Role <span className="text-state-occupied">*</span>
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  required
                  className={FIELD}
                >
                  <option value="">Select Role</option>
                  {roles.map((roleName) => (
                    <option key={roleName} value={roleName}>
                      {roleName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 px-modal py-item border-t border-line bg-canvas shrink-0">
              <button
                type="button"
                onClick={onCancel}
                className="ui-btn flex-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="ui-btn ui-btn-add flex-1"
              >
                {loading
                  ? (isEdit ? "Updating User..." : "Adding User...")
                  : (isEdit ? "Update User" : "Add New User")
                }
              </button>
            </div>
          </form>
        </div>
      </div>

      <ConfirmModal
        open={!!errorMessage}
        title="Something went wrong"
        description={errorMessage}
        confirmText="OK"
        cancelText="Close"
        onClose={() => setErrorMessage("")}
        onConfirm={() => setErrorMessage("")}
      />
    </>
  );
};


export default UserManagement;