import React, { useState } from 'react';
import { Plus, Minus, X, Edit2, Trash2, Search, Filter } from 'lucide-react';

const Header = ({ onFeaturesClick }) => {
  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 lg:py-4">
        <div className="flex items-center justify-between">
          <div className="hidden lg:flex items-center space-x-8">
            <a href="#" className="text-gray-700 hover:text-orange-500 transition-colors">Home</a>
            <a href="#" className="text-gray-700 hover:text-orange-500 transition-colors">About</a>
            <a href="#" onClick={onFeaturesClick} className="text-orange-500 font-semibold">Features</a>
          </div>
          
          <div className="text-2xl lg:text-3xl font-serif italic">foodee</div>
          
          <div className="hidden lg:flex items-center space-x-8">
            <a href="#" className="text-gray-700 hover:text-orange-500 transition-colors">Menu</a>
            <a href="#" className="text-gray-700 hover:text-orange-500 transition-colors">Events</a>
            <a href="#" className="text-gray-700 hover:text-orange-500 transition-colors">Order</a>
          </div>

          <button className="lg:hidden text-gray-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
};

const AddItemModal = ({ isOpen, onClose, onAdd, availableItems }) => {
  const [selectedItem, setSelectedItem] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const filteredItems = availableItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdd = () => {
    if (selectedItem) {
      onAdd({ ...selectedItem, quantity });
      setSelectedItem(null);
      setQuantity(1);
      setSearchTerm('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 lg:p-6 border-b flex justify-between items-center">
          <h2 className="text-xl lg:text-2xl font-bold">Add Item to Order</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <div className="p-4 lg:p-6 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="grid sm:grid-cols-2 gap-4">
            {filteredItems.map(item => (
              <div
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedItem?.id === item.id
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-200 hover:border-orange-300'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-16 h-16 object-cover rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm lg:text-base truncate">{item.name}</h3>
                    <p className="text-xs text-gray-500">{item.category}</p>
                    <p className="text-orange-500 font-bold mt-1">Rs.{item.price.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {selectedItem && (
          <div className="p-4 lg:p-6 border-t bg-gray-50">
            <div className="flex items-center justify-between mb-4">
              <span className="font-semibold">Quantity:</span>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="bg-gray-200 p-2 rounded hover:bg-gray-300"
                >
                  <Minus size={18} />
                </button>
                <span className="w-12 text-center font-bold text-lg">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="bg-gray-200 p-2 rounded hover:bg-gray-300"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>
            <button
              onClick={handleAdd}
              className="w-full bg-orange-500 text-white py-3 rounded-lg hover:bg-orange-600 transition-colors font-semibold"
            >
              Add to Order
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const UpdateItemModal = ({ isOpen, onClose, item, onUpdate }) => {
  const [quantity, setQuantity] = useState(item?.quantity || 1);

  if (!isOpen || !item) return null;

  const handleUpdate = () => {
    onUpdate(item.id, quantity);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="p-4 lg:p-6 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold">Update Item</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <div className="p-4 lg:p-6">
          <div className="flex items-start space-x-4 mb-6">
            <img
              src={item.image}
              alt={item.name}
              className="w-20 h-20 object-cover rounded"
            />
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{item.name}</h3>
              <p className="text-orange-500 font-bold">Rs.{item.price.toFixed(2)}</p>
            </div>
          </div>

          <div className="flex items-center justify-between mb-6">
            <span className="font-semibold">Quantity:</span>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="bg-gray-200 p-2 rounded hover:bg-gray-300"
              >
                <Minus size={18} />
              </button>
              <span className="w-12 text-center font-bold text-lg">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="bg-gray-200 p-2 rounded hover:bg-gray-300"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdate}
              className="flex-1 bg-orange-500 text-white py-2 rounded-lg hover:bg-orange-600 transition-colors font-semibold"
            >
              Update
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="p-4 lg:p-6 border-b">
          <h2 className="text-xl font-bold text-red-600">{title}</h2>
        </div>

        <div className="p-4 lg:p-6">
          <p className="text-gray-700 mb-6">{message}</p>

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="flex-1 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition-colors font-semibold"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};





const OrderActionsModal = ({ isOpen, onClose, order, availableItems, onSave, onMarkCompleted, onDeleteOrder }) => {
  const [localOrder, setLocalOrder] = useState(order ? { ...order, items: order.items.map(i => ({ ...i })) } : null);
  const [addItemModal, setAddItemModal] = useState({ isOpen: false });
  const [updateItemModal, setUpdateItemModal] = useState({ isOpen: false, item: null });
  const [deleteItemConfirm, setDeleteItemConfirm] = useState({ isOpen: false, itemId: null });

  // Keep localOrder in sync when modal opens/closes or order changes
  React.useEffect(() => {
    if (isOpen && order) {
      setLocalOrder({ ...order, items: order.items.map(i => ({ ...i })) });
    }
  }, [isOpen, order]);

  if (!isOpen || !localOrder) return null;

  const handleChangeCustomer = (val) => setLocalOrder(prev => ({ ...prev, customerName: val }));
  const handleChangeTable = (val) => setLocalOrder(prev => ({ ...prev, table: val }));

  const handleAddItemLocal = (newItem) => {
    setLocalOrder(prev => {
      const existing = prev.items.find(i => i.id === newItem.id);
      if (existing) {
        return { ...prev, items: prev.items.map(i => i.id === newItem.id ? { ...i, quantity: i.quantity + newItem.quantity, isNew: true } : i) };
      } else {
        return { ...prev, items: [...prev.items, { ...newItem, isNew: true }] };
      }
    });
  };

  const handleUpdateItemLocal = (itemId, quantity) => {
    setLocalOrder(prev => ({ ...prev, items: prev.items.map(i => i.id === itemId ? { ...i, quantity } : i) }));
  };

  const handleRemoveItemLocal = (itemId) => {
    setLocalOrder(prev => ({ ...prev, items: prev.items.filter(i => i.id !== itemId) }));
  };

  const handleSave = () => {
    onSave(localOrder);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-lg shadow-lg">
          <div className="p-4 lg:p-6 border-b flex justify-between items-center">
            <h2 className="text-xl lg:text-2xl font-bold">Manage Order #{localOrder.id}</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X size={22} />
            </button>
          </div>

          <div className="p-4 lg:p-6 space-y-4">
            {/* Customer & Table */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold block mb-1">Customer</label>
                <input
                  value={localOrder.customerName}
                  onChange={(e) => handleChangeCustomer(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
              <div>
                <label className="text-sm font-semibold block mb-1">Table</label>
                <input
                  value={localOrder.table}
                  onChange={(e) => handleChangeTable(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
            </div>

            {/* Items list */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-600">Items ({localOrder.items.length})</h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setAddItemModal({ isOpen: true })}
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center space-x-2"
                  >
                    <Plus size={16} /> <span>Add Item</span>
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {localOrder.items.map(item => (
                  <div key={item.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <img src={item.image} alt={item.name} className="w-14 h-14 object-cover rounded" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold truncate">{item.name}</h4>
                        <span className="text-orange-500 font-bold">Rs.{item.price.toFixed(2)}</span>
                      </div>
                      <p className="text-sm text-gray-600">Qty: {item.quantity} • Subtotal: Rs.{(item.price * item.quantity).toFixed(2)}</p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setUpdateItemModal({ isOpen: true, item })}
                        className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"
                        title="Edit quantity"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => setDeleteItemConfirm({ isOpen: true, itemId: item.id })}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                        title="Remove item"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                {localOrder.items.length === 0 && (
                  <div className="text-center text-gray-500 py-6 bg-white rounded-lg">No items added</div>
                )}
              </div>
            </div>

            {/* Totals */}
            <div className="border-t pt-4">
              <div className="flex justify-between items-center text-lg font-semibold">
                <span>Subtotal</span>
                <span>Rs.{localOrder.items.reduce((s, it) => s + it.price * it.quantity, 0).toFixed(2)}</span>
              </div>
              <div className="mt-2 flex justify-between items-center text-2xl font-bold">
                <span>Total</span>
                <span className="text-orange-500">Rs.{localOrder.items.reduce((s, it) => s + it.price * it.quantity, 0).toFixed(2)}</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col md:flex-row gap-3 mt-2">
              <button
                onClick={() => { onSave(localOrder); onClose(); }}
                className="flex-1 bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 font-semibold"
              >
                Save Changes
              </button>

              <button
                onClick={() => { onMarkCompleted(localOrder.id); onClose(); }}
                className={`flex-1 py-3 rounded-lg font-semibold ${localOrder.status === 'Completed' ? 'bg-gray-300 text-gray-700 cursor-not-allowed' : 'bg-green-500 text-white hover:bg-green-600'}`}
                disabled={localOrder.status === 'Completed'}
              >
                {localOrder.status === 'Completed' ? 'Completed' : 'Mark Completed'}
              </button>

              <button
                onClick={() => window.print()}
                className="flex-1 bg-white border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50 font-semibold"
              >
                Print Invoice
              </button>

              <button
                onClick={() => { onDeleteOrder(localOrder.id); onClose(); }}
                className="flex-1 bg-red-500 text-white py-3 rounded-lg hover:bg-red-600 font-semibold"
              >
                Delete Order
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* AddItemModal -> will call handleAddItemLocal */}
      <AddItemModal
        isOpen={addItemModal.isOpen}
        onClose={() => setAddItemModal({ isOpen: false })}
        availableItems={availableItems}
        onAdd={(item) => {
          handleAddItemLocal(item);
          setAddItemModal({ isOpen: false });
        }}
      />

      {/* UpdateItemModal -> will call handleUpdateItemLocal */}
      <UpdateItemModal
        isOpen={updateItemModal.isOpen}
        onClose={() => setUpdateItemModal({ isOpen: false, item: null })}
        item={updateItemModal.item}
        onUpdate={(itemId, quantity) => {
          handleUpdateItemLocal(itemId, quantity);
          setUpdateItemModal({ isOpen: false, item: null });
        }}
      />

      {/* Delete item confirm */}
      <DeleteConfirmModal
        isOpen={deleteItemConfirm.isOpen}
        onClose={() => setDeleteItemConfirm({ isOpen: false, itemId: null })}
        title="Delete Item"
        message="Are you sure you want to remove this item from the order?"
        onConfirm={() => {
          if (deleteItemConfirm.itemId != null) {
            handleRemoveItemLocal(deleteItemConfirm.itemId);
            setDeleteItemConfirm({ isOpen: false, itemId: null });
          }
        }}
      />
    </>
  );
};

/* ---------- Updated OrderSummary (wires the modal) ---------- */

const OrderSummary = () => {
  const [showFeaturesContent, setShowFeaturesContent] = useState(true);

  // available items (same as you had)
  const availableItems = [
    { id: 1, name: 'Pineapple Juice', category: 'Juices', price: 75, image: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&h=300&fit=crop' },
    { id: 2, name: 'Green Juice', category: 'Juices', price: 99, image: 'https://images.unsplash.com/photo-1610970881699-44a5587cabec?w=400&h=300&fit=crop' },
    { id: 3, name: 'Coca Cola', category: 'Soft Drinks', price: 99, image: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&h=300&fit=crop' },
    { id: 4, name: 'Espresso', category: 'Coffee', price: 199, image: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=400&h=300&fit=crop' },
    { id: 5, name: 'Cappuccino', category: 'Coffee', price: 299, image: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400&h=300&fit=crop' },
    { id: 6, name: 'Beef Steak', category: 'Steaks', price: 349, image: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=400&h=300&fit=crop' },
    { id: 7, name: 'Grilled Chicken', category: 'Chicken', price: 555, image: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=400&h=300&fit=crop' },
    { id: 8, name: 'Caesar Salad', category: 'Salads', price: 249, image: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=400&h=300&fit=crop' },
    { id: 9, name: 'Chocolate Cake', category: 'Desserts', price: 120, image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&h=300&fit=crop' },
    { id: 10, name: 'Tiramisu', category: 'Desserts', price: 200, image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400&h=300&fit=crop' },
  ];

  // sample orders
  const [orders, setOrders] = useState([
    {
      id: 1,
      table: 'Table 5',
      customerName: 'John Doe',
      status: 'In Progress',
      timestamp: '2:30 PM',
      items: [
        { id: 1, name: 'Pineapple Juice', price: 75, quantity: 2, image: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&h=300&fit=crop', isNew: false },
        { id: 6, name: 'Beef Steak', price: 349, quantity: 1, image: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=400&h=300&fit=crop', isNew: false },
      ]
    },
    {
      id: 2,
      table: 'Table 12',
      customerName: 'Jane Smith',
      status: 'In Progress',
      timestamp: '2:45 PM',
      items: [
        { id: 4, name: 'Espresso', price: 199, quantity: 2, image: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=400&h=300&fit=crop', isNew: false },
        { id: 8, name: 'Caesar Salad', price: 249, quantity: 1, image: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=400&h=300&fit=crop', isNew: false },
        { id: 9, name: 'Chocolate Cake', price: 120, quantity: 1, image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&h=300&fit=crop', isNew: false },
      ]
    },
    {
      id: 3,
      table: 'Table 8',
      customerName: 'Mike Johnson',
      status: 'In Progress',
      timestamp: '3:00 PM',
      items: [
        { id: 7, name: 'Grilled Chicken', price: 555, quantity: 1, image: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=400&h=300&fit=crop', isNew: false },
        { id: 3, name: 'Coca Cola', price: 99, quantity: 2, image: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&h=300&fit=crop', isNew: false },
      ]
    },
  ]);

  const [orderModal, setOrderModal] = useState({ isOpen: false, order: null });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, type: null, orderId: null });

  // handlers to update orders from OrderActionsModal
  const handleSaveOrder = (updatedOrder) => {
    setOrders(prev => prev.map(o => o.id === updatedOrder.id ? { ...updatedOrder } : o));
  };

  const handleMarkCompleted = (orderId) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'Completed' } : o));
  };

  const handleDeleteOrder = (orderId) => {
    setOrders(prev => prev.filter(o => o.id !== orderId));
  };

  const getOrderTotal = (items) => items.reduce((t, i) => t + i.price * i.quantity, 0).toFixed(2);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.table.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (!showFeaturesContent) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header onFeaturesClick={() => setShowFeaturesContent(true)} />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-4xl font-serif italic mb-4">Welcome to Features</h1>
          <p className="text-gray-600">Click Features in the header to view Order Summary</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onFeaturesClick={() => setShowFeaturesContent(true)} />

      <div className="container mx-auto px-4 py-6 lg:py-8">
        {/* Page Title */}
        <div className="text-center mb-6 lg:mb-8">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif italic mb-3 lg:mb-4">Order Summary</h1>
          <p className="text-gray-600 text-sm md:text-base">Manage and track all active orders</p>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-lg shadow-md p-4 lg:p-6 mb-6 lg:mb-8">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by customer or table..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="All">All Orders</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Orders list - now with Manage button to open modal */}
        <div className="space-y-4 lg:space-y-6">
          {filteredOrders.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 lg:p-12 text-center">
              <p className="text-gray-500 text-lg">No orders found</p>
            </div>
          ) : (
            filteredOrders.map(order => (
              <div key={order.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-4 lg:p-6 border-b bg-gray-50">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-xl font-bold">Order #{order.id}</h3>
                        <span className="px-3 py-1 bg-orange-100 text-orange-600 rounded-full text-sm font-semibold">
                          {order.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600">
                        <span><strong>Customer:</strong> {order.customerName}</span>
                        <span><strong>Table:</strong> {order.table}</span>
                        <span><strong>Time:</strong> {order.timestamp}</span>
                        <span><strong>Items:</strong> {order.items.length}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setOrderModal({ isOpen: true, order })}
                        className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-semibold"
                      >
                        Manage Order
                      </button>

                      <button
                        onClick={() => setDeleteModal({ isOpen: true, type: 'order', orderId: order.id })}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete order"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* compact footer showing total */}
                <div className="p-4 lg:p-6 flex items-center justify-between">
                  <div className="text-sm text-gray-600">Total items: {order.items.length}</div>
                  <div className="text-lg font-bold text-orange-500">Rs.{getOrderTotal(order.items)}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* OrderActionsModal */}
      <OrderActionsModal
        isOpen={orderModal.isOpen}
        onClose={() => setOrderModal({ isOpen: false, order: null })}
        order={orderModal.order}
        availableItems={availableItems}
        onSave={(updatedOrder) => handleSaveOrder(updatedOrder)}
        onMarkCompleted={(orderId) => handleMarkCompleted(orderId)}
        onDeleteOrder={(orderId) => handleDeleteOrder(orderId)}
      />

      {/* Delete confirm for entire order */}
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, type: null, orderId: null })}
        title="Delete Order"
        message="Are you sure you want to delete this order? This action cannot be undone."
        onConfirm={() => {
          if (deleteModal.orderId != null) {
            handleDeleteOrder(deleteModal.orderId);
            setDeleteModal({ isOpen: false, type: null, orderId: null });
          }
        }}
      />
    </div>
  );
};

export default OrderSummary;

