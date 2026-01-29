import React, { useEffect, useState } from "react";
import axios from "axios";
import { Check } from "lucide-react";
import { toast } from "react-toastify";

const PERMISSIONS = [
  { key: "create", label: "Create" },
  { key: "read", label: "Read" },
  { key: "update", label: "Update" },
  { key: "delete", label: "Delete" },
  { key: "create_order", label: "Create Order" },
  { key: "update_order", label: "Update Order" },
  { key: "delete_order", label: "Delete Order" },
];

const DEFAULT_ROLE_RULES = {
  admin: ["create", "read", "update", "delete"],
  waiter: ["read"],
  order: ["create_order", "update_order", "delete_order"],
};

const RoleConfig = ({ token, clientId }) => {
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [permissions, setPermissions] = useState([]);

  /** Fetch roles */
  useEffect(() => {
    const fetchRoles = async () => {
      const res = await axios.get(
        `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/inventory/read_category?category_id=roles`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRoles(res.data?.data?.[0]?.subCategories || []);
    };
    fetchRoles();
  }, [clientId, token]);

  /** Load permissions when role selected */
  useEffect(() => {
    if (!selectedRole) return;

    // If backend exists → fetch
    // Else fallback to defaults
    setPermissions(DEFAULT_ROLE_RULES[selectedRole] || []);
  }, [selectedRole]);

  const togglePermission = (perm) => {
    setPermissions((prev) =>
      prev.includes(perm)
        ? prev.filter((p) => p !== perm)
        : [...prev, perm]
    );
  };

  const saveConfig = async () => {
    try {
      await axios.post(
        `${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/roles/update-permissions`,
        {
          role: selectedRole,
          permissions,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Role permissions updated");
    } catch {
      toast.error("Failed to update role");
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary p-4">
      <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-card grid grid-cols-1 md:grid-cols-3">

        {/* LEFT – ROLES */}
        <div className="border-r border-border-default p-4">
          <h2 className="text-lg font-semibold mb-4">Roles</h2>
          <ul className="space-y-2">
            {roles.map((role) => (
              <li
                key={role.id}
                onClick={() => setSelectedRole(role.name)}
                className={`p-3 rounded-lg cursor-pointer transition ${
                  selectedRole === role.name
                    ? "bg-action-primary text-white"
                    : "hover:bg-bg-tertiary"
                }`}
              >
                {role.name}
              </li>
            ))}
          </ul>
        </div>

        {/* RIGHT – PERMISSIONS */}
        <div className="md:col-span-2 p-6">
          {!selectedRole ? (
            <p className="text-text-secondary">Select a role to configure permissions</p>
          ) : (
            <>
              <h2 className="text-xl font-semibold mb-4">
                Permissions – {selectedRole}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {PERMISSIONS.map((perm) => (
                  <label
                    key={perm.key}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border-default cursor-pointer hover:bg-bg-tertiary"
                  >
                    <input
                      type="checkbox"
                      checked={permissions.includes(perm.key)}
                      onChange={() => togglePermission(perm.key)}
                      className="w-4 h-4"
                    />
                    <span className="font-medium">{perm.label}</span>
                  </label>
                ))}
              </div>

              <button
                onClick={saveConfig}
                className="mt-6 flex items-center gap-2 px-6 py-2.5 rounded-lg bg-action-primary text-white hover:bg-action-danger transition"
              >
                <Check size={18} />
                Save Configuration
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoleConfig;
