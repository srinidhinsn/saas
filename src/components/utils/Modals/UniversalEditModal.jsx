import React, { useState } from 'react';
import { X, Upload } from 'lucide-react';
import { FaTimes, FaCheck } from 'react-icons/fa';
import DropdownCheckbox from './DropdownCheckbox';
import MenuImagePreview from '../../MainComponents/InventoryServices/Tree&CategoryManage/MenuImagePreview';

const UniversalEditModal = ({
  // Common props
  showModal,
  setShowModal,
  modalType, // 'menu' or 'table'
  
  // Menu-specific props
  editingItem,
  setEditingItem,
  categories,
  menuItems,
  editItemImage,
  setEditItemImage,
  editItemImageUrl,
  setEditItemImageUrl,
  handleEditItem,
  clientId,
  token,
  
  // Table-specific props
  editRowId,
  setEditRowId,
  tables,
  handleEditChange,
  saveEdit,
  editFieldErrors
}) => {
  const [dragActive, setDragActive] = useState(false);

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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-color-modalsbg">
        <div className="rounded-lg max-w-2xl w-full p-6 bg-bg-primary max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-text-primary">Edit Menu Item</h3>
            <button onClick={handleClose} className="text-text-secondary hover:text-text-primary">
              <X size={24} />
            </button>
          </div>

          <div className="space-y-4">
            {/* Category Selector */}
            <div>
              <label className="block text-sm font-medium mb-2 text-text-primary">Category *</label>
              <select
                value={editingItem.category_id || ''}
                onChange={(e) => setEditingItem({ ...editingItem, category_id: e.target.value })}
                className="w-full px-4 py-2 rounded-lg bg-bg-tertiary border border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary"
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

            {/* Item Name */}
            <div>
              <label className="block text-sm font-medium mb-2 text-text-primary">Item Name *</label>
              <input
                type="text"
                value={editingItem.name}
                onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                className="w-full px-4 py-2 rounded-lg bg-bg-tertiary border border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-2 text-text-primary">Description</label>
              <textarea
                value={editingItem.description}
                onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                className="w-full px-4 py-2 rounded-lg bg-bg-tertiary border border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary"
                rows="3"
              />
            </div>

            {/* Unit Price & Discount */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-text-primary">Unit Price *</label>
                <input
                  type="number"
                  value={editingItem.unit_price}
                  onChange={(e) => setEditingItem({ ...editingItem, unit_price: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-bg-tertiary border border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-text-primary">Discount</label>
                <input
                  type="number"
                  value={editingItem.discount}
                  onChange={(e) => setEditingItem({ ...editingItem, discount: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-bg-tertiary border border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary"
                />
              </div>
            </div>

            {/* Availability & Unit */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-text-primary">Availability</label>
                <input
                  type="number"
                  value={editingItem.availability}
                  onChange={(e) => setEditingItem({ ...editingItem, availability: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-bg-tertiary border border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-text-primary">Unit</label>
                <input
                  type="text"
                  value={editingItem.unit}
                  onChange={(e) => setEditingItem({ ...editingItem, unit: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-bg-tertiary border border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary"
                />
              </div>
            </div>

            {/* Item Image Upload */}
            <div>
              <label className="block text-sm font-medium mb-1 text-text-primary">Item Image</label>

              {editItemImageUrl || editingItem.image_id ? (
                <div className="mb-3">
                  <label className="block text-xs text-text-secondary mb-1">Current Image:</label>
                  {editItemImageUrl ? (
                    <div className="relative">
                      <img
                        src={editItemImageUrl}
                        alt="New Preview"
                        className="w-full h-20 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setEditItemImage(null);
                          setEditItemImageUrl('');
                        }}
                        className="absolute top-2 right-2 bg-action-danger text-text-white p-2 rounded-full hover:opacity-90"
                      >
                        <X size={16} />
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
                      className="w-full h-20 object-cover rounded-lg"
                    />
                  )}
                </div>
              ) : null}

              <div
                className={`relative border-2 border-dashed rounded-lg p-4 transition-colors ${
                  dragActive ? 'border-action-primary bg-bg-secondary' : 'border-border-default'
                }`}
                onDragEnter={handleEditDrag}
                onDragLeave={handleEditDrag}
                onDragOver={handleEditDrag}
                onDrop={handleEditDrop}
              >
                <div className="text-center">
                  <Upload className="mx-auto mb-2 text-text-secondary" size={32} />
                  <p className="text-sm text-text-secondary mb-2">
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
                    className="inline-block px-4 py-2 bg-action-primary text-text-white rounded-lg cursor-pointer hover:opacity-90"
                  >
                    Choose File
                  </label>
                </div>
              </div>
            </div>

            {/* Add-ons */}
            <div>
              <label className="block text-sm font-medium mb-2 text-text-primary">Add-ons</label>
              <DropdownCheckbox
                selected={Array.isArray(editingItem.line_item_id) ? editingItem.line_item_id : []}
                options={(menuItems || []).filter(item => item.id !== editingItem.id)}
                onChange={(selected) => setEditingItem({ ...editingItem, line_item_id: selected })}
                label="Select Add-ons"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-2 rounded-lg bg-bg-tertiary text-text-primary border border-border-default hover:bg-bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditItem}
                className="flex-1 px-4 py-2 rounded-lg bg-action-primary text-text-white hover:opacity-90 transition-opacity"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render Table Edit Modal
  if (modalType === 'table' && editRowId) {
    const table = (tables || []).find(t => t.id === editRowId);
    if (!table) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl w-full max-w-md shadow-2xl border border-gray-200 animate-scale-in">
          <div className="px-5 py-3 rounded-xl border-b-default flex justify-between items-center bg-gradient-to-r from-blue-50 to-cyan-50">
            <h3 className="text-lg font-bold text-text-primary">Edit Table</h3>
            <button 
              className="text-text-secondary hover:text-text-primary transition-colors p-1 rounded-full" 
              onClick={handleClose}
            >
              <FaTimes size={20} />
            </button>
          </div>

          <div className="p-5">
            <div className="bg-gradient-to-r from-action-primary via-text-white to-bulkActionsHover-deleteHover rounded-lg border border-orange-200 p-3 mb-4 text-center">
              <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Table Name</span>
              <div className="text-2xl font-bold text-text-primary mt-0.5">{table.name}</div>
            </div>

            <div className="space-y-3">
              {/* No of Seating */}
              <div>
                <label className="block text-sm font-semibold mb-1.5 text-text-secondary">No of Seating</label>
                <input
                  type="number"
                  min="1"
                  value={table.table_type}
                  onChange={(e) => {
                    const value = Math.max(1, Number(e.target.value) || 1);
                    handleEditChange(table.id, "table_type", value);
                  }}
                  className={`w-full px-3 py-2 border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-action-primary ${
                    editFieldErrors?.table_type ? 'border-bulkActions-delete bg-red-50' : 'border-border-default'
                  }`}
                />
                {editFieldErrors?.table_type && (
                  <div className="text-action-danger text-xs mt-1 font-medium">{editFieldErrors.table_type}</div>
                )}
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-semibold mb-1.5 text-text-secondary">Type</label>
                <select
                  value={table.location_zone}
                  onChange={(e) => handleEditChange(table.id, "location_zone", e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-action-primary ${
                    editFieldErrors?.location_zone ? 'border-bulkActions-delete bg-red-50' : 'border-border-default'
                  }`}
                >
                  <option value="AC">AC</option>
                  <option value="Non-AC">Non-AC</option>
                </select>
                {editFieldErrors?.location_zone && (
                  <div className="text-action-danger text-xs mt-1 font-medium">{editFieldErrors.location_zone}</div>
                )}
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-semibold mb-1.5 text-text-secondary">Status</label>
                <select
                  value={table.status || ""}
                  onChange={(e) => handleEditChange(table.id, "status", e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-action-primary ${
                    editFieldErrors?.status ? 'border-bulkActions-delete bg-red-50' : 'border-border-default'
                  }`}
                >
                  <option value="Vacant">Vacant</option>
                  <option value="Reserved">Reserved</option>
                </select>
                {editFieldErrors?.status && (
                  <div className="text-action-danger text-xs mt-1 font-medium">{editFieldErrors.status}</div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mt-5">
              <button
                className="flex-1 bg-action-primary text-text-white py-2.5 rounded-lg hover:bg-green-600 transition-colors font-bold shadow-md flex items-center justify-center gap-2"
                onClick={() => saveEdit(table)}
              >
                <FaCheck /> Save
              </button>
              <button
                className="flex-1 bg-modalsUpdateBg-cancel text-text-white py-2.5 rounded-lg hover:bg-gray-300 transition-colors font-bold flex items-center justify-center gap-2"
                onClick={handleClose}
              >
                <FaTimes /> Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default UniversalEditModal;