// import React, { useEffect, useState } from 'react';
// import { X, Edit, Trash2, Search } from 'lucide-react';
// import DropdownCheckbox from './DropdownCheckbox';
// import axios from "axios";

// const UniversalBulkUpdateModal = ({
//   // Common props
//   showModal,
//   setShowModal,
//   modalType, // 'menu' or 'table'
//   clientId,
//   token,

//   // Menu-specific props (Bulk Update)
//   filteredItems,
//   selectedRows,
//   setSelectedRows,
//   selectAllChecked,
//   setSelectAllChecked,
//   bulkEditData,
//   setBulkEditData,
//   handleBulkUpdate,
//   handleBulkDelete,
//   addonItems, // ✅ Addon items from parent

//   // Table-specific props (Bulk Update)
//   tables,
//   bulkUpdateSearch,
//   setBulkUpdateSearch,
//   selectedUpdateTables,
//   setSelectedUpdateTables,
//   bulkUpdateData,
//   setBulkUpdateData,
//   bulkUpdateGlobal,
//   setBulkUpdateGlobal,
//   handleBulkUpdateChange,
//   saveBulkUpdate,
//   getFilteredUpdateTables
// }) => {

//   // ✅ NEW: State for global add-ons selection
//   const [globalAddons, setGlobalAddons] = React.useState([]);
//   const [zoneOptions, setZoneOptions] = React.useState([]);
//   const [sectionOptions, setSectionOptions] = React.useState([]);
//   const [loadingMasters, setLoadingMasters] = React.useState(false);

//   // ✅ NEW: Apply global add-ons to all selected items
//   const applyGlobalAddons = () => {
//     if (globalAddons.length === 0) {
//       alert('Please select at least one add-on to apply');
//       return;
//     }

//     const updatedBulkData = { ...bulkEditData };

//     selectedRows.forEach(itemId => {
//       updatedBulkData[itemId] = {
//         ...(updatedBulkData[itemId] || {}),
//         line_item_id: globalAddons
//       };
//     });

//     setBulkEditData(updatedBulkData);
//     alert(`Applied ${globalAddons.length} add-on(s) to ${selectedRows.length} selected item(s)`);
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
//   React.useEffect(() => {
//     if (!showModal || modalType !== "table") return;
//     if (!clientId || !token) return;

//     const loadMasters = async () => {
//       setLoadingMasters(true);

//       await Promise.all([
//         fetchMasterValues("zone", setZoneOptions),
//         fetchMasterValues("section", setSectionOptions)
//       ]);

//       setLoadingMasters(false);
//     };

//     loadMasters();
//   }, [showModal, modalType, clientId, token]);

//   // ✅ NEW: Clear global add-ons for all selected items
//   const clearGlobalAddons = () => {
//     const updatedBulkData = { ...bulkEditData };

//     selectedRows.forEach(itemId => {
//       updatedBulkData[itemId] = {
//         ...(updatedBulkData[itemId] || {}),
//         line_item_id: []
//       };
//     });

//     setBulkEditData(updatedBulkData);
//     setGlobalAddons([]);
//     alert(`Cleared add-ons for ${selectedRows.length} selected item(s)`);
//   };

//   // Menu: Toggle all selection
//   const toggleSelectAll = () => {
//     if (modalType === 'menu') {
//       if (!selectAllChecked) {
//         setSelectedRows(filteredItems.map(item => item.id));
//         setSelectAllChecked(true);
//       } else {
//         setSelectedRows([]);
//         setSelectAllChecked(false);
//       }
//     }
//   };

//   // Menu: Toggle individual row
//   const toggleRowSelection = (itemId) => {
//     if (selectedRows.includes(itemId)) {
//       setSelectedRows(selectedRows.filter(id => id !== itemId));
//     } else {
//       setSelectedRows([...selectedRows, itemId]);
//     }
//   };

//   // Menu: Update bulk edit data
//   const updateBulkEditData = (itemId, field, value) => {
//     const editData = bulkEditData[itemId] || {};
//     setBulkEditData({
//       ...bulkEditData,
//       [itemId]: { ...editData, [field]: value }
//     });
//   };

//   // Table: Toggle all selection
//   const selectAllUpdateTables = () => {
//     const filtered = getFilteredUpdateTables();
//     if (selectedUpdateTables.length === filtered.length) {
//       setSelectedUpdateTables([]);
//     } else {
//       setSelectedUpdateTables(filtered.map(t => t.id));
//     }
//   };

//   // Table: Toggle individual table
//   const toggleUpdateTableSelection = (tableId) => {
//     setSelectedUpdateTables(prev =>
//       prev.includes(tableId)
//         ? prev.filter(id => id !== tableId)
//         : [...prev, tableId]
//     );
//   };

//   const handleClose = () => {
//     setShowModal(false);
//     if (modalType === 'menu') {
//       setSelectedRows([]);
//       setBulkEditData({});
//       setSelectAllChecked(false);
//       setGlobalAddons([]); // ✅ Reset global addons
//     } else if (modalType === 'table') {
//       setSelectedUpdateTables([]);
//       setBulkUpdateData({});
//       setBulkUpdateSearch('');
//       setBulkUpdateGlobal({
//         table_type: "",
//         status: "",
//         section: "",
//         location_zone: ""
//       });
//     }
//   };

//   if (!showModal) return null;

//   // Render Menu Bulk Update Modal
//   if (modalType === 'menu') {
//     return (
//       <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
//         <div className="rounded-lg max-w-6xl w-full bg-white max-h-[90vh] flex flex-col shadow-xl">

//           {/* Header */}
//           <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
//             <h2 className="text-xl font-semibold text-gray-900">Bulk Update & Delete</h2>
//             <button
//               onClick={handleClose}
//               className="p-1.5 rounded-lg bg-action-primary text-text-white hover:opacity-90 transition-opacity"
//             >
//               <X className="w-5 h-5" />
//             </button>
//           </div>

//           {/* ✅ NEW: Global Add-ons Section */}
//           <div className="px-6 py-4 bg-blue-50 border-b border-blue-200">
//             <div className="flex items-start gap-4">
//               <div className="flex-1">
//                 <label className="block text-sm font-semibold mb-2 text-gray-700">
//                   Apply Add-ons to All Selected Items
//                 </label>
//                 <div className="flex items-center gap-3">
//                   <div className="flex-1">
//                     <DropdownCheckbox
//                       selected={globalAddons}
//                       options={addonItems || []}
//                       onChange={setGlobalAddons}
//                       label="Select Add-ons to Apply Globally"
//                     />
//                   </div>
//                   <button
//                     onClick={applyGlobalAddons}
//                     disabled={selectedRows.length === 0 || globalAddons.length === 0}
//                     className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed font-medium text-sm whitespace-nowrap"
//                   >
//                     Apply to Selected ({selectedRows.length})
//                   </button>
//                   <button
//                     onClick={clearGlobalAddons}
//                     disabled={selectedRows.length === 0}
//                     className="px-4 py-2 rounded-md bg-gray-600 text-white hover:bg-gray-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed font-medium text-sm whitespace-nowrap"
//                   >
//                     Clear All
//                   </button>
//                 </div>
//                 <p className="text-xs text-gray-600 mt-2">
//                   💡 Select add-ons above and click "Apply to Selected" to add them to all {selectedRows.length} selected item(s) at once
//                 </p>
//               </div>
//             </div>
//           </div>

//           {/* Action Bar */}
//           <div className="flex justify-between items-center gap-4 px-6 py-3 border-b border-gray-200 bg-gray-50">
//             <div className="flex items-center gap-4">
//               <label className="flex items-center gap-2 cursor-pointer">
//                 <input
//                   type="checkbox"
//                   checked={selectAllChecked}
//                   onChange={toggleSelectAll}
//                   className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
//                 />
//                 <span className="text-sm font-medium text-gray-700">Select All</span>
//               </label>
//               <span className="text-sm text-gray-600">
//                 {selectedRows.length} item(s) selected
//               </span>
//             </div>

//             <div className="flex gap-3">
//               <button
//                 onClick={handleBulkUpdate}
//                 disabled={selectedRows.length === 0}
//                 className="flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed font-medium text-sm"
//               >
//                 <Edit className="w-4 h-4" />
//                 Update Selected
//               </button>
//               <button
//                 onClick={handleBulkDelete}
//                 disabled={selectedRows.length === 0}
//                 className="flex items-center gap-2 px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed font-medium text-sm"
//               >
//                 <Trash2 className="w-4 h-4" />
//                 Delete Selected
//               </button>
//             </div>
//           </div>

//           {/* Table Container */}
//           <div className="flex-1 overflow-auto px-4 py-4">
//             <div className="min-w-[1000px]">
//               <table className="w-full border-collapse">
//                 <thead className="sticky top-0 bg-white z-10">
//                   <tr className="border-b border-gray-200">
//                     <th className="px-4 py-3 text-left bg-gray-50">
//                       <input
//                         type="checkbox"
//                         checked={selectAllChecked}
//                         onChange={toggleSelectAll}
//                         className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
//                       />
//                     </th>
//                     <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 bg-gray-50">Name</th>
//                     <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 bg-gray-50">Description</th>
//                     <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 bg-gray-50">Price</th>
//                     <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 bg-gray-50">Discount</th>
//                     <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 bg-gray-50">Code</th>
//                     <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 bg-gray-50">Add-ons</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {filteredItems.map((item, index) => {
//                     const isSelected = selectedRows.includes(item.id);
//                     const editData = bulkEditData[item.id] || {};

//                     return (
//                       <tr
//                         key={item.id}
//                         className={`border-b border-gray-200 ${isSelected
//                           ? 'bg-blue-50'
//                           : index % 2 === 0
//                             ? 'bg-white hover:bg-gray-50'
//                             : 'bg-gray-50 hover:bg-gray-100'
//                           }`}
//                       >
//                         <td className="px-4 py-3">
//                           <input
//                             type="checkbox"
//                             checked={isSelected}
//                             onChange={() => toggleRowSelection(item.id)}
//                             className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
//                           />
//                         </td>
//                         <td className="px-4 py-3">
//                           {isSelected ? (
//                             <input
//                               type="text"
//                               value={editData.name !== undefined ? editData.name : item.name}
//                               onChange={(e) => updateBulkEditData(item.id, 'name', e.target.value)}
//                               className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//                               placeholder="Item name"
//                             />
//                           ) : (
//                             <span className="text-sm text-gray-900">{item.name}</span>
//                           )}
//                         </td>
//                         <td className="px-4 py-3">
//                           {isSelected ? (
//                             <input
//                               type="text"
//                               value={editData.description !== undefined ? editData.description : item.description}
//                               onChange={(e) => updateBulkEditData(item.id, 'description', e.target.value)}
//                               className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//                               placeholder="Description"
//                             />
//                           ) : (
//                             <span className="text-sm text-gray-600 truncate block max-w-xs">
//                               {item.description || '-'}
//                             </span>
//                           )}
//                         </td>
//                         <td className="px-4 py-3">
//                           {isSelected ? (
//                             <input
//                               type="number"
//                               step="0.01"
//                               value={editData.unit_price !== undefined ? editData.unit_price : item.unit_price}
//                               onChange={(e) => updateBulkEditData(item.id, 'unit_price', e.target.value)}
//                               className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//                               placeholder="0.00"
//                             />
//                           ) : (
//                             <span className="text-sm text-gray-900">
//                               ₹{typeof item.unit_price === 'number' ? item.unit_price.toFixed(2) : '0.00'}
//                             </span>
//                           )}
//                         </td>
//                         <td className="px-4 py-3">
//                           {isSelected ? (
//                             <input
//                               type="number"
//                               step="0.01"
//                               value={editData.discount !== undefined ? editData.discount : item.discount}
//                               onChange={(e) => updateBulkEditData(item.id, 'discount', e.target.value)}
//                               className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//                               placeholder="0.00"
//                             />
//                           ) : (
//                             <span className="text-sm text-gray-900">
//                               ₹{typeof item.discount === 'number' ? item.discount.toFixed(2) : (item.discount || 0)}
//                             </span>
//                           )}
//                         </td>
//                         <td className="px-4 py-3">
//                           {isSelected ? (
//                             <input
//                               type="text"
//                               value={
//                                 editData.code !== undefined
//                                   ? editData.code
//                                   : item.code ?? ''
//                               }
//                               onChange={(e) =>
//                                 updateBulkEditData(item.id, 'code', e.target.value)
//                               }
//                               className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-action-primary"
//                               placeholder="Code"
//                             />
//                           ) : (
//                             <span className="text-sm text-gray-900">
//                               {item.code ?? '-'}
//                             </span>
//                           )}
//                         </td>
//                         {/* Add-ons Column */}
//                         <td className="px-4 py-3">
//                           {isSelected ? (
//                             <div className="w-64">
//                               <DropdownCheckbox
//                                 selected={
//                                   editData.line_item_id !== undefined
//                                     ? editData.line_item_id
//                                     : Array.isArray(item.line_item_id)
//                                       ? item.line_item_id
//                                       : []
//                                 }
//                                 options={(addonItems || []).filter(addon => addon.id !== item.id)}
//                                 onChange={(selected) =>
//                                   updateBulkEditData(item.id, 'line_item_id', selected)
//                                 }
//                                 label="Select Add-ons"
//                               />
//                             </div>
//                           ) : (
//                             <span className="text-sm text-gray-900">
//                               {Array.isArray(item.line_item_id) && item.line_item_id.length > 0
//                                 ? `${item.line_item_id.length} add-on(s)`
//                                 : '-'}
//                             </span>
//                           )}
//                         </td>
//                       </tr>
//                     );
//                   })}
//                 </tbody>
//               </table>

//               {filteredItems.length === 0 && (
//                 <div className="text-center py-16 mt-4">
//                   <p className="text-gray-500 text-lg">No items to display</p>
//                   <p className="text-gray-400 text-sm mt-2">Try adjusting your filters or search</p>
//                 </div>
//               )}
//             </div>
//           </div>

//           {/* Footer */}
//           <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
//             <div className="flex justify-between items-center">
//               <p className="text-sm text-gray-600">
//                 💡 Use the global add-ons section at the top to apply add-ons to all selected items at once, or edit individual items below
//               </p>
//               <button
//                 onClick={handleClose}
//                 className="px-6 py-2 rounded-md bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 font-medium text-sm"
//               >
//                 Close
//               </button>
//             </div>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   // Render Table Bulk Update Modal
//   if (modalType === 'table') {
//     const filteredTables = getFilteredUpdateTables();

//     return (
//       <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
//         <div className="bg-bg-primary rounded-xl w-full max-w-3xl shadow-2xl h-[95vh] overflow-hidden flex flex-col border border-border-default">

//           {/* Header */}
//           <div className="px-4 sm:px-6 py-3 border-b border-border-default flex justify-between items-center bg-bg-tertiary flex-shrink-0">
//             <h2 className="text-base sm:text-lg font-bold text-text-primary">Update Tables
//               <span className='text-sm'>(Apply to All Selected)</span>
//             </h2>
//             <button
//               onClick={handleClose}
//               className="p-1.5 rounded-lg bg-action-primary text-text-white hover:opacity-90 transition-opacity"
//             >
//               <X className="w-4 h-4 " />
//             </button>
//           </div>

//           {/* Global Update Section */}
//           <div className="px-4 sm:px-6 py-3 bg-bg-tertiary border-b border-border-default flex-shrink-0">
//             <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
//               <div>
//                 <label className="block text-xs font-semibold mb-1.5 text-text-secondary">Seating</label>

//                 {/* Desktop */}
//                 <input
//                   type="number"
//                   min="1"
//                   value={bulkUpdateGlobal.table_type}
//                   onChange={e => {
//                     const value = e.target.value ? Math.max(1, Number(e.target.value)) : "";
//                     setBulkUpdateGlobal(prev => ({ ...prev, table_type: value }));
//                   }}
//                   placeholder="No change"
//                   className="hidden sm:block w-full px-3 py-1.5 border border-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-action-primary focus:border-transparent text-sm bg-bg-primary text-text-primary"
//                 />

//                 {/* Mobile with +/- buttons */}
//                 <div className="sm:hidden flex items-center border border-border-default rounded-lg overflow-hidden bg-bg-primary">
//                   <button
//                     type="button"
//                     onClick={() => {
//                       const current = Number(bulkUpdateGlobal.table_type) || 0;
//                       const value = current > 1 ? current - 1 : "";
//                       setBulkUpdateGlobal(prev => ({ ...prev, table_type: value }));
//                     }}
//                     className="px-3 py-1.5 text-text-primary hover:bg-bg-tertiary font-bold transition-colors"
//                   >
//                     −
//                   </button>
//                   <input
//                     type="number"
//                     min="1"
//                     value={bulkUpdateGlobal.table_type}
//                     onChange={e => {
//                       const value = e.target.value ? Math.max(1, Number(e.target.value)) : "";
//                       setBulkUpdateGlobal(prev => ({ ...prev, table_type: value }));
//                     }}
//                     placeholder="None"
//                     className="flex-1 text-center py-1.5 border-x border-border-default focus:outline-none text-sm bg-transparent text-text-primary"
//                   />
//                   <button
//                     type="button"
//                     onClick={() => {
//                       const current = Number(bulkUpdateGlobal.table_type) || 0;
//                       setBulkUpdateGlobal(prev => ({ ...prev, table_type: current + 1 }));
//                     }}
//                     className="px-3 py-1.5 text-text-primary hover:bg-bg-tertiary font-bold transition-colors"
//                   >
//                     +
//                   </button>
//                 </div>
//               </div>

//               <div>
//                 <label className="block text-xs font-semibold mb-1.5 text-text-secondary">Status</label>
//                 <select
//                   value={bulkUpdateGlobal.status}
//                   onChange={e => setBulkUpdateGlobal(prev => ({ ...prev, status: e.target.value }))}
//                   className="w-full px-3 py-1.5 border border-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-action-primary focus:border-transparent text-sm bg-bg-primary text-text-primary"
//                 >
//                   <option value="">No change</option>
//                   <option value="Vacant">Vacant</option>
//                   <option value="Reserved">Reserved</option>
//                 </select>
//               </div>

//               {/* Section */}
//               <div>
//                 <label className="block text-xs font-semibold mb-1.5 text-text-secondary">
//                   Section
//                 </label>
//                 <select
//                   value={bulkUpdateGlobal.section || ""}
//                   onChange={e =>
//                     setBulkUpdateGlobal(prev => ({ ...prev, section: e.target.value }))
//                   }
//                   className="w-full px-3 py-1.5 border border-border-default rounded-lg text-sm bg-bg-primary text-text-primary"
//                 >
//                   <option value="">No change</option>

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
//                 <label className="block text-xs font-semibold mb-1.5 text-text-secondary">
//                   Zone
//                 </label>
//                 <select
//                   value={bulkUpdateGlobal.location_zone || ""}
//                   onChange={e =>
//                     setBulkUpdateGlobal(prev => ({ ...prev, location_zone: e.target.value }))
//                   }
//                   className="w-full px-3 py-1.5 border border-border-default rounded-lg text-sm bg-bg-primary text-text-primary"
//                 >
//                   <option value="">No change</option>

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
//             </div>
//           </div>

//           {/* Search Bar */}
//           <div className="px-4 sm:px-6 py-2 border-b border-border-default bg-bg-primary flex-shrink-0">
//             <div className="relative">
//               <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-secondary" />
//               <input
//                 type="text"
//                 placeholder="Search tables..."
//                 value={bulkUpdateSearch}
//                 onChange={e => setBulkUpdateSearch(e.target.value)}
//                 className="w-full pl-10 pr-4 py-1.5 border border-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-action-primary focus:border-transparent text-sm bg-bg-primary text-text-primary"
//               />
//             </div>
//           </div>

//           {/* Select All */}
//           <div className="px-4 sm:px-6 py-2 bg-bg-tertiary border-b border-border-default flex-shrink-0">
//             <label className="flex items-center justify-between cursor-pointer">
//               <div className="flex items-center gap-2">
//                 <input
//                   type="checkbox"
//                   checked={selectedUpdateTables.length === filteredTables.length && filteredTables.length > 0}
//                   onChange={selectAllUpdateTables}
//                   className="w-4 h-4 text-action-primary border-border-default rounded focus:ring-action-primary"
//                 />
//                 <span className="text-sm font-semibold text-text-primary">Select All</span>
//               </div>
//               <span className="text-xs text-text-secondary">
//                 {selectedUpdateTables.length} of {filteredTables.length} selected
//               </span>
//             </label>
//           </div>

//           {/* Table List */}
//           <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3">
//             <div className="space-y-2">
//               {filteredTables.length === 0 ? (
//                 <div className="text-center py-12">
//                   <Search className="w-12 h-12 text-text-secondary mx-auto mb-3 opacity-30" />
//                   <p className="text-text-secondary">No tables found</p>
//                 </div>
//               ) : (
//                 filteredTables.map(table => (
//                   <div
//                     key={table.id}
//                     className={`border rounded-xl p-3 transition-all ${selectedUpdateTables.includes(table.id)
//                       ? 'border-action-primary bg-action-primary/5 shadow-sm'
//                       : 'border-border-default bg-bg-primary'
//                       }`}
//                   >
//                     <div className="flex items-center gap-2 mb-2">
//                       <input
//                         type="checkbox"
//                         checked={selectedUpdateTables.includes(table.id)}
//                         onChange={() => toggleUpdateTableSelection(table.id)}
//                         className="w-4 h-4 text-action-primary border-border-default rounded focus:ring-action-primary cursor-pointer"
//                       />
//                       <span className="font-bold text-sm text-text-primary">{table.name}</span>
//                     </div>

//                     {selectedUpdateTables.includes(table.id) ? (
//                       <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-border-default">
//                         <div>
//                           <label className="block text-xs font-semibold mb-1.5 text-text-secondary">Seating</label>

//                           {/* Desktop */}
//                           <input
//                             type="number"
//                             min="1"
//                             value={bulkUpdateData[table.id]?.table_type ?? table.table_type ?? ""}
//                             onChange={e => {
//                               const value = e.target.value ? Math.max(1, Number(e.target.value)) : "";
//                               handleBulkUpdateChange(table.id, "table_type", value);
//                             }}
//                             placeholder={bulkUpdateGlobal.table_type ? `Global: ${bulkUpdateGlobal.table_type}` : "Seating"}
//                             className="hidden sm:block w-full px-3 py-1.5 border border-border-default rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-action-primary focus:border-transparent bg-bg-primary text-text-primary"
//                           />

//                           {/* Mobile with +/- buttons */}
//                           <div className="sm:hidden flex items-center border border-border-default rounded-lg overflow-hidden bg-bg-primary">
//                             <button
//                               type="button"
//                               onClick={() => {
//                                 const current = Number(bulkUpdateData[table.id]?.table_type ?? table.table_type) || 1;
//                                 const value = Math.max(1, current - 1);
//                                 handleBulkUpdateChange(table.id, "table_type", value);
//                               }}
//                               className="px-3 py-1.5 text-text-primary hover:bg-bg-tertiary font-bold transition-colors"
//                             >
//                               −
//                             </button>
//                             <input
//                               type="number"
//                               min="1"
//                               value={bulkUpdateData[table.id]?.table_type ?? table.table_type ?? ""}
//                               onChange={e => {
//                                 const value = e.target.value ? Math.max(1, Number(e.target.value)) : "";
//                                 handleBulkUpdateChange(table.id, "table_type", value);
//                               }}
//                               placeholder={bulkUpdateGlobal.table_type ? `${bulkUpdateGlobal.table_type}` : ""}
//                               className="flex-1 text-center py-1.5 border-x border-border-default focus:outline-none text-sm bg-transparent text-text-primary"
//                             />
//                             <button
//                               type="button"
//                               onClick={() => {
//                                 const current = Number(bulkUpdateData[table.id]?.table_type ?? table.table_type) || 0;
//                                 handleBulkUpdateChange(table.id, "table_type", current + 1);
//                               }}
//                               className="px-3 py-1.5 text-text-primary hover:bg-bg-tertiary font-bold transition-colors"
//                             >
//                               +
//                             </button>
//                           </div>
//                         </div>

//                         <div>
//                           <label className="block text-xs font-semibold mb-1.5 text-text-secondary">Status</label>
//                           <select
//                             value={bulkUpdateData[table.id]?.status ?? table.status}
//                             onChange={e => handleBulkUpdateChange(table.id, 'status', e.target.value)}
//                             className="w-full px-3 py-1.5 border border-border-default rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-action-primary focus:border-transparent bg-bg-primary text-text-primary"
//                           >
//                             <option value="Vacant">Vacant</option>
//                             <option value="Reserved">Reserved</option>
//                           </select>
//                         </div>

//                         {/* Section */}
//                         <div>
//                           <label className="block text-xs font-semibold mb-1.5 text-text-secondary">
//                             Section
//                           </label>
//                           <select
//                             value={bulkUpdateGlobal.section || ""}
//                             onChange={e =>
//                               setBulkUpdateGlobal(prev => ({ ...prev, section: e.target.value }))
//                             }
//                             className="w-full px-3 py-1.5 border border-border-default rounded-lg text-sm bg-bg-primary text-text-primary"
//                           >
//                             <option value="">No change</option>

//                             {loadingMasters ? (
//                               <option disabled>Loading...</option>
//                             ) : sectionOptions.length === 0 ? (
//                               <option disabled>No Sections Configured</option>
//                             ) : (
//                               sectionOptions.map((sec, i) => (
//                                 <option key={i} value={sec}>{sec}</option>
//                               ))
//                             )}
//                           </select>

//                         </div>

//                         {/* Zone */}
//                         <div>
//                           <label className="block text-xs font-semibold mb-1.5 text-text-secondary">
//                             Zone
//                           </label>
//                           <select
//                             value={bulkUpdateGlobal.location_zone || ""}
//                             onChange={e =>
//                               setBulkUpdateGlobal(prev => ({ ...prev, location_zone: e.target.value }))
//                             }
//                             className="w-full px-3 py-1.5 border border-border-default rounded-lg text-sm bg-bg-primary text-text-primary"
//                           >
//                             <option value="">No change</option>

//                             {loadingMasters ? (
//                               <option disabled>Loading...</option>
//                             ) : zoneOptions.length === 0 ? (
//                               <option disabled>No Zones Configured</option>
//                             ) : (
//                               zoneOptions.map((zone, i) => (
//                                 <option key={i} value={zone}>{zone}</option>
//                               ))
//                             )}
//                           </select>

//                         </div>
//                       </div>
//                     ) : (
//                       <div className="pt-2 border-t border-border-default">
//                         <div className="grid grid-cols-4 gap-2 text-xs">
//                           <div>
//                             <span className="text-text-secondary">Seating:</span>
//                             <span className="ml-1 text-text-primary font-semibold">{table.table_type}</span>
//                           </div>
//                           <div>
//                             <span className="text-text-secondary">Status:</span>
//                             <span className="ml-1 text-text-primary font-semibold">{table.status}</span>
//                           </div>
//                           <div>
//                             <span className="text-text-secondary">Section:</span>
//                             <span className="ml-1 text-text-primary font-semibold">{table.section}</span>
//                           </div>
//                           <div>
//                             <span className="text-text-secondary">Zone:</span>
//                             <span className="ml-1 text-text-primary font-semibold">{table.location_zone}</span>
//                           </div>
//                         </div>
//                       </div>
//                     )}
//                   </div>
//                 ))
//               )}
//             </div>
//           </div>

//           {/* Footer */}
//           <div className="px-4 sm:px-6 py-3 bg-bg-tertiary border-t border-border-default flex flex-col sm:flex-row gap-2 justify-end flex-shrink-0">
//             <button
//               className="px-6 py-2 rounded-lg bg-bg-primary text-text-primary border border-border-default hover:bg-bg-secondary font-semibold text-sm transition-colors"
//               onClick={handleClose}
//             >
//               Cancel
//             </button>
//             <button
//               className="px-6 py-2 rounded-lg bg-action-primary text-text-white hover:bg-action-primary/90 font-semibold text-sm transition-colors disabled:bg-bg-secondary disabled:cursor-not-allowed shadow-lg"
//               onClick={saveBulkUpdate}
//               disabled={selectedUpdateTables.length === 0}
//             >
//               Update ({selectedUpdateTables.length})
//             </button>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   return null;
// };

// export default UniversalBulkUpdateModal;















import React, { useState, useEffect } from 'react';
import { X, Edit, Trash2, Search, Plus } from 'lucide-react';
import AddonSelectionPopup from './AddonSelection';
import axios from 'axios';

const UniversalBulkUpdateModal = ({
  // Common props
  showModal,
  setShowModal,
  modalType, // 'menu' or 'table'
  clientId,
  token,

  // Menu-specific props (Bulk Update)
  filteredItems,
  selectedRows,
  setSelectedRows,
  selectAllChecked,
  setSelectAllChecked,
  bulkEditData,
  setBulkEditData,
  handleBulkUpdate,
  handleBulkDelete,
  addonSubcategories, // ✅ Addon subcategories
  allAddonItems, // ✅ All addon items

  // Table-specific props (Bulk Update)
  tables,
  bulkUpdateSearch,
  setBulkUpdateSearch,
  selectedUpdateTables,
  setSelectedUpdateTables,
  bulkUpdateData,
  setBulkUpdateData,
  bulkUpdateGlobal,
  setBulkUpdateGlobal,
  handleBulkUpdateChange,
  saveBulkUpdate,
  getFilteredUpdateTables
}) => {

  // ✅ State for global add-ons popup
  const [showGlobalAddonPopup, setShowGlobalAddonPopup] = React.useState(false);
  const [globalAddons, setGlobalAddons] = React.useState([]);
  const [configs, setConfigs] = useState([]);

  // ✅ State for individual item addon popup
  const [showItemAddonPopup, setShowItemAddonPopup] = React.useState(false);
  const [currentEditingItemId, setCurrentEditingItemId] = React.useState(null);
  const [loadingConfigs, setLoadingConfigs] = useState(false);

  const fetchConfigs = async () => {
    try {
      setLoadingConfigs(true);

      const res = await axios.get(
        `${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/config`,
        {
          params: { client_id: clientId },
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setConfigs(res.data || []);
    } catch (err) {
      console.error("Config fetch error:", err);
      setConfigs([]);
    } finally {
      setLoadingConfigs(false);
    }
  };
  // ✅ Get addon name by ID
  const getAddonNameById = (id) => {
    const addon = allAddonItems?.find(item => item.id === id);
    return addon?.name || 'Unknown';
  };

  // ✅ FIXED: Apply global add-ons to all selected items (works both ways)
  const handleGlobalAddonSave = (selectedAddons) => {
    setGlobalAddons(selectedAddons);
    setShowGlobalAddonPopup(false);

    // If items are already selected, apply immediately
    if (selectedRows.length > 0) {
      const updatedBulkData = { ...bulkEditData };

      selectedRows.forEach(itemId => {
        updatedBulkData[itemId] = {
          ...(updatedBulkData[itemId] || {}),
          line_item_id: [...selectedAddons]
        };
      });

      setBulkEditData(updatedBulkData);

      if (selectedAddons.length > 0) {
        alert(`Applied ${selectedAddons.length} add-on(s) to ${selectedRows.length} selected item(s)`);
      }
    } else if (selectedAddons.length > 0) {
      // Addons selected but no items yet - just store them
    }
  };
  useEffect(() => {
    if (!showModal) return;
    if (!clientId || !token) return;

    fetchConfigs();   // ✅ always fetch (not only table)
  }, [showModal, clientId, token]);
  useEffect(() => {
    console.log("CONFIGS:", configs);
  }, [configs]);
  // ✅ Clear global add-ons for all selected items
  const clearGlobalAddons = () => {
    if (selectedRows.length === 0) {
      alert('No items selected');
      return;
    }

    const updatedBulkData = { ...bulkEditData };

    selectedRows.forEach(itemId => {
      updatedBulkData[itemId] = {
        ...(updatedBulkData[itemId] || {}),
        line_item_id: []
      };
    });

    setBulkEditData(updatedBulkData);
    setGlobalAddons([]);
  };

  // ✅ Open addon popup for specific item
  const openItemAddonPopup = (itemId) => {
    setCurrentEditingItemId(itemId);
    setShowItemAddonPopup(true);
  };

  // ✅ NEW: Apply global addons automatically when items are selected (if addons were already chosen)
  React.useEffect(() => {
    if (modalType === 'menu' && globalAddons.length > 0 && selectedRows.length > 0) {
      const updatedBulkData = { ...bulkEditData };
      let hasChanges = false;

      selectedRows.forEach(itemId => {
        // Only apply if this item doesn't already have the global addons set
        const currentAddons = updatedBulkData[itemId]?.line_item_id;
        const addonsMatch = currentAddons &&
          currentAddons.length === globalAddons.length &&
          currentAddons.every(id => globalAddons.includes(id));

        if (!addonsMatch) {
          updatedBulkData[itemId] = {
            ...(updatedBulkData[itemId] || {}),
            line_item_id: [...globalAddons]
          };
          hasChanges = true;
        }
      });

      if (hasChanges) {
        setBulkEditData(updatedBulkData);
      }
    }
  }, [selectedRows, globalAddons, modalType]);

  // Menu: Toggle all selection
  const toggleSelectAll = () => {
    if (modalType === 'menu') {
      if (!selectAllChecked) {
        setSelectedRows(filteredItems.map(item => item.id));
        setSelectAllChecked(true);
      } else {
        setSelectedRows([]);
        setSelectAllChecked(false);
      }
    }
  };

  // Menu: Toggle individual row
  const toggleRowSelection = (itemId) => {
    if (selectedRows.includes(itemId)) {
      setSelectedRows(selectedRows.filter(id => id !== itemId));
    } else {
      setSelectedRows([...selectedRows, itemId]);
    }
  };

  // Menu: Update bulk edit data
  const updateBulkEditData = (itemId, field, value) => {
    const editData = bulkEditData[itemId] || {};
    setBulkEditData({
      ...bulkEditData,
      [itemId]: { ...editData, [field]: value }
    });
  };

  // Table: Toggle all selection
  const selectAllUpdateTables = () => {
    const filtered = getFilteredUpdateTables();
    if (selectedUpdateTables.length === filtered.length) {
      setSelectedUpdateTables([]);
    } else {
      setSelectedUpdateTables(filtered.map(t => t.id));
    }
  };

  // Table: Toggle individual table
  const toggleUpdateTableSelection = (tableId) => {
    setSelectedUpdateTables(prev =>
      prev.includes(tableId)
        ? prev.filter(id => id !== tableId)
        : [...prev, tableId]
    );
  };

  const handleClose = () => {
    setShowModal(false);
    if (modalType === 'menu') {
      setSelectedRows([]);
      setBulkEditData({});
      setSelectAllChecked(false);
      setGlobalAddons([]);
      setShowGlobalAddonPopup(false);
      setShowItemAddonPopup(false);
      setCurrentEditingItemId(null);
    } else if (modalType === 'table') {
      setSelectedUpdateTables([]);
      setBulkUpdateData({});
      setBulkUpdateSearch('');
      setBulkUpdateGlobal({
        table_type: "",
        status: "",
        config_id: ""
      });
    }
  };

  if (!showModal) return null;

  // Render Menu Bulk Update Modal
  if (modalType === 'menu') {
    return (
      <>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="rounded-lg max-w-6xl w-full bg-white max-h-[90vh] flex flex-col shadow-xl">

            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Bulk Update & Delete</h2>
              <button
                onClick={handleClose}
                className="p-1.5 rounded-lg bg-action-primary text-text-white hover:opacity-90 transition-opacity"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* ✅ Global Add-ons Section */}
            <div className="px-6 py-4 flex justify-between bg-blue-50 border-b border-blue-200">
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-semibold mb-2 text-gray-700">
                    Apply Add-ons to All Selected Items
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowGlobalAddonPopup(true)}
                      className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium text-sm whitespace-nowrap flex items-center gap-2"
                    >
                      <Plus size={16} />
                      {globalAddons.length > 0
                        ? `Selected: ${globalAddons.length} add-on(s)`
                        : 'Select Add-ons'}
                    </button>
                    <button
                      onClick={clearGlobalAddons}
                      disabled={globalAddons.length === 0 && selectedRows.length === 0}
                      className="px-4 py-2 rounded-md bg-gray-600 text-white hover:bg-gray-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed font-medium text-sm whitespace-nowrap"
                    >
                      Clear All
                    </button>
                    {globalAddons.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {globalAddons.slice(0, 3).map(id => (
                          <span key={id} className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                            {getAddonNameById(id)}
                          </span>
                        ))}
                        {globalAddons.length > 3 && (
                          <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                            +{globalAddons.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    💡 {selectedRows.length > 0
                      ? `${globalAddons.length > 0 ? 'Add-ons applied to' : 'Select add-ons to apply to'} ${selectedRows.length} selected item(s)`
                      : globalAddons.length > 0
                        ? `${globalAddons.length} add-on(s) selected. Now select items to apply them.`
                        : 'Select add-ons first, then select items - or vice versa!'}
                  </p>
                </div>
              </div>
              <div className="px-6 py-3 bg-bg-primary">
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                Apply Zone & Section
              </label>

              <select
                className="px-3 py-2 border rounded-md text-sm outline-none"
                onChange={(e) => {
                  const value = Number(e.target.value);
                  if (!value) return;

                  const updated = { ...bulkEditData };

                  selectedRows.forEach(id => {
                    updated[id] = {
                      ...(updated[id] || {}),
                      zone_config_id: value
                    };
                  });

                  setBulkEditData(updated);
                }}
              >
                <option value="">Select Zone</option>

                {configs.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.zone} - {c.section}
                  </option>
                ))}
              </select>
            </div>
            </div>
        
            {/* Action Bar */}
            <div className="flex justify-between items-center gap-4 px-6 py-3 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectAllChecked}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Select All</span>
                </label>
                <span className="text-sm text-gray-600">
                  {selectedRows.length} item(s) selected
                </span>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleBulkUpdate}
                  disabled={selectedRows.length === 0}
                  className="flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed font-medium text-sm"
                >
                  <Edit className="w-4 h-4" />
                  Update Selected
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={selectedRows.length === 0}
                  className="flex items-center gap-2 px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed font-medium text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Selected
                </button>
              </div>
            </div>

            {/* Table Container */}
            <div className="flex-1 overflow-auto px-4 py-4">
              <div className="min-w-[1000px]">
                <table className="w-full border-collapse">
                  <thead className="sticky top-0 bg-white z-10">
                    <tr className="border-b border-gray-200">
                      <th className="px-4 py-3 text-left bg-gray-50">
                        <input
                          type="checkbox"
                          checked={selectAllChecked}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 bg-gray-50">Name</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 bg-gray-50">Description</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 bg-gray-50">Price</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 bg-gray-50">Discount</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 bg-gray-50">Code</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 bg-gray-50">Add-ons</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 bg-gray-50">
                        Zone
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item, index) => {
                      const isSelected = selectedRows.includes(item.id);
                      const editData = bulkEditData[item.id] || {};
                      const currentAddons = editData.line_item_id !== undefined
                        ? editData.line_item_id
                        : Array.isArray(item.line_item_id)
                          ? item.line_item_id
                          : [];

                      return (
                        <tr
                          key={item.id}
                          className={`border-b border-gray-200 ${isSelected
                            ? 'bg-blue-50'
                            : index % 2 === 0
                              ? 'bg-white hover:bg-gray-50'
                              : 'bg-gray-50 hover:bg-gray-100'
                            }`}
                        >
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleRowSelection(item.id)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-3">
                            {isSelected ? (
                              <input
                                type="text"
                                value={editData.name !== undefined ? editData.name : item.name}
                                onChange={(e) => updateBulkEditData(item.id, 'name', e.target.value)}
                                className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Item name"
                              />
                            ) : (
                              <span className="text-sm text-gray-900">{item.name}</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {isSelected ? (
                              <input
                                type="text"
                                value={editData.description !== undefined ? editData.description : item.description}
                                onChange={(e) => updateBulkEditData(item.id, 'description', e.target.value)}
                                className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Description"
                              />
                            ) : (
                              <span className="text-sm text-gray-600 truncate block max-w-xs">
                                {item.description || '-'}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {isSelected ? (
                              <input
                                type="number"
                                step="0.01"
                                value={editData.unit_price !== undefined ? editData.unit_price : item.unit_price}
                                onChange={(e) => updateBulkEditData(item.id, 'unit_price', e.target.value)}
                                className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="0.00"
                              />
                            ) : (
                              <span className="text-sm text-gray-900">
                                ₹{typeof item.unit_price === 'number' ? item.unit_price.toFixed(2) : '0.00'}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {isSelected ? (
                              <input
                                type="number"
                                step="0.01"
                                value={editData.discount !== undefined ? editData.discount : item.discount}
                                onChange={(e) => updateBulkEditData(item.id, 'discount', e.target.value)}
                                className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="0.00"
                              />
                            ) : (
                              <span className="text-sm text-gray-900">
                                ₹{typeof item.discount === 'number' ? item.discount.toFixed(2) : (item.discount || 0)}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {isSelected ? (
                              <input
                                type="text"
                                value={
                                  editData.code !== undefined
                                    ? editData.code
                                    : item.code ?? ''
                                }
                                onChange={(e) =>
                                  updateBulkEditData(item.id, 'code', e.target.value)
                                }
                                className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-action-primary"
                                placeholder="Code"
                              />
                            ) : (
                              <span className="text-sm text-gray-900">
                                {item.code ?? '-'}
                              </span>
                            )}
                          </td>
                          {/* Add-ons Column */}
                          <td className="px-4 py-3">
                            {isSelected ? (
                              <button
                                type="button"
                                onClick={() => openItemAddonPopup(item.id)}
                                className="w-full px-3 py-2 rounded-md bg-gray-50 border-2 border-dashed border-gray-300 text-gray-700 hover:border-blue-500 hover:bg-blue-50 transition-all text-sm font-medium flex items-center justify-center gap-1"
                              >
                                <Plus size={14} />
                                {currentAddons.length > 0
                                  ? `${currentAddons.length} addon(s)`
                                  : 'Select'}
                              </button>
                            ) : (
                              <span className="text-sm text-gray-900">
                                {Array.isArray(item.line_item_id) && item.line_item_id.length > 0
                                  ? `${item.line_item_id.length} add-on(s)`
                                  : '-'}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {isSelected ? (
                              <select
                                value={
                                  editData.zone_config_id !== undefined
                                    ? editData.zone_config_id
                                    : item.zone_config_id || ""
                                }
                                onChange={(e) =>
                                  updateBulkEditData(item.id, "zone_config_id", Number(e.target.value))
                                }
                                className="w-full px-2 py-1 border rounded text-sm"
                              >
                                <option value="">Select</option>

                                {configs.map(c => (
                                  <option key={c.id} value={c.id}>
                                    {c.zone} - {c.section}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-sm text-gray-900">
                                {(() => {
                                  const c = configs.find(x => x.id === item.zone_config_id);
                                  return c ? `${c.zone} - ${c.section}` : "-";
                                })()}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {filteredItems.length === 0 && (
                  <div className="text-center py-16 mt-4">
                    <p className="text-gray-500 text-lg">No items to display</p>
                    <p className="text-gray-400 text-sm mt-2">Try adjusting your filters or search</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  💡 Use the global add-ons section at the top to apply add-ons to all selected items at once, or edit individual items below
                </p>
                <button
                  onClick={handleClose}
                  className="px-6 py-2 rounded-md bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 font-medium text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ✅ FIXED: Global Addon Selection Popup */}
        <AddonSelectionPopup
          isOpen={showGlobalAddonPopup}
          onClose={() => setShowGlobalAddonPopup(false)}
          selectedAddons={globalAddons}
          onSave={handleGlobalAddonSave}
          addonSubcategories={addonSubcategories || []}
          allAddonItems={allAddonItems || []}
          currentItemId={null}
        />

        {/* ✅ Individual Item Addon Selection Popup */}
        {currentEditingItemId && (
          <AddonSelectionPopup
            isOpen={showItemAddonPopup}
            onClose={() => {
              setShowItemAddonPopup(false);
              setCurrentEditingItemId(null);
            }}
            selectedAddons={bulkEditData[currentEditingItemId]?.line_item_id ||
              filteredItems.find(i => i.id === currentEditingItemId)?.line_item_id || []}
            onSave={(selectedAddons) => {
              updateBulkEditData(currentEditingItemId, 'line_item_id', selectedAddons);
              setShowItemAddonPopup(false);
              setCurrentEditingItemId(null);
            }}
            addonSubcategories={addonSubcategories || []}
            allAddonItems={allAddonItems || []}
            currentItemId={currentEditingItemId}
          />
        )}
      </>
    );
  }

  // Render Table Bulk Update Modal
  if (modalType === 'table') {
    const filteredTables = getFilteredUpdateTables();

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-bg-primary rounded-xl w-full max-w-3xl shadow-2xl h-[95vh] overflow-hidden flex flex-col border border-border-default">

          {/* Header */}
          <div className="px-4 sm:px-6 py-3 border-b border-border-default flex justify-between items-center bg-bg-tertiary flex-shrink-0">
            <h2 className="text-base sm:text-lg font-bold text-text-primary">Update Tables
              <span className='text-sm'> (Apply to All Selected)</span>
            </h2>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg bg-action-primary text-text-white hover:opacity-90 transition-opacity"
            >
              <X className="w-4 h-4 " />
            </button>
          </div>

          {/* Global Update Section */}
          <div className="px-4 sm:px-6 py-3 bg-bg-tertiary border-b border-border-default flex-shrink-0">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <div>
                <label className="block text-xs font-semibold mb-1.5 text-text-secondary">Seating</label>

                {/* Desktop */}
                <input
                  type="number"
                  min="1"
                  value={bulkUpdateGlobal.table_type}
                  onChange={e => {
                    const value = e.target.value ? Math.max(1, Number(e.target.value)) : "";
                    setBulkUpdateGlobal(prev => ({ ...prev, table_type: value }));
                  }}
                  placeholder="No change"
                  className="hidden sm:block w-full px-3 py-1.5 border border-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-action-primary focus:border-transparent text-sm bg-bg-primary text-text-primary"
                />

                {/* Mobile with +/- buttons */}
                <div className="sm:hidden flex items-center border border-border-default rounded-lg overflow-hidden bg-bg-primary">
                  <button
                    type="button"
                    onClick={() => {
                      const current = Number(bulkUpdateGlobal.table_type) || 0;
                      const value = current > 1 ? current - 1 : "";
                      setBulkUpdateGlobal(prev => ({ ...prev, table_type: value }));
                    }}
                    className="px-3 py-1.5 text-text-primary hover:bg-bg-tertiary font-bold transition-colors"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={bulkUpdateGlobal.table_type}
                    onChange={e => {
                      const value = e.target.value ? Math.max(1, Number(e.target.value)) : "";
                      setBulkUpdateGlobal(prev => ({ ...prev, table_type: value }));
                    }}
                    placeholder="None"
                    className="flex-1 text-center py-1.5 border-x border-border-default focus:outline-none text-sm bg-transparent text-text-primary"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const current = Number(bulkUpdateGlobal.table_type) || 0;
                      setBulkUpdateGlobal(prev => ({ ...prev, table_type: current + 1 }));
                    }}
                    className="px-3 py-1.5 text-text-primary hover:bg-bg-tertiary font-bold transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5 text-text-secondary">Status</label>
                <select
                  value={bulkUpdateGlobal.status}
                  onChange={e => setBulkUpdateGlobal(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-1.5 border border-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-action-primary focus:border-transparent text-sm bg-bg-primary text-text-primary"
                >
                  <option value="">No change</option>
                  <option value="Vacant">Vacant</option>
                  <option value="Reserved">Reserved</option>
                </select>
              </div>
              <div className="">
                <label className="block text-xs font-semibold mb-1.5 text-text-secondary">Section & Zone :</label>

                <select
                  value={bulkUpdateGlobal.config_id || ""} className="w-full px-3 py-1.5 border border-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-action-primary focus:border-transparent text-sm bg-bg-primary text-text-primary"

                  onChange={e => {
                    const value = Number(e.target.value);

                    setBulkUpdateGlobal(prev => ({
                      ...prev,
                      config_id: value
                    }));

                    selectedUpdateTables.forEach(id => {
                      handleBulkUpdateChange(id, "config_id", value);
                    });
                  }}
                >
                  <option value="">No change</option>

                  {configs.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.section} - {c.zone}
                    </option>
                  ))}
                </select>
              </div>

            </div>
          </div>

          {/* Search Bar */}
          <div className="px-4 sm:px-6 py-2 border-b border-border-default bg-bg-primary flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-secondary" />
              <input
                type="text"
                placeholder="Search tables..."
                value={bulkUpdateSearch}
                onChange={e => setBulkUpdateSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-1.5 border border-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-action-primary focus:border-transparent text-sm bg-bg-primary text-text-primary"
              />
            </div>
          </div>

          {/* Select All */}
          <div className="px-4 sm:px-6 py-2 bg-bg-tertiary border-b border-border-default flex-shrink-0">
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedUpdateTables.length === filteredTables.length && filteredTables.length > 0}
                  onChange={selectAllUpdateTables}
                  className="w-4 h-4 text-action-primary border-border-default rounded focus:ring-action-primary"
                />
                <span className="text-sm font-semibold text-text-primary">Select All</span>
              </div>
              <span className="text-xs text-text-secondary">
                {selectedUpdateTables.length} of {filteredTables.length} selected
              </span>
            </label>
          </div>

          {/* Table List */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3">
            <div className="space-y-2">
              {filteredTables.length === 0 ? (
                <div className="text-center py-12">
                  <Search className="w-12 h-12 text-text-secondary mx-auto mb-3 opacity-30" />
                  <p className="text-text-secondary">No tables found</p>
                </div>
              ) : (
                filteredTables.map(table => {
                  const config = configs.find(c => c.id === table.config_id);
                  return (

                    <div
                      key={table.id}
                      className={`border rounded-xl p-3 transition-all ${selectedUpdateTables.includes(table.id)
                        ? 'border-action-primary bg-action-primary/5 shadow-sm'
                        : 'border-border-default bg-bg-primary'
                        }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          type="checkbox"
                          checked={selectedUpdateTables.includes(table.id)}
                          onChange={() => toggleUpdateTableSelection(table.id)}
                          className="w-4 h-4 text-action-primary border-border-default rounded focus:ring-action-primary cursor-pointer"
                        />
                        <span className="font-bold text-sm text-text-primary">{table.name}</span>
                      </div>

                      {selectedUpdateTables.includes(table.id) ? (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-border-default">
                          <div>
                            <label className="block text-xs font-semibold mb-1.5 text-text-secondary">Seating</label>

                            {/* Desktop */}
                            <input
                              type="number"
                              min="1"
                              value={bulkUpdateData[table.id]?.table_type ?? table.table_type ?? ""}
                              onChange={e => {
                                const value = e.target.value ? Math.max(1, Number(e.target.value)) : "";
                                handleBulkUpdateChange(table.id, "table_type", value);
                              }}
                              placeholder={bulkUpdateGlobal.table_type ? `Global: ${bulkUpdateGlobal.table_type}` : "Seating"}
                              className="hidden sm:block w-full px-3 py-1.5 border border-border-default rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-action-primary focus:border-transparent bg-bg-primary text-text-primary"
                            />

                            {/* Mobile with +/- buttons */}
                            <div className="sm:hidden flex items-center border border-border-default rounded-lg overflow-hidden bg-bg-primary">
                              <button
                                type="button"
                                onClick={() => {
                                  const current = Number(bulkUpdateData[table.id]?.table_type ?? table.table_type) || 1;
                                  const value = Math.max(1, current - 1);
                                  handleBulkUpdateChange(table.id, "table_type", value);
                                }}
                                className="px-3 py-1.5 text-text-primary hover:bg-bg-tertiary font-bold transition-colors"
                              >
                                −
                              </button>
                              <input
                                type="number"
                                min="1"
                                value={bulkUpdateData[table.id]?.table_type ?? table.table_type ?? ""}
                                onChange={e => {
                                  const value = e.target.value ? Math.max(1, Number(e.target.value)) : "";
                                  handleBulkUpdateChange(table.id, "table_type", value);
                                }}
                                placeholder={bulkUpdateGlobal.table_type ? `${bulkUpdateGlobal.table_type}` : ""}
                                className="flex-1 text-center py-1.5 border-x border-border-default focus:outline-none text-sm bg-transparent text-text-primary"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const current = Number(bulkUpdateData[table.id]?.table_type ?? table.table_type) || 0;
                                  handleBulkUpdateChange(table.id, "table_type", current + 1);
                                }}
                                className="px-3 py-1.5 text-text-primary hover:bg-bg-tertiary font-bold transition-colors"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold mb-1.5 text-text-secondary">Status</label>
                            <select
                              value={bulkUpdateData[table.id]?.status ?? table.status}
                              onChange={e => handleBulkUpdateChange(table.id, 'status', e.target.value)}
                              className="w-full px-3 py-1.5 border border-border-default rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-action-primary focus:border-transparent bg-bg-primary text-text-primary"
                            >
                              <option value="Vacant">Vacant</option>
                              <option value="Reserved">Reserved</option>
                            </select>
                          </div>
                          <div className="">
                            <label className="block text-xs font-semibold mb-1.5 text-text-secondary">Section & Zone :</label>
                            <select
                              value={bulkUpdateData[table.id]?.config_id ?? table.config_id ?? ""}
                              className="w-full px-3 py-1.5 border border-border-default rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-action-primary focus:border-transparent bg-bg-primary text-text-primary"
                              onChange={e =>
                                handleBulkUpdateChange(
                                  table.id,
                                  "config_id",
                                  Number(e.target.value)
                                )
                              }
                            >
                              <option value="">No change</option>

                              {configs.map(c => (
                                <option key={c.id} value={c.id}>
                                  {c.section} - {c.zone}
                                </option>
                              ))}
                            </select>
                          </div>

                        </div>
                      ) : (
                        <div className="pt-2 border-t border-border-default">
                          <div className="grid grid-cols-4 gap-2 text-xs">
                            <div>
                              <span className="text-text-secondary">Seating:</span>
                              <span className="ml-1 text-text-primary font-semibold">{table.table_type}</span>
                            </div>
                            <div>
                              <span className="text-text-secondary">Status:</span>
                              <span className="ml-1 text-text-primary font-semibold">{table.status}</span>
                            </div>
                            <div>
                              <span className="text-text-secondary">Section & Zone :</span>
                              <span className="ml-1 text-text-primary font-semibold">
                                {config ? `${config.section} - ${config.zone}` : "-"}
                              </span>
                            </div>
                            {/* <div>
                              <span className="text-text-secondary">Zone:</span>
                              <span className="ml-1 text-text-primary font-semibold">{config?.zone || "-"}</span>
                            </div> */}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 sm:px-6 py-3 bg-bg-tertiary border-t border-border-default flex flex-col sm:flex-row gap-2 justify-end flex-shrink-0">
            <button
              className="px-6 py-2 rounded-lg bg-bg-primary text-text-primary border border-border-default hover:bg-bg-secondary font-semibold text-sm transition-colors"
              onClick={handleClose}
            >
              Cancel
            </button>
            <button
              className="px-6 py-2 rounded-lg bg-action-primary text-text-white hover:bg-action-primary/90 font-semibold text-sm transition-colors disabled:bg-bg-secondary disabled:cursor-not-allowed shadow-lg"
              onClick={saveBulkUpdate}
              disabled={selectedUpdateTables.length === 0}
            >
              Update ({selectedUpdateTables.length})
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default UniversalBulkUpdateModal;