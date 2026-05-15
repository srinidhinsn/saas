import React, { useEffect, useState } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_INVENTORY_SERVICE_URL;
const defaultRoot = import.meta.env.VITE_MENU_DEFAULT_ROOT;
const counterCategory = import.meta.env.VITE_MENU_COUNTER;

export default function CounterManager({ clientId, token }) {
  const [counters, setCounters] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCounterId, setNewCounterId] = useState("");
  const [newCounterName, setNewCounterName] = useState("");

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
      console.log("catgeories are",acRoot)

      if (!acRoot) {
        setAllCategories([]);
        return;
      }

      // Keep levelOne as groups (veg, non_veg, etc)
      const levelOne = acRoot.subCategories || [];
      console.log("The categories are",levelOne)

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

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto bg-white shadow-xl rounded-2xl p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Counter Management</h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition"
          >
            + Add Counter
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {counters.map((counter) => (
            <div
              key={counter.id}
              className="border rounded-xl p-4 flex justify-between items-center shadow-sm"
            >
              <div>
                <p className="font-semibold">{counter.name}</p>
                <p className="text-sm text-gray-500">{counter.id}</p>
              </div>

              <button
                onClick={() => {
                  setSelectedCounter(counter);
                  setSelectedCategories(
                    counter.subCategories?.map((c) => c.id) || []
                  );
                }}
                className="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 transition"
              >
                Assign
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 w-96 shadow-xl">
            <h3 className="text-lg font-bold mb-4">Create Counter</h3>

            <input
              type="text"
              placeholder="Counter ID"
              value={newCounterId}
              onChange={(e) => setNewCounterId(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 mb-3"
            />

            <input
              type="text"
              placeholder="Counter Name"
              value={newCounterName}
              onChange={(e) => setNewCounterName(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 mb-4"
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCounter}
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg"
              >
                {loading ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {selectedCounter && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 w-[500px] max-h-[80vh] overflow-y-auto shadow-xl">
            <h3 className="text-lg font-bold mb-4">
              Assign Categories to {selectedCounter.name}
            </h3>

            <div className="space-y-4">
              {allCategories.map((group) => (
                <div key={group.id}>

                  {/* Level One Heading */}
                  <h4 className="font-semibold text-lg mb-2 border-b pb-1">
                    {group.name}
                  </h4>

                  {/* Actual Categories */}
                  <div className="space-y-2 pl-4">
                    {group.subCategories?.map((cat) => (
                      <label
                        key={cat.id}
                        className="flex items-center gap-2 border p-2 rounded-lg"
                      >
                        <input
                          type="checkbox"
                          checked={selectedCategories.includes(cat.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCategories([
                                ...selectedCategories,
                                cat.id,
                              ]);
                            } else {
                              setSelectedCategories(
                                selectedCategories.filter(
                                  (id) => id !== cat.id
                                )
                              );
                            }
                          }}
                        />
                        {cat.name}
                      </label>
                    ))}
                  </div>

                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setSelectedCounter(null)}
                className="px-4 py-2 border rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                className="bg-green-600 text-white px-4 py-2 rounded-lg"
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