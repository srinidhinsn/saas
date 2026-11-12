import React, { useEffect, useState } from "react";
import axios from "axios";
import {X} from 'lucide-react';

const API = import.meta.env.VITE_API_INVENTORY_SERVICE_URL;
const defaultRoot = import.meta.env.VITE_MENU_DEFAULT_ROOT;
const counterCategory = import.meta.env.VITE_MENU_COUNTER;

// Shared theme class strings (standardized purple design)
const FIELD =
  "w-full h-control px-item rounded-button-sm border border-brand-line bg-surface text-ui text-ink " +
  "outline-none placeholder:text-ink-faint transition-colors " +
  "focus:border-brand-ring focus:shadow-focus-ring disabled:opacity-50 disabled:cursor-not-allowed";
const DIALOG =
  "flex flex-col w-full max-h-[calc(100dvh-1.5rem)] overflow-hidden bg-surface border border-line " +
  "border-t-panel border-t-line-panel rounded-modal-lg shadow-modal-lg text-ink animate-scale-in";
const HEAD =
  "flex items-center justify-between gap-item px-modal py-item bg-brand-light border-b border-brand-line shrink-0";
const FOOT =
  "flex flex-wrap justify-end gap-item-sm px-modal py-item bg-canvas border-t border-line shrink-0";

export default function CounterManager({ clientId, token }) {
  const [counters, setCounters] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCounterId, setNewCounterId] = useState("");
  const [newCounterName, setNewCounterName] = useState("");

  const [editingCounter, setEditingCounter] = useState(null);
  const [editCounterName, setEditCounterName] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  const [deletingCounter, setDeletingCounter] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [selectedCounter, setSelectedCounter] = useState(null);
  const [selectedCategories, setSelectedCategories] = useState([]);

  const headers = {
    Authorization: `Bearer ${token}`,
  };

  const BASE = `${API}/${clientId}/menu`;

  // ================= Fetch Counter Tree =================
  const fetchCounters = async () => {
    try {
      const res = await axios.get(
        `${API}/${clientId}/inventory/read_category?category_id=${counterCategory}`, {
        params: {
          client_id: clientId,
        },
        headers,
      });

      const root = res.data.data?.[0];
      setCounters(root?.subCategories || []);
    } catch (err) {
      console.error("Error fetching counters:", err);
    }
  };

  // ================= Fetch All Categories =================
  const fetchAllCategories = async () => {
    try {
      const res = await axios.get(
        `${API}/${clientId}/inventory/read_category?category_id=${defaultRoot}`,
        {
          params: {
            client_id: clientId,
          },
          headers,
        }
      );

      const acRoot = res.data.data?.[0];

      if (!acRoot) {
        setAllCategories([]);
        return;
      }

      // Keep levelOne as groups (veg, non_veg, etc)
      const levelOne = acRoot.subCategories || [];

      setAllCategories(levelOne);

    } catch (err) {
      console.error("Error fetching AC tree:", err);
    }
  };

  useEffect(() => {
    fetchCounters();
    fetchAllCategories();
  }, []);

  // ================= Create Counter =================
  const handleCreateCounter = async () => {
    if (!newCounterId || !newCounterName) return;

    try {
      setLoading(true);

      // 1️⃣ Create new category
      await axios.post(
        `${BASE}/create_category`,
        {
          id: newCounterId,
          client_id: clientId,
          name: newCounterName,
          description: "Counter",
          sub_categories: [],
          slug: `_Counter_${newCounterId}`,
        },
        {
          params: { client_id: clientId },
          headers,
        }
      );

      // 2️⃣ Get existing subcategories
      const res = await axios.get(`${BASE}/read_category`, {
        params: {
          client_id: clientId,
          category_id: "counter",
        },
        headers,
      });

      const existing = res.data.data?.[0]?.subCategories || [];
      const updatedIds = [...existing.map((c) => c.id), newCounterId];

      // 3️⃣ Update root counter category
      await axios.post(
        `${BASE}/update_category`,
        {
          id: "counter",
          sub_categories: updatedIds,
        },
        {
          params: { client_id: clientId },
          headers,
        }
      );

      setShowCreateModal(false);
      setNewCounterId("");
      setNewCounterName("");
      fetchCounters();
    } catch (err) {
      console.error("Error creating counter:", err);
    } finally {
      setLoading(false);
    }
  };

  // ================= Update Counter (rename) =================
  const handleUpdateCounter = async () => {
    if (!editingCounter || !editCounterName.trim()) return;

    try {
      setEditLoading(true);

      await axios.post(
        `${BASE}/update_category`,
        {
          id: editingCounter.id,
          name: editCounterName.trim(),
        },
        {
          params: { client_id: clientId },
          headers,
        }
      );

      setEditingCounter(null);
      setEditCounterName("");
      fetchCounters();
    } catch (err) {
      console.error("Error updating counter:", err);
    } finally {
      setEditLoading(false);
    }
  };

  // ================= Delete Counter =================
  const handleDeleteCounter = async () => {
    if (!deletingCounter) return;

    try {
      setDeleteLoading(true);

      // 1️⃣ Delete the counter category itself
      await axios.post(
        `${BASE}/delete_category`,
        {
          id: deletingCounter.id,
        },
        {
          params: { client_id: clientId },
          headers,
        }
      );

      // 2️⃣ Remove its id from the root "counter" category's sub_categories
      const res = await axios.get(`${BASE}/read_category`, {
        params: {
          client_id: clientId,
          category_id: "counter",
        },
        headers,
      });

      const existing = res.data.data?.[0]?.subCategories || [];
      const updatedIds = existing
        .map((c) => c.id)
        .filter((id) => id !== deletingCounter.id);

      await axios.post(
        `${BASE}/update_category`,
        {
          id: "counter",
          sub_categories: updatedIds,
        },
        {
          params: { client_id: clientId },
          headers,
        }
      );

      setDeletingCounter(null);
      fetchCounters();
    } catch (err) {
      console.error("Error deleting counter:", err);
    } finally {
      setDeleteLoading(false);
    }
  };

  // ================= Assign Categories =================
  const handleAssign = async () => {
    try {
      await axios.post(
        `${BASE}/update_category`,
        {
          id: selectedCounter.id,
          sub_categories: selectedCategories,
        },
        {
          params: { client_id: clientId },
          headers,
        }
      );

      setSelectedCounter(null);
      setSelectedCategories([]);
      fetchCounters();
    } catch (err) {
      console.error("Error assigning categories:", err);
    }
  };

  // ================= Selection Helpers =================
  // A parent is "fully checked" if its own id is selected, OR every one of
  // its children is individually selected (both states mean the same thing
  // for KOT routing, but we want the checkbox to reflect either path).
  const isParentChecked = (group) => {
    const children = group.subCategories || [];
    if (selectedCategories.includes(group.id)) return true;
    if (children.length === 0) return false;
    return children.every((c) => selectedCategories.includes(c.id));
  };

  // Parent is "partially checked" (indeterminate) if some but not all
  // children are selected, and the parent itself isn't directly selected.
  const isParentIndeterminate = (group) => {
    const children = group.subCategories || [];
    if (selectedCategories.includes(group.id)) return false;
    if (children.length === 0) return false;
    const checkedCount = children.filter((c) =>
      selectedCategories.includes(c.id)
    ).length;
    return checkedCount > 0 && checkedCount < children.length;
  };

  // Checking a parent assigns the parent itself (sufficient on its own for
  // KOT differentiation, since printKOT walks the full ancestor chain) and
  // also checks every child for clarity in the UI. Unchecking clears both.
  const toggleParent = (group, checked) => {
    const childIds = (group.subCategories || []).map((c) => c.id);

    setSelectedCategories((prev) => {
      const withoutGroup = prev.filter(
        (id) => id !== group.id && !childIds.includes(id)
      );
      if (checked) {
        return [...withoutGroup, group.id, ...childIds];
      }
      return withoutGroup;
    });
  };

  // Checking/unchecking a single child never touches the parent id itself,
  // but if the parent id happens to be selected (parent was previously
  // checked wholesale) and the user unchecks one child, we need to drop the
  // parent id too — otherwise the parent id alone would still imply ALL
  // children are assigned, silently re-including the one just unchecked.
  const toggleChild = (group, cat, checked) => {
    setSelectedCategories((prev) => {
      let next = checked
        ? [...prev, cat.id]
        : prev.filter((id) => id !== cat.id);

      if (!checked && next.includes(group.id)) {
        next = next.filter((id) => id !== group.id);
      }
      return [...new Set(next)];
    });
  };

  return (
    <div className="ui-page">
      <div className="max-w-6xl mx-auto ui-panel">
        <div className="flex justify-between items-center mb-item">
          <h2 className="text-page-title text-brand-dark">Counter Management</h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="ui-btn ui-btn-add"
          >
            + Add Counter
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-tiles">
          {counters.map((counter) => (
            <div
              key={counter.id}
              className="ui-card p-4 flex justify-between items-center"
            >
              <div>
                <p className="text-body-sm font-bold text-ink">{counter.name}</p>
                <p className="text-ui-sm text-ink-muted">{counter.id}</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSelectedCounter(counter);
                    setSelectedCategories(
                      counter.subCategories?.map((c) => c.id) || []
                    );
                  }}
                  className="ui-btn ui-btn-add !h-7"
                >
                  Assign
                </button>
                <button
                  onClick={() => {
                    setEditingCounter(counter);
                    setEditCounterName(counter.name);
                  }}
                  className="ui-btn ui-btn-update !h-7"
                >
                  Edit
                </button>
                <button
                  onClick={() => setDeletingCounter(counter)}
                  className="ui-btn ui-btn-delete !h-7"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="ui-backdrop font-sans">
          <div className={`${DIALOG} max-w-modal`} role="dialog" aria-modal="true" aria-label="Create counter">
            <div className={HEAD}>
              <h3 className="text-panel-title text-brand-dark">Create Counter</h3>
            </div>

            <div className="flex-1 overflow-y-auto px-modal py-card space-y-item">
              <input
                type="text"
                placeholder="Counter ID"
                value={newCounterId}
                onChange={(e) => setNewCounterId(e.target.value)}
                className={FIELD}
              />

              <input
                type="text"
                placeholder="Counter Name"
                value={newCounterName}
                onChange={(e) => setNewCounterName(e.target.value)}
                className={FIELD}
              />
            </div>

            <div className={FOOT}>
              <button
                onClick={() => setShowCreateModal(false)}
                className="ui-btn"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCounter}
                disabled={loading}
                className="ui-btn ui-btn-add"
              >
                {loading ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingCounter && (
        <div className="ui-backdrop font-sans">
          <div className={`${DIALOG} max-w-modal`} role="dialog" aria-modal="true" aria-label="Edit counter">
            <div className={HEAD}>
              <h3 className="text-panel-title text-brand-dark">Edit Counter</h3>
            </div>

            <div className="flex-1 overflow-y-auto px-modal py-card">
              <p className="text-ui-sm text-ink-muted mb-2">
                ID: {editingCounter.id}
              </p>

              <input
                type="text"
                placeholder="Counter Name"
                value={editCounterName}
                onChange={(e) => setEditCounterName(e.target.value)}
                className={FIELD}
              />
            </div>

            <div className={FOOT}>
              <button
                onClick={() => {
                  setEditingCounter(null);
                  setEditCounterName("");
                }}
                className="ui-btn"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateCounter}
                disabled={editLoading || !editCounterName.trim()}
                className="ui-btn ui-btn-add"
              >
                {editLoading ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingCounter && (
        <div className="ui-backdrop font-sans">
          <div className={`${DIALOG} max-w-modal`} role="dialog" aria-modal="true" aria-label="Delete counter">
            <div className={HEAD}>
              <h3 className="text-panel-title text-brand-dark">Delete Counter</h3>
            </div>
            <div className="flex-1 overflow-y-auto px-modal py-card">
              <p className="text-ui text-ink-muted">
                Are you sure you want to delete{" "}
                <span className="font-bold text-brand-dark">{deletingCounter.name}</span>?
                Categories assigned to it will no longer be differentiated in
                KOT printing until reassigned to another counter. This action
                cannot be undone.
              </p>
            </div>

            <div className={FOOT}>
              <button
                onClick={() => setDeletingCounter(null)}
                className="ui-btn"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCounter}
                disabled={deleteLoading}
                className="ui-btn ui-btn-danger"
              >
                {deleteLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {selectedCounter && (
        <div className="ui-backdrop font-sans">
          <div className={`${DIALOG} max-w-lg`} role="dialog" aria-modal="true" aria-label="Assign categories">
            <div className={HEAD}>
              <h3 className="text-panel-title text-brand-dark">
                Assign Categories to {selectedCounter.name}
              </h3>
              <button
                onClick={() => setSelectedCounter(null)}
                className="grid place-items-center h-7 w-7 shrink-0 rounded-button-sm border border-brand-line bg-surface text-ink-muted hover:bg-brand-soft hover:text-brand-dark transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-modal py-card space-y-4">
              {allCategories.map((group) => {
                const parentChecked = isParentChecked(group);
                const parentIndeterminate = isParentIndeterminate(group);

                return (
                  <div key={group.id}>

                    {/* Level One Heading - now also a checkbox */}
                    <label className="flex items-center gap-2 font-bold text-ui text-brand-dark mb-2 border-b border-line-divider pb-1 cursor-pointer">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-brand cursor-pointer"
                        checked={parentChecked}
                        ref={(el) => {
                          if (el) el.indeterminate = parentIndeterminate;
                        }}
                        onChange={(e) =>
                          toggleParent(group, e.target.checked)
                        }
                      />
                      {group.name}
                      {parentChecked && (
                        <span className="text-ui-sm font-normal text-state-vacant">
                          (all items in this category differentiated)
                        </span>
                      )}
                    </label>

                    {/* Child Categories */}
                    <div className="space-y-2 pl-4">
                      {group.subCategories?.map((cat) => (
                        <label
                          key={cat.id}
                          className="flex items-center gap-2 border border-line p-2 rounded-button-sm text-ui text-ink cursor-pointer hover:bg-brand-tint"
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-brand cursor-pointer"
                            checked={
                              parentChecked ||
                              selectedCategories.includes(cat.id)
                            }
                            onChange={(e) =>
                              toggleChild(group, cat, e.target.checked)
                            }
                          />
                          {cat.name}
                        </label>
                      ))}
                    </div>

                  </div>
                );
              })}
            </div>

            <div className={FOOT}>
              <button
                onClick={() => setSelectedCounter(null)}
                className="ui-btn"
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                className="ui-btn ui-btn-add"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}