// import React, { useState, useEffect } from 'react';
// import { X, Upload } from 'lucide-react';
// import DropdownCheckbox from './DropdownCheckbox';
// import MenuImagePreview from '../../MainComponents/InventoryServices/Tree&CategoryManage/MenuImagePreview';
// import axios from "axios";

// const UniversalEditModal = ({
//   // Common props
//   showModal,
//   setShowModal,
//   modalType, // 'menu' or 'table'

//   // Menu-specific props
//   editingItem,
//   setEditingItem,
//   categories,
//   menuItems, // ✅ This now receives addonItems from parent
//   editItemImage,
//   setEditItemImage,
//   editItemImageUrl,
//   setEditItemImageUrl,
//   handleEditItem,
//   clientId,
//   token,
//   inventoryIds,

//   // Table-specific props
//   editRowId,
//   setEditRowId,
//   table,
//   handleEditChange,
//   saveEdit,
//   editFieldErrors
// }) => {
//   const [dragActive, setDragActive] = useState(false);
//   const [zoneOptions, setZoneOptions] = useState([]);
//   const [sectionOptions, setSectionOptions] = useState([]);
//   const [loadingMasters, setLoadingMasters] = useState(false);
//   const [statusOptions, setStatusOptions] = useState([]);

//   // Menu Modal Functions
//   const handleEditDrag = (e) => {
//     e.preventDefault();
//     e.stopPropagation();
//     if (e.type === "dragenter" || e.type === "dragover") {
//       setDragActive(true);
//     } else if (e.type === "dragleave") {
//       setDragActive(false);
//     }
//   };

//   const handleEditDrop = (e) => {
//     e.preventDefault();
//     e.stopPropagation();
//     setDragActive(false);

//     if (e.dataTransfer.files && e.dataTransfer.files[0]) {
//       handleEditImageFile(e.dataTransfer.files[0]);
//     }
//   };
//   const fetchMasterValues = async (categoryId, setter) => {
//     try {
//       const res = await axios.get(
//         `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/inventory/masters`,
//         {
//           params: { category_id: categoryId },
//           headers: { Authorization: `Bearer ${token}` }
//         }
//       );

//       setter(res?.data?.data || []);

//     } catch (err) {
//       console.error("Master fetch error:", categoryId, err);
//       setter([]);
//     }
//   };
//   useEffect(() => {
//     if (!showModal || modalType !== "table") return;
//     if (!clientId || !token) return;

//     const loadMasters = async () => {
//       setLoadingMasters(true);

//       await Promise.all([
//         fetchMasterValues("zone", setZoneOptions),
//         fetchMasterValues("section", setSectionOptions),
//         fetchMasterValues("status", setStatusOptions)
//       ]);

//       setLoadingMasters(false);
//     };

//     loadMasters();
//   }, [showModal, modalType, clientId, token]);

//   const handleEditImageFile = (file) => {
//     if (file && file.type.startsWith('image/')) {
//       setEditItemImage(file);
//       setEditItemImageUrl(URL.createObjectURL(file));
//     } else {
//       alert('Please upload a valid image file');
//     }
//   };

//   const flattenCategories = (items, level = 0) => {
//     let result = [];
//     items.forEach(item => {
//       if (item.id !== 'all') {
//         result.push({ ...item, level });
//         if (item.children) {
//           result = result.concat(flattenCategories(item.children, level + 1));
//         }
//       }
//     });
//     return result;
//   };

//   const handleClose = () => {
//     setShowModal(false);
//     if (modalType === 'menu') {
//       setEditingItem?.(null);
//       setEditItemImage?.(null);
//       setEditItemImageUrl?.('');
//     } else if (modalType === 'table') {
//       setEditRowId?.(null);
//     }


//   };

//   if (!showModal) return null;

//   // Render Menu Edit Modal
//   if (modalType === 'menu' && editingItem) {
//     return (
//       <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
//         <div className="rounded-lg max-w-2xl w-full bg-white max-h-[90vh] overflow-hidden flex flex-col shadow-xl">

//           {/* Header */}
//           <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
//             <h2 className="text-xl font-semibold text-gray-900">Edit Menu Item</h2>
//             <button
//               onClick={handleClose}
//               className="p-1.5 rounded-lg bg-action-primary text-text-white hover:opacity-90 transition-opacity">
//               <X className="w-5 h-5" />
//             </button>
//           </div>

//           {/* Content */}
//           <div className="flex-1 overflow-y-auto px-6 py-4">
//             <div className="space-y-4">
//               {/* Category Selector */}
//               <div>
//                 <label className="block text-sm font-medium mb-1 text-gray-700">
//                   Category <span className="text-red-600">*</span>
//                 </label>
//                 <select
//                   value={editingItem.category_id || ''}
//                   onChange={(e) => setEditingItem({ ...editingItem, category_id: e.target.value })}
//                   className="w-full px-3 py-2 rounded-md border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//                   required
//                 >
//                   <option value="">Select a category</option>
//                   {flattenCategories(categories || []).map(cat => (
//                     <option key={cat.id} value={cat.id}>
//                       {'—'.repeat(cat.level)} {cat.name}
//                     </option>
//                   ))}
//                 </select>
//               </div>

//               {/* Inventory ID Dropdown */}
//               <div>
//                 <label className="block text-sm font-medium mb-1 text-gray-700">
//                   Inventory ID <span className="text-red-600">*</span>
//                 </label>

//                 <select
//                   value={editingItem.inventory_id || ""}
//                   onChange={(e) =>
//                     setEditingItem({
//                       ...editingItem,
//                       inventory_id: e.target.value
//                     })
//                   }
//                   className="w-full px-3 py-2 rounded-md border border-gray-300 text-gray-900
//                focus:outline-none focus:ring-2 focus:ring-action-primary"
//                   required
//                 >
//                   <option value="">Select Inventory ID</option>

//                   {(inventoryIds || []).map((inv) => (
//                     <option key={inv.id} value={inv.id}>
//                       {inv.inventory_id} - {inv.name}
//                     </option>
//                   ))}
//                 </select>
//               </div>

//               {/* Item Name */}
//               <div>
//                 <label className="block text-sm font-medium mb-1 text-gray-700">
//                   Item Name <span className="text-red-600">*</span>
//                 </label>
//                 <input
//                   type="text"
//                   value={editingItem.name}
//                   onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
//                   className="w-full px-3 py-2 rounded-md border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//                   required
//                 />
//               </div>

//               {/* Description */}
//               <div>
//                 <label className="block text-sm font-medium mb-1 text-gray-700">Description</label>
//                 <textarea
//                   value={editingItem.description}
//                   onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
//                   className="w-full px-3 py-2 rounded-md border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//                   rows="3"
//                 />
//               </div>

//               {/* Unit Price & Discount */}
//               <div className="grid grid-cols-2 gap-4">
//                 <div>
//                   <label className="block text-sm font-medium mb-1 text-gray-700">
//                     Unit Price <span className="text-red-600">*</span>
//                   </label>
//                   <input
//                     type="number"
//                     value={editingItem.unit_price}
//                     onChange={(e) => setEditingItem({ ...editingItem, unit_price: e.target.value })}
//                     className="w-full px-3 py-2 rounded-md border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//                     required
//                   />
//                 </div>

//                 <div>
//                   <label className="block text-sm font-medium mb-1 text-gray-700">Discount</label>
//                   <input
//                     type="number"
//                     value={editingItem.discount}
//                     onChange={(e) => setEditingItem({ ...editingItem, discount: e.target.value })}
//                     className="w-full px-3 py-2 rounded-md border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//                   />
//                 </div>
//               </div>

//               {/* Code & Unit */}
//               <div className="grid grid-cols-2 gap-4">
//                 <div>
//                   <label className="block text-sm font-medium mb-1 text-gray-700">
//                     Code <span className="text-red-600">*</span>
//                   </label>
//                   <input
//                     type="text"
//                     value={editingItem.code ?? ''}
//                     onChange={(e) =>
//                       setEditingItem({
//                         ...editingItem,
//                         code: e.target.value
//                       })
//                     }
//                     className="w-full px-3 py-2 rounded-md border border-gray-300 text-gray-900
//                       focus:outline-none focus:ring-2 focus:ring-action-primary"
//                     placeholder="Item Code"
//                     required
//                   />
//                 </div>
//                 <div>
//                   <label className="block text-sm font-medium mb-1 text-gray-700">Unit</label>
//                   <input
//                     type="text"
//                     value={editingItem.unit}
//                     onChange={(e) => setEditingItem({ ...editingItem, unit: e.target.value })}
//                     className="w-full px-3 py-2 rounded-md border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//                   />
//                 </div>
//               </div>

//               {/* Item Image Upload */}
//               <div>
//                 <label className="block text-sm font-medium mb-1 text-gray-700">Item Image</label>

//                 {editItemImageUrl || editingItem.image_id ? (
//                   <div className="mb-3">
//                     <p className="text-xs text-gray-600 mb-1">Current Image:</p>
//                     {editItemImageUrl ? (
//                       <div className="relative">
//                         <img
//                           src={editItemImageUrl}
//                           alt="New Preview"
//                           className="w-full h-32 object-cover rounded-md border border-gray-200"
//                         />
//                         <button
//                           type="button"
//                           onClick={() => {
//                             setEditItemImage(null);
//                             setEditItemImageUrl('');
//                           }}
//                           className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-full hover:bg-red-700"
//                         >
//                           <X className="w-4 h-4" />
//                         </button>
//                       </div>
//                     ) : (
//                       <MenuImagePreview
//                         clientId={clientId}
//                         imageId={editingItem.image_id}
//                         token={token}
//                         alt={editingItem.name}
//                         baseUrl={import.meta.env.VITE_API_DOCUMENT_SERVICE_URL}
//                         urlBuilder={({ baseUrl, clientId, imageId }) =>
//                           `${baseUrl}/${clientId}/document/download?doc_id=${imageId}`
//                         }
//                         className="w-full h-32 object-cover rounded-md border border-gray-200"
//                       />
//                     )}
//                   </div>
//                 ) : null}

//                 <div
//                   className={`relative border-2 border-dashed rounded-md p-6 transition-colors ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'
//                     }`}
//                   onDragEnter={handleEditDrag}
//                   onDragLeave={handleEditDrag}
//                   onDragOver={handleEditDrag}
//                   onDrop={handleEditDrop}
//                 >
//                   <div className="text-center">
//                     <Upload className="mx-auto mb-2 text-gray-400" size={32} />
//                     <p className="text-sm text-gray-600 mb-2">
//                       {editingItem.image_id ? 'Upload new image to replace' : 'Drag & drop an image here'}
//                     </p>
//                     <input
//                       type="file"
//                       accept="image/*"
//                       onChange={(e) => e.target.files[0] && handleEditImageFile(e.target.files[0])}
//                       className="hidden"
//                       id="editImageUpload"
//                     />
//                     <label
//                       htmlFor="editImageUpload"
//                       className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md cursor-pointer hover:bg-blue-700 text-sm font-medium"
//                     >
//                       Choose File
//                     </label>
//                   </div>
//                 </div>
//               </div>

//               {/* Add-ons - ✅ Now only shows items from addons category, excluding current item */}
//               <div>
//                 <label className="block text-sm font-medium mb-1 text-gray-700">
//                   Add-ons
//                   <span className="text-xs text-gray-500 ml-2">
//                     (Only items from Addons category)
//                   </span>
//                 </label>
//                 <DropdownCheckbox
//                   selected={Array.isArray(editingItem.line_item_id) ? editingItem.line_item_id : []}
//                   options={(menuItems || []).filter(item => item.id !== editingItem.id)}
//                   onChange={(selected) => setEditingItem({ ...editingItem, line_item_id: selected })}
//                   label="Select Add-ons"
//                 />
//               </div>
//             </div>
//           </div>

//           {/* Footer */}
//           <div className="px-6 py-4 border-t border-border-default bg-gray-50 flex gap-3 justify-end">
//             <button
//               onClick={handleClose}
//               className="px-6 py-2 rounded-md bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 font-medium"
//             >
//               Cancel
//             </button>
//             <button
//               onClick={handleEditItem}
//               className="px-6 py-2 rounded-md bg-action-primary text-text-white font-medium"
//             >
//               Save Changes
//             </button>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   // Render Table Edit Modal
//   if (modalType === 'table' && table) {
//     return (
//       <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
//         <div className="bg-white rounded-lg w-full max-w-md shadow-xl">

//           {/* Header */}
//           <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
//             <h2 className="text-xl font-semibold text-gray-900">Edit Table</h2>
//             <button
//               className="p-1.5 rounded-lg bg-action-primary text-text-white hover:opacity-90 transition-opacity"
//               onClick={handleClose}
//             >
//               <X className="w-5 h-5" />
//             </button>
//           </div>

//           {/* Content */}
//           <div className="px-6 py-4">
//             {/* Table Name Display */}
//             <div className="bg-gray-50 border border-gray-200 rounded-md p-4 mb-4 text-center">
//               <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">Table Name</p>
//               <p className="text-2xl font-bold text-gray-900">{table.name}</p>
//             </div>

//             <div className="space-y-4">
//               {/* No of Seating */}
//               <div>
//                 <label className="block text-sm font-medium mb-1 text-gray-700">No of Seating</label>

//                 {/* Desktop */}
//                 <input
//                   type="number"
//                   min="1"
//                   value={table.table_type}
//                   onChange={(e) => {
//                     const value = Math.max(1, Number(e.target.value) || 1);
//                     handleEditChange(table.id, "table_type", value);
//                   }}
//                   className={`hidden md:block w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${editFieldErrors?.table_type ? 'border-red-500 bg-red-50' : 'border-gray-300'
//                     }`}
//                 />

//                 {/* Mobile */}
//                 <div className={`md:hidden flex items-center gap-2 border rounded-md ${editFieldErrors?.table_type ? 'border-red-500 bg-red-50' : 'border-gray-300'
//                   }`}>
//                   <button
//                     type="button"
//                     onClick={() => {
//                       const newValue = Math.max(1, (Number(table.table_type) || 1) - 1);
//                       handleEditChange(table.id, "table_type", newValue);
//                     }}
//                     className="px-4 py-2 text-lg font-bold text-gray-700 hover:bg-gray-100 transition-colors"
//                   >
//                     −
//                   </button>
//                   <input
//                     type="number"
//                     min="1"
//                     value={table.table_type}
//                     onChange={(e) => {
//                       const value = Math.max(1, Number(e.target.value) || 1);
//                       handleEditChange(table.id, "table_type", value);
//                     }}
//                     className="flex-1 text-center py-2 border-x border-gray-300 focus:outline-none bg-transparent font-bold"
//                   />
//                   <button
//                     type="button"
//                     onClick={() => {
//                       const newValue = (Number(table.table_type) || 1) + 1;
//                       handleEditChange(table.id, "table_type", newValue);
//                     }}
//                     className="px-4 py-2 text-lg font-bold text-gray-700 hover:bg-gray-100 transition-colors"
//                   >
//                     +
//                   </button>
//                 </div>

//                 {editFieldErrors?.table_type && (
//                   <p className="text-red-600 text-xs mt-1">{editFieldErrors.table_type}</p>
//                 )}
//               </div>

//               {/* Section */}
//               <div>
//                 <label className="block text-sm font-medium mb-1 text-gray-700">
//                   Section
//                 </label>
//                 <select
//                   value={table.section || ""}
//                   onChange={(e) =>
//                     handleEditChange(table.id, "section", e.target.value)
//                   }
//                   className="w-full px-3 py-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-blue-500"
//                 >
//                   <option value="">Select Section</option>

//                   {loadingMasters ? (
//                     <option disabled>Loading...</option>
//                   ) : sectionOptions.length === 0 ? (
//                     <option disabled>No Sections Configured</option>
//                   ) : (
//                     sectionOptions.map((sec, i) => (
//                       <option key={i} value={sec}>{sec}</option>
//                     ))
//                   )}
//                 </select>

//               </div>

//               {/* Zone */}
//               <div>
//                 <label className="block text-sm font-medium mb-1 text-gray-700">
//                   Zone
//                 </label>
//                 <select
//                   value={table.location_zone || ""}
//                   onChange={(e) =>
//                     handleEditChange(table.id, "location_zone", e.target.value)
//                   }
//                   className="w-full px-3 py-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-blue-500"
//                 >
//                   <option value="">Select Zone</option>

//                   {loadingMasters ? (
//                     <option disabled>Loading...</option>
//                   ) : zoneOptions.length === 0 ? (
//                     <option disabled>No Zones Configured</option>
//                   ) : (
//                     zoneOptions.map((zone, i) => (
//                       <option key={i} value={zone}>{zone}</option>
//                     ))
//                   )}
//                 </select>

//               </div>

//               {/* Status */}
//               <div>
//                 <label className="block text-sm font-medium mb-1 text-gray-700">Status</label>
//                 <select
//                   value={table.status || ""}
//                   onChange={(e) => handleEditChange(table.id, "status", e.target.value)}
//                   className={`w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-500 ${editFieldErrors?.status ? 'border-red-500 bg-red-50' : 'border-gray-300'
//                     }`}
//                 >
//                   <option value="">Select Status</option>

//                   {loadingMasters ? (
//                     <option disabled>Loading...</option>
//                   ) : statusOptions.length === 0 ? (
//                     <option disabled>No Status Configured</option>
//                   ) : (
//                     statusOptions.map((status, i) => (
//                       <option key={i} value={status}>{status}</option>
//                     ))
//                   )}
//                 </select>

//                 {editFieldErrors?.status && (
//                   <p className="text-red-600 text-xs mt-1">{editFieldErrors.status}</p>
//                 )}
//               </div>
//             </div>
//           </div>

//           {/* Footer */}
//           <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex gap-3 justify-end">
//             <button
//               className="px-6 py-2 rounded-md bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 font-medium"
//               onClick={handleClose}
//             >
//               Cancel
//             </button>
//             <button
//               className="px-6 py-2 rounded-md bg-action-primary text-text-white hover:bg-blue-700 font-medium"
//               onClick={saveEdit}

//             >
//               Save
//             </button>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   return null;
// };

// export default UniversalEditModal;


















import React, { useState, useEffect } from 'react';
import { X, Upload, Plus } from 'lucide-react';
import MenuImagePreview from '../../MainComponents/InventoryServices/Tree&CategoryManage/MenuImagePreview';
import AddonSelectionPopup from './AddonSelection';
import axios from 'axios';

const UniversalEditModal = ({
  // Common props
  showModal,
  setShowModal,
  modalType, // 'menu' or 'table'

  // Menu-specific props
  editingItem,
  setEditingItem,
  categories,
  addonSubcategories, // ✅ Addon subcategories
  allAddonItems, // ✅ All addon items
  editItemImage,
  setEditItemImage,
  editItemImageUrl,
  setEditItemImageUrl,
  handleEditItem,
  clientId,
  token,
  inventoryIds,

  // Table-specific props
  editRowId,
  setEditRowId,
  table,
  handleEditChange,
  saveEdit,
  editFieldErrors
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [showAddonPopup, setShowAddonPopup] = useState(false); // ✅ Popup state
  const [zoneOptions, setZoneOptions] = useState([]);
  const [sectionOptions, setSectionOptions] = useState([]);
  const [loadingMasters, setLoadingMasters] = useState(false);
  const [statusOptions, setStatusOptions] = useState([]);

  // Fetch master values for zones, sections, and status
  const fetchMasterValues = async (categoryId, setter) => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/inventory/masters`,
        {
          params: { category_id: categoryId },
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setter(res?.data?.data || []);
    } catch (err) {
      console.error("Master fetch error:", categoryId, err);
      setter([]);
    }
  };

  // Load master data for table modal
  useEffect(() => {
    if (!showModal || modalType !== "table") return;
    if (!clientId || !token) return;

    const loadMasters = async () => {
      setLoadingMasters(true);
      await Promise.all([
        fetchMasterValues("zone", setZoneOptions),
        fetchMasterValues("section", setSectionOptions),
        fetchMasterValues("status", setStatusOptions)
      ]);
      setLoadingMasters(false);
    };

    loadMasters();
  }, [showModal, modalType, clientId, token]);

  // Menu Modal Functions
  const handleEditDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleEditDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleEditImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleEditImageFile = (file) => {
    if (file && file.type.startsWith('image/')) {
      setEditItemImage(file);
      setEditItemImageUrl(URL.createObjectURL(file));
    } else {
      alert('Please upload a valid image file');
    }
  };

  const flattenCategories = (items, level = 0) => {
    let result = [];
    items.forEach(item => {
      if (item.id !== 'all') {
        result.push({ ...item, level });
        if (item.children) {
          result = result.concat(flattenCategories(item.children, level + 1));
        }
      }
    });
    return result;
  };

  // ✅ Get addon name by ID
  const getAddonNameById = (id) => {
    const addon = allAddonItems?.find(item => item.id === id);
    return addon?.name || 'Unknown';
  };

  // ✅ Remove individual addon
  const removeAddon = (addonId) => {
    setEditingItem(prev => ({
      ...prev,
      line_item_id: (prev?.line_item_id || []).filter(id => id !== addonId)
    }));
  };

  const handleClose = () => {
    setShowModal(false);
    if (modalType === 'menu') {
      setEditingItem?.(null);
      setEditItemImage?.(null);
      setEditItemImageUrl?.('');
    } else if (modalType === 'table') {
      setEditRowId?.(null);
    }
  };

  if (!showModal) return null;

  // Render Menu Edit Modal
  if (modalType === 'menu' && editingItem) {
    return (
      <>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="rounded-lg max-w-2xl w-full bg-white max-h-[90vh] overflow-hidden flex flex-col shadow-xl">

            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Edit Menu Item</h2>
              <button
                onClick={handleClose} 
                className="p-1.5 rounded-lg bg-action-primary text-text-white hover:opacity-90 transition-opacity">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-4">
                {/* Category Selector */}
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">
                    Category <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={editingItem.category_id || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, category_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-md border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select a category</option>
                    {flattenCategories(categories || []).map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {'—'.repeat(cat.level)} {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Inventory ID Dropdown */}
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">
                    Inventory ID <span className="text-red-600">*</span>
                  </label>

                  <select
                    value={editingItem.inventory_id || ""}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        inventory_id: e.target.value
                      })
                    }
                    className="w-full px-3 py-2 rounded-md border border-gray-300 text-gray-900
                 focus:outline-none focus:ring-2 focus:ring-action-primary"
                    required
                  >
                    <option value="">Select Inventory ID</option>

                    {(inventoryIds || []).map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.inventory_id} - {inv.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Item Name */}
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">
                    Item Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingItem.name}
                    onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-md border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Description</label>
                  <textarea
                    value={editingItem.description}
                    onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                    className="w-full px-3 py-2 rounded-md border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows="3"
                  />
                </div>

                {/* Unit Price & Discount */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">
                      Unit Price <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="number"
                      value={editingItem.unit_price}
                      onChange={(e) => setEditingItem({ ...editingItem, unit_price: e.target.value })}
                      className="w-full px-3 py-2 rounded-md border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">Discount</label>
                    <input
                      type="number"
                      value={editingItem.discount}
                      onChange={(e) => setEditingItem({ ...editingItem, discount: e.target.value })}
                      className="w-full px-3 py-2 rounded-md border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Code & Unit */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">
                      Code <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={editingItem.code ?? ''}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          code: e.target.value
                        })
                      }
                      className="w-full px-3 py-2 rounded-md border border-gray-300 text-gray-900
                        focus:outline-none focus:ring-2 focus:ring-action-primary"
                      placeholder="Item Code"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">Unit</label>
                    <input
                      type="text"
                      value={editingItem.unit}
                      onChange={(e) => setEditingItem({ ...editingItem, unit: e.target.value })}
                      className="w-full px-3 py-2 rounded-md border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Item Image Upload */}
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Item Image</label>

                  {editItemImageUrl || editingItem.image_id ? (
                    <div className="mb-3">
                      <p className="text-xs text-gray-600 mb-1">Current Image:</p>
                      {editItemImageUrl ? (
                        <div className="relative">
                          <img
                            src={editItemImageUrl}
                            alt="New Preview"
                            className="w-full h-32 object-cover rounded-md border border-gray-200"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setEditItemImage(null);
                              setEditItemImageUrl('');
                            }}
                            className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-full hover:bg-red-700"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <MenuImagePreview
                          clientId={clientId}
                          imageId={editingItem.image_id}
                          token={token}
                          alt={editingItem.name}
                          baseUrl={import.meta.env.VITE_API_DOCUMENT_SERVICE_URL}
                          urlBuilder={({ baseUrl, clientId, imageId }) =>
                            `${baseUrl}/${clientId}/document/download?doc_id=${imageId}`
                          }
                          className="w-full h-32 object-cover rounded-md border border-gray-200"
                        />
                      )}
                    </div>
                  ) : null}

                  <div
                    className={`relative border-2 border-dashed rounded-md p-6 transition-colors ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'
                      }`}
                    onDragEnter={handleEditDrag}
                    onDragLeave={handleEditDrag}
                    onDragOver={handleEditDrag}
                    onDrop={handleEditDrop}
                  >
                    <div className="text-center">
                      <Upload className="mx-auto mb-2 text-gray-400" size={32} />
                      <p className="text-sm text-gray-600 mb-2">
                        {editingItem.image_id ? 'Upload new image to replace' : 'Drag & drop an image here'}
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => e.target.files[0] && handleEditImageFile(e.target.files[0])}
                        className="hidden"
                        id="editImageUpload"
                      />
                      <label
                        htmlFor="editImageUpload"
                        className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md cursor-pointer hover:bg-blue-700 text-sm font-medium"
                      >
                        Choose File
                      </label>
                    </div>
                  </div>
                </div>

                {/* ✅ Add-ons with Popup */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">
                    Add-ons
                  </label>
                  
                  {/* Selected Addons Display */}
                  {editingItem.line_item_id && editingItem.line_item_id.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {editingItem.line_item_id.map(addonId => (
                        <div
                          key={addonId}
                          className="flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-sm"
                        >
                          <span>{getAddonNameById(addonId)}</span>
                          <button
                            type="button"
                            onClick={() => removeAddon(addonId)}
                            className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Select Addons Button */}
                  <button
                    type="button"
                    onClick={() => setShowAddonPopup(true)}
                    className="w-full px-4 py-3 rounded-lg bg-gray-50 border-2 border-dashed border-gray-300 text-gray-700 hover:border-blue-500 hover:bg-blue-50 transition-all flex items-center justify-center gap-2 font-medium"
                  >
                    <Plus size={18} />
                    <span>
                      {editingItem.line_item_id && editingItem.line_item_id.length > 0
                        ? `Manage Add-ons (${editingItem.line_item_id.length} selected)`
                        : 'Select Add-ons'}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border-default bg-gray-50 flex gap-3 justify-end">
              <button
                onClick={handleClose}
                className="px-6 py-2 rounded-md bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleEditItem}
                className="px-6 py-2 rounded-md bg-action-primary text-text-white font-medium"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>

        {/* ✅ Addon Selection Popup */}
        <AddonSelectionPopup
          isOpen={showAddonPopup}
          onClose={() => setShowAddonPopup(false)}
          selectedAddons={editingItem?.line_item_id || []}
          onSave={(selectedAddons) => {
            setEditingItem(prev => ({ ...prev, line_item_id: selectedAddons }));
          }}
          addonSubcategories={addonSubcategories || []}
          allAddonItems={allAddonItems || []}
          currentItemId={editingItem?.id}
        />
      </>
    );
  }

  // Render Table Edit Modal
  if (modalType === 'table' && table) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg w-full max-w-md shadow-xl">

          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Edit Table</h2>
            <button
              className="p-1.5 rounded-lg bg-action-primary text-text-white hover:opacity-90 transition-opacity"
              onClick={handleClose}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            {/* Table Name Display */}
            <div className="bg-gray-50 border border-gray-200 rounded-md p-4 mb-4 text-center">
              <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">Table Name</p>
              <p className="text-2xl font-bold text-gray-900">{table.name}</p>
            </div>

            <div className="space-y-4">
              {/* No of Seating */}
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">No of Seating</label>

                {/* Desktop */}
                <input
                  type="number"
                  min="1"
                  value={table.table_type}
                  onChange={(e) => {
                    const value = Math.max(1, Number(e.target.value) || 1);
                    handleEditChange(table.id, "table_type", value);
                  }}
                  className={`hidden md:block w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${editFieldErrors?.table_type ? 'border-red-500 bg-red-50' : 'border-gray-300'
                    }`}
                />

                {/* Mobile */}
                <div className={`md:hidden flex items-center gap-2 border rounded-md ${editFieldErrors?.table_type ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}>
                  <button
                    type="button"
                    onClick={() => {
                      const newValue = Math.max(1, (Number(table.table_type) || 1) - 1);
                      handleEditChange(table.id, "table_type", newValue);
                    }}
                    className="px-4 py-2 text-lg font-bold text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={table.table_type}
                    onChange={(e) => {
                      const value = Math.max(1, Number(e.target.value) || 1);
                      handleEditChange(table.id, "table_type", value);
                    }}
                    className="flex-1 text-center py-2 border-x border-gray-300 focus:outline-none bg-transparent font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const newValue = (Number(table.table_type) || 1) + 1;
                      handleEditChange(table.id, "table_type", newValue);
                    }}
                    className="px-4 py-2 text-lg font-bold text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    +
                  </button>
                </div>

                {editFieldErrors?.table_type && (
                  <p className="text-red-600 text-xs mt-1">{editFieldErrors.table_type}</p>
                )}
              </div>

              {/* Section */}
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  Section
                </label>
                <select
                  value={table.section || ""}
                  onChange={(e) =>
                    handleEditChange(table.id, "section", e.target.value)
                  }
                  className="w-full px-3 py-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Section</option>

                  {loadingMasters ? (
                    <option disabled>Loading...</option>
                  ) : sectionOptions.length === 0 ? (
                    <option disabled>No Sections Configured</option>
                  ) : (
                    sectionOptions.map((sec, i) => (
                      <option key={i} value={sec}>{sec}</option>
                    ))
                  )}
                </select>
              </div>

              {/* Zone */}
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  Zone
                </label>
                <select
                  value={table.location_zone || ""}
                  onChange={(e) =>
                    handleEditChange(table.id, "location_zone", e.target.value)
                  }
                  className="w-full px-3 py-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Zone</option>

                  {loadingMasters ? (
                    <option disabled>Loading...</option>
                  ) : zoneOptions.length === 0 ? (
                    <option disabled>No Zones Configured</option>
                  ) : (
                    zoneOptions.map((zone, i) => (
                      <option key={i} value={zone}>{zone}</option>
                    ))
                  )}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Status</label>
                <select
                  value={table.status || ""}
                  onChange={(e) => handleEditChange(table.id, "status", e.target.value)}
                  className={`w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-500 ${editFieldErrors?.status ? 'border-red-500 bg-red-50' : 'border-gray-300'
                    }`}
                >
                  <option value="">Select Status</option>

                  {loadingMasters ? (
                    <option disabled>Loading...</option>
                  ) : statusOptions.length === 0 ? (
                    <option disabled>No Status Configured</option>
                  ) : (
                    statusOptions.map((status, i) => (
                      <option key={i} value={status}>{status}</option>
                    ))
                  )}
                </select>

                {editFieldErrors?.status && (
                  <p className="text-red-600 text-xs mt-1">{editFieldErrors.status}</p>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex gap-3 justify-end">
            <button
              className="px-6 py-2 rounded-md bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 font-medium"
              onClick={handleClose}
            >
              Cancel
            </button>
            <button
              className="px-6 py-2 rounded-md bg-action-primary text-text-white hover:bg-blue-700 font-medium"
              onClick={saveEdit}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default UniversalEditModal;