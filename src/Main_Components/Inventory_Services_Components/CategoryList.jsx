import React, { useEffect, useState } from "react";
import { FaEdit, FaTrash } from "react-icons/fa";
import { jwtDecode } from "jwt-decode";
import { useParams } from "react-router-dom";
import inventoryServicesPort from '../../Backend_Port_Files/InventoryServices'


function CategoryList({ onCategorySelect }) {
    const [categories, setCategories] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [editSubcategories, setEditSubcategories] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [newName, setNewName] = useState("");
    const [newDescription, setNewDescription] = useState("");
    const [newSubcategories, setNewSubcategories] = useState([]);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [newId, setNewId] = useState(""); const [activeCategory, setActiveCategory] = useState(null);
    const [expandedCategoryIds, setExpandedCategoryIds] = useState([]);
    const [newSubcategoryName, setNewSubcategoryName] = useState("");
    const [editNewSubcategoryName, setEditNewSubcategoryName] = useState("");
    const [parentMap, setParentMap] = useState({});

    const [newParentCategory, setNewParentCategory] = useState("");

    /////////////////////////////////////// /////////////


    const { clientId } = useParams();
    const token = localStorage.getItem("access_token");

    useEffect(() => {
        if (!token || !clientId) return;

        inventoryServicesPort
            .get(`/${clientId}/inventory/read_category?category_id=dietery`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })
            .then((res) => {
                const rawCategories = res.data.data;
                const tempParentMap = {};
                const traverseAndBuildMap = (cats, parentId = null) => {
                    for (const cat of cats) {
                        if (parentId) {
                            tempParentMap[cat.id] = parentId;
                        }
                        if (cat.subCategories && cat.subCategories.length > 0) {
                            traverseAndBuildMap(cat.subCategories, cat.id);
                        }
                    }
                };

                traverseAndBuildMap(rawCategories);
                setParentMap(tempParentMap);

                const subCategoryIds = new Set(Object.keys(tempParentMap));
                const topLevelCategories = rawCategories.filter(
                    (cat) => !subCategoryIds.has(cat.id)
                );

                const allCategory = { id: "all", name: "All" };
                setCategories([allCategory, ...topLevelCategories]);
                setActiveCategory("all");
            })

            .catch((err) => console.error("❌ Error fetching categories:", err));
    }, [clientId, token]);



    const toggleCategoryExpand = (id) => {
        setExpandedCategoryIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const renderCategory = (category, level = 0) => {
        const isParent = level === 0;

        return (
            <div key={category.id} style={{ marginLeft: level * 5 }}>
                <div className="category-item" style={{ display: "flex", alignItems: "center" }}>
                    <span
                        onClick={() => onCategorySelect(category)}
                        style={{
                            cursor: "pointer",
                            fontWeight: "bold",
                            flexGrow: 1,
                            color: isParent ? "var(--bg-number-color)" : "var(--bg-text-color)"
                        }}
                    >
                        {category.name}
                    </span>

                    {category.subCategories?.length > 0 && (
                        <span
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleCategoryExpand(category.id);
                            }}
                            style={{ cursor: "pointer", marginLeft: 8 }}
                        >
                            ▾
                        </span>
                    )}

                    <>
                        <button
                            className="btn-edit"
                            onClick={(e) => {
                                e.stopPropagation();
                                startEdit(category);
                            }}
                        >
                            <FaEdit />
                        </button>
                        <button
                            className="btn-delete"
                            onClick={(e) => {
                                e.stopPropagation();
                                setDeleteTarget(category);
                            }}
                        >
                            <FaTrash />
                        </button>
                    </>
                </div>

                {expandedCategoryIds.includes(category.id) &&
                    category.subCategories?.map((sub) =>
                        renderCategory(sub, level + 1)
                    )}
            </div>
        );
    };


    const toggleSubcategory = (id, isEdit = false) => {
        const state = isEdit ? editSubcategories : newSubcategories;
        const setter = isEdit ? setEditSubcategories : setNewSubcategories;

        setter(
            state.includes(id)
                ? state.filter((sid) => sid !== id)
                : [...state, id]
        );
    };


    const buildParentMap = (categories) => {
        const map = {};
        const dfs = (nodes, parent = null) => {
            nodes.forEach((node) => {
                if (parent) map[node.id] = parent;
                if (node.subCategories?.length) dfs(node.subCategories, node.id);
            });
        };
        dfs(categories);
        return map;
    };

    const generateSlugFromParents = (categoryId, currentName, overrideParentMap = null) => {
        const path = [];
        const categoryMap = {};
        const buildMap = (cats) => {
            for (const cat of cats) {
                categoryMap[cat.id] = cat;
                if (cat.subCategories) buildMap(cat.subCategories);
            }
        };
        buildMap(categories);

        const mapToUse = overrideParentMap || parentMap;

        let currentId = categoryId;
        const ancestors = [];
        while (mapToUse[currentId]) {
            const parentId = mapToUse[currentId];
            ancestors.unshift(parentId);
            currentId = parentId;
        }

        ancestors.forEach(id => {
            const cat = categoryMap[id];
            if (cat) path.push(cat.name.trim().replace(/\s+/g, " "));
        });

        if (currentName) {
            path.push(currentName.trim().replace(/\s+/g, " "));
        } else {
            const cat = categoryMap[categoryId];
            if (cat) path.push(cat.name.trim().replace(/\s+/g, " "));
        }

        return " " + path.join(" _");
    };

    const refreshCategoriesAndParentMap = async () => {
        try {
            const response = await inventoryServicesPort.get(
                `/${clientId}/inventory/read_category`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const rawCategories = response.data.data;

            const subCategoryIds = new Set();
            rawCategories.forEach(cat => {
                cat.subCategories?.forEach(sub => subCategoryIds.add(sub.id));
            });
            const topLevelCategories = rawCategories.filter(cat => !subCategoryIds.has(cat.id));

            setCategories([{ id: "all", name: "All" }, ...topLevelCategories]);
            setParentMap(buildParentMap(rawCategories));
        } catch (error) {
            console.error("Error refreshing categories:", error);
        }
    };


    const getAllCategoriesRecursive = (categoryList) => {
        const result = [];

        const traverse = (cats) => {
            for (const cat of cats) {
                result.push(cat);
                if (cat.subCategories && cat.subCategories.length > 0) {
                    traverse(cat.subCategories);
                }
            }
        };

        traverse(categoryList);
        return result;
    };



    const handleAddCategory = async () => {
        if (!newId.trim() || !newName.trim()) {
            alert("ID and Name are required");
            return;
        }

        let createdBy = "null";
        let updatedBy = "null";
        try {
            const decoded = jwtDecode(token);
            createdBy = String(decoded.user_id);
            updatedBy = String(decoded.user_id);
        } catch (err) {
            console.error("Token decode failed:", err);
        }

        let finalSubcategories = [...newSubcategories];


        if (newSubcategoryName.trim()) {
            const subId = `sub_${Date.now()}`;
            const tempParentMap = { [subId]: newId.trim() };

            const newSubPayload = {
                id: subId,
                client_id: clientId,
                name: newSubcategoryName.trim(),
                description: "",
                sub_categories: [],
                created_by: createdBy,
                updated_by: updatedBy,
                slug: generateSlugFromParents(subId, newSubcategoryName.trim(), tempParentMap),
            };

            try {
                const subRes = await inventoryServicesPort.post(
                    `/${clientId}/inventory/create_category`,
                    newSubPayload,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                const newSubId = subRes.data.data.id;
                finalSubcategories.push(newSubId);
            } catch (err) {
                console.error("Error creating new subcategory:", err.response?.data || err);
                alert("Failed to create subcategory");
                return;
            }
        }

        await refreshCategoriesAndParentMap();

        const slug = generateSlugFromParents(newId.trim(), newName.trim());

        const mainPayload = {
            id: newId.trim(),
            client_id: clientId,
            name: newName.trim(),
            description: newDescription.trim(),
            sub_categories: finalSubcategories,
            created_by: createdBy,
            updated_by: updatedBy,
            slug,
        };

        try {
            await inventoryServicesPort.post(
                `/${clientId}/inventory/create_category`,
                mainPayload,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            await refreshCategoriesAndParentMap();

            setNewId("");
            setNewName("");
            setNewDescription("");
            setNewSubcategories([]);
            setNewSubcategoryName("");
            setShowAddModal(false);
        } catch (err) {
            console.error("Error adding main category:", err.response?.data || err);
            alert("Failed to add main category");
        }
    };


    const startEdit = (cat) => {
        setEditingId(cat.id);
        setEditName(cat.name);
        setEditDescription(cat.description);

        const subcatIds = cat.sub_categories
            ? cat.sub_categories
            : (cat.subCategories?.map(sub => sub.id) || []);

        setEditSubcategories(subcatIds);
        setShowEditModal(true);
    };



    const handleEditSave = async () => {
        let finalEditSubcategories = [...editSubcategories];

        if (!editingId) return;

        let createdBy = "null";
        let updatedBy = "null";
        try {
            const decoded = jwtDecode(token);
            createdBy = String(decoded.user_id);
            updatedBy = String(decoded.user_id);
        } catch (err) {
            console.error("Token decode failed:", err);
        }

        if (editNewSubcategoryName.trim()) {
            const newSubId = `subcat_${Date.now()}`;
            const tempParentMap = { [newSubId]: editingId };

            const newSubPayload = {
                id: newSubId,
                client_id: clientId,
                name: editNewSubcategoryName.trim(),
                description: "",
                sub_categories: [],
                created_by: createdBy,
                updated_by: updatedBy,
                slug: generateSlugFromParents(newSubId, editNewSubcategoryName.trim(), tempParentMap),
            };

            try {
                const subRes = await inventoryServicesPort.post(
                    `/${clientId}/inventory/create_category`,
                    newSubPayload,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                const createdSubId = subRes.data.data.id;
                finalEditSubcategories.push(createdSubId);
            } catch (err) {
                console.error("Error creating subcategory:", err.response?.data || err);
                alert("Failed to create subcategory");
                return;
            }
        }


        await refreshCategoriesAndParentMap();

        const slug = generateSlugFromParents(editingId, editName.trim());

        const payload = {
            id: editingId,
            name: editName.trim(),
            description: editDescription.trim(),
            sub_categories: finalEditSubcategories,
            slug,
            overwrite_subcategories: true
        };

        try {
            await inventoryServicesPort.post(
                `/${clientId}/inventory/update_category`,
                payload,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            await refreshCategoriesAndParentMap();

            setEditingId(null);
            setEditNewSubcategoryName("");
            setShowEditModal(false);
        } catch (err) {
            console.error("Error editing category:", err.response?.data || err);
            alert("Failed to update category.");
        }
    };




    const handleDelete = async () => {
        if (!deleteTarget) return;
        const category = deleteTarget;
        console.log("Deleting category ID:", category.id);

        try {
            const res = await inventoryServicesPort.post(
                `/${clientId}/inventory/delete_category`,
                { id: category.id },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            const response = await inventoryServicesPort.get(
                `/${clientId}/inventory/read_category`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const rawCategories = response.data.data;

            const subCategoryIds = new Set();
            rawCategories.forEach(cat => {
                cat.subCategories?.forEach(sub => subCategoryIds.add(sub.id));
            });

            const topLevelCategories = rawCategories.filter(cat => !subCategoryIds.has(cat.id));
            const allCategory = { id: "all", name: "All" };
            setCategories([allCategory, ...topLevelCategories]);
            setActiveCategory("all");
            setDeleteTarget(null);

            alert(res.data.message || "Category deleted successfully");
        } catch (err) {
            console.error("Delete error:", err.response?.data || err);
            alert(err.response?.data?.detail || "Failed to delete category");
        }
    };


    return (
        <div className="category-list-container">
            <div className="category-header">
                <h3 className="category-list-title">Categories</h3>
                <button className="add-btn" onClick={() => setShowAddModal(true)}>
                    ➕
                </button>
            </div>

            <ul className="category-list">
                {categories.map((cat) =>
                    cat.name === "All" ? null : renderCategory(cat)
                )}
            </ul>

            {/* Add Modal */}
            {showAddModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h4>Add New Category</h4>
                        <input
                            type="text"
                            value={newId}
                            onChange={(e) => setNewId(e.target.value)}
                            placeholder="Category ID (required)"
                            className="modal-input"
                            required
                        />
                        <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="Category Name"
                            className="modal-input"
                        />
                        <input
                            type="text"
                            value={newDescription}
                            onChange={(e) => setNewDescription(e.target.value)}
                            placeholder="Description"
                            className="modal-input"
                        />
                        <input
                            type="text"
                            value={newSubcategoryName}
                            onChange={(e) => setNewSubcategoryName(e.target.value)}
                            placeholder="New Subcategory Name (optional)"
                            className="modal-input"
                        />

                        {/* <label>Assign as Subcategory under:</label>
                        <div className="subcategory-checkboxes">
                            {getAllCategoriesRecursive(categories).map((cat) => (
                                <label key={cat.id}>
                                    <input
                                        type="checkbox"
                                        checked={newSubcategories.includes(cat.id)}
                                        onChange={() => toggleSubcategory(cat.id)}
                                    />
                                    {cat.name}
                                </label>
                            ))}
                        </div> */}


                        
                        <div className="modal-buttons">
                            <button onClick={handleAddCategory} className="modal-save-btn">
                                Add
                            </button>
                            <button
                                onClick={() => {
                                    setShowAddModal(false);
                                    setNewId("");
                                    setNewName("");
                                    setNewDescription("");
                                    setNewSubcategories([]);
                                }}
                                className="modal-cancel-btn"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h4>Edit Category</h4>
                        <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="Category Name"
                            className="modal-input"
                        />
                        <input
                            type="text"
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            placeholder="Description"
                            className="modal-input"
                        />
                        <input
                            type="text"
                            value={editNewSubcategoryName}
                            onChange={(e) => setEditNewSubcategoryName(e.target.value)}
                            placeholder="New Subcategory Name (optional)"
                            className="modal-input"
                        />

                        {/* <label>Subcategories:</label>
                        <div className="subcategory-checkboxes">
                            {getAllCategoriesRecursive(categories)
                                .filter((cat) => cat.id !== editingId)
                                .map((cat) => (
                                    <label key={cat.id}>
                                        <input
                                            type="checkbox"
                                            checked={editSubcategories.includes(cat.id)}
                                            onChange={() => toggleSubcategory(cat.id, true)}
                                        />
                                        {cat.name}
                                    </label>
                                ))}
                        </div> */}
                        <div className="modal-buttons">
                            <button onClick={handleEditSave} className="modal-save-btn">
                                Save
                            </button>
                            <button
                                onClick={() => {
                                    setShowEditModal(false);
                                    setEditingId(null);
                                }}
                                className="modal-cancel-btn"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {deleteTarget && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h4>Confirm Delete</h4>
                        <p>
                            Are you sure you want to delete{" "}
                            <strong>{deleteTarget.name}</strong>?
                        </p>
                        <div className="modal-buttons">
                            <button
                                onClick={() => handleDelete(deleteTarget.id)}
                                className="modal-save-btn"
                            >
                                Yes
                            </button>
                            <button
                                onClick={() => setDeleteTarget(null)}
                                className="modal-cancel-btn"
                            >
                                No
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

export default CategoryList;