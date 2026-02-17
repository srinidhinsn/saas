// const calculateElapsedTime = (createdAt) => {
//   if (!createdAt) return null;

//   let created;

//   if (typeof createdAt === "string") {
//     // Convert to proper ISO UTC format
//     const utcString =
//       createdAt.replace(" ", "T").split(".")[0] + "Z";

//     created = new Date(utcString).getTime();
//   } else {
//     created = new Date(createdAt).getTime();
//   }

//   const diffMs = Date.now() - created;

//   if (diffMs < 0) return "Just now";

//   const seconds = Math.floor(diffMs / 1000);
//   const minutes = Math.floor(seconds / 60);
//   const hours = Math.floor(minutes / 60);
//   const days = Math.floor(hours / 24);

//   if (seconds < 60) return "Just now";
//   if (minutes === 1) return "1 min ago";
//   if (minutes < 60) return `${minutes} mins ago`;
//   if (hours === 1) return "1 hr ago";
//   if (hours < 24) return `${hours} hrs ago`;
//   if (days === 1) return "1 day ago";

//   return `${days} days ago`;
// };




// import React, { useState, useEffect, useRef } from 'react';
// import { ShoppingCart, Plus, Minus, X, Check, StickyNote, Search, Users, Package, Trash2, ArrowLeft, FileText, Printer as PrinterIcon, Clock } from 'lucide-react';
// import axios from 'axios';
// import CategoryTree from '../InventoryServices/CategoryTree';
// import ImagePreview from '../../utils/ImagePreview';
// import { Eye, Lock, Printer } from 'lucide-react';
// import { useNavigate } from 'react-router-dom';
// import { toast } from 'react-toastify';
// import InvoiceModal from '../BillingServices/InvoiceModal';

// const TABLE_STATUS_CONFIG = {
//   vacant: {
//     clickable: true,
//     bg: 'bg-action-success',
//     border: 'border-border-default',
//     badge: 'bg-green-100 text-action-success',
//     icon: null,
//   },
//   available: {
//     clickable: true,
//     bg: 'bg-action-success',
//     border: 'border-border-default',
//     badge: 'bg-green-100 text-green-700',
//     icon: null,
//   },
//   occupied: {
//     clickable: false,
//     bg: 'bg-action-primary',
//     border: 'border-action-primary',
//     badge: 'bg-red-100 text-action-primary',
//     icon: Eye,
//     viewable: true,
//   },
//   served: {
//     clickable: false,
//     bg: 'bg-blue-50',
//     border: 'border-blue-400',
//     badge: 'bg-blue-100 text-blue-700',
//     icon: Eye,
//     viewable: true,
//   },
//   reserved: {
//     clickable: false,
//     bg: 'bg-yellow-50',
//     border: 'border-yellow-400',
//     badge: 'bg-yellow-100 text-yellow-700',
//     icon: Lock,
//   },
// };

// const TableReservation = ({
//   tables = [],
//   orderMode = "dinein",
//   onSelectTable,
//   onSelectTakeaway,
//   onSelectDineIn,
//   onViewOrder,
//   tableOrders = {},
//   onPrintBill,
//   onDeleteOrder,
//   onMarkAsServed,
// }) => {
//   const [selectedSections, setSelectedSections] = useState([]);
//   const [selectedZones, setSelectedZones] = useState([]);
//   const [currentTime, setCurrentTime] = useState(Date.now());

//   // Update timer every second
//   useEffect(() => {
//     const interval = setInterval(() => {
//       setCurrentTime(Date.now());
//     }, 1000);
//     return () => clearInterval(interval);
//   }, []);

//   const toggleFilter = (value, list, setList) => {
//     setList(prev =>
//       prev.includes(value)
//         ? prev.filter(v => v !== value)
//         : [...prev, value]
//     );
//   };

//   const uniqueZones = [...new Set(tables.map(t => t.location_zone))];

//   const getSectionsByZone = (zone) => {
//     return [...new Set(
//       filteredTables
//         .filter(t => t.location_zone === zone)
//         .map(t => t.section || 'Other')
//     )];
//   };

//   const filteredTables = tables.filter(t => {
//     if ((t.name || '').toLowerCase().includes('takeaway') || t.id === 500) {
//       return false;
//     }

//     const zoneMatch =
//       selectedZones.length === 0 || selectedZones.includes(t.location_zone);

//     const sectionMatch =
//       selectedSections.length === 0 || selectedSections.includes(t.section);

//     return zoneMatch && sectionMatch;
//   });

//   const visibleZones = [...new Set(filteredTables.map(t => t.location_zone))];

//   // Calculate elapsed time for table orders
//   const calculateElapsedTime = (createdAt) => {
//     if (!createdAt) return null;

//     const now = currentTime;
//     const created = new Date(createdAt).getTime();
//     const diffMs = now - created;
//     const diffMins = Math.floor(diffMs / 60000);
//     const diffSecs = Math.floor((diffMs % 60000) / 1000);

//     return `${diffMins}:${diffSecs.toString().padStart(2, '0')}`;
//   };

//   return (
//     <div className="p-4 bg-bg-primary overflow-y-auto h-[calc(100vh-4rem)]">
//       {/* FILTER BAR */}
//       <div className="mb-3 sticky top-0 z-10 bg-bg-primary">
//         <div className="flex flex-wrap gap-2 p-2 rounded-xl border border-border-default bg-bg-tertiary">
//           <div className="flex flex-wrap items-center gap-2 p-2 rounded-xl">
//             <button
//               onClick={() => {
//                 setSelectedSections([]);
//                 setSelectedZones([]);
//               }}
//               className={`px-3 py-1 rounded-full text-xs font-semibold transition
//                 ${selectedSections.length === 0 && selectedZones.length === 0
//                   ? "bg-action-primary text-white"
//                   : "bg-white text-text-secondary hover:bg-gray-100"}`}
//             >
//               All
//             </button>

//             <div className="w-px bg-border-default mx-1" />

//             {["AC", "Non-AC"].map(sec => (
//               <button
//                 key={sec}
//                 onClick={() => toggleFilter(sec, selectedSections, setSelectedSections)}
//                 className={`px-3 py-1 rounded-full text-xs font-semibold transition
//                   ${selectedSections.includes(sec)
//                     ? "bg-action-primary text-white"
//                     : "bg-white text-text-secondary hover:bg-gray-100"}`}
//               >
//                 {sec}
//               </button>
//             ))}

//             <div className="w-px bg-border-default mx-1" />

//             {["Ground Floor", "First Floor", "Second Floor", "Garden Area"].map(zone => (
//               <button
//                 key={zone}
//                 onClick={() => toggleFilter(zone, selectedZones, setSelectedZones)}
//                 className={`px-3 py-1 rounded-full text-xs font-semibold transition
//                   ${selectedZones.includes(zone)
//                     ? "bg-action-primary text-white"
//                     : "bg-white text-text-secondary hover:bg-gray-100"}`}
//               >
//                 {zone}
//               </button>
//             ))}
//           </div>

//           <div className="ml-auto flex bg-bg-primary border-2 rounded-full border-action-primary p-1 shadow-sm">
//             <button
//               onClick={onSelectDineIn}
//               className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all
//                 ${orderMode === "dinein"
//                   ? "bg-action-primary text-text-white shadow"
//                   : "text-text-secondary hover:bg-gray-100"}`}
//             >
//               Dine In
//             </button>

//             <button
//               onClick={onSelectTakeaway}
//               className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all flex items-center gap-1
//                 ${orderMode === "takeaway"
//                   ? "bg-orange-500 text-white shadow"
//                   : "text-gray-600 hover:bg-gray-100"}`}
//             >
//               <Package size={12} />
//               Takeaway
//             </button>
//           </div>
//         </div>
//       </div>

//       {/* TABLE GRID */}
//       {orderMode === "dinein" && visibleZones.map(zone => {
//         const sections = getSectionsByZone(zone);

//         return (
//           <div key={zone} className="mb-10">
//             <h3 className="text-xl font-bold mb-4 text-gray-800">
//               {zone}
//             </h3>

//             {sections.map(section => (
//               <div key={section} className="mb-6">
//                 <div className="flex items-center gap-2 mb-3">
//                   <span className="text-sm font-semibold px-3 py-1 rounded-full bg-gray-200">
//                     {section}
//                   </span>
//                 </div>

//                 <div className="grid gap-6 grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-5">
//                   {filteredTables
//                     .filter(t => t.location_zone === zone && t.section === section)
//                     .map(table => {
//                       const statusKey = table.status?.toLowerCase();
//                       const config = TABLE_STATUS_CONFIG[statusKey] || TABLE_STATUS_CONFIG.vacant;
//                       const orderInfo = tableOrders[table.id];

//                       const hasViewableOrder = (statusKey === 'occupied' || statusKey === 'served') && orderInfo;
//                       const elapsedTime = orderInfo?.created_at ? calculateElapsedTime(orderInfo.created_at) : null;

//                       return (
//                         <div
//                           key={table.id}
//                           className="rounded-xl overflow-hidden border shadow-sm hover:shadow-md transition bg-white"
//                         >
//                           <div
//                             onClick={() => {
//                               if (config.clickable) {
//                                 onSelectTable(table);
//                               } else if (hasViewableOrder && onViewOrder) {
//                                 onViewOrder(table);
//                               }
//                             }}
//                             className={`${config.clickable || hasViewableOrder ? 'cursor-pointer' : ''}`}
//                           >
//                             <div className="flex justify-between px-3 py-2 bg-action-primary text-white">
//                               <span className="font-bold text-xl tracking-wide">
//                                 {table.table_number}
//                               </span>

//                               {hasViewableOrder && (
//                                 <span
//                                   className={`text-xl px-2 py-0.5 rounded-full font-semibold
//                                     ${orderInfo.status === 'pending' ? 'bg-orange-100 text-orange-700' :
//                                       orderInfo.status === 'preparing' ? 'bg-blue-100 text-blue-700' :
//                                         orderInfo.status === 'ready' ? 'bg-green-100 text-green-700' :
//                                           orderInfo.status === 'served' ? 'bg-purple-100 text-purple-700' :
//                                             'bg-gray-100 text-gray-700'}
//                                   `}
//                                 >
//                                   {orderInfo.status?.toUpperCase()}
//                                 </span>
//                               )}

//                               {hasViewableOrder && (
//                                 <div className="text-xl opacity-90 mt-1">
//                                   #{orderInfo.id}
//                                 </div>
//                               )}
//                             </div>

//                             <div className={`p-6 flex justify-between  ${statusKey === 'occupied' ? 'text-blue-600 bg-blue-200' :
//                               statusKey === 'served' ? 'text-purple-600 bg-purple-50' :
//                                 statusKey === 'reserved' ? 'text-yellow-600 bg-yellow-50' :
//                                   'text-green-600 bg-green-200'} `}>
//                               {statusKey === 'vacant' && <span className="text-2xl">-</span>}
//                               {(statusKey === 'occupied' || statusKey === 'served') && <Eye size={28} className="text-blue-600" />}

//                               {hasViewableOrder && (
//                                 <>
//                                   <button
//                                     onClick={(e) => {
//                                       e.stopPropagation();
//                                       if (onPrintBill) {
//                                         onPrintBill(orderInfo.id, table.id);
//                                       }
//                                     }}
//                                     className="text-yellow-600 hover:scale-110 transition-transform"
//                                     title="Print Bill"
//                                   >
//                                     <Printer size={28} />
//                                   </button>

//                                   <button
//                                     onClick={(e) => {
//                                       e.stopPropagation();
//                                       if (onDeleteOrder) {
//                                         onDeleteOrder(orderInfo.id, table.id);
//                                       }
//                                     }}
//                                     className="text-red-600 hover:scale-110 transition-transform"
//                                     title="Delete Order"
//                                   >
//                                     <Trash2 size={28} />
//                                   </button>
//                                 </>
//                               )}
//                               {statusKey === 'reserved' && <Lock size={28} className="text-yellow-600" />}
//                             </div>

//                             {/* Timer display for table */}
//                             {hasViewableOrder && elapsedTime && (
//                               <div className="px-3 py-2 bg-gray-50 border-t border-gray-200">
//                                 <div className="flex items-center justify-center gap-2 text-sm font-semibold text-gray-700">
//                                   <Clock size={16} className="text-orange-600" />
//                                   <span>{elapsedTime}</span>
//                                 </div>
//                               </div>
//                             )}
//                           </div>

//                           {hasViewableOrder && orderInfo.status === 'ready' && (
//                             <button
//                               onClick={(e) => {
//                                 e.stopPropagation();
//                                 if (onMarkAsServed) {
//                                   onMarkAsServed(orderInfo.id, table.id);
//                                 }
//                               }}
//                               className="w-full px-4 py-2 bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors"
//                             >
//                               Mark as Served
//                             </button>
//                           )}
//                         </div>
//                       );
//                     })}
//                 </div>
//               </div>
//             ))}
//           </div>
//         );
//       })}

//       {orderMode === "takeaway" && (
//         <div className="text-center mt-10 text-gray-500 text-sm">
//           Takeaway selected. Opening menu…
//         </div>
//       )}
//     </div>
//   );
// };

// const NoteModal = ({ isOpen, onClose, itemName }) => {
//   if (!isOpen) return null;

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
//       <div className="rounded-lg max-w-md w-full p-6" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
//         <h3 className="text-xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
//           Add Note for {itemName}
//         </h3>

//         <div className="flex gap-3 mt-4">
//           <button
//             onClick={onClose}
//             className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
//             style={{
//               borderColor: 'var(--color-border-default)',
//               backgroundColor: 'transparent',
//               color: 'var(--color-text-primary)',
//             }}
//           >
//             Cancel
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// // ✅ UPDATED: Checkbox-based Line Items Modal
// const LineItemsModal = ({ isOpen, onClose, mainItem, lineItems, onAddWithSelectedAddons, onAddMainOnly }) => {
//   const [selectedAddons, setSelectedAddons] = useState([]);

//   useEffect(() => {
//     if (isOpen) {
//       setSelectedAddons([]);
//     }
//   }, [isOpen]);

//   const toggleAddon = (addonId) => {
//     setSelectedAddons(prev =>
//       prev.includes(addonId)
//         ? prev.filter(id => id !== addonId)
//         : [...prev, addonId]
//     );
//   };

//   if (!isOpen) return null;

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-color-modalsbg">
//       <div className="rounded-lg max-w-lg w-full p-6 bg-bg-primary max-h-[80vh] overflow-y-auto">
//         <h3 className="text-xl font-semibold mb-2 text-text-primary">{mainItem?.name}</h3>
//         <p className="mb-4 text-text-secondary">Select add-ons you want:</p>

//         <div className="space-y-2 mb-6">
//           {lineItems.map((item, index) => (
//             <div
//               key={item.id}
//               onClick={() => toggleAddon(item.id)}
//               className={`flex justify-between items-center p-3 rounded-lg cursor-pointer transition-all ${selectedAddons.includes(item.id)
//                 ? 'bg-action-primary/10 border-2 border-action-primary'
//                 : 'bg-bg-tertiary border border-border-default hover:border-action-primary/50'
//                 }`}
//             >
//               <div className="flex items-center gap-3 flex-1">
//                 <div
//                   className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${selectedAddons.includes(item.id)
//                     ? 'bg-action-primary border-action-primary'
//                     : 'border-gray-300'
//                     }`}
//                 >
//                   {selectedAddons.includes(item.id) && (
//                     <Check size={14} className="text-white" />
//                   )}
//                 </div>
//                 <span className="text-text-primary font-medium">{item.name}</span>
//               </div>
//               <span className="font-semibold text-action-primary">₹{item.unit_price}</span>
//             </div>
//           ))}
//         </div>

//         {selectedAddons.length > 0 && (
//           <div className="mb-4 p-3 bg-blue-50 rounded-lg">
//             <p className="text-sm text-blue-800">
//               <span className="font-semibold">{selectedAddons.length}</span> add-on{selectedAddons.length > 1 ? 's' : ''} selected
//             </p>
//           </div>
//         )}

//         <div className="flex gap-3">
//           <button
//             onClick={onClose}
//             className="flex-1 px-4 py-2 rounded-lg transition-colors border-border-default bg-bg-tertiary text-text-primary hover:bg-gray-100"
//           >
//             Cancel
//           </button>
//           <button
//             onClick={onAddMainOnly}
//             className="flex-1 px-4 py-2 rounded-lg transition-colors bg-gray-600 text-white hover:bg-gray-700"
//           >
//             Main Only
//           </button>
//           <button
//             onClick={() => onAddWithSelectedAddons(selectedAddons)}
//             disabled={selectedAddons.length === 0}
//             className={`flex-1 px-4 py-2 rounded-lg transition-colors ${selectedAddons.length > 0
//               ? 'bg-action-primary text-text-white hover:bg-action-danger'
//               : 'bg-gray-300 text-gray-500 cursor-not-allowed'
//               }`}
//           >
//             Add ({selectedAddons.length})
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// const DeleteConfirmModal = ({ isOpen, onClose, onConfirm }) => {
//   if (!isOpen) return null;

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
//       <div className="rounded-lg w-full max-w-sm bg-white shadow-xl">
//         <div className="px-6 py-4 border-b flex justify-between items-center">
//           <h2 className="text-lg font-bold text-red-600">Delete Order</h2>
//           <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
//             <X size={20} />
//           </button>
//         </div>
//         <div className="px-6 py-5">
//           <p className="text-sm text-gray-700">
//             Are you sure you want to delete this order? This action cannot be undone.
//           </p>
//         </div>
//         <div className="px-6 py-4 flex gap-3 bg-gray-50 rounded-b-lg">
//           <button
//             onClick={onClose}
//             className="flex-1 py-2.5 rounded-lg font-medium text-sm border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
//           >
//             Cancel
//           </button>
//           <button
//             onClick={() => {
//               onConfirm();
//               onClose();
//             }}
//             className="flex-1 py-2.5 rounded-lg bg-red-600 text-white font-medium text-sm hover:bg-red-700"
//           >
//             Delete
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// const TakeOrder = ({ clientId, token, onOrderUpdate, realm }) => {
//   const [searchOpen, setSearchOpen] = useState(false);
//   const [searchQuery, setSearchQuery] = useState('');
//   const searchInputRef = useRef(null);
//   const [selectedCategory, setSelectedCategory] = useState('All Categories');
//   const [selectedTable, setSelectedTable] = useState('');
//   const [cart, setCart] = useState([]);
//   const [showCart, setShowCart] = useState(true);
//   const [orderPlaced, setOrderPlaced] = useState(false);
//   const [tables, setTables] = useState([]);
//   const [categories, setCategories] = useState([]);
//   const [menuItems, setMenuItems] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [isPlacingOrder, setIsPlacingOrder] = useState(false);
//   const [noteModalOpen, setNoteModalOpen] = useState(false);
//   const [currentItemForNote, setCurrentItemForNote] = useState(null);
//   const [lineItemsModalOpen, setLineItemsModalOpen] = useState(false);
//   const [selectedMainItem, setSelectedMainItem] = useState(null);
//   const [lineItemsDetails, setLineItemsDetails] = useState([]);
//   const [orderMode, setOrderMode] = useState('dinein');
//   const [takeawayTableId, setTakeawayTableId] = useState(null);
//   const isPlacingRef = useRef(false);
//   const isMobile = window.matchMedia('(max-width: 1024px)').matches;
//   const [showClearConfirm, setShowClearConfirm] = useState(false);
//   const [showOrderPage, setShowOrderPage] = useState(false);
//   const [currentView, setCurrentView] = useState('floor');
//   const [activeOrderId, setActiveOrderId] = useState(null);
//   const [hasNewItems, setHasNewItems] = useState(false);
//   const [currentBatchTimestamp, setCurrentBatchTimestamp] = useState(null);
//   const [isOrderFormOpen, setIsOrderFormOpen] = useState(false);
//   const [tableOrders, setTableOrders] = useState({});
//   const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
//   const [orderToDelete, setOrderToDelete] = useState(null);
//   const [returnToView, setReturnToView] = useState('floor');
//   const navigate = useNavigate();

//   // ============ UTILITY FUNCTIONS ============
//   const flattenCategoryTree = (tree, level = 0, parentId = null) => {
//     let flatList = [];
//     tree.forEach(category => {
//       flatList.push({
//         id: category.id,
//         name: category.name,
//         level: level,
//         parentId: parentId,
//         hasChildren: category.subCategories && category.subCategories.length > 0,
//       });
//       if (category.subCategories && category.subCategories.length > 0) {
//         flatList = flatList.concat(
//           flattenCategoryTree(category.subCategories, level + 1, category.id)
//         );
//       }
//     });
//     return flatList;
//   };

//   const generateSlug = (text) =>
//     "_" + text.trim().replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "_");

//   const getCategoryAndChildrenNames = (categories, targetName) => {
//     const result = new Set();
//     const traverse = (nodes, found = false) => {
//       for (const node of nodes) {
//         const isTarget = node.name === targetName;
//         if (isTarget || found) {
//           result.add(node.name);
//         }
//         if (node.children && node.children.length > 0) {
//           traverse(node.children, found || isTarget);
//         }
//       }
//     };
//     traverse(categories);
//     return Array.from(result);
//   };

//   const fetchTables = async () => {
//     const res = await axios.get(
//       `${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/read`,
//       { headers: { Authorization: `Bearer ${token}` } }
//     );

//     const tableList = Array.isArray(res.data?.data)
//       ? res.data.data.map(t => ({
//         ...t,
//         table_number: t.name || t.table_number || "-",
//       }))
//       : [];

//     const takeawayTable = tableList.find(t => Number(t.id) === 500);
//     if (takeawayTable) {
//       setTakeawayTableId(takeawayTable.id);
//     } else {
//       console.warn("⚠️ Takeaway table (id=500) not found");
//     }

//     tableList.sort((a, b) =>
//       a.table_number.localeCompare(b.table_number, undefined, { numeric: true })
//     );

//     setTables(tableList);
//     await fetchTableOrders(tableList);
//   };

//   const fetchTableOrders = async (tableList) => {
//     try {
//       const response = await axios.get(
//         `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/table`,
//         { headers: { Authorization: `Bearer ${token}` } }
//       );

//       const allOrders = response.data?.data || [];
//       const ordersMap = {};

//       tableList.forEach(table => {
//         const tableStatus = table.status?.toLowerCase();

//         if (tableStatus === 'occupied' || tableStatus === 'served') {
//           const tableOrder = allOrders
//             .filter(o => o.table_id === table.id && o.status?.toLowerCase() !== 'completed')
//             .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

//           if (tableOrder) {
//             ordersMap[table.id] = {
//               id: tableOrder.id,
//               status: tableOrder.status,
//               order_mode: tableOrder.order_type || 'dinein',
//               created_at: tableOrder.created_at,
//             };
//           }
//         }
//       });

//       setTableOrders(ordersMap);
//     } catch (err) {
//       console.error("Failed to fetch table orders:", err);
//     }
//   };

//   const handleDeleteOrder = async (orderId, tableId) => {
//     try {
//       await axios.delete(
//         `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/delete`,
//         {
//           params: { dinein_order_id: orderId, client_id: clientId },
//           headers: { Authorization: `Bearer ${token}` }
//         }
//       );

//       const tableObj = tables.find(t => t.id === tableId);
//       if (tableObj) {
//         await axios.post(
//           `${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/update`,
//           {
//             id: tableId,
//             client_id: clientId,
//             name: tableObj.name,
//             table_type: tableObj.table_type,
//             status: 'Vacant',
//             location_zone: tableObj.location_zone
//           },
//           { headers: { Authorization: `Bearer ${token}` } }
//         );
//       }

//       toast.success('Order deleted successfully');

//       await fetchTables();

//       setShowDeleteConfirm(false);
//       setOrderToDelete(null);
//     } catch (err) {
//       console.error('Delete order error:', err);
//       toast.error('Failed to delete order');
//     }
//   };

//   const handleMarkAsServed = async (orderId, tableId) => {
//     try {
//       await axios.post(
//         `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/update`,
//         {
//           id: orderId,
//           client_id: clientId,
//           status: 'served'
//         },
//         { headers: { Authorization: `Bearer ${token}` } }
//       );

//       toast.success('Order marked as served');

//       await fetchTables();
//     } catch (err) {
//       console.error('Mark as served error:', err.response?.data || err.message);
//       toast.error('Failed to mark order as served');
//     }
//   };

//   useEffect(() => {
//     setIsOrderFormOpen(showCart);
//   }, [showCart]);

//   useEffect(() => {
//     const onBackButton = (e) => {
//       if (currentView === 'order') {
//         e.preventDefault();
//         setCurrentView('floor');
//         setShowCart(false);
//         window.history.pushState({ view: 'floor' }, '');
//       }
//     };

//     window.addEventListener('popstate', onBackButton);
//     return () => window.removeEventListener('popstate', onBackButton);
//   }, [currentView]);

//   useEffect(() => {
//     window.history.pushState({ view: 'floor' }, '');
//   }, []);

//   useEffect(() => {
//     const fetchData = async () => {
//       if (!clientId || !token) {
//         setLoading(false);
//         return;
//       }

//       try {
//         setLoading(true);
//         await fetchTables();

//         const [catRes, itemRes] = await Promise.all([
//           axios.get(
//             `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/read_category?category_id=dietery`,
//             { headers: { Authorization: `Bearer ${token}` } }
//           ),
//           axios.get(
//             `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/read?realm=${realm}`,
//             { headers: { Authorization: `Bearer ${token}` } }
//           )
//         ]);

//         const fullTree = catRes.data.data.filter(
//           c => c.name?.toLowerCase() !== "all"
//         );

//         const subcategoryIds = new Set();
//         fullTree.forEach(cat =>
//           cat.subCategories?.forEach(sub => subcategoryIds.add(sub.id))
//         );

//         const topLevelCategories = fullTree.filter(
//           cat => !subcategoryIds.has(cat.id)
//         );

//         const flatCategories = flattenCategoryTree(topLevelCategories);

//         const enrichedItems = itemRes.data.data.map(item => {
//           const cat = flatCategories.find(c => c.id === item.category_id);
//           return { ...item, category: cat?.name || "Uncategorized" };
//         });

//         setMenuItems(enrichedItems);

//         const buildCategoryTree = () => {
//           const map = new Map();

//           flatCategories.forEach(cat => {
//             map.set(cat.id, {
//               ...cat,
//               count: enrichedItems.filter(i =>
//                 cat.name === "All Categories"
//                   ? true
//                   : i.category === cat.name
//               ).length,
//               children: []
//             });
//           });

//           const tree = [];
//           map.forEach(cat => {
//             if (cat.parentId && map.has(cat.parentId)) {
//               map.get(cat.parentId).children.push(cat);
//             } else {
//               tree.push(cat);
//             }
//           });

//           return tree;
//         };

//         const tree = buildCategoryTree().map(cat => {
//           if (cat.id === 'dietery' || cat.name?.toLowerCase() === 'dietery') {
//             return {
//               ...cat,
//               name: 'All Categories',
//               count: enrichedItems.length
//             };
//           }
//           return cat;
//         });

//         setCategories(tree);

//       } catch (err) {
//         console.error("Fetch error:", err);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchData();
//   }, [clientId, token, realm]);

//   useEffect(() => {
//     if (!activeOrderId || menuItems.length === 0 || cart.length === 0) return;

//     setCart(prev =>
//       prev.map(item => {
//         if (item.name !== 'Unnamed Item') return item;
//         const menuItem = menuItems.find(
//           mi => Number(mi.id) === Number(item.id)
//         );

//         if (!menuItem) return item;

//         return {
//           ...item,
//           name: menuItem.name,
//           unit_price: menuItem.unit_price,
//           image_id: menuItem.image_id,
//           discount: menuItem.discount || 0,
//           slug: menuItem.slug,
//           category: menuItem.category,
//         };
//       })
//     );
//   }, [menuItems, activeOrderId]);

//   useEffect(() => {
//     if (searchOpen && searchInputRef.current) {
//       const t = setTimeout(() => searchInputRef.current.focus(), 80);
//       return () => clearTimeout(t);
//     }
//   }, [searchOpen]);

//   useEffect(() => {
//     const onKey = (e) => {
//       if (e.key === 'Escape') {
//         setSearchOpen(false);
//       }
//     };
//     window.addEventListener('keydown', onKey);
//     return () => window.removeEventListener('keydown', onKey);
//   }, []);

//   const getFilteredItems = () => {
//     const q = (searchQuery || '').trim().toLowerCase();
//     let items = menuItems;

//     if (selectedCategory && selectedCategory !== 'All Categories') {
//       const allowedCategories = getCategoryAndChildrenNames(
//         categories,
//         selectedCategory
//       );
//       items = items.filter(item =>
//         allowedCategories.includes(item.category)
//       );
//     }

//     if (!q) return items;

//     return items.filter(item => {
//       const name = (item.name || '').toLowerCase();
//       const category = (item.category || '').toLowerCase();
//       const code = String(item.code || '').toLowerCase();

//       return (
//         name.includes(q) ||
//         category.includes(q) ||
//         code.includes(q)
//       );
//     });
//   };

//   const filteredItems = getFilteredItems();

//   const handleItemClick = (item) => {
//     if (item.line_item_id && Array.isArray(item.line_item_id) && item.line_item_id.length > 0) {
//       const lineItems = item.line_item_id
//         .map(id => menuItems.find(i => i.id === id))
//         .filter(Boolean);

//       setSelectedMainItem(item);
//       setLineItemsDetails(lineItems);
//       setLineItemsModalOpen(true);
//     } else {
//       addToCart(item);
//     }
//   };

//   const addToCart = (item, parentItemKey = null) => {
//     setHasNewItems(true);

//     const timestamp = Date.now() + Math.random();
//     const uniqueKey = `${item.id}_${timestamp}`;

//     let batchTimestamp = currentBatchTimestamp;

//     if (!batchTimestamp) {
//       batchTimestamp = Date.now();
//       setCurrentBatchTimestamp(batchTimestamp);

//       if (activeOrderId) {
//         localStorage.setItem(
//           `order_${activeOrderId}_batch_${batchTimestamp}`,
//           JSON.stringify({
//             timestamp: batchTimestamp,
//             started_at: Date.now(),
//           })
//         );
//       }
//     }

//     if (activeOrderId) {
//       const cartItem = {
//         id: Number(item.id),
//         name: item.name,
//         unit_price: item.unit_price || 0,
//         image_id: item.image_id,
//         discount: item.discount || 0,
//         slug: item.slug,
//         category: item.category,
//         quantity: 1,
//         note: "",
//         frontend_unique_key: uniqueKey,
//         batch_timestamp: batchTimestamp,
//         is_new_item: true,
//         parent_item_key: parentItemKey, // ✅ Track parent relationship
//         is_addon: !!parentItemKey, // ✅ Mark as addon
//       };

//       setCart(prev => [...prev, cartItem]);

//       localStorage.setItem(
//         `order_${activeOrderId}_new_item_${uniqueKey}`,
//         JSON.stringify({
//           item_id: item.id,
//           unique_key: uniqueKey,
//           added_at: timestamp,
//           batch_timestamp: batchTimestamp,
//           quantity: 1,
//           parent_item_key: parentItemKey,
//         })
//       );
//     } else {
//       const existingItem = cart.find(i => i.id === item.id && !i.frontend_unique_key && !i.parent_item_key);

//       if (existingItem && !parentItemKey) {
//         setCart(cart.map(i =>
//           i.id === item.id && !i.frontend_unique_key && !i.parent_item_key
//             ? { ...i, quantity: i.quantity + 1 }
//             : i
//         ));
//       } else {
//         const cartItem = {
//           id: Number(item.id),
//           name: item.name,
//           unit_price: item.unit_price || 0,
//           image_id: item.image_id,
//           discount: item.discount || 0,
//           slug: item.slug,
//           category: item.category,
//           quantity: 1,
//           note: "",
//           parent_item_key: parentItemKey,
//           is_addon: !!parentItemKey,
//         };
//         setCart(prev => [...prev, cartItem]);
//       }
//     }

//     if (!isMobile) setShowCart(true);
//   };

//   const clearDraftForOrder = (orderId) => {
//     if (!orderId) return;
//     Object.keys(localStorage).forEach(key => {
//       if (
//         key.startsWith(`order_${orderId}_new_item_`) ||
//         key.startsWith(`order_${orderId}_batch_`)
//       ) {
//         localStorage.removeItem(key);
//       }
//     });
//   };

//   // ✅ UPDATED: Handle adding main item with selected addons
//   const handleAddMainItemWithSelectedAddons = (selectedAddonIds) => {
//     if (!selectedMainItem) return;

//     const timestamp = Date.now() + Math.random();
//     const mainItemUniqueKey = `${selectedMainItem.id}_${timestamp}`;

//     let batchTimestamp = currentBatchTimestamp;
//     if (!batchTimestamp) {
//       batchTimestamp = Date.now();
//       setCurrentBatchTimestamp(batchTimestamp);
//     }

//     // Add main item
//     const mainCartItem = {
//       id: Number(selectedMainItem.id),
//       name: selectedMainItem.name,
//       unit_price: selectedMainItem.unit_price || 0,
//       image_id: selectedMainItem.image_id,
//       discount: selectedMainItem.discount || 0,
//       slug: selectedMainItem.slug,
//       category: selectedMainItem.category,
//       quantity: 1,
//       note: "",
//       frontend_unique_key: mainItemUniqueKey,
//       batch_timestamp: batchTimestamp,
//       is_new_item: true,
//       has_addons: selectedAddonIds.length > 0,
//     };

//     setCart(prev => [...prev, mainCartItem]);

//     // Add selected addons
//     const selectedLineItems = lineItemsDetails.filter(item => selectedAddonIds.includes(item.id));

//     selectedLineItems.forEach(addon => {
//       const addonTimestamp = Date.now() + Math.random();
//       const addonUniqueKey = `${addon.id}_${addonTimestamp}`;

//       const addonCartItem = {
//         id: Number(addon.id),
//         name: addon.name,
//         unit_price: addon.unit_price || 0,
//         image_id: addon.image_id,
//         discount: addon.discount || 0,
//         slug: addon.slug,
//         category: addon.category,
//         quantity: 1,
//         note: "",
//         frontend_unique_key: addonUniqueKey,
//         batch_timestamp: batchTimestamp,
//         is_new_item: true,
//         parent_item_key: mainItemUniqueKey, // ✅ Link to main item
//         is_addon: true,
//       };

//       setCart(prev => [...prev, addonCartItem]);
//     });

//     setLineItemsModalOpen(false);
//     setSelectedMainItem(null);
//     setLineItemsDetails([]);
//   };

//   const handleAddMainItemOnly = () => {
//     if (!selectedMainItem) return;

//     const mainItemCopy = { ...selectedMainItem };
//     const existingMainItem = cart.find(i => i.id === mainItemCopy.id);

//     if (existingMainItem) {
//       setCart(cart.map(i =>
//         i.id === mainItemCopy.id ? { ...i, quantity: i.quantity + 1 } : i
//       ));
//     } else {
//       setCart(prev => [
//         ...prev,
//         {
//           id: Number(mainItemCopy.id),
//           name: mainItemCopy.name || mainItemCopy.item_name || 'Unnamed Item',
//           unit_price: mainItemCopy.unit_price || 0,
//           image_id: mainItemCopy.image_id,
//           discount: mainItemCopy.discount || 0,
//           slug: mainItemCopy.slug,
//           category: mainItemCopy.category,
//           quantity: 1,
//           note: "",
//         }
//       ]);
//     }

//     setLineItemsModalOpen(false);
//     setSelectedMainItem(null);
//     setLineItemsDetails([]);
//   };

//   const openNoteEditor = (item) => {
//     setCurrentItemForNote(item);
//     setNoteModalOpen(true);
//   };

//   const saveNoteToItem = (noteText) => {
//     setCart(cart.map(i =>
//       i.id === currentItemForNote.id ? { ...i, note: noteText } : i
//     ));
//   };

//   const removeFromCart = (itemId, uniqueKey = null) => {
//     setHasNewItems(true);

//     if (uniqueKey) {
//       // ✅ Also remove associated addons
//       setCart(cart.filter(i =>
//         i.frontend_unique_key !== uniqueKey &&
//         i.parent_item_key !== uniqueKey
//       ));
//     } else {
//       setCart(cart.filter(i => i.id !== itemId));
//     }
//   };

//   const updateQuantity = (itemId, change, uniqueKey = null) => {
//     setHasNewItems(true);

//     setCart(cart
//       .map(item => {
//         const isMatch = uniqueKey
//           ? item.frontend_unique_key === uniqueKey
//           : item.id === itemId && !item.frontend_unique_key;

//         if (isMatch) {
//           const qty = item.quantity + change;
//           return qty > 0 ? { ...item, quantity: qty } : null;
//         }
//         return item;
//       })
//       .filter(Boolean)
//     );
//   };

//   const getTotalPrice = () => {
//     return cart.reduce((total, item) =>
//       total + ((item.unit_price || 0) * item.quantity), 0
//     ).toFixed(2);
//   };

//   const deriveOrderStatusFromItems = (items) => {
//     if (!items || items.length === 0) return "new";

//     const statuses = items.map(i => i.status);

//     if (statuses.every(s => s === "served")) return "ready";
//     if (statuses.some(s => s === "preparing")) return "preparing";
//     if (statuses.some(s => s === "pending")) return "pending";
//     return "new";
//   };


//   const handlePlaceOrder = async () => {
//     if (isPlacingRef.current || !canPlaceOrder) return;

//     isPlacingRef.current = true;
//     setIsPlacingOrder(true);

//     try {
//       const subtotal = cart.reduce(
//         (s, i) => s + (i.unit_price || 0) * i.quantity,
//         0
//       );

//       const gst = subtotal * 0.05;
//       const cst = subtotal * 0.02;
//       const total = subtotal + gst + cst;

//       const headers = { Authorization: `Bearer ${token}` };

//       if (activeOrderId) {
//         // Prepare items for backend: preserve existing item.status, new items default to pending
//         const itemsForBackend = cart.map(i => ({
//           client_id: clientId,
//           item_id: i.id,
//           order_id: activeOrderId,
//           item_name: i.name,
//           quantity: i.quantity,
//           unit_price: i.unit_price,
//           line_total: i.unit_price * i.quantity,
//           status: i.status || "pending", // ✅ preserve old item status, new items pending
//           note: i.note || "",
//           frontend_unique_key: i.frontend_unique_key || null,
//         }));

//         await axios.post(
//           `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/order_items/update?order_id=${activeOrderId}`,
//           itemsForBackend,
//           { headers }
//         );

//         // Dynamically derive order status from items
//         const derivedStatus = deriveOrderStatusFromItems(cart);

//         await axios.post(
//           `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/update`,
//           {
//             id: activeOrderId,
//             total_price: total,
//             status: derivedStatus, // ✅ dynamic order status
//           },
//           { headers }
//         );
//       }
//       else {
//         await axios.post(
//           `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/create`,
//           {
//             client_id: clientId,
//             table_id: Number(selectedTable),
//             price: subtotal,
//             gst,
//             cst,
//             total_price: total,
//             status: "pending",
//             items: cart.map(i => ({
//               item_id: i.id,
//               item_name: i.name,
//               quantity: i.quantity,
//               unit_price: i.unit_price,
//               line_total: i.unit_price * i.quantity,
//               status: "pending"
//             }))
//           },
//           { headers }
//         );
//       }

//       const tableToUpdate = tables.find(t => t.id.toString() === selectedTable);
//       if (tableToUpdate) {
//         await axios.post(
//           `${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/update`,
//           {
//             ...tableToUpdate,
//             id: Number(selectedTable),
//             status: "Occupied",
//             table_type: tableToUpdate.table_type.toString()
//           },
//           { headers }
//         );
//       }

//       await fetchTables();

//       if (activeOrderId && currentBatchTimestamp) {
//         Object.keys(localStorage).forEach(key => {
//           if (key.startsWith(`order_${activeOrderId}_batch_${currentBatchTimestamp}`)) {
//             localStorage.removeItem(key);
//           }
//         });
//       }

//       setCart([]);
//       setActiveOrderId(null);
//       setShowCart(false);
//       setCurrentView("floor");
//       setCurrentBatchTimestamp(null);
//       setHasNewItems(false);

//     } catch (err) {
//       console.error("ORDER ERROR:", err);
//       alert("Order failed");
//     } finally {
//       isPlacingRef.current = false;
//       setIsPlacingOrder(false);
//     }
//   };

//   const handleTableSelect = (table) => {
//     setSelectedTable(table.id.toString());
//     setCurrentView('order');
//     window.history.pushState({ view: 'order' }, '');
//   };

//   const handleClearCart = () => {
//     if (cart.length === 0) return;
//     setShowClearConfirm(true);
//   };

//   const confirmClearCart = () => {
//     setCart([]);
//     setSelectedTable('');
//     setShowOrderPage(false);
//     setCurrentView('floor');
//     setShowCart(false);
//     setShowClearConfirm(false);
//     setActiveOrderId(null);
//     setCurrentBatchTimestamp(null);
//     setHasNewItems(false);
//   };

//   const handleTakeawaySelect = () => {
//     setOrderMode('takeaway');
//     setSelectedTable(takeawayTableId.toString());
//     setCurrentView('order');
//     window.history.pushState({ view: 'order' }, '');
//   };

//   const handleViewOrder = async (table) => {
//     if (menuItems.length === 0) {
//       alert("Menu is still loading, please wait...");
//       return;
//     }

//     try {
//       setLoading(true);

//       const response = await axios.get(
//         `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/table`,
//         { headers: { Authorization: `Bearer ${token}` } }
//       );

//       const allOrders = response.data?.data || [];

//       const tableOrders = allOrders.filter(
//         o => o.table_id === table.id && o.status?.toLowerCase() !== 'completed'
//       );

//       if (tableOrders.length === 0) {
//         alert('No active order for this table');
//         return;
//       }

//       const activeOrder = tableOrders.sort(
//         (a, b) => new Date(b.created_at) - new Date(a.created_at)
//       )[0];

//       setActiveOrderId(activeOrder.id);
//       setHasNewItems(false);
//       setCurrentBatchTimestamp(null);

//       const batchGroups = {};

//       (activeOrder.items || []).forEach(item => {
//         const itemId = Number(item.item_id);
//         const menuItem = menuItems.find(mi => Number(mi.id) === itemId);
//         const frontendKey = item.frontend_unique_key;

//         let batchTimestamp = null;
//         if (frontendKey) {
//           const parts = frontendKey.split('_');
//           if (parts.length >= 2) {
//             const extractedTimestamp = parseFloat(parts[parts.length - 1]);
//             if (!isNaN(extractedTimestamp)) {
//               batchTimestamp = Math.floor(extractedTimestamp / 1000) * 1000;
//             }
//           }
//         }

//         const cartItem = {
//           id: itemId,
//           name: item.item_name || menuItem?.name || 'Unnamed Item',
//           unit_price: item.unit_price || menuItem?.unit_price || 0,
//           quantity: item.quantity || 1,
//           note: item.note || '',
//           image_id: menuItem?.image_id,
//           discount: menuItem?.discount || 0,
//           slug: item.slug || menuItem?.slug,
//           category: menuItem?.category,
//           frontend_unique_key: frontendKey,
//           batch_timestamp: batchTimestamp,

//           // ✅ ADD THIS
//           status: item.status || "pending"
//         };


//         const groupKey = batchTimestamp || 'original';
//         if (!batchGroups[groupKey]) {
//           batchGroups[groupKey] = [];
//         }
//         batchGroups[groupKey].push(cartItem);
//       });

//       const sortedBatches = Object.keys(batchGroups).sort((a, b) => {
//         if (a === 'original') return -1;
//         if (b === 'original') return 1;
//         return Number(a) - Number(b);
//       });

//       const reconstructedCart = [];
//       sortedBatches.forEach(batchKey => {
//         reconstructedCart.push(...batchGroups[batchKey]);
//       });

//       setCart(reconstructedCart);
//       setSelectedTable(table.id.toString());
//       setOrderMode('dinein');
//       setCurrentView('order');
//       setShowCart(true);

//       window.history.pushState({ view: 'order' }, '');
//     } catch (err) {
//       console.error(err);
//       alert('Failed to load order');
//     } finally {
//       setLoading(false);
//     }
//   };

//   // ✅ Group cart items with their addons
//   const getGroupedCartItems = (items) => {
//     const grouped = [];
//     const processedKeys = new Set();

//     items.forEach(item => {
//       if (processedKeys.has(item.frontend_unique_key || item.id)) return;

//       if (!item.is_addon) {
//         const mainItem = { ...item };
//         const addons = items.filter(i => i.parent_item_key === item.frontend_unique_key);

//         grouped.push({
//           main: mainItem,
//           addons: addons
//         });

//         processedKeys.add(item.frontend_unique_key || item.id);
//         addons.forEach(addon => processedKeys.add(addon.frontend_unique_key || addon.id));
//       }
//     });

//     return grouped;
//   };

//   const oldItems = cart.filter(i => !i.batch_timestamp);
//   const newItems = cart.filter(i => !!i.batch_timestamp);

//   const groupedNewItems = newItems.reduce((acc, item) => {
//     const batch = item.batch_timestamp || 'default';
//     if (!acc[batch]) acc[batch] = [];
//     acc[batch].push(item);
//     return acc;
//   }, {});

//   const batchTimestamps = Object.keys(groupedNewItems).sort();

//   const canPlaceOrder =
//     orderMode === 'takeaway'
//       ? cart.length > 0
//       : activeOrderId
//         ? hasNewItems
//         : selectedTable && cart.length > 0;

//   const displayTableName =
//     orderMode === 'takeaway'
//       ? tables.find(t => t.id === 500)?.table_number || 'Takeaway'
//       : tables.find(t => t.id.toString() === selectedTable)?.table_number;

//   const handleBillFromCart = (orderId) => {
//     setReturnToView('order');
//     navigate(`/saas/${clientId}/billing?orderId=${orderId || activeOrderId}&returnTo=order`);
//   };

//   const handlePrintBill = (orderId, tableId) => {
//     setReturnToView('floor');
//     navigate(`/saas/${clientId}/billing?orderId=${orderId}&returnTo=floor`);
//   };

//   const handleBackToTables = () => {
//     setCurrentView('floor');
//     setShowCart(false);
//     setSelectedTable('');
//     setCart([]);
//     setActiveOrderId(null);
//     setCurrentBatchTimestamp(null);
//     setHasNewItems(false);
//   };

//   // ✅ Cart Item Component with Addon Support
//   const CartItemWithAddons = ({ group, onUpdateQuantity, onRemove }) => {
//     const { main, addons } = group;

//     return (
//       <div className="space-y-1">
//         {/* Main Item */}
//         <div className="flex items-center gap-2 p-3 rounded-xl border bg-white shadow-sm hover:shadow transition">
//           <div className="flex items-center gap-3 flex-1 min-w-0">
//             <div className="w-12 h-12 rounded-lg overflow-hidden border bg-white shrink-0">
//               <ImagePreview
//                 clientId={clientId}
//                 imageId={main.image_id}
//                 token={token}
//                 alt={main.name}
//                 baseUrl={import.meta.env.VITE_API_DOCUMENT_SERVICE_URL}
//                 urlBuilder={({ baseUrl, clientId, imageId }) =>
//                   `${baseUrl}/${clientId}/document/download?doc_id=${imageId}`
//                 }
//                 className="w-full h-full object-cover"
//               />
//             </div>

//             <div className="min-w-0 flex-1">
//               <h4 className="text-sm font-semibold truncate text-gray-800">
//                 {main.name}
//               </h4>
//               <p className="text-xs font-bold text-action-primary">
//                 ₹{(main.unit_price - (main.discount || 0)).toFixed(2)}
//               </p>
//             </div>
//           </div>

//           <div className="flex items-center gap-1">
//             <button
//               onClick={() => onUpdateQuantity(main.id, -1, main.frontend_unique_key)}
//               className="w-7 h-7 flex items-center justify-center border rounded hover:bg-gray-100"
//             >
//               <Minus size={14} />
//             </button>

//             <span className="w-6 text-center text-sm font-semibold">
//               {main.quantity}
//             </span>

//             <button
//               onClick={() => onUpdateQuantity(main.id, 1, main.frontend_unique_key)}
//               className="w-7 h-7 flex items-center justify-center border rounded hover:bg-gray-100"
//             >
//               <Plus size={14} />
//             </button>
//           </div>

//           <button
//             onClick={() => onRemove(main.id, main.frontend_unique_key)}
//             className="text-action-primary hover:text-red-700"
//           >
//             <X size={16} />
//           </button>
//         </div>

//         {/* Addons */}
//         {addons.map(addon => (
//           <div key={addon.frontend_unique_key || addon.id} className="flex items-center gap-2 p-2 pl-8 rounded-lg border border-dashed bg-blue-50/50">
//             <div className="flex items-center gap-2 flex-1 min-w-0">
//               <span className="text-xs text-blue-600">↳</span>
//               <span className="text-sm text-gray-700 truncate">{addon.name}</span>
//             </div>
//             <span className="text-xs font-semibold text-blue-600">
//               ₹{(addon.unit_price - (addon.discount || 0)).toFixed(2)}
//             </span>
//             <span className="text-xs text-gray-500 w-6 text-center">×{addon.quantity}</span>
//           </div>
//         ))}
//       </div>
//     );
//   };

//   return (
//     <div className="bg-bg-primary p-0 h-[calc(100vh-4rem)] overflow-x-hidden overflow-y-auto">
//       {currentView === 'floor' && (
//         <TableReservation
//           tables={tables}
//           onSelectTable={handleTableSelect}
//           onSelectTakeaway={handleTakeawaySelect}
//           onSelectDineIn={() => setOrderMode('dinein')}
//           onViewOrder={handleViewOrder}
//           orderMode={orderMode}
//           tableOrders={tableOrders}
//           onPrintBill={handlePrintBill}
//           onDeleteOrder={(orderId, tableId) => {
//             setOrderToDelete({ orderId, tableId });
//             setShowDeleteConfirm(true);
//           }}
//           onMarkAsServed={handleMarkAsServed}
//         />
//       )}

//       {currentView === 'order' && (
//         <div className="mx-auto px-2 py-2">
//           <div className="grid lg:grid-cols-4 gap-1">

//             <div className="w-full lg:col-span-1">
//               <div className="lg:h-[calc(98dvh-4rem)] lg:overflow-y-auto pr-1">
//                 <CategoryTree
//                   categories={categories}
//                   selectedCategory={selectedCategory}
//                   onSelectCategory={setSelectedCategory}
//                   defaultOpenAll
//                 />
//               </div>
//             </div>

//             <div className="lg:col-span-3 flex gap-2">

//               <div className="transition-all duration-300 border-default border-border-default p-2 rounded-lg flex-1 overflow-y-auto h-[calc(98dvh-4rem)] lg:h-auto lg:max-h-[calc(98dvh-4rem)]">

//                 <div className="mb-2 flex items-center justify-between lg:flex-row flex-col gap-2">
//                   <div className="flex items-center gap-2">
//                     <button
//                       onClick={handleBackToTables}
//                       className="p-2 rounded-lg bg-bg-tertiary border border-border-default hover:bg-bg-secondary transition-colors"
//                       title="Back to table selection"
//                     >
//                       <ArrowLeft size={20} className="text-text-primary" />
//                     </button>

//                     <h2 className="text-xl lg:text-2xl font-semibold text-text-primary truncate">
//                       {selectedCategory}
//                       <span className="text-sm ml-2">({filteredItems.length})</span>
//                     </h2>
//                   </div>

//                   <div className="relative w-64 max-w-full">
//                     <Search
//                       size={16}
//                       className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
//                     />
//                     <input
//                       ref={searchInputRef}
//                       value={searchQuery}
//                       onChange={(e) => setSearchQuery(e.target.value)}
//                       placeholder="Search items..."
//                       className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border-default bg-bg-primary focus:outline-none focus:ring-2 focus:ring-action-primary"
//                     />
//                   </div>
//                 </div>

//                 <div className={`grid gap-2 grid-cols-2 md:grid-cols-4 ${isOrderFormOpen ? 'lg:grid-cols-3' : 'lg:grid-cols-4'}`}>
//                   {filteredItems.map(item => {
//                     const discountPercent =
//                       item.discount &&
//                         item.unit_price &&
//                         Number(item.discount) > 0
//                         ? ((Number(item.discount) * 100) / Number(item.unit_price))
//                           .toFixed(0)
//                         : null;

//                     // ✅ Calculate addon count
//                     const addonCount = item.line_item_id?.length || 0;

//                     return (
//                       <div onClick={() => handleItemClick(item)}
//                         key={item.id}
//                         className="flex gap-2 items-center bg-bg-primary border-default border-border-default rounded-xl p-1 shadow-sm hover:shadow-md transition cursor-pointer relative"
//                       >
//                         <div className="w-14 h-16 rounded-lg overflow-hidden shrink-0 bg-gray-100">
//                           <ImagePreview
//                             clientId={clientId}
//                             imageId={item.image_id}
//                             token={token}
//                             alt={item.name}
//                             baseUrl={import.meta.env.VITE_API_DOCUMENT_SERVICE_URL}
//                             urlBuilder={({ baseUrl, clientId, imageId }) =>
//                               `${baseUrl}/${clientId}/document/download?doc_id=${imageId}`
//                             }
//                             className="w-full h-full object-cover"
//                           />
//                         </div>

//                         <div className="flex-1 min-w-0">
//                           <h3 className="text-sm font-semibold text-text-primary line-clamp-2">
//                             {item.name}
//                           </h3>

//                           {item.description && (
//                             <p className="text-xs text-text-secondary line-clamp-1 mt-0.5">
//                               {item.description}
//                             </p>
//                           )}

//                           <div className="flex items-center gap-2 mt-1">
//                             {discountPercent ? (
//                               <>
//                                 <span className="text-sm font-bold text-action-primary">
//                                   ₹{(item.unit_price - item.discount).toFixed(0)}
//                                 </span>
//                                 <span className="text-xs line-through text-text-secondary">
//                                   ₹{item.unit_price}
//                                 </span>
//                                 <span className="text-xs text-action-danger font-semibold">
//                                   {discountPercent}% OFF
//                                 </span>
//                               </>
//                             ) : (
//                               <span className="text-sm font-bold text-action-primary">
//                                 ₹{item.unit_price}
//                               </span>
//                             )}
//                           </div>

//                           {/* ✅ Show addon badge */}
//                           {addonCount > 0 && (
//                             <div className="mt-1">
//                               <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
//                                 +{addonCount} addon{addonCount > 1 ? 's' : ''}
//                               </span>
//                             </div>
//                           )}
//                         </div>
//                       </div>
//                     );
//                   })}
//                 </div>
//               </div>

//               {!isMobile && (
//                 <div className={`transition-all duration-300 ease-in-out ${showCart ? 'w-[22rem] opacity-100 z-30' : 'w-0 opacity-0'}`}>
//                   <div className="border border-gray-300 rounded-xl bg-white">
//                     <div className="shadow-xl rounded-xl lg:h-[calc(98dvh-4rem)] flex flex-col">
//                       <div className="flex flex-col h-full p-4">

//                         <div className="pb-3 border-b space-y-2">
//                           <div className="flex items-center justify-between">
//                             <h2 className="text-lg font-semibold text-gray-800">
//                               Your Order
//                             </h2>
//                           </div>

//                           {cart.length >= 0 && (
//                             <div className="flex items-center justify-between text-sm bg-gray-50 px-3 py-2 rounded-lg">
//                               <div className="flex items-center gap-2">
//                                 {orderMode === 'dinein' && selectedTable && (
//                                   <>
//                                     <span className="font-semibold text-[18px] text-gray-700">
//                                       {tables.find(t => t.id.toString() === selectedTable)?.table_number}
//                                     </span>

//                                     <button
//                                       onClick={() => {
//                                         setOrderMode('dinein');
//                                         setSelectedTable('');
//                                         if (activeOrderId && hasNewItems) {
//                                           clearDraftForOrder(activeOrderId);
//                                         }
//                                         setActiveOrderId(null);
//                                         setCurrentBatchTimestamp(null);
//                                         setHasNewItems(false);
//                                         setShowCart(false);
//                                         setCurrentView('floor');
//                                       }}
//                                       className="text-sm text-red-600 hover:underline"
//                                     > Transfer
//                                     </button>
//                                   </>
//                                 )}
//                               </div>

//                               <span className="text-base font-bold text-red-600">
//                                 ₹{getTotalPrice()}
//                               </span>
//                             </div>
//                           )}
//                         </div>

//                         <div className="mt-3">
//                           <div className="flex bg-gray-100 rounded-lg p-1">
//                             <button
//                               onClick={() => setOrderMode('dinein')}
//                               className={`flex-1 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2
//                                 ${orderMode === 'dinein'
//                                   ? 'bg-action-primary text-text-white shadow-sm'
//                                   : 'text-gray-600 hover:text-gray-800'
//                                 }`}
//                             >
//                               <Users size={16} />
//                               Dine In
//                             </button>

//                             <button
//                               onClick={() => {
//                                 setOrderMode('takeaway');
//                                 setSelectedTable(takeawayTableId?.toString());
//                               }}
//                               className={`flex-1 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2
//                                 ${orderMode === 'takeaway'
//                                   ? 'bg-action-primary text-white shadow-sm'
//                                   : 'text-gray-600 hover:text-gray-800'
//                                 }`}
//                             >
//                               <Package size={16} />
//                               Takeaway
//                             </button>
//                           </div>
//                         </div>

//                         {cart.length === 0 ? (
//                           <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
//                             No items added
//                           </div>
//                         ) : (
//                           <>
//                             <div className="flex-1 overflow-y-auto mt-4 space-y-2">
//                               {/* ✅ Display grouped old items */}
//                               {getGroupedCartItems(oldItems).map((group, idx) => (
//                                 <CartItemWithAddons
//                                   key={`old-group-${idx}`}
//                                   group={group}
//                                   onUpdateQuantity={updateQuantity}
//                                   onRemove={removeFromCart}
//                                 />
//                               ))}

//                               {activeOrderId && newItems.length > 0 && (
//                                 <div className="flex items-center gap-2 my-2">
//                                   <div className="flex-1 h-px bg-gradient-to-r from-transparent via-orange-400 to-transparent"></div>
//                                   <span className="text-xs font-semibold text-orange-600 px-2">NEW ITEMS</span>
//                                   <div className="flex-1 h-px bg-gradient-to-r from-orange-400 via-transparent to-transparent"></div>
//                                 </div>
//                               )}

//                               {/* ✅ Display grouped new items */}
//                               {batchTimestamps.map((timestamp, batchIndex) => (
//                                 <React.Fragment key={timestamp}>
//                                   {batchIndex > 0 && (
//                                     <div className="flex items-center gap-2 my-2">
//                                       <div className="flex-1 h-px bg-gradient-to-r from-transparent via-orange-400 to-transparent"></div>
//                                       <span className="text-xs font-semibold text-orange-600 px-2">NEW ITEMS</span>
//                                       <div className="flex-1 h-px bg-gradient-to-r from-orange-400 via-transparent to-transparent"></div>
//                                     </div>
//                                   )}

//                                   {getGroupedCartItems(groupedNewItems[timestamp]).map((group, idx) => (
//                                     <div key={`new-group-${timestamp}-${idx}`} className="space-y-1">
//                                       {/* Main Item */}
//                                       <div className="flex items-center gap-2 p-3 rounded-xl border bg-orange-50 shadow-sm hover:shadow transition">
//                                         <div className="flex items-center gap-3 flex-1 min-w-0">
//                                           <div className="w-12 h-12 rounded-lg overflow-hidden border bg-white shrink-0">
//                                             <ImagePreview
//                                               clientId={clientId}
//                                               imageId={group.main.image_id}
//                                               token={token}
//                                               alt={group.main.name}
//                                               baseUrl={import.meta.env.VITE_API_DOCUMENT_SERVICE_URL}
//                                               urlBuilder={({ baseUrl, clientId, imageId }) =>
//                                                 `${baseUrl}/${clientId}/document/download?doc_id=${imageId}`
//                                               }
//                                               className="w-full h-full object-cover"
//                                             />
//                                           </div>

//                                           <div className="min-w-0 flex-1">
//                                             <h4 className="text-sm font-semibold truncate text-gray-800">
//                                               {group.main.name}
//                                             </h4>
//                                             <p className="text-xs font-bold text-action-primary">
//                                               ₹{(group.main.unit_price - (group.main.discount || 0)).toFixed(2)}
//                                             </p>
//                                           </div>
//                                         </div>

//                                         <div className="flex items-center gap-1">
//                                           <button
//                                             onClick={() => updateQuantity(group.main.id, -1, group.main.frontend_unique_key)}
//                                             className="w-7 h-7 flex items-center justify-center border rounded hover:bg-gray-100"
//                                           >
//                                             <Minus size={14} />
//                                           </button>

//                                           <span className="w-6 text-center text-sm font-semibold">
//                                             {group.main.quantity}
//                                           </span>

//                                           <button
//                                             onClick={() => updateQuantity(group.main.id, 1, group.main.frontend_unique_key)}
//                                             className="w-7 h-7 flex items-center justify-center border rounded hover:bg-gray-100"
//                                           >
//                                             <Plus size={14} />
//                                           </button>
//                                         </div>

//                                         <button
//                                           onClick={() => removeFromCart(group.main.id, group.main.frontend_unique_key)}
//                                           className="text-action-primary hover:text-red-700"
//                                         >
//                                           <X size={16} />
//                                         </button>
//                                       </div>

//                                       {/* Addons */}
//                                       {group.addons.map(addon => (
//                                         <div key={addon.frontend_unique_key} className="flex items-center gap-2 p-2 pl-8 rounded-lg border border-dashed bg-orange-100/50">
//                                           <div className="flex items-center gap-2 flex-1 min-w-0">
//                                             <span className="text-xs text-orange-600">↳</span>
//                                             <span className="text-sm text-gray-700 truncate">{addon.name}</span>
//                                           </div>
//                                           <span className="text-xs font-semibold text-orange-600">
//                                             ₹{(addon.unit_price - (addon.discount || 0)).toFixed(2)}
//                                           </span>
//                                           <span className="text-xs text-gray-500 w-6 text-center">×{addon.quantity}</span>
//                                         </div>
//                                       ))}
//                                     </div>
//                                   ))}
//                                 </React.Fragment>
//                               ))}
//                             </div>

//                             <div className="grid grid-cols-2 gap-2 mt-3">
//                               <button
//                                 onClick={handlePlaceOrder}
//                                 className={`py-2 rounded-lg text-sm font-semibold
//                                   ${canPlaceOrder && !isPlacingOrder
//                                     ? 'bg-action-primary text-text-white hover:bg-action-danger'
//                                     : 'bg-gray-300 cursor-not-allowed'
//                                   }`}
//                                 disabled={!canPlaceOrder || isPlacingOrder}
//                               >
//                                 {isPlacingOrder ? 'Placing...' : 'Place Order'}
//                               </button>

//                               <button
//                                 onClick={() => handleBillFromCart(activeOrderId)}
//                                 className="py-2 rounded-lg text-sm font-semibold bg-green-600 text-white hover:bg-green-700 flex items-center justify-center gap-1"
//                               >
//                                 <FileText size={16} />
//                                 Bill
//                               </button>

//                               <button
//                                 onClick={handleClearCart}
//                                 className="py-2 border rounded-lg text-sm hover:bg-gray-100"
//                               >
//                                 Clear
//                               </button>

//                               <button
//                                 onClick={() => toast.info('Print KOT feature coming soon')}
//                                 className="py-2 border rounded-lg text-sm hover:bg-gray-100 flex items-center justify-center gap-1"
//                                 title="Print KOT (Kitchen Order Ticket)"
//                               >
//                                 <PrinterIcon size={16} />
//                                 Print KOT
//                               </button>
//                             </div>
//                           </>
//                         )}
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>
//       )}

//       {isMobile && showCart && (
//         <div className="fixed inset-0 z-50 flex justify-end bg-color-modalsbg animate-fade-in">
//           <div className="w-full md:w-96 lg:w-[28rem] h-full overflow-y-auto bg-bg-primary animate-slide-in-right">
//             <div className="p-4 lg:p-6">
//               <div className="flex justify-between items-center mb-6">
//                 <h2 className="text-xl lg:text-2xl font-bold text-text-primary">Your Order</h2>
//                 <button onClick={() => setShowCart(false)} className="p-1.5 rounded-lg bg-action-primary text-text-white hover:opacity-90 transition-opacity">
//                   <X className='h-5 w-5' />
//                 </button>
//               </div>

//               {orderPlaced ? (
//                 <div className="text-center py-12 animate-scale-in">
//                   <div className="rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4 bg-action-success">
//                     <Check size={40} className='text-bg-primary' />
//                   </div>
//                   <h3 className="text-xl font-semibold mb-2 text-action-success">Order Placed!</h3>
//                   <p className='text-text-secondary'>Your order has been successfully placed.</p>
//                 </div>
//               ) : (
//                 <>
//                   <div className="mb-6 p-4 rounded-lg bg-bg-tertiary border-border-default">
//                     <div className="mb-4">
//                       <div className="flex gap-2 p-1 bg-bg-tertiary rounded-lg">
//                         <button
//                           onClick={() => setOrderMode('dinein')}
//                           className={`flex-1 px-4 py-2.5 rounded-md transition-all flex items-center justify-center gap-2 font-medium ${orderMode === 'dinein'
//                             ? 'bg-action-primary text-text-white shadow-sm'
//                             : 'text-text-secondary'
//                             }`}
//                         >
//                           <Users size={18} />
//                           Dine In
//                         </button>

//                         <button
//                           onClick={() => {
//                             setOrderMode('takeaway');
//                             setSelectedTable(takeawayTableId?.toString());
//                           }}
//                           className={`flex-1 px-4 py-2.5 rounded-md transition-all flex items-center justify-center gap-2 font-medium ${orderMode === 'takeaway'
//                             ? 'bg-action-primary text-text-white shadow-sm'
//                             : 'text-text-secondary'
//                             }`}
//                         >
//                           <Package size={18} />
//                           Takeaway
//                         </button>
//                       </div>
//                     </div>
//                     {selectedTable && (
//                       <div className="mb-3 flex justify-between items-center">
//                         <span className="font-semibold text-gray-800">
//                           {displayTableName}
//                         </span>

//                         <button
//                           onClick={() => {
//                             setCurrentView('floor');
//                             setShowCart(false);
//                           }}
//                           className="text-xs text-action-danger"
//                         >
//                           Change
//                         </button>
//                       </div>
//                     )}
//                   </div>

//                   <div className="space-y-4 mb-6 max-h-[calc(100vh-4rem)] overflow-y-auto">
//                     {/* Mobile view with grouped items */}
//                     {getGroupedCartItems(oldItems).map((group, idx) => (
//                       <div key={`mobile-old-${idx}`} className="space-y-2">
//                         <div className="flex items-center space-x-3 p-3 lg:p-4 rounded-lg bg-bg-tertiary border-border-default animate-slide-up">
//                           <div className="w-16 h-16 rounded-md overflow-hidden flex-shrink-0">
//                             <ImagePreview
//                               clientId={clientId}
//                               imageId={group.main.image_id}
//                               token={token}
//                               alt={group.main.name}
//                               baseUrl={import.meta.env.VITE_API_DOCUMENT_SERVICE_URL}
//                               urlBuilder={({ baseUrl, clientId, imageId }) =>
//                                 `${baseUrl}/${clientId}/document/download?doc_id=${imageId}`
//                               }
//                               className="w-full h-full object-cover"
//                             />
//                           </div>

//                           <div className="flex-1 min-w-0">
//                             <h4 className="font-semibold text-sm lg:text-base truncate flex items-center gap-2 text-text-primary">
//                               {group.main.name}
//                               {group.main.note && (
//                                 <button
//                                   onClick={() => openNoteEditor(group.main)}
//                                   title="Has note" className='text-action-primary hover:scale-110 transition-transform'>
//                                   <StickyNote size={16} />
//                                 </button>
//                               )}
//                             </h4>
//                             <p className='text-action-primary font-bold'>₹{group.main.unit_price?.toFixed(2)}</p>
//                             {!group.main.note && (
//                               <button
//                                 onClick={() => openNoteEditor(group.main)}
//                                 className="text-xs mt-1 text-text-secondary hover:text-action-primary transition-colors">
//                                 + Add note
//                               </button>
//                             )}
//                           </div>
//                           <div className="flex items-center space-x-2">
//                             <button
//                               onClick={() => updateQuantity(group.main.id, -1, null)}
//                               className="p-1 rounded bg-bg-primary border-border-default hover:bg-bg-secondary transition-colors"
//                             >
//                               <Minus size={16} />
//                             </button>
//                             <span className="w-8 text-center font-semibold text-text-primary">{group.main.quantity}</span>
//                             <button
//                               onClick={() => updateQuantity(group.main.id, 1, null)}
//                               className="p-1 rounded bg-bg-primary border-border-default hover:bg-bg-secondary transition-colors">
//                               <Plus size={16} />
//                             </button>
//                           </div>
//                           <button
//                             onClick={() => removeFromCart(group.main.id, null)}
//                             title="Remove item" className='text-action-danger hover:scale-110 transition-transform'>
//                             <X size={20} />
//                           </button>
//                         </div>

//                         {group.addons.map(addon => (
//                           <div key={addon.frontend_unique_key || addon.id} className="flex items-center gap-2 p-2 pl-8 ml-4 rounded-lg border border-dashed bg-blue-50/50">
//                             <span className="text-xs text-blue-600">↳</span>
//                             <span className="text-sm text-gray-700 flex-1">{addon.name}</span>
//                             <span className="text-xs font-semibold text-blue-600">₹{addon.unit_price?.toFixed(2)}</span>
//                           </div>
//                         ))}
//                       </div>
//                     ))}

//                     {activeOrderId && newItems.length > 0 && (
//                       <div className="flex items-center gap-2 my-3">
//                         <div className="flex-1 h-px bg-gradient-to-r from-transparent via-orange-500 to-transparent"></div>
//                         <span className="text-sm font-bold text-orange-600 px-3">NEW ITEMS</span>
//                         <div className="flex-1 h-px bg-gradient-to-r from-orange-500 via-transparent to-transparent"></div>
//                       </div>
//                     )}

//                     {batchTimestamps.map((timestamp, batchIndex) => (
//                       <React.Fragment key={`mobile-batch-${timestamp}`}>
//                         {batchIndex > 0 && (
//                           <div className="flex items-center gap-2 my-3">
//                             <div className="flex-1 h-px bg-gradient-to-r from-transparent via-orange-500 to-transparent"></div>
//                             <span className="text-sm font-bold text-orange-600 px-3">NEW ITEMS</span>
//                             <div className="flex-1 h-px bg-gradient-to-r from-orange-500 via-transparent to-transparent"></div>
//                           </div>
//                         )}

//                         {getGroupedCartItems(groupedNewItems[timestamp]).map((group, idx) => (
//                           <div key={`mobile-new-${timestamp}-${idx}`} className="space-y-2">
//                             <div className="flex items-center space-x-3 p-3 lg:p-4 rounded-lg bg-orange-50 border border-orange-200 animate-slide-up">
//                               <div className="w-16 h-16 rounded-md overflow-hidden flex-shrink-0">
//                                 <ImagePreview
//                                   clientId={clientId}
//                                   imageId={group.main.image_id}
//                                   token={token}
//                                   alt={group.main.name}
//                                   baseUrl={import.meta.env.VITE_API_DOCUMENT_SERVICE_URL}
//                                   urlBuilder={({ baseUrl, clientId, imageId }) =>
//                                     `${baseUrl}/${clientId}/document/download?doc_id=${imageId}`
//                                   }
//                                   className="w-full h-full object-cover"
//                                 />
//                               </div>

//                               <div className="flex-1 min-w-0">
//                                 <h4 className="font-semibold text-sm lg:text-base truncate flex items-center gap-2 text-text-primary">
//                                   {group.main.name}
//                                 </h4>
//                                 <p className='text-action-primary font-bold'>₹{group.main.unit_price?.toFixed(2)}</p>
//                               </div>
//                               <div className="flex items-center space-x-2">
//                                 <button
//                                   onClick={() => updateQuantity(group.main.id, -1, group.main.frontend_unique_key)}
//                                   className="p-1 rounded bg-bg-primary border-border-default hover:bg-bg-secondary transition-colors"
//                                 >
//                                   <Minus size={16} />
//                                 </button>
//                                 <span className="w-8 text-center font-semibold text-text-primary">{group.main.quantity}</span>
//                                 <button
//                                   onClick={() => updateQuantity(group.main.id, 1, group.main.frontend_unique_key)}
//                                   className="p-1 rounded bg-bg-primary border-border-default hover:bg-bg-secondary transition-colors">
//                                   <Plus size={16} />
//                                 </button>
//                               </div>
//                               <button
//                                 onClick={() => removeFromCart(group.main.id, group.main.frontend_unique_key)}
//                                 title="Remove item" className='text-action-danger hover:scale-110 transition-transform'>
//                                 <X size={20} />
//                               </button>
//                             </div>

//                             {group.addons.map(addon => (
//                               <div key={addon.frontend_unique_key} className="flex items-center gap-2 p-2 pl-8 ml-4 rounded-lg border border-dashed bg-orange-100/50">
//                                 <span className="text-xs text-orange-600">↳</span>
//                                 <span className="text-sm text-gray-700 flex-1">{addon.name}</span>
//                                 <span className="text-xs font-semibold text-orange-600">₹{addon.unit_price?.toFixed(2)}</span>
//                               </div>
//                             ))}
//                           </div>
//                         ))}
//                       </React.Fragment>
//                     ))}
//                   </div>

//                   <div className="border-t pt-4 mb-6 border-border-default">
//                     <div className="flex justify-between items-center text-xl font-bold">
//                       <span className='text-text-primary'>Total:</span>
//                       <span className='text-action-primary font-bold'>₹{getTotalPrice()}</span>
//                     </div>
//                   </div>

//                   <button
//                     onClick={handlePlaceOrder}
//                     disabled={!canPlaceOrder || isPlacingOrder}
//                     className={`w-full py-3 rounded-lg font-semibold transition-all
//                       ${canPlaceOrder && !isPlacingOrder
//                         ? 'bg-action-primary text-text-white hover:shadow-lg'
//                         : 'bg-border-default text-text-primary cursor-not-allowed'
//                       }`}
//                   >
//                     {isPlacingOrder ? "Placing Order..." : "Place Order"}
//                   </button>

//                   {orderMode === 'dinein' && !selectedTable && cart.length > 0 && (
//                     <p className="text-sm text-center mt-2 text-action-danger">
//                       Select a table
//                     </p>
//                   )}
//                 </>
//               )}
//             </div>
//           </div>
//         </div>
//       )}

//       {showClearConfirm && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
//           <div className="bg-white rounded-lg p-6 w-80 shadow-xl animate-scale-in">
//             <h3 className="text-lg font-semibold mb-4 text-gray-800">
//               Clear all items?
//             </h3>
//             <p className="text-sm text-gray-600 mb-5">
//               This will remove all items from the order.
//             </p>

//             <div className="flex gap-3">
//               <button
//                 onClick={() => setShowClearConfirm(false)}
//                 className="flex-1 py-2 border rounded-lg hover:bg-gray-100"
//               >
//                 Cancel
//               </button>

//               <button
//                 onClick={confirmClearCart}
//                 className="flex-1 py-2 bg-action-primary text-white rounded-lg hover:bg-action-danger"
//               >
//                 Clear
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {cart.length > 0 && !showCart && (
//         <button
//           onClick={() => setShowCart(true)}
//           className="fixed bottom-6 right-6 bg-action-primary text-white p-4 rounded-full shadow-lg z-40"
//         >
//           <ShoppingCart size={24} />
//         </button>
//       )}

//       <LineItemsModal
//         isOpen={lineItemsModalOpen}
//         onClose={() => {
//           setLineItemsModalOpen(false);
//           setSelectedMainItem(null);
//           setLineItemsDetails([]);
//         }}
//         mainItem={selectedMainItem}
//         lineItems={lineItemsDetails}
//         onAddMainOnly={handleAddMainItemOnly}
//         onAddWithSelectedAddons={handleAddMainItemWithSelectedAddons}
//       />

//       <NoteModal
//         isOpen={noteModalOpen}
//         onClose={() => {
//           setNoteModalOpen(false);
//           setCurrentItemForNote(null);
//         }}
//         itemName={currentItemForNote?.name}
//       />

//       <DeleteConfirmModal
//         isOpen={showDeleteConfirm}
//         onClose={() => {
//           setShowDeleteConfirm(false);
//           setOrderToDelete(null);
//         }}
//         onConfirm={() => {
//           if (orderToDelete) {
//             handleDeleteOrder(orderToDelete.orderId, orderToDelete.tableId);
//           }
//         }}
//       />
//     </div>
//   );
// };

// export default TakeOrder;








// import React, { useState, useEffect, useRef } from 'react';
// import { ShoppingCart, Plus, Minus, X, Check, StickyNote, Search, Users, Package, Trash2, ArrowLeft, FileText, Printer as PrinterIcon, Clock } from 'lucide-react';
// import axios from 'axios';
// import CategoryTree from '../InventoryServices/CategoryTree';
// import ImagePreview from '../../utils/ImagePreview';
// import { Eye, Lock, Printer } from 'lucide-react';
// import { useNavigate } from 'react-router-dom';
// import { toast } from 'react-toastify';
// import InvoiceModal from '../BillingServices/InvoiceModal';
// import { getMenuConfig } from '../../utils/menuConfigResolver';

// const TABLE_STATUS_CONFIG = {
//   vacant: {
//     clickable: true,
//     bg: 'bg-action-success',
//     border: 'border-border-default',
//     badge: 'bg-green-100 text-action-success',
//     icon: null,
//   },
//   available: {
//     clickable: true,
//     bg: 'bg-action-success',
//     border: 'border-border-default',
//     badge: 'bg-green-100 text-green-700',
//     icon: null,
//   },
//   occupied: {
//     clickable: false,
//     bg: 'bg-action-primary',
//     border: 'border-action-primary',
//     badge: 'bg-red-100 text-action-primary',
//     icon: Eye,
//     viewable: true,
//   },
//   served: {
//     clickable: false,
//     bg: 'bg-blue-50',
//     border: 'border-blue-400',
//     badge: 'bg-blue-100 text-blue-700',
//     icon: Eye,
//     viewable: true,
//   },
//   reserved: {
//     clickable: false,
//     bg: 'bg-yellow-50',
//     border: 'border-yellow-400',
//     badge: 'bg-yellow-100 text-yellow-700',
//     icon: Lock,
//   },
// };

// const TableReservation = ({
//   tables = [],
//   orderMode = "dinein",
//   onSelectTable,
//   onSelectTakeaway,
//   onSelectDineIn,
//   onViewOrder,
//   tableOrders = {},
//   onPrintBill,
//   onDeleteOrder,
//   onMarkAsServed,
// }) => {
//   const [selectedSections, setSelectedSections] = useState([]);
//   const [selectedZones, setSelectedZones] = useState([]);
//   const [currentTime, setCurrentTime] = useState(Date.now());
//   const getZone = (t) => t.location_zone?.trim() || "Unassigned";
//   const getSection = (t) => t.section?.trim() || "Other";


//   const zonesFromDB = [
//     ...new Set(
//       tables
//         .map(t => t.location_zone)
//         .filter(z => z !== null && z !== undefined && z !== "")
//     )
//   ];

//   const sectionsFromDB = [
//     ...new Set(
//       tables
//         .map(t => t.section)
//         .filter(s => s !== null && s !== undefined && s !== "")
//     )
//   ];

//   useEffect(() => {
//     const interval = setInterval(() => {
//       setCurrentTime(Date.now());
//     }, 1000);
//     return () => clearInterval(interval);
//   }, []);

//   const toggleFilter = (value, list, setList) => {
//     setList(prev =>
//       prev.includes(value)
//         ? prev.filter(v => v !== value)
//         : [...prev, value]
//     );
//   };

//   const uniqueZones = [...new Set(tables.map(t => t.location_zone))];

//   const getSectionsByZone = (zone) => {
//     return [
//       ...new Set(
//         filteredTables
//           .filter(t => getZone(t) === zone)
//           .map(t => getSection(t))
//       )
//     ];
//   };


//   const filteredTables = tables.filter(t => {
//     const zone = getZone(t);
//     const section = getSection(t);


//     const zoneMatch =
//       selectedZones.length === 0 || selectedZones.includes(zone);

//     const sectionMatch =
//       selectedSections.length === 0 || selectedSections.includes(section);

//     return zoneMatch && sectionMatch;
//   });


//   const visibleZones = [
//     ...new Set(
//       filteredTables.map(t => getZone(t))
//     )
//   ];

//   const calculateElapsedTime = (createdAt) => {
//     if (!createdAt) return null;

//     let created;

//     if (typeof createdAt === "string") {
//       // Convert to proper ISO UTC format
//       const utcString =
//         createdAt.replace(" ", "T").split(".")[0] + "Z";

//       created = new Date(utcString).getTime();
//     } else {
//       created = new Date(createdAt).getTime();
//     }

//     const diffMs = Date.now() - created;

//     if (diffMs < 0) return "Just now";

//     const seconds = Math.floor(diffMs / 1000);
//     const minutes = Math.floor(seconds / 60);
//     const hours = Math.floor(minutes / 60);
//     const days = Math.floor(hours / 24);

//     if (seconds < 60) return "Just now";
//     if (minutes === 1) return "1 min ago";
//     if (minutes < 60) return `${minutes} mins ago`;
//     if (hours === 1) return "1 hr ago";
//     if (hours < 24) return `${hours} hrs ago`;
//     if (days === 1) return "1 day ago";

//     return `${days} days ago`;
//   };


//   return (
//     <div className="p-4 bg-bg-primary overflow-y-auto h-[calc(100vh-4rem)]">
//       {/* FILTER BAR */}
//       <div className="mb-3 sticky top-0 z-10 bg-bg-primary">
//         <div className="flex flex-wrap gap-2 p-2 rounded-xl border border-border-default bg-bg-tertiary">
//           <div className="flex flex-wrap items-center gap-2 p-2 rounded-xl">
//             <button
//               onClick={() => {
//                 setSelectedSections([]);
//                 setSelectedZones([]);
//               }}
//               className={`px-3 py-1 rounded-full text-xs font-semibold transition
//                 ${selectedSections.length === 0 && selectedZones.length === 0
//                   ? "bg-action-primary text-white"
//                   : "bg-white text-text-secondary hover:bg-gray-100"}`}
//             >
//               All
//             </button>

//             <div className="w-px bg-border-default mx-1" />

//             {sectionsFromDB.map(sec => (
//               <button
//                 key={sec}
//                 onClick={() => toggleFilter(sec, selectedSections, setSelectedSections)}
//                 className={`px-3 py-1 rounded-full text-xs font-semibold transition
//       ${selectedSections.includes(sec)
//                     ? "bg-action-primary text-white"
//                     : "bg-white text-text-secondary hover:bg-gray-100"}`}
//               >
//                 {sec}
//               </button>
//             ))}



//             <div className="w-px bg-border-default mx-1" />

//             {zonesFromDB.map(zone => (
//               <button
//                 key={zone}
//                 onClick={() => toggleFilter(zone, selectedZones, setSelectedZones)}
//                 className={`px-3 py-1 rounded-full text-xs font-semibold transition
//       ${selectedZones.includes(zone)
//                     ? "bg-action-primary text-white"
//                     : "bg-white text-text-secondary hover:bg-gray-100"}`}
//               >
//                 {zone}
//               </button>
//             ))}


//           </div>

//           <div className="ml-auto flex bg-bg-primary border-2 rounded-full border-action-primary p-1 shadow-sm">
//             <button
//               onClick={onSelectDineIn}
//               className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all
//                 ${orderMode === "dinein"
//                   ? "bg-action-primary text-text-white shadow"
//                   : "text-text-secondary hover:bg-gray-100"}`}
//             >
//               Dine In
//             </button>

//             <button
//               onClick={onSelectTakeaway}
//               className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all flex items-center gap-1
//                 ${orderMode === "takeaway"
//                   ? "bg-orange-500 text-white shadow"
//                   : "text-gray-600 hover:bg-gray-100"}`}
//             >
//               <Package size={12} />
//               Takeaway
//             </button>
//           </div>
//         </div>
//       </div>

//       {/* TABLE GRID */}
//       {orderMode === "dinein" && visibleZones.map(zone => {
//         const sections = getSectionsByZone(zone);

//         return (
//           <div key={zone} className="mb-10">
//             <h3 className="text-xl font-bold mb-4 text-gray-800">
//               {zone}
//             </h3>

//             {sections.map(section => (
//               <div key={section} className="mb-6">
//                 <div className="flex items-center gap-2 mb-3">
//                   <span className="text-sm font-semibold px-3 py-1 rounded-full bg-gray-200">
//                     {section}
//                   </span>
//                 </div>

//                 <div className="grid gap-6 grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-5">
//                   {filteredTables
//                     .filter(t => getZone(t) === zone && getSection(t) === section)
//                     .map(table => {
//                       const statusKey = table.status?.toLowerCase();
//                       const config = TABLE_STATUS_CONFIG[statusKey] || TABLE_STATUS_CONFIG.vacant;
//                       const orderInfo = tableOrders[table.id];

//                       const hasViewableOrder = (statusKey === 'occupied' || statusKey === 'served') && orderInfo;
//                       const elapsedTime = orderInfo?.created_at ? calculateElapsedTime(orderInfo.created_at) : null;

//                       return (
//                         <div
//                           key={table.id}
//                           className="rounded-xl overflow-hidden border shadow-sm hover:shadow-md transition bg-white"
//                         >
//                           <div
//                             onClick={() => {
//                               if (config.clickable) {
//                                 onSelectTable(table);
//                               } else if (hasViewableOrder && onViewOrder) {
//                                 onViewOrder(table);
//                               }
//                             }}
//                             className={`${config.clickable || hasViewableOrder ? 'cursor-pointer' : ''}`}
//                           >
//                             <div className="flex justify-between px-3 py-2 bg-action-primary text-white">
//                               <span className="font-bold text-xl tracking-wide">
//                                 {table.table_number}
//                               </span>

//                               {hasViewableOrder && (
//                                 <span
//                                   className={`text-xl px-2 py-0.5 rounded-full font-semibold
//                                     ${orderInfo.status === 'pending' ? 'bg-orange-100 text-orange-700' :
//                                       orderInfo.status === 'preparing' ? 'bg-blue-100 text-blue-700' :
//                                         orderInfo.status === 'ready' ? 'bg-green-100 text-green-700' :
//                                           orderInfo.status === 'served' ? 'bg-purple-100 text-purple-700' :
//                                             'bg-gray-100 text-gray-700'}
//                                   `}
//                                 >
//                                   {orderInfo.status?.toUpperCase()}
//                                 </span>
//                               )}

//                               {hasViewableOrder && (
//                                 <div className="text-xl opacity-90 mt-1">
//                                   #{orderInfo.id}
//                                 </div>
//                               )}
//                             </div>

//                             <div className={`p-6 flex justify-between  ${statusKey === 'occupied' ? 'text-blue-600 bg-blue-200' :
//                               statusKey === 'served' ? 'text-purple-600 bg-purple-50' :
//                                 statusKey === 'reserved' ? 'text-yellow-600 bg-yellow-50' :
//                                   'text-green-600 bg-green-200'} `}>
//                               {statusKey === 'vacant' && <span className="text-2xl">-</span>}
//                               {(statusKey === 'occupied' || statusKey === 'served') && <Eye size={28} className="text-blue-600" />}

//                               {hasViewableOrder && (
//                                 <>
//                                   <button
//                                     onClick={(e) => {
//                                       e.stopPropagation();
//                                       if (onPrintBill) {
//                                         onPrintBill(orderInfo.id, table.id);
//                                       }
//                                     }}
//                                     className="text-yellow-600 hover:scale-110 transition-transform"
//                                     title="Print Bill"
//                                   >
//                                     <Printer size={28} />
//                                   </button>

//                                   <button
//                                     onClick={(e) => {
//                                       e.stopPropagation();
//                                       if (onDeleteOrder) {
//                                         onDeleteOrder(orderInfo.id, table.id);
//                                       }
//                                     }}
//                                     className="text-red-600 hover:scale-110 transition-transform"
//                                     title="Delete Order"
//                                   >
//                                     <Trash2 size={28} />
//                                   </button>
//                                 </>
//                               )}
//                               {statusKey === 'reserved' && <Lock size={28} className="text-yellow-600" />}
//                             </div>

//                             {hasViewableOrder && elapsedTime && (
//                               <div className="px-3 py-2 bg-gray-50 border-t border-gray-200">
//                                 <div className="flex items-center justify-center gap-2 text-sm font-semibold text-gray-700">
//                                   <Clock size={16} className="text-orange-600" />
//                                   <span>{elapsedTime}</span>
//                                 </div>
//                               </div>
//                             )}
//                           </div>

//                           {hasViewableOrder && orderInfo.status === 'ready' && (
//                             <button
//                               onClick={(e) => {
//                                 e.stopPropagation();
//                                 if (onMarkAsServed) {
//                                   onMarkAsServed(orderInfo.id, table.id);
//                                 }
//                               }}
//                               className="w-full px-4 py-2 bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors"
//                             >
//                               Mark as Served
//                             </button>
//                           )}
//                         </div>
//                       );
//                     })}
//                 </div>
//               </div>
//             ))}
//           </div>
//         );
//       })}

//       {orderMode === "takeaway" && (
//         <div className="text-center mt-10 text-gray-500 text-sm">
//           Takeaway selected. Opening menu…
//         </div>
//       )}
//     </div>
//   );
// };

// const NoteModal = ({ isOpen, onClose, itemName }) => {
//   if (!isOpen) return null;

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
//       <div className="rounded-lg max-w-md w-full p-6" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
//         <h3 className="text-xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
//           Add Note for {itemName}
//         </h3>

//         <div className="flex gap-3 mt-4">
//           <button
//             onClick={onClose}
//             className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
//             style={{
//               borderColor: 'var(--color-border-default)',
//               backgroundColor: 'transparent',
//               color: 'var(--color-text-primary)',
//             }}
//           >
//             Cancel
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// const LineItemsModal = ({ isOpen, onClose, mainItem, lineItems, onAddWithSelectedAddons, onAddMainOnly }) => {
//   const [selectedAddons, setSelectedAddons] = useState([]);

//   useEffect(() => {
//     if (isOpen) {
//       setSelectedAddons([]);
//     }
//   }, [isOpen]);

//   const toggleAddon = (addonId) => {
//     setSelectedAddons(prev =>
//       prev.includes(addonId)
//         ? prev.filter(id => id !== addonId)
//         : [...prev, addonId]
//     );
//   };

//   if (!isOpen) return null;

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-color-modalsbg">
//       <div className="rounded-lg max-w-lg w-full p-6 bg-bg-primary max-h-[80vh] overflow-y-auto">
//         <h3 className="text-xl font-semibold mb-2 text-text-primary">{mainItem?.name}</h3>
//         <p className="mb-4 text-text-secondary">Select add-ons you want:</p>

//         <div className="space-y-2 mb-6">
//           {lineItems.map((item, index) => (
//             <div
//               key={item.id}
//               onClick={() => toggleAddon(item.id)}
//               className={`flex justify-between items-center p-3 rounded-lg cursor-pointer transition-all ${selectedAddons.includes(item.id)
//                 ? 'bg-action-primary/10 border-2 border-action-primary'
//                 : 'bg-bg-tertiary border border-border-default hover:border-action-primary/50'
//                 }`}
//             >
//               <div className="flex items-center gap-3 flex-1">
//                 <div
//                   className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${selectedAddons.includes(item.id)
//                     ? 'bg-action-primary border-action-primary'
//                     : 'border-gray-300'
//                     }`}
//                 >
//                   {selectedAddons.includes(item.id) && (
//                     <Check size={14} className="text-white" />
//                   )}
//                 </div>
//                 <span className="text-text-primary font-medium">{item.name}</span>
//               </div>
//               <span className="font-semibold text-action-primary">₹{item.unit_price}</span>
//             </div>
//           ))}
//         </div>

//         {selectedAddons.length > 0 && (
//           <div className="mb-4 p-3 bg-blue-50 rounded-lg">
//             <p className="text-sm text-blue-800">
//               <span className="font-semibold">{selectedAddons.length}</span> add-on{selectedAddons.length > 1 ? 's' : ''} selected
//             </p>
//           </div>
//         )}

//         <div className="flex gap-3">
//           <button
//             onClick={onClose}
//             className="flex-1 px-4 py-2 rounded-lg transition-colors border-border-default bg-bg-tertiary text-text-primary hover:bg-gray-100"
//           >
//             Cancel
//           </button>
//           <button
//             onClick={onAddMainOnly}
//             className="flex-1 px-4 py-2 rounded-lg transition-colors bg-gray-600 text-white hover:bg-gray-700"
//           >
//             Main Only
//           </button>
//           <button
//             onClick={() => onAddWithSelectedAddons(selectedAddons)}
//             disabled={selectedAddons.length === 0}
//             className={`flex-1 px-4 py-2 rounded-lg transition-colors ${selectedAddons.length > 0
//               ? 'bg-action-primary text-text-white hover:bg-action-danger'
//               : 'bg-gray-300 text-gray-500 cursor-not-allowed'
//               }`}
//           >
//             Add ({selectedAddons.length})
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// const DeleteConfirmModal = ({ isOpen, onClose, onConfirm }) => {
//   if (!isOpen) return null;

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
//       <div className="rounded-lg w-full max-w-sm bg-white shadow-xl">
//         <div className="px-6 py-4 border-b flex justify-between items-center">
//           <h2 className="text-lg font-bold text-red-600">Delete Order</h2>
//           <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
//             <X size={20} />
//           </button>
//         </div>
//         <div className="px-6 py-5">
//           <p className="text-sm text-gray-700">
//             Are you sure you want to delete this order? This action cannot be undone.
//           </p>
//         </div>
//         <div className="px-6 py-4 flex gap-3 bg-gray-50 rounded-b-lg">
//           <button
//             onClick={onClose}
//             className="flex-1 py-2.5 rounded-lg font-medium text-sm border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
//           >
//             Cancel
//           </button>
//           <button
//             onClick={() => {
//               onConfirm();
//               onClose();
//             }}
//             className="flex-1 py-2.5 rounded-lg bg-red-600 text-white font-medium text-sm hover:bg-red-700"
//           >
//             Delete
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// const TakeOrder = ({ clientId, token, onOrderUpdate, realm }) => {
//   const [searchOpen, setSearchOpen] = useState(false);
//   const [searchQuery, setSearchQuery] = useState('');
//   const searchInputRef = useRef(null);
//   const [selectedTable, setSelectedTable] = useState('');
//   const [cart, setCart] = useState([]);
//   const [showCart, setShowCart] = useState(true);
//   const [orderPlaced, setOrderPlaced] = useState(false);
//   const [tables, setTables] = useState([]);
//   const [categories, setCategories] = useState([]);
//   const [categoriesFlat, setCategoriesFlat] = useState([]); // ✅ NEW: For addon resolution
//   const [menuItems, setMenuItems] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [isPlacingOrder, setIsPlacingOrder] = useState(false);
//   const [noteModalOpen, setNoteModalOpen] = useState(false);
//   const [currentItemForNote, setCurrentItemForNote] = useState(null);
//   const [lineItemsModalOpen, setLineItemsModalOpen] = useState(false);
//   const [selectedMainItem, setSelectedMainItem] = useState(null);
//   const [lineItemsDetails, setLineItemsDetails] = useState([]);
//   const [orderMode, setOrderMode] = useState('dinein');
//   const [takeawayTableId, setTakeawayTableId] = useState(null);
//   const isPlacingRef = useRef(false);
//   const isMobile = window.matchMedia('(max-width: 1024px)').matches;
//   const [showClearConfirm, setShowClearConfirm] = useState(false);
//   const [showOrderPage, setShowOrderPage] = useState(false);
//   const [currentView, setCurrentView] = useState('floor');
//   const [activeOrderId, setActiveOrderId] = useState(null);
//   const [hasNewItems, setHasNewItems] = useState(false);
//   const [currentBatchTimestamp, setCurrentBatchTimestamp] = useState(null);
//   const [isOrderFormOpen, setIsOrderFormOpen] = useState(false);
//   const [tableOrders, setTableOrders] = useState({});
//   const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
//   const [orderToDelete, setOrderToDelete] = useState(null);
//   const [dieterySubCategories, setDieterySubCategories] = useState([]);
//   const [sidebarCategories, setSidebarCategories] = useState([]);
//   const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
//   const [invoiceOrderData, setInvoiceOrderData] = useState(null);
//   const [inventoryMap, setInventoryMap] = useState({});
//   const navigate = useNavigate();
//   const [selectedCategoryId, setSelectedCategoryId] = useState(null);

//   // ============ UTILITY FUNCTIONS ============
//   const flattenCategoryTree = (tree, level = 0, parentId = null) => {
//     let flatList = [];
//     tree.forEach(category => {
//       flatList.push({
//         id: category.id,
//         name: category.name,
//         level: level,
//         parentId: parentId,
//         hasChildren: category.subCategories && category.subCategories.length > 0,
//       });
//       if (category.subCategories && category.subCategories.length > 0) {
//         flatList = flatList.concat(
//           flattenCategoryTree(category.subCategories, level + 1, category.id)
//         );
//       }
//     });
//     return flatList;
//   };

//   const menuConfig = React.useMemo(() => {
//     if (!clientId) return null;
//     return getMenuConfig(clientId);
//   }, [clientId]);

//   const getAddonCategoryId = (itemCategoryId) => {
//     let current = itemCategoryId;

//     while (current) {
//       const cat = categoriesFlat.find(c => c.id === current);
//       if (!cat) break;

//       // 👇 these must be your actual DB ids
//       if (cat.id === 'AC_ROOT_ID') return 'addons_ac';
//       if (cat.id === 'NON_AC_ROOT_ID') return 'addons_non_ac';

//       current = cat.parentId;
//     }

//     return 'addons_ac';
//   };


//   const generateSlug = (text) =>
//     "_" + text.trim().replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "_");

//   const getCategoryAndChildrenIds = (categories, targetId) => {
//     const result = new Set();

//     const traverse = (nodes, found = false) => {
//       for (const node of nodes) {
//         const isTarget = node.id === targetId;

//         if (isTarget || found) {
//           result.add(node.id);
//         }

//         if (node.children?.length) {
//           traverse(node.children, found || isTarget);
//         }
//       }
//     };

//     traverse(categories);
//     return Array.from(result);
//   };

//   const fetchTables = async () => {
//     const res = await axios.get(
//       `${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/read`,
//       { headers: { Authorization: `Bearer ${token}` } }
//     );

//     const tableList = Array.isArray(res.data?.data)
//       ? res.data.data.map(t => ({
//         ...t,
//         table_number: t.name || t.table_number || "-",
//       }))
//       : [];

//     const takeawayTable = tableList.find(t => Number(t.id) === 500);
//     if (takeawayTable) {
//       setTakeawayTableId(takeawayTable.id);
//     } else {
//       console.warn("⚠️ Takeaway table (id=500) not found");
//     }

//     tableList.sort((a, b) =>
//       a.table_number.localeCompare(b.table_number, undefined, { numeric: true })
//     );

//     setTables(tableList);
//     await fetchTableOrders(tableList);
//   };

//   const fetchTableOrders = async (tableList) => {
//     try {
//       const response = await axios.get(
//         `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/table`,
//         { headers: { Authorization: `Bearer ${token}` } }
//       );

//       const allOrders = response.data?.data || [];
//       const ordersMap = {};

//       tableList.forEach(table => {
//         const tableStatus = table.status?.toLowerCase();

//         if (tableStatus === 'occupied' || tableStatus === 'served') {
//           const tableOrder = allOrders
//             .filter(o => o.table_id === table.id && o.status?.toLowerCase() !== 'completed')
//             .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

//           if (tableOrder) {
//             ordersMap[table.id] = {
//               id: tableOrder.id,
//               status: tableOrder.status,
//               order_mode: tableOrder.order_type || 'dinein',
//               created_at: tableOrder.created_at,
//             };
//           }
//         }
//       });

//       setTableOrders(ordersMap);
//     } catch (err) {
//       console.error("Failed to fetch table orders:", err);
//     }
//   };

//   const handleDeleteOrder = async (orderId, tableId) => {
//     try {
//       await axios.delete(
//         `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/delete`,
//         {
//           params: { dinein_order_id: orderId, client_id: clientId },
//           headers: { Authorization: `Bearer ${token}` }
//         }
//       );

//       const tableObj = tables.find(t => t.id === tableId);
//       if (tableObj) {
//         await axios.post(
//           `${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/update`,
//           {
//             id: tableId,
//             client_id: clientId,
//             name: tableObj.name,
//             table_type: tableObj.table_type,
//             status: 'Vacant',
//             location_zone: tableObj.location_zone
//           },
//           { headers: { Authorization: `Bearer ${token}` } }
//         );
//       }

//       toast.success('Order deleted successfully');

//       await fetchTables();

//       setShowDeleteConfirm(false);
//       setOrderToDelete(null);
//     } catch (err) {
//       console.error('Delete order error:', err);
//       toast.error('Failed to delete order');
//     }
//   };

//   const handleMarkAsServed = async (orderId, tableId) => {
//     try {
//       await axios.post(
//         `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/update`,
//         {
//           id: orderId,
//           client_id: clientId,
//           status: 'served'
//         },
//         { headers: { Authorization: `Bearer ${token}` } }
//       );

//       toast.success('Order marked as served');

//       await fetchTables();
//     } catch (err) {
//       console.error('Mark as served error:', err.response?.data || err.message);
//       toast.error('Failed to mark order as served');
//     }
//   };

//   const handlePrintBill = async (orderId, tableId) => {
//     try {
//       setLoading(true);

//       const response = await axios.get(
//         `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/table`,
//         { headers: { Authorization: `Bearer ${token}` } }
//       );

//       const allOrders = response.data?.data || [];
//       const order = allOrders.find(o => o.id === orderId);

//       if (!order) {
//         toast.error('Order not found');
//         return;
//       }

//       const enrichedItems = (order.items || []).map((item) => {
//         const inv = inventoryMap[item.item_id] || {};
//         return {
//           ...item,
//           unit_price: item.unit_price ?? item.price ?? inv.unit_price ?? 0,
//           description: item.description ?? inv.description ?? "",
//           name: item.item_name ?? inv.name ?? "Unnamed Item",
//         };
//       });

//       const combinedItems = combineDuplicateItems(enrichedItems);

//       const updatedOrder = {
//         ...order,
//         items: combinedItems,
//       };

//       setInvoiceOrderData(updatedOrder);
//       setInvoiceModalOpen(true);
//     } catch (error) {
//       console.error("Error loading order for invoice:", error);
//       toast.error("Failed to load order details");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleBillFromCart = async () => {
//     if (!activeOrderId) {
//       toast.error('No active order');
//       return;
//     }

//     try {
//       setLoading(true);

//       const response = await axios.get(
//         `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/table`,
//         { headers: { Authorization: `Bearer ${token}` } }
//       );

//       const allOrders = response.data?.data || [];
//       const order = allOrders.find(o => o.id === activeOrderId);

//       if (!order) {
//         toast.error('Order not found');
//         return;
//       }

//       const enrichedItems = (order.items || []).map((item) => {
//         const inv = inventoryMap[item.item_id] || {};
//         return {
//           ...item,
//           unit_price: item.unit_price ?? item.price ?? inv.unit_price ?? 0,
//           description: item.description ?? inv.description ?? "",
//           name: item.item_name ?? inv.name ?? "Unnamed Item",
//         };
//       });

//       const combinedItems = combineDuplicateItems(enrichedItems);

//       const updatedOrder = {
//         ...order,
//         items: combinedItems,
//       };

//       setInvoiceOrderData(updatedOrder);
//       setInvoiceModalOpen(true);
//     } catch (error) {
//       console.error("Error loading order for invoice:", error);
//       toast.error("Failed to load order details");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const combineDuplicateItems = (items) => {
//     const itemsMap = new Map();
//     items.forEach(item => {
//       const key = item.item_id.toString();
//       if (itemsMap.has(key)) {
//         const existing = itemsMap.get(key);
//         existing.quantity = (existing.quantity || 0) + (item.quantity || 0);
//       } else {
//         itemsMap.set(key, { ...item });
//       }
//     });
//     return Array.from(itemsMap.values());
//   };

//   useEffect(() => {
//     setIsOrderFormOpen(showCart);
//   }, [showCart]);

//   useEffect(() => {
//     const onBackButton = (e) => {
//       if (currentView === 'order') {
//         e.preventDefault();
//         setCurrentView('floor');
//         setShowCart(false);
//         window.history.pushState({ view: 'floor' }, '');
//       }
//     };

//     window.addEventListener('popstate', onBackButton);
//     return () => window.removeEventListener('popstate', onBackButton);
//   }, [currentView]);

//   useEffect(() => {
//     window.history.pushState({ view: 'floor' }, '');
//   }, []);

//   const findCategoryNode = (tree, matcher) => {
//     for (const cat of tree) {
//       if (
//         cat.id?.toLowerCase() === matcher.toLowerCase() ||
//         cat.name?.toLowerCase() === matcher.toLowerCase()
//       ) {
//         return cat;
//       }
//       if (cat.children?.length) {
//         const found = findCategoryNode(cat.children, matcher);
//         if (found) return found;
//       }
//     }
//     return null;
//   };

//   const getCategoriesAtLevel = (node, targetLevel, currentLevel = 0) => {
//     if (!node) return [];

//     if (currentLevel === targetLevel) {
//       return [node];
//     }

//     let result = [];
//     for (const child of node.children || []) {
//       result = result.concat(
//         getCategoriesAtLevel(child, targetLevel, currentLevel + 1)
//       );
//     }

//     return result;
//   };

//   const findNodeAndChildren = (nodes, id) => {
//     for (const node of nodes) {
//       if (node.id === id) return node;

//       if (node.children?.length) {
//         const found = findNodeAndChildren(node.children, id);
//         if (found) return found;
//       }
//     }
//     return null;
//   };

//   useEffect(() => {
//     const fetchData = async () => {
//       if (!clientId || !token || !menuConfig) {
//         return;
//       }

//       try {
//         setLoading(true);
//         await fetchTables();

//         const [catRes, itemRes, invRes] = await Promise.all([
//           axios.get(
//             `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/read_category?category_id=${menuConfig.root}`,
//             { headers: { Authorization: `Bearer ${token}` } }
//           ),
//           axios.get(
//             `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/read?inventory_id=menu`,
//             { headers: { Authorization: `Bearer ${token}` } }
//           ),
//           axios.get(
//             `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/inventory/read`,
//             { headers: { Authorization: `Bearer ${token}` } }
//           )
//         ]);

//         const iMap = {};
//         (invRes.data?.data || []).forEach((i) => (iMap[i.id] = i));
//         setInventoryMap(iMap);

//         const fullTree = catRes.data.data.filter(
//           c => c.name?.toLowerCase() !== "all"
//         );

//         const subcategoryIds = new Set();
//         fullTree.forEach(cat =>
//           cat.subCategories?.forEach(sub => subcategoryIds.add(sub.id))
//         );

//         const topLevelCategories = fullTree.filter(
//           cat => !subcategoryIds.has(cat.id)
//         );

//         const flatCategories = flattenCategoryTree(topLevelCategories);

//         // ✅ NEW: Store normalized flat categories for addon resolution
//         const normalizedFlat = flatCategories.map(cat => ({
//           id: cat.id,
//           name: (cat.name || '').trim(),
//           parentId: cat.parentId ?? cat.parent_id ?? null
//         }));
//         setCategoriesFlat(normalizedFlat);

//         console.log('📦 Loaded flat categories for addon resolution:', normalizedFlat.length);

//         const enrichedItems = itemRes.data.data.map(item => {
//           const cat = flatCategories.find(c => c.id === item.category_id);

//           return {
//             ...item,
//             category_id: item.category_id,
//             category_name: cat?.name || "Uncategorized"
//           };
//         });


//         setMenuItems(enrichedItems);

//         const buildCategoryTree = () => {
//           const map = new Map();

//           flatCategories.forEach(cat => {
//             map.set(cat.id, {
//               ...cat,
//               count: enrichedItems.filter(i =>
//                 i.category_id === cat.id
//               ).length,
//               children: []
//             });
//           });

//           const tree = [];
//           map.forEach(cat => {
//             if (cat.parentId && map.has(cat.parentId)) {
//               map.get(cat.parentId).children.push(cat);
//             } else {
//               tree.push(cat);
//             }
//           });

//           return tree;
//         };

//         const categoryTree = buildCategoryTree().map(cat => {
//           if (cat.id === 'dietery' || cat.name?.toLowerCase() === 'dietery') {
//             return {
//               ...cat,
//               name: 'All Categories',
//               count: cat.children.length
//             };
//           }
//           return cat;
//         });

//         setCategories(categoryTree);

//         const rootNode = findCategoryNode(categoryTree, menuConfig.root);

//         let quickCategories = [];

//         if (rootNode) {
//           let level = menuConfig.level;

//           while (level >= 0) {
//             quickCategories = getCategoriesAtLevel(rootNode, level);

//             if (quickCategories.length > 0) {
//               console.log("Using hierarchy level:", level);
//               break;
//             }

//             level--;
//           }
//         }

//         setDieterySubCategories(quickCategories);
//         setSidebarCategories(categoryTree);

//         const tree = buildCategoryTree().map(cat => {
//           if (cat.id === 'dietery' || cat.name?.toLowerCase() === 'dietery') {
//             return {
//               ...cat,
//               name: 'All Categories',
//               count: enrichedItems.length
//             };
//           }
//           return cat;
//         });

//         setCategories(tree);

//       } catch (err) {
//         console.error("Fetch error:", err);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchData();
//   }, [clientId, token, realm, menuConfig]);
//   const selectedCategoryName =
//     categoriesFlat.find(c => c.id === selectedCategoryId)?.name || "All Categories";


//   useEffect(() => {
//     if (!activeOrderId || menuItems.length === 0 || cart.length === 0) return;

//     setCart(prev =>
//       prev.map(item => {
//         if (item.name !== 'Unnamed Item') return item;
//         const menuItem = menuItems.find(
//           mi => Number(mi.id) === Number(item.id)
//         );

//         if (!menuItem) return item;

//         return {
//           ...item,
//           name: menuItem.name,
//           unit_price: menuItem.unit_price,
//           image_id: menuItem.image_id,
//           discount: menuItem.discount || 0,
//           slug: menuItem.slug,
//           category: menuItem.category_name,
//         };
//       })
//     );
//   }, [menuItems, activeOrderId]);

//   useEffect(() => {
//     if (searchOpen && searchInputRef.current) {
//       const t = setTimeout(() => searchInputRef.current.focus(), 80);
//       return () => clearTimeout(t);
//     }
//   }, [searchOpen]);

//   useEffect(() => {
//     const onKey = (e) => {
//       if (e.key === 'Escape') {
//         setSearchOpen(false);
//       }
//     };
//     window.addEventListener('keydown', onKey);
//     return () => window.removeEventListener('keydown', onKey);
//   }, []);

//   const getFilteredItems = () => {
//     const q = (searchQuery || '').trim().toLowerCase();
//     let items = menuItems;

//     if (selectedCategoryId) {
//       const allowedCategoryIds = getCategoryAndChildrenIds(
//         categories,
//         selectedCategoryId
//       );

//       items = items.filter(item =>
//         allowedCategoryIds.includes(item.category_id)
//       );
//     }


//     if (!q) return items;

//     return items.filter(item => {
//       const name = (item.name || '').toLowerCase();
//       const category = (item.category_name || '').toLowerCase();
//       const code = String(item.code || '').toLowerCase();

//       return (
//         name.includes(q) ||
//         category.includes(q) ||
//         code.includes(q)
//       );
//     });
//   };

//   const filteredItems = getFilteredItems();

//   // ✅ UPDATED: handleItemClick now determines addon category dynamically
//   const handleItemClick = (item) => {
//     if (item.line_item_id && Array.isArray(item.line_item_id) && item.line_item_id.length > 0) {
//       console.log(`🔍 Item ${item.name} has addons, determining category...`);

//       // ✅ Determine which addon category to use based on item's category
//       const addonCategoryId = getAddonCategoryId(item.category_id);

//       // ✅ Filter addons based on the determined category
//       const lineItems = item.line_item_id
//         .map(id => {
//           const addonItem = menuItems.find(i => i.id === id);
//           if (!addonItem) return null;

//           // Check if this addon belongs to the correct addon category
//           const addonPath = [];
//           let currentId = addonItem.category_id;
//           const visited = new Set();

//           while (currentId && !visited.has(currentId)) {
//             visited.add(currentId);
//             const cat = categoriesFlat.find(c => c.id === currentId);
//             if (!cat) break;
//             addonPath.unshift(cat.id);
//             currentId = cat.parentId || cat.parent_id;
//           }

//           // Check if this addon's path includes the correct addon category
//           const belongsToCorrectCategory = addonPath.includes(addonCategoryId);

//           console.log(`  Addon ${addonItem.name}: category_id=${addonItem.category_id}, belongs to ${addonCategoryId}? ${belongsToCorrectCategory}`);

//           return belongsToCorrectCategory ? addonItem : null;
//         })
//         .filter(Boolean);

//       if (lineItems.length > 0) {
//         console.log(`✅ Found ${lineItems.length} valid addons for ${addonCategoryId}`);
//         setSelectedMainItem(item);
//         setLineItemsDetails(lineItems);
//         setLineItemsModalOpen(true);
//       } else {
//         console.log(`⚠️ No valid addons found for ${addonCategoryId}, adding item directly`);
//         addToCart(item);
//       }
//     } else {
//       addToCart(item);
//     }
//   };

//   const addToCart = (item, parentItemKey = null) => {
//     setHasNewItems(true);

//     const timestamp = Date.now() + Math.random();
//     const uniqueKey = `${item.id}_${timestamp}`;

//     let batchTimestamp = currentBatchTimestamp;

//     if (!batchTimestamp) {
//       batchTimestamp = Date.now();
//       setCurrentBatchTimestamp(batchTimestamp);

//       if (activeOrderId) {
//         localStorage.setItem(
//           `order_${activeOrderId}_batch_${batchTimestamp}`,
//           JSON.stringify({
//             timestamp: batchTimestamp,
//             started_at: Date.now(),
//           })
//         );
//       }
//     }

//     if (activeOrderId) {
//       const cartItem = {
//         id: Number(item.id),
//         name: item.name,
//         unit_price: item.unit_price || 0,
//         image_id: item.image_id,
//         discount: item.discount || 0,
//         slug: item.slug,
//         category: item.category_name,
//         quantity: 1,
//         note: "",
//         frontend_unique_key: uniqueKey,
//         batch_timestamp: batchTimestamp,
//         is_new_item: true,
//         parent_item_key: parentItemKey,
//         is_addon: !!parentItemKey,
//       };

//       setCart(prev => [...prev, cartItem]);

//       localStorage.setItem(
//         `order_${activeOrderId}_new_item_${uniqueKey}`,
//         JSON.stringify({
//           item_id: item.id,
//           unique_key: uniqueKey,
//           added_at: timestamp,
//           batch_timestamp: batchTimestamp,
//           quantity: 1,
//           parent_item_key: parentItemKey,
//         })
//       );
//     } else {
//       const existingItem = cart.find(i => i.id === item.id && !i.frontend_unique_key && !i.parent_item_key);

//       if (existingItem && !parentItemKey) {
//         setCart(cart.map(i =>
//           i.id === item.id && !i.frontend_unique_key && !i.parent_item_key
//             ? { ...i, quantity: i.quantity + 1 }
//             : i
//         ));
//       } else {
//         const cartItem = {
//           id: Number(item.id),
//           name: item.name,
//           unit_price: item.unit_price || 0,
//           image_id: item.image_id,
//           discount: item.discount || 0,
//           slug: item.slug,
//           category: item.category_name,
//           quantity: 1,
//           note: "",
//           parent_item_key: parentItemKey,
//           is_addon: !!parentItemKey,
//         };
//         setCart(prev => [...prev, cartItem]);
//       }
//     }

//     if (!isMobile) setShowCart(true);
//   };

//   const clearDraftForOrder = (orderId) => {
//     if (!orderId) return;
//     Object.keys(localStorage).forEach(key => {
//       if (
//         key.startsWith(`order_${orderId}_new_item_`) ||
//         key.startsWith(`order_${orderId}_batch_`)
//       ) {
//         localStorage.removeItem(key);
//       }
//     });
//   };

//   const handleAddMainItemWithSelectedAddons = (selectedAddonIds) => {
//     if (!selectedMainItem) return;

//     const timestamp = Date.now() + Math.random();
//     const mainItemUniqueKey = `${selectedMainItem.id}_${timestamp}`;

//     let batchTimestamp = currentBatchTimestamp;
//     if (!batchTimestamp) {
//       batchTimestamp = Date.now();
//       setCurrentBatchTimestamp(batchTimestamp);
//     }

//     const mainCartItem = {
//       id: Number(selectedMainItem.id),
//       name: selectedMainItem.name,
//       unit_price: selectedMainItem.unit_price || 0,
//       image_id: selectedMainItem.image_id,
//       discount: selectedMainItem.discount || 0,
//       slug: selectedMainItem.slug,
//       category: selectedMainItem.category_name,
//       quantity: 1,
//       note: "",
//       frontend_unique_key: mainItemUniqueKey,
//       batch_timestamp: batchTimestamp,
//       is_new_item: true,
//       has_addons: selectedAddonIds.length > 0,
//     };

//     setCart(prev => [...prev, mainCartItem]);

//     const selectedLineItems = lineItemsDetails.filter(item => selectedAddonIds.includes(item.id));

//     selectedLineItems.forEach(addon => {
//       const addonTimestamp = Date.now() + Math.random();
//       const addonUniqueKey = `${addon.id}_${addonTimestamp}`;

//       const addonCartItem = {
//         id: Number(addon.id),
//         name: addon.name,
//         unit_price: addon.unit_price || 0,
//         image_id: addon.image_id,
//         discount: addon.discount || 0,
//         slug: addon.slug,
//         category: addon.category_name,
//         quantity: 1,
//         note: "",
//         frontend_unique_key: addonUniqueKey,
//         batch_timestamp: batchTimestamp,
//         is_new_item: true,
//         parent_item_key: mainItemUniqueKey,
//         is_addon: true,
//       };

//       setCart(prev => [...prev, addonCartItem]);
//     });

//     setLineItemsModalOpen(false);
//     setSelectedMainItem(null);
//     setLineItemsDetails([]);
//   };

//   const handleAddMainItemOnly = () => {
//     if (!selectedMainItem) return;

//     const timestamp = Date.now() + Math.random();
//     const uniqueKey = `${selectedMainItem.id}_${timestamp}`;

//     let batchTimestamp = currentBatchTimestamp;

//     // ✅ Create new batch if doesn't exist
//     if (!batchTimestamp) {
//       batchTimestamp = Date.now();
//       setCurrentBatchTimestamp(batchTimestamp);

//       if (activeOrderId) {
//         localStorage.setItem(
//           `order_${activeOrderId}_batch_${batchTimestamp}`,
//           JSON.stringify({
//             timestamp: batchTimestamp,
//             started_at: Date.now(),
//           })
//         );
//       }
//     }

//     // ✅ For active orders, always create new items with batch timestamp
//     if (activeOrderId) {
//       setHasNewItems(true);

//       const cartItem = {
//         id: Number(selectedMainItem.id),
//         name: selectedMainItem.name || selectedMainItem.item_name || 'Unnamed Item',
//         unit_price: selectedMainItem.unit_price || 0,
//         image_id: selectedMainItem.image_id,
//         discount: selectedMainItem.discount || 0,
//         slug: selectedMainItem.slug,
//         category: selectedMainItem.category_name,
//         quantity: 1,
//         note: "",
//         frontend_unique_key: uniqueKey, // ✅ CRITICAL FIX
//         batch_timestamp: batchTimestamp, // ✅ CRITICAL FIX
//         is_new_item: true,
//       };

//       setCart(prev => [...prev, cartItem]);

//       localStorage.setItem(
//         `order_${activeOrderId}_new_item_${uniqueKey}`,
//         JSON.stringify({
//           item_id: selectedMainItem.id,
//           unique_key: uniqueKey,
//           added_at: timestamp,
//           batch_timestamp: batchTimestamp,
//           quantity: 1,
//         })
//       );
//     } else {
//       // For new orders, check if item exists and increment quantity
//       const existingMainItem = cart.find(i =>
//         i.id === selectedMainItem.id &&
//         !i.frontend_unique_key &&
//         !i.parent_item_key
//       );

//       if (existingMainItem) {
//         setCart(cart.map(i =>
//           i.id === selectedMainItem.id && !i.frontend_unique_key && !i.parent_item_key
//             ? { ...i, quantity: i.quantity + 1 }
//             : i
//         ));
//       } else {
//         setCart(prev => [
//           ...prev,
//           {
//             id: Number(selectedMainItem.id),
//             name: selectedMainItem.name || selectedMainItem.item_name || 'Unnamed Item',
//             unit_price: selectedMainItem.unit_price || 0,
//             image_id: selectedMainItem.image_id,
//             discount: selectedMainItem.discount || 0,
//             slug: selectedMainItem.slug,
//             category: selectedMainItem.category_name,
//             quantity: 1,
//             note: "",
//           }
//         ]);
//       }
//     }

//     setLineItemsModalOpen(false);
//     setSelectedMainItem(null);
//     setLineItemsDetails([]);

//     if (!isMobile) setShowCart(true);
//   };

//   const openNoteEditor = (item) => {
//     setCurrentItemForNote(item);
//     setNoteModalOpen(true);
//   };

//   const saveNoteToItem = (noteText) => {
//     setCart(cart.map(i =>
//       i.id === currentItemForNote.id ? { ...i, note: noteText } : i
//     ));
//   };

//   const removeFromCart = (itemId, uniqueKey = null) => {
//     setHasNewItems(true);

//     if (uniqueKey) {
//       setCart(cart.filter(i =>
//         i.frontend_unique_key !== uniqueKey &&
//         i.parent_item_key !== uniqueKey
//       ));
//     } else {
//       setCart(cart.filter(i => i.id !== itemId));
//     }
//   };

//   const updateQuantity = (itemId, change, uniqueKey = null) => {
//     setHasNewItems(true);

//     setCart(cart
//       .map(item => {
//         const isMatch = uniqueKey
//           ? item.frontend_unique_key === uniqueKey
//           : item.id === itemId && !item.frontend_unique_key;

//         if (isMatch) {
//           const qty = item.quantity + change;
//           return qty > 0 ? { ...item, quantity: qty } : null;
//         }
//         return item;
//       })
//       .filter(Boolean)
//     );
//   };

//   const getTotalPrice = () => {
//     return cart.reduce((total, item) =>
//       total + ((item.unit_price || 0) * item.quantity), 0
//     ).toFixed(2);
//   };

//   const deriveOrderStatusFromItems = (items) => {
//     if (!items || items.length === 0) return "new";

//     const statuses = items.map(i => i.status);

//     if (statuses.every(s => s === "served")) return "ready";
//     if (statuses.some(s => s === "preparing")) return "preparing";
//     if (statuses.some(s => s === "pending")) return "pending";
//     return "new";
//   };

//   const handlePlaceOrder = async () => {
//     if (isPlacingRef.current || !canPlaceOrder) return;

//     isPlacingRef.current = true;
//     setIsPlacingOrder(true);

//     try {
//       const subtotal = cart.reduce(
//         (s, i) => s + (i.unit_price || 0) * i.quantity,
//         0
//       );

//       const gst = subtotal * 0.05;
//       const cst = subtotal * 0.02;
//       const total = subtotal + gst + cst;

//       const headers = { Authorization: `Bearer ${token}` };

//       if (activeOrderId) {
//         const itemsForBackend = cart.map(i => ({
//           client_id: clientId,
//           item_id: i.id,
//           order_id: activeOrderId,
//           item_name: i.name,
//           quantity: i.quantity,
//           unit_price: i.unit_price,
//           line_total: i.unit_price * i.quantity,
//           status: i.status || "pending",
//           note: i.note || "",
//           frontend_unique_key: i.frontend_unique_key || null,
//         }));

//         await axios.post(
//           `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/order_items/update?order_id=${activeOrderId}`,
//           itemsForBackend,
//           { headers }
//         );

//         const derivedStatus = deriveOrderStatusFromItems(cart);

//         await axios.post(
//           `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/update`,
//           {
//             id: activeOrderId,
//             total_price: total,
//             status: derivedStatus,
//           },
//           { headers }
//         );
//       }
//       else {
//         await axios.post(
//           `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/create`,
//           {
//             client_id: clientId,
//             table_id: Number(selectedTable),
//             price: subtotal,
//             gst,
//             cst,
//             total_price: total,
//             status: "pending",
//             items: cart.map(i => ({
//               item_id: i.id,
//               item_name: i.name,
//               quantity: i.quantity,
//               unit_price: i.unit_price,
//               line_total: i.unit_price * i.quantity,
//               status: "pending"
//             }))
//           },
//           { headers }
//         );
//       }

//       const tableToUpdate = tables.find(t => t.id.toString() === selectedTable);
//       if (tableToUpdate) {
//         await axios.post(
//           `${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/update`,
//           {
//             ...tableToUpdate,
//             id: Number(selectedTable),
//             status: "Occupied",
//             table_type: tableToUpdate.table_type.toString()
//           },
//           { headers }
//         );
//       }

//       await fetchTables();

//       if (activeOrderId && currentBatchTimestamp) {
//         Object.keys(localStorage).forEach(key => {
//           if (key.startsWith(`order_${activeOrderId}_batch_${currentBatchTimestamp}`)) {
//             localStorage.removeItem(key);
//           }
//         });
//       }

//       setCart([]);
//       setActiveOrderId(null);
//       setShowCart(false);
//       setCurrentView("floor");
//       setCurrentBatchTimestamp(null);
//       setHasNewItems(false);

//     } catch (err) {
//       console.error("ORDER ERROR:", err);
//       alert("Order failed");
//     } finally {
//       isPlacingRef.current = false;
//       setIsPlacingOrder(false);
//     }
//   };

//   const handleTableSelect = (table) => {
//     setSelectedTable(table.id.toString());
//     setCurrentView('order');
//     window.history.pushState({ view: 'order' }, '');
//   };

//   const handleClearCart = () => {
//     if (cart.length === 0) return;
//     setShowClearConfirm(true);
//   };

//   const confirmClearCart = () => {
//     setCart([]);
//     setSelectedTable('');
//     setShowOrderPage(false);
//     setCurrentView('floor');
//     setShowCart(false);
//     setShowClearConfirm(false);
//     setActiveOrderId(null);
//     setCurrentBatchTimestamp(null);
//     setHasNewItems(false);
//   };

//   const handleTakeawaySelect = () => {
//     setOrderMode('takeaway');
//     setSelectedTable(takeawayTableId.toString());
//     setCurrentView('order');
//     window.history.pushState({ view: 'order' }, '');
//   };

//   const handleViewOrder = async (table) => {
//     if (menuItems.length === 0) {
//       alert("Menu is still loading, please wait...");
//       return;
//     }

//     try {
//       setLoading(true);

//       const response = await axios.get(
//         `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/table`,
//         { headers: { Authorization: `Bearer ${token}` } }
//       );

//       const allOrders = response.data?.data || [];

//       const tableOrders = allOrders.filter(
//         o => o.table_id === table.id && o.status?.toLowerCase() !== 'completed'
//       );

//       if (tableOrders.length === 0) {
//         alert('No active order for this table');
//         return;
//       }

//       const activeOrder = tableOrders.sort(
//         (a, b) => new Date(b.created_at) - new Date(a.created_at)
//       )[0];

//       setActiveOrderId(activeOrder.id);
//       setHasNewItems(false);
//       setCurrentBatchTimestamp(null);

//       const batchGroups = {};

//       (activeOrder.items || []).forEach(item => {
//         const itemId = Number(item.item_id);
//         const menuItem = menuItems.find(mi => Number(mi.id) === itemId);
//         const frontendKey = item.frontend_unique_key;

//         let batchTimestamp = null;
//         if (frontendKey) {
//           const parts = frontendKey.split('_');
//           if (parts.length >= 2) {
//             const extractedTimestamp = parseFloat(parts[parts.length - 1]);
//             if (!isNaN(extractedTimestamp)) {
//               batchTimestamp = Math.floor(extractedTimestamp / 1000) * 1000;
//             }
//           }
//         }

//         const cartItem = {
//           id: itemId,
//           name: item.item_name || menuItem?.name || 'Unnamed Item',
//           unit_price: item.unit_price || menuItem?.unit_price || 0,
//           quantity: item.quantity || 1,
//           note: item.note || '',
//           image_id: menuItem?.image_id,
//           discount: menuItem?.discount || 0,
//           slug: item.slug || menuItem?.slug,
//           category: menuItem?.category_name,
//           frontend_unique_key: frontendKey,
//           batch_timestamp: batchTimestamp,
//           status: item.status || "pending"
//         };

//         const groupKey = batchTimestamp || 'original';
//         if (!batchGroups[groupKey]) {
//           batchGroups[groupKey] = [];
//         }
//         batchGroups[groupKey].push(cartItem);
//       });

//       const sortedBatches = Object.keys(batchGroups).sort((a, b) => {
//         if (a === 'original') return -1;
//         if (b === 'original') return 1;
//         return Number(a) - Number(b);
//       });

//       const reconstructedCart = [];
//       sortedBatches.forEach(batchKey => {
//         reconstructedCart.push(...batchGroups[batchKey]);
//       });

//       setCart(reconstructedCart);
//       setSelectedTable(table.id.toString());
//       setOrderMode('dinein');
//       setCurrentView('order');
//       setShowCart(true);

//       window.history.pushState({ view: 'order' }, '');
//     } catch (err) {
//       console.error(err);
//       alert('Failed to load order');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const getGroupedCartItems = (items) => {
//     const grouped = [];
//     const processedKeys = new Set();

//     items.forEach(item => {
//       // Skip if already processed
//       if (processedKeys.has(item.frontend_unique_key || item.id)) return;

//       // ✅ CRITICAL FIX: Only group if item is NOT an addon itself
//       if (!item.is_addon && !item.parent_item_key) {
//         const mainItem = { ...item };

//         // Find addons that belong to this main item
//         const addons = items.filter(i =>
//           i.parent_item_key === item.frontend_unique_key
//         );

//         grouped.push({
//           main: mainItem,
//           addons: addons
//         });

//         // Mark as processed
//         processedKeys.add(item.frontend_unique_key || item.id);
//         addons.forEach(addon =>
//           processedKeys.add(addon.frontend_unique_key || addon.id)
//         );
//       }
//     });

//     return grouped;
//   };

//   const oldItems = cart.filter(i => !i.batch_timestamp);
//   const newItems = cart.filter(i => !!i.batch_timestamp);

//   const groupedNewItems = newItems.reduce((acc, item) => {
//     const batch = item.batch_timestamp || 'default';
//     if (!acc[batch]) acc[batch] = [];
//     acc[batch].push(item);
//     return acc;
//   }, {});

//   const batchTimestamps = Object.keys(groupedNewItems).sort();

//   const canPlaceOrder =
//     orderMode === 'takeaway'
//       ? cart.length > 0
//       : activeOrderId
//         ? hasNewItems
//         : selectedTable && cart.length > 0;

//   const displayTableName =
//     orderMode === 'takeaway'
//       ? tables.find(t => t.id === 500)?.table_number || 'Takeaway'
//       : tables.find(t => t.id.toString() === selectedTable)?.table_number;

//   const handleBackToTables = () => {
//     setCurrentView('floor');
//     setShowCart(false);
//     setSelectedTable('');
//     setCart([]);
//     setActiveOrderId(null);
//     setCurrentBatchTimestamp(null);
//     setHasNewItems(false);
//     setSelectedCategoryId("All Categories");
//     setSidebarCategories(categories);
//   };

//   const CartItemWithAddons = ({ group, onUpdateQuantity, onRemove }) => {
//     const { main, addons } = group;

//     return (
//       <div className="space-y-1">
//         <div className="flex items-center gap-2 p-3 rounded-xl border bg-white shadow-sm hover:shadow transition">
//           <div className="flex items-center gap-3 flex-1 min-w-0">
//             <div className="w-12 h-12 rounded-lg overflow-hidden border bg-white shrink-0">
//               <ImagePreview
//                 clientId={clientId}
//                 imageId={main.image_id}
//                 token={token}
//                 alt={main.name}
//                 baseUrl={import.meta.env.VITE_API_DOCUMENT_SERVICE_URL}
//                 urlBuilder={({ baseUrl, clientId, imageId }) =>
//                   `${baseUrl}/${clientId}/document/download?doc_id=${imageId}`
//                 }
//                 className="w-full h-full object-cover"
//               />
//             </div>

//             <div className="min-w-0 flex-1">
//               <h4 className="text-sm font-semibold truncate text-gray-800">
//                 {main.name}
//               </h4>
//               <p className="text-xs font-bold text-action-primary">
//                 ₹{(main.unit_price - (main.discount || 0)).toFixed(2)}
//               </p>
//             </div>
//           </div>

//           <div className="flex items-center gap-1">
//             <button
//               onClick={() => onUpdateQuantity(main.id, -1, main.frontend_unique_key)}
//               className="w-7 h-7 flex items-center justify-center border rounded hover:bg-gray-100"
//             >
//               <Minus size={14} />
//             </button>

//             <span className="w-6 text-center text-sm font-semibold">
//               {main.quantity}
//             </span>

//             <button
//               onClick={() => onUpdateQuantity(main.id, 1, main.frontend_unique_key)}
//               className="w-7 h-7 flex items-center justify-center border rounded hover:bg-gray-100"
//             >
//               <Plus size={14} />
//             </button>
//           </div>

//           <button
//             onClick={() => onRemove(main.id, main.frontend_unique_key)}
//             className="text-action-primary hover:text-red-700"
//           >
//             <X size={16} />
//           </button>
//         </div>

//         {addons.map(addon => (
//           <div key={addon.frontend_unique_key || addon.id} className="flex items-center gap-2 p-2 pl-8 rounded-lg border border-dashed bg-blue-50/50">
//             <div className="flex items-center gap-2 flex-1 min-w-0">
//               <span className="text-xs text-blue-600">↳</span>
//               <span className="text-sm text-gray-700 truncate">{addon.name}</span>
//             </div>
//             <span className="text-xs font-semibold text-blue-600">
//               ₹{(addon.unit_price - (addon.discount || 0)).toFixed(2)}
//             </span>
//             <span className="text-xs text-gray-500 w-6 text-center">×{addon.quantity}</span>
//           </div>
//         ))}
//       </div>
//     );
//   };

//   return (
//     <div className="bg-bg-primary p-0 h-[calc(100vh-4rem)] overflow-x-hidden overflow-y-auto">
//       {currentView === 'floor' && (
//         <TableReservation
//           tables={tables}
//           onSelectTable={handleTableSelect}
//           onSelectTakeaway={handleTakeawaySelect}
//           onSelectDineIn={() => setOrderMode('dinein')}
//           onViewOrder={handleViewOrder}
//           orderMode={orderMode}
//           tableOrders={tableOrders}
//           onPrintBill={handlePrintBill}
//           onDeleteOrder={(orderId, tableId) => {
//             setOrderToDelete({ orderId, tableId });
//             setShowDeleteConfirm(true);
//           }}
//           onMarkAsServed={handleMarkAsServed}
//         />
//       )}

//       {currentView === 'order' && (
//         <div className="mx-auto px-2 py-2">
//           <div className="grid lg:grid-cols-4 gap-1">

//             <div className="w-full lg:col-span-1">
//               <div className="lg:h-[calc(98dvh-4rem)] lg:overflow-y-auto pr-1">
//                 <CategoryTree categories={sidebarCategories} selectedCategoryId={selectedCategoryId} onSelectCategory={setSelectedCategoryId} defaultOpenAll />
//               </div>
//             </div>

//             <div className="lg:col-span-3 flex gap-2">

//               <div className="transition-all duration-300 border-default border-border-default p-2 rounded-lg flex-1 overflow-y-auto h-[calc(98dvh-4rem)] lg:h-auto lg:max-h-[calc(98dvh-4rem)]">

//                 <div className="space-y-2">
//                   {/* Quick Category Pills */}
//                   <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
//                     {dieterySubCategories.map(cat => (
//                       <button
//                         key={cat.id}
//                         onClick={() => {
//                           setSelectedCategoryId(cat.id);

//                           const selectedNode = findNodeAndChildren(categories, cat.id);
//                           if (selectedNode) {
//                             setSidebarCategories([selectedNode]);
//                           }
//                         }}

//                         className={`px-3 py-1.5 rounded-lg text-sm font-semibold border whitespace-nowrap transition-all flex-shrink-0
//           ${selectedCategoryId === cat.id
//                             ? 'bg-action-primary text-white border-action-primary'
//                             : 'bg-bg-tertiary text-text-primary hover:border-action-primary'
//                           }`}
//                       >
//                         <div className="flex flex-col leading-tight text-left">
//                           <span className="text-sm font-semibold">
//                             {cat.name}
//                           </span>
//                         </div>
//                       </button>
//                     ))}
//                   </div>

//                   {/* Header with Back button, Title, and Search */}
//                   <div className="flex items-center justify-between lg:flex-row flex-col gap-2">
//                     <div className="flex items-center gap-2">
//                       <button
//                         onClick={handleBackToTables}
//                         className="p-2 rounded-lg bg-bg-tertiary border border-border-default hover:bg-bg-secondary transition-colors"
//                         title="Back to table selection"
//                       >
//                         <ArrowLeft size={20} className="text-text-primary" />
//                       </button>

//                       <h2 className="text-xl lg:text-2xl font-semibold text-text-primary truncate">
//                         {selectedCategoryName}
//                         <span className="text-sm ml-2">({filteredItems.length})</span>
//                       </h2>
//                     </div>

//                     <div className="relative w-64 max-w-full">
//                       <Search
//                         size={16}
//                         className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
//                       />
//                       <input
//                         ref={searchInputRef}
//                         value={searchQuery}
//                         onChange={(e) => setSearchQuery(e.target.value)}
//                         placeholder="Search items..."
//                         className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border-default bg-bg-primary focus:outline-none focus:ring-2 focus:ring-action-primary"
//                       />
//                     </div>
//                   </div>
//                 </div>

//                 <div className={`grid gap-2 grid-cols-2 md:grid-cols-4 ${isOrderFormOpen ? 'lg:grid-cols-3' : 'lg:grid-cols-4'}`}>
//                   {filteredItems.map(item => {
//                     const discountPercent =
//                       item.discount &&
//                         item.unit_price &&
//                         Number(item.discount) > 0
//                         ? ((Number(item.discount) * 100) / Number(item.unit_price))
//                           .toFixed(0)
//                         : null;

//                     const addonCount = item.line_item_id?.length || 0;

//                     return (
//                       <div onClick={() => handleItemClick(item)}
//                         key={item.id}
//                         className="flex gap-2 items-center bg-bg-primary border-default border-border-default rounded-xl p-1 shadow-sm hover:shadow-md transition cursor-pointer relative"
//                       >
//                         <div className="w-14 h-16 rounded-lg overflow-hidden shrink-0 bg-gray-100">
//                           <ImagePreview
//                             clientId={clientId}
//                             imageId={item.image_id}
//                             token={token}
//                             alt={item.name}
//                             baseUrl={import.meta.env.VITE_API_DOCUMENT_SERVICE_URL}
//                             urlBuilder={({ baseUrl, clientId, imageId }) =>
//                               `${baseUrl}/${clientId}/document/download?doc_id=${imageId}`
//                             }
//                             className="w-full h-full object-cover"
//                           />
//                         </div>

//                         <div className="flex-1 min-w-0">
//                           <h3 className="text-sm font-semibold text-text-primary line-clamp-2">
//                             {item.name}
//                           </h3>

//                           {item.description && (
//                             <p className="text-xs text-text-secondary line-clamp-1 mt-0.5">
//                               {item.description}
//                             </p>
//                           )}

//                           <div className="flex items-center gap-2 mt-1">
//                             {discountPercent ? (
//                               <>
//                                 <span className="text-sm font-bold text-action-primary">
//                                   ₹{(item.unit_price - item.discount).toFixed(0)}
//                                 </span>
//                                 <span className="text-xs line-through text-text-secondary">
//                                   ₹{item.unit_price}
//                                 </span>
//                                 <span className="text-xs text-action-danger font-semibold">
//                                   {discountPercent}% OFF
//                                 </span>
//                               </>
//                             ) : (
//                               <span className="text-sm font-bold text-action-primary">
//                                 ₹{item.unit_price}
//                               </span>
//                             )}
//                           </div>

//                           {addonCount > 0 && (
//                             <div className="mt-1">
//                               <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
//                                 +{addonCount} addon{addonCount > 1 ? 's' : ''}
//                               </span>
//                             </div>
//                           )}
//                         </div>
//                       </div>
//                     );
//                   })}
//                 </div>
//               </div>

//               {!isMobile && (
//                 <div className={`transition-all duration-300 ease-in-out ${showCart ? 'w-[22rem] opacity-100 z-30' : 'w-0 opacity-0'}`}>
//                   <div className="border border-gray-300 rounded-xl bg-white">
//                     <div className="shadow-xl rounded-xl lg:h-[calc(98dvh-4rem)] flex flex-col">
//                       <div className="flex flex-col h-full p-4">

//                         <div className="pb-3 border-b space-y-2">
//                           <div className="flex items-center justify-between">
//                             <h2 className="text-lg font-semibold text-gray-800">
//                               Your Order
//                             </h2>
//                           </div>

//                           {cart.length >= 0 && (
//                             <div className="flex items-center justify-between text-sm bg-gray-50 px-3 py-2 rounded-lg">
//                               <div className="flex items-center gap-2">
//                                 {orderMode === 'dinein' && selectedTable && (
//                                   <>
//                                     <span className="font-semibold text-[18px] text-gray-700">
//                                       {tables.find(t => t.id.toString() === selectedTable)?.table_number}
//                                     </span>

//                                     <button
//                                       onClick={() => {
//                                         setOrderMode('dinein');
//                                         setSelectedTable('');
//                                         if (activeOrderId && hasNewItems) {
//                                           clearDraftForOrder(activeOrderId);
//                                         }
//                                         setActiveOrderId(null);
//                                         setCurrentBatchTimestamp(null);
//                                         setHasNewItems(false);
//                                         setShowCart(false);
//                                         setCurrentView('floor');
//                                       }}
//                                       className="text-sm text-red-600 hover:underline"
//                                     > Transfer
//                                     </button>
//                                   </>
//                                 )}
//                               </div>

//                               <span className="text-base font-bold text-red-600">
//                                 ₹{getTotalPrice()}
//                               </span>
//                             </div>
//                           )}
//                         </div>

//                         <div className="mt-3">
//                           <div className="flex bg-gray-100 rounded-lg p-1">
//                             <button
//                               onClick={() => setOrderMode('dinein')}
//                               className={`flex-1 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2
//                                 ${orderMode === 'dinein'
//                                   ? 'bg-action-primary text-text-white shadow-sm'
//                                   : 'text-gray-600 hover:text-gray-800'
//                                 }`}
//                             >
//                               <Users size={16} />
//                               Dine In
//                             </button>

//                             <button
//                               onClick={() => {
//                                 setOrderMode('takeaway');
//                                 setSelectedTable(takeawayTableId?.toString());
//                               }}
//                               className={`flex-1 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2
//                                 ${orderMode === 'takeaway'
//                                   ? 'bg-action-primary text-white shadow-sm'
//                                   : 'text-gray-600 hover:text-gray-800'
//                                 }`}
//                             >
//                               <Package size={16} />
//                               Takeaway
//                             </button>
//                           </div>
//                         </div>

//                         {cart.length === 0 ? (
//                           <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
//                             No items added
//                           </div>
//                         ) : (
//                           <>
//                             <div className="flex-1 overflow-y-auto mt-4 space-y-2">
//                               {/* ✅ FIXED: Old items section */}
//                               {oldItems.length > 0 && (
//                                 <>
//                                   {getGroupedCartItems(oldItems).map((group, idx) => (
//                                     <CartItemWithAddons
//                                       key={`old-group-${idx}`}
//                                       group={group}
//                                       onUpdateQuantity={updateQuantity}
//                                       onRemove={removeFromCart}
//                                     />
//                                   ))}
//                                 </>
//                               )}

//                               {/* ✅ CRITICAL FIX: Show separator ONLY when BOTH old AND new items exist */}
//                               {activeOrderId && oldItems.length > 0 && newItems.length > 0 && (
//                                 <div className="flex items-center gap-2 my-2">
//                                   <div className="flex-1 h-px bg-gradient-to-r from-transparent via-orange-400 to-transparent"></div>
//                                   <span className="text-xs font-semibold text-orange-600 px-2">NEW ITEMS</span>
//                                   <div className="flex-1 h-px bg-gradient-to-r from-orange-400 via-transparent to-transparent"></div>
//                                 </div>
//                               )}

//                               {/* ✅ FIXED: New items section with proper batching */}
//                               {batchTimestamps.length > 0 && batchTimestamps.map((timestamp, batchIndex) => (
//                                 <React.Fragment key={timestamp}>
//                                   {/* ✅ CRITICAL FIX: Show separator between batches only */}
//                                   {batchIndex > 0 && (
//                                     <div className="flex items-center gap-2 my-2">
//                                       <div className="flex-1 h-px bg-gradient-to-r from-transparent via-orange-400 to-transparent"></div>
//                                       <span className="text-xs font-semibold text-orange-600 px-2">NEW ITEMS</span>
//                                       <div className="flex-1 h-px bg-gradient-to-r from-orange-400 via-transparent to-transparent"></div>
//                                     </div>
//                                   )}

//                                   {/* Render grouped items for this batch */}
//                                   {getGroupedCartItems(groupedNewItems[timestamp]).map((group, idx) => (
//                                     <div key={`new-group-${timestamp}-${idx}`} className="space-y-1">
//                                       <div className="flex items-center gap-2 p-3 rounded-xl border bg-orange-50 shadow-sm hover:shadow transition">
//                                         <div className="flex items-center gap-3 flex-1 min-w-0">
//                                           <div className="w-12 h-12 rounded-lg overflow-hidden border bg-white shrink-0">
//                                             <ImagePreview
//                                               clientId={clientId}
//                                               imageId={group.main.image_id}
//                                               token={token}
//                                               alt={group.main.name}
//                                               baseUrl={import.meta.env.VITE_API_DOCUMENT_SERVICE_URL}
//                                               urlBuilder={({ baseUrl, clientId, imageId }) =>
//                                                 `${baseUrl}/${clientId}/document/download?doc_id=${imageId}`
//                                               }
//                                               className="w-full h-full object-cover"
//                                             />
//                                           </div>

//                                           <div className="min-w-0 flex-1">
//                                             <h4 className="text-sm font-semibold truncate text-gray-800">
//                                               {group.main.name}
//                                             </h4>
//                                             <p className="text-xs font-bold text-action-primary">
//                                               ₹{(group.main.unit_price - (group.main.discount || 0)).toFixed(2)}
//                                             </p>
//                                           </div>
//                                         </div>

//                                         <div className="flex items-center gap-1">
//                                           <button
//                                             onClick={() => updateQuantity(group.main.id, -1, group.main.frontend_unique_key)}
//                                             className="w-7 h-7 flex items-center justify-center border rounded hover:bg-gray-100"
//                                           >
//                                             <Minus size={14} />
//                                           </button>

//                                           <span className="w-6 text-center text-sm font-semibold">
//                                             {group.main.quantity}
//                                           </span>

//                                           <button
//                                             onClick={() => updateQuantity(group.main.id, 1, group.main.frontend_unique_key)}
//                                             className="w-7 h-7 flex items-center justify-center border rounded hover:bg-gray-100"
//                                           >
//                                             <Plus size={14} />
//                                           </button>
//                                         </div>

//                                         <button
//                                           onClick={() => removeFromCart(group.main.id, group.main.frontend_unique_key)}
//                                           className="text-action-primary hover:text-red-700"
//                                         >
//                                           <X size={16} />
//                                         </button>
//                                       </div>

//                                       {/* Render addons for this main item */}
//                                       {group.addons.map(addon => (
//                                         <div key={addon.frontend_unique_key} className="flex items-center gap-2 p-2 pl-8 rounded-lg border border-dashed bg-orange-100/50">
//                                           <div className="flex items-center gap-2 flex-1 min-w-0">
//                                             <span className="text-xs text-orange-600">↳</span>
//                                             <span className="text-sm text-gray-700 truncate">{addon.name}</span>
//                                           </div>
//                                           <span className="text-xs font-semibold text-orange-600">
//                                             ₹{(addon.unit_price - (addon.discount || 0)).toFixed(2)}
//                                           </span>
//                                           <span className="text-xs text-gray-500 w-6 text-center">×{addon.quantity}</span>
//                                         </div>
//                                       ))}
//                                     </div>
//                                   ))}
//                                 </React.Fragment>
//                               ))}
//                             </div>

//                             <div className="grid grid-cols-2 gap-2 mt-3">
//                               <button
//                                 onClick={handlePlaceOrder}
//                                 className={`py-2 rounded-lg text-sm font-semibold
//                                   ${canPlaceOrder && !isPlacingOrder
//                                     ? 'bg-action-primary text-text-white hover:bg-action-danger'
//                                     : 'bg-gray-300 cursor-not-allowed'
//                                   }`}
//                                 disabled={!canPlaceOrder || isPlacingOrder}
//                               >
//                                 {isPlacingOrder ? 'Placing...' : 'Place Order'}
//                               </button>

//                               <button
//                                 onClick={handleBillFromCart}
//                                 className="py-2 rounded-lg text-sm font-semibold bg-green-600 text-white hover:bg-green-700 flex items-center justify-center gap-1"
//                               >
//                                 <FileText size={16} />
//                                 Bill
//                               </button>

//                               <button
//                                 onClick={handleClearCart}
//                                 className="py-2 border rounded-lg text-sm hover:bg-gray-100"
//                               >
//                                 Clear
//                               </button>

//                               <button
//                                 onClick={() => toast.info('Print KOT feature coming soon')}
//                                 className="py-2 border rounded-lg text-sm hover:bg-gray-100 flex items-center justify-center gap-1"
//                                 title="Print KOT (Kitchen Order Ticket)"
//                               >
//                                 <PrinterIcon size={16} />
//                                 Print KOT
//                               </button>
//                             </div>
//                           </>
//                         )}
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>
//       )}

//       {showClearConfirm && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
//           <div className="bg-white rounded-lg p-6 w-80 shadow-xl animate-scale-in">
//             <h3 className="text-lg font-semibold mb-4 text-gray-800">
//               Clear all items?
//             </h3>
//             <p className="text-sm text-gray-600 mb-5">
//               This will remove all items from the order.
//             </p>

//             <div className="flex gap-3">
//               <button
//                 onClick={() => setShowClearConfirm(false)}
//                 className="flex-1 py-2 border rounded-lg hover:bg-gray-100"
//               >
//                 Cancel
//               </button>

//               <button
//                 onClick={confirmClearCart}
//                 className="flex-1 py-2 bg-action-primary text-white rounded-lg hover:bg-action-danger"
//               >
//                 Clear
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {cart.length > 0 && !showCart && (
//         <button
//           onClick={() => setShowCart(true)}
//           className="fixed bottom-6 right-6 bg-action-primary text-white p-4 rounded-full shadow-lg z-40"
//         >
//           <ShoppingCart size={24} />
//         </button>
//       )}

//       <LineItemsModal
//         isOpen={lineItemsModalOpen}
//         onClose={() => {
//           setLineItemsModalOpen(false);
//           setSelectedMainItem(null);
//           setLineItemsDetails([]);
//         }}
//         mainItem={selectedMainItem}
//         lineItems={lineItemsDetails}
//         onAddMainOnly={handleAddMainItemOnly}
//         onAddWithSelectedAddons={handleAddMainItemWithSelectedAddons}
//       />

//       <NoteModal
//         isOpen={noteModalOpen}
//         onClose={() => {
//           setNoteModalOpen(false);
//           setCurrentItemForNote(null);
//         }}
//         itemName={currentItemForNote?.name}
//       />

//       <DeleteConfirmModal
//         isOpen={showDeleteConfirm}
//         onClose={() => {
//           setShowDeleteConfirm(false);
//           setOrderToDelete(null);
//         }}
//         onConfirm={() => {
//           if (orderToDelete) {
//             handleDeleteOrder(orderToDelete.orderId, orderToDelete.tableId);
//           }
//         }}
//       />

//       {invoiceModalOpen && invoiceOrderData && (
//         <InvoiceModal
//           clientId={clientId}
//           token={token}
//           selectedOrder={invoiceOrderData}
//           tablesMap={tables.reduce((map, table) => {
//             map[table.id] = table;
//             return map;
//           }, {})}
//           inventoryMap={inventoryMap}
//           onClose={() => {
//             setInvoiceModalOpen(false);
//             setInvoiceOrderData(null);
//             fetchTables();
//           }}
//           onSave={(draftId) => {
//             console.log('Invoice saved:', draftId);
//             fetchTables();
//           }}
//         />
//       )}
//     </div>
//   );
// };

// export default TakeOrder;



import React, { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Plus, Minus, X, Check, Search, Users, Package, Trash2, ArrowLeft, FileText, Printer as PrinterIcon, Clock } from 'lucide-react';
import axios from 'axios';
import CategoryTree from '../InventoryServices/CategoryTree';
import ImagePreview from '../../utils/ImagePreview';
import { Eye, Lock, Printer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import InvoiceModal from '../BillingServices/InvoiceModal';
import { getMenuConfig } from '../../utils/menuConfigResolver';

// ─── Status badge helper ─────────────────────────────────────────────────────
const ItemStatusBadge = ({ status }) => {
  const cfg = {
    pending:   { bg: 'bg-blue-100',   text: 'text-blue-700',   label: 'Pending' },
    preparing: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Preparing' },
    ready:     { bg: 'bg-green-100',  text: 'text-green-700',  label: 'Ready' },
    served:    { bg: 'bg-gray-100',   text: 'text-gray-600',   label: 'Served' },
  }[status] || { bg: 'bg-gray-100', text: 'text-gray-500', label: status || '—' };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
};

const TABLE_STATUS_CONFIG = {
  vacant:   { clickable: true,  bg: 'bg-action-success', border: 'border-border-default', badge: 'bg-green-100 text-action-success' },
  available:{ clickable: true,  bg: 'bg-action-success', border: 'border-border-default', badge: 'bg-green-100 text-green-700' },
  occupied: { clickable: false, bg: 'bg-action-primary', border: 'border-action-primary', badge: 'bg-red-100 text-action-primary', viewable: true },
  served:   { clickable: false, bg: 'bg-blue-50',        border: 'border-blue-400',       badge: 'bg-blue-100 text-blue-700',  viewable: true },
  reserved: { clickable: false, bg: 'bg-yellow-50',      border: 'border-yellow-400',     badge: 'bg-yellow-100 text-yellow-700' },
};

// ─── Table reservation floor view ────────────────────────────────────────────
const TableReservation = ({ tables=[], orderMode="dinein", onSelectTable, onSelectTakeaway, onSelectDineIn, onViewOrder, tableOrders={}, onPrintBill, onDeleteOrder, onMarkAsServed }) => {
  const [selectedSections, setSelectedSections] = useState([]);
  const [selectedZones, setSelectedZones]       = useState([]);

  const getZone    = t => t.location_zone?.trim() || "Unassigned";
  const getSection = t => t.section?.trim()       || "Other";
  const zonesFromDB    = [...new Set(tables.map(t => t.location_zone).filter(Boolean))];
  const sectionsFromDB = [...new Set(tables.map(t => t.section).filter(Boolean))];
  const toggleFilter = (v, set) => set(p => p.includes(v) ? p.filter(x => x !== v) : [...p, v]);

  const filteredTables = tables.filter(t => {
    const z = getZone(t), s = getSection(t);
    return (selectedZones.length === 0 || selectedZones.includes(z))
        && (selectedSections.length === 0 || selectedSections.includes(s));
  });
  const visibleZones    = [...new Set(filteredTables.map(t => getZone(t)))];
  const getSectionsByZone = zone => [...new Set(filteredTables.filter(t => getZone(t) === zone).map(t => getSection(t)))];

  const calcElapsed = createdAt => {
    if (!createdAt) return null;
    const utc  = typeof createdAt === "string" ? createdAt.replace(" ", "T").split(".")[0] + "Z" : createdAt;
    const diff = Date.now() - new Date(utc).getTime();
    if (diff < 0) return "Just now";
    const s = Math.floor(diff / 1000), m = Math.floor(s / 60), h = Math.floor(m / 60), d = Math.floor(h / 24);
    if (s < 60)  return "Just now";
    if (m === 1) return "1 min ago";  if (m < 60) return `${m} mins ago`;
    if (h === 1) return "1 hr ago";   if (h < 24) return `${h} hrs ago`;
    if (d === 1) return "1 day ago";  return `${d} days ago`;
  };

  return (
    <div className="p-4 bg-bg-primary overflow-y-auto h-[calc(100vh-4rem)]">
      {/* Filter bar */}
      <div className="mb-3 sticky top-0 z-10 bg-bg-primary">
        <div className="flex flex-wrap gap-2 p-2 rounded-xl border border-border-default bg-bg-tertiary">
          <div className="flex flex-wrap items-center gap-2 p-2 rounded-xl">
            <button onClick={() => { setSelectedSections([]); setSelectedZones([]); }}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition ${selectedSections.length === 0 && selectedZones.length === 0 ? "bg-action-primary text-white" : "bg-white text-text-secondary hover:bg-gray-100"}`}>All</button>
            <div className="w-px bg-border-default mx-1"/>
            {sectionsFromDB.map(sec => (
              <button key={sec} onClick={() => toggleFilter(sec, setSelectedSections)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition ${selectedSections.includes(sec) ? "bg-action-primary text-white" : "bg-white text-text-secondary hover:bg-gray-100"}`}>{sec}</button>
            ))}
            <div className="w-px bg-border-default mx-1"/>
            {zonesFromDB.map(zone => (
              <button key={zone} onClick={() => toggleFilter(zone, setSelectedZones)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition ${selectedZones.includes(zone) ? "bg-action-primary text-white" : "bg-white text-text-secondary hover:bg-gray-100"}`}>{zone}</button>
            ))}
          </div>
          <div className="ml-auto flex bg-bg-primary border-2 rounded-full border-action-primary p-1 shadow-sm">
            <button onClick={onSelectDineIn}
              className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all ${orderMode === "dinein" ? "bg-action-primary text-text-white shadow" : "text-text-secondary hover:bg-gray-100"}`}>Dine In</button>
            <button onClick={onSelectTakeaway}
              className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all flex items-center gap-1 ${orderMode === "takeaway" ? "bg-orange-500 text-white shadow" : "text-gray-600 hover:bg-gray-100"}`}>
              <Package size={12}/>Takeaway
            </button>
          </div>
        </div>
      </div>

      {orderMode === "dinein" && visibleZones.map(zone => {
        const sections = getSectionsByZone(zone);
        return (
          <div key={zone} className="mb-10">
            <h3 className="text-xl font-bold mb-4 text-gray-800">{zone}</h3>
            {sections.map(section => (
              <div key={section} className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-semibold px-3 py-1 rounded-full bg-gray-200">{section}</span>
                </div>
                <div className="grid gap-4 grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-5">
                  {filteredTables.filter(t => getZone(t) === zone && getSection(t) === section).map(table => {
                    const statusKey = table.status?.toLowerCase();
                    const config    = TABLE_STATUS_CONFIG[statusKey] || TABLE_STATUS_CONFIG.vacant;
                    const orderInfo = tableOrders[table.id];
                    const hasViewableOrder = (statusKey === 'occupied' || statusKey === 'served') && orderInfo;

                    // ── Timer from root created_at (oldest sub-order) ──────────
                    const rootCreatedAt = orderInfo?.created_at;
                    const elapsedTime   = rootCreatedAt ? calcElapsed(rootCreatedAt) : null;

                    // ── Order count & total from merged group ─────────────────
                    const orderCount = orderInfo?.order_count || 1;
                    const totalPrice = orderInfo?.total_price ? `₹${Number(orderInfo.total_price).toFixed(0)}` : null;

                    return (
                      <div key={table.id} className="rounded-xl overflow-hidden border shadow-sm hover:shadow-md transition bg-white">
                        {/* Clickable area */}
                        <div onClick={() => { if (config.clickable) onSelectTable(table); else if (hasViewableOrder && onViewOrder) onViewOrder(table); }}
                          className={`${config.clickable || hasViewableOrder ? 'cursor-pointer' : ''}`}>

                          {/* Header row: table number | status | order id */}
                          <div className="flex justify-between items-center px-3 py-2 bg-action-primary text-white">
                            <span className="font-bold text-lg tracking-wide">{table.table_number}</span>
                            {hasViewableOrder && (
                              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold
                                ${orderInfo.status === 'pending'   ? 'bg-orange-100 text-orange-700' :
                                  orderInfo.status === 'preparing' ? 'bg-blue-100 text-blue-700'   :
                                  orderInfo.status === 'ready'     ? 'bg-green-100 text-green-700' :
                                  orderInfo.status === 'served'    ? 'bg-purple-100 text-purple-700' :
                                  'bg-gray-100 text-gray-700'}`}>
                                {orderInfo.status?.toUpperCase()}
                              </span>
                            )}
                            {hasViewableOrder && (
                              <span className="text-xs opacity-80 font-mono">#{orderInfo.dinein_order_id || orderInfo.id}</span>
                            )}
                          </div>

                          {/* Body: icon area | CENTER: order count + total | actions */}
                          <div className={`p-3 flex items-center justify-between gap-2
                            ${statusKey === 'occupied' ? 'text-blue-600 bg-blue-50'     :
                              statusKey === 'served'   ? 'text-purple-600 bg-purple-50' :
                              statusKey === 'reserved' ? 'text-yellow-600 bg-yellow-50' :
                              'text-green-600 bg-green-50'}`}>

                            {/* Left icon */}
                            {statusKey === 'vacant'   && <span className="text-2xl text-green-400">—</span>}
                            {(statusKey === 'occupied' || statusKey === 'served') && <Eye size={22}/>}
                            {statusKey === 'reserved' && <Lock size={22}/>}

                            {/* ★ Centre: order count + total price */}
                            {hasViewableOrder && (
                              <div className="flex flex-col items-center flex-1">
                                <span className="text-xs font-bold text-gray-700">
                                  {orderCount} order{orderCount !== 1 ? 's' : ''}
                                </span>
                                {totalPrice && (
                                  <span className="text-sm font-bold text-action-primary">{totalPrice}</span>
                                )}
                              </div>
                            )}

                            {/* Right: print + delete */}
                            {hasViewableOrder && (
                              <div className="flex gap-2">
                                <button onClick={e => { e.stopPropagation(); onPrintBill && onPrintBill(orderInfo.id, table.id); }}
                                  className="text-yellow-600 hover:scale-110 transition-transform" title="Print Bill">
                                  <Printer size={22}/>
                                </button>
                                <button onClick={e => { e.stopPropagation(); onDeleteOrder && onDeleteOrder(orderInfo.id, table.id); }}
                                  className="text-red-600 hover:scale-110 transition-transform" title="Delete Order">
                                  <Trash2 size={22}/>
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Timer row — from root created_at */}
                          {hasViewableOrder && elapsedTime && (
                            <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-100">
                              <div className="flex items-center justify-center gap-1 text-xs font-semibold text-gray-600">
                                <Clock size={13} className="text-orange-500"/>
                                <span>{elapsedTime}</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Mark as served CTA */}
                        {hasViewableOrder && orderInfo.status === 'ready' && (
                          <button onClick={e => { e.stopPropagation(); onMarkAsServed && onMarkAsServed(orderInfo.id, table.id); }}
                            className="w-full px-4 py-2 bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors">
                            Mark as Served
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
};

// ─── Modals ───────────────────────────────────────────────────────────────────
const LineItemsModal = ({ isOpen, onClose, mainItem, lineItems, onAddWithSelectedAddons, onAddMainOnly }) => {
  const [selectedAddons, setSelectedAddons] = useState([]);
  useEffect(() => { if (isOpen) setSelectedAddons([]); }, [isOpen]);
  const toggleAddon = id => setSelectedAddons(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="rounded-lg max-w-lg w-full p-6 bg-bg-primary max-h-[80vh] overflow-y-auto">
        <h3 className="text-xl font-semibold mb-2 text-text-primary">{mainItem?.name}</h3>
        <p className="mb-4 text-text-secondary">Select add-ons:</p>
        <div className="space-y-2 mb-6">
          {lineItems.map(item => (
            <div key={item.id} onClick={() => toggleAddon(item.id)}
              className={`flex justify-between items-center p-3 rounded-lg cursor-pointer transition-all
                ${selectedAddons.includes(item.id) ? 'bg-action-primary/10 border-2 border-action-primary' : 'bg-bg-tertiary border border-border-default hover:border-action-primary/50'}`}>
              <div className="flex items-center gap-3 flex-1">
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${selectedAddons.includes(item.id) ? 'bg-action-primary border-action-primary' : 'border-gray-300'}`}>
                  {selectedAddons.includes(item.id) && <Check size={14} className="text-white"/>}
                </div>
                <span className="text-text-primary font-medium">{item.name}</span>
              </div>
              <span className="font-semibold text-action-primary">₹{item.unit_price}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-border-default bg-bg-tertiary text-text-primary hover:bg-gray-100">Cancel</button>
          <button onClick={onAddMainOnly} className="flex-1 px-4 py-2 rounded-lg bg-gray-600 text-white hover:bg-gray-700">Main Only</button>
          <button onClick={() => onAddWithSelectedAddons(selectedAddons)} disabled={selectedAddons.length === 0}
            className={`flex-1 px-4 py-2 rounded-lg transition-colors ${selectedAddons.length > 0 ? 'bg-action-primary text-white hover:bg-action-danger' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>
            Add ({selectedAddons.length})
          </button>
        </div>
      </div>
    </div>
  );
};

const DeleteConfirmModal = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="rounded-lg w-full max-w-sm bg-white shadow-xl">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-bold text-red-600">Delete Order</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700"><X size={20}/></button>
        </div>
        <div className="px-6 py-5"><p className="text-sm text-gray-700">Are you sure? This cannot be undone.</p></div>
        <div className="px-6 py-4 flex gap-3 bg-gray-50 rounded-b-lg">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg font-medium text-sm border border-gray-300 bg-white text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={() => { onConfirm(); onClose(); }} className="flex-1 py-2.5 rounded-lg bg-red-600 text-white font-medium text-sm hover:bg-red-700">Delete</button>
        </div>
      </div>
    </div>
  );
};

// ─── Main TakeOrder component ─────────────────────────────────────────────────
const TakeOrder = ({ clientId, token, onOrderUpdate, realm }) => {
  const [searchQuery, setSearchQuery]   = useState('');
  const searchInputRef                  = useRef(null);
  const [selectedTable, setSelectedTable] = useState('');
  const [cart, setCart]                 = useState([]);
  const [showCart, setShowCart]         = useState(true);
  const [tables, setTables]             = useState([]);
  const [categories, setCategories]     = useState([]);
  const [categoriesFlat, setCategoriesFlat] = useState([]);
  const [menuItems, setMenuItems]       = useState([]);
  const [loading, setLoading]           = useState(true);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [lineItemsModalOpen, setLineItemsModalOpen] = useState(false);
  const [selectedMainItem, setSelectedMainItem]     = useState(null);
  const [lineItemsDetails, setLineItemsDetails]     = useState([]);
  const [orderMode, setOrderMode]       = useState('dinein');
  const [takeawayTableId, setTakeawayTableId] = useState(null);
  const isPlacingRef                    = useRef(false);
  const isMobile                        = window.matchMedia('(max-width: 1024px)').matches;
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [currentView, setCurrentView]   = useState('floor');
  const [activeOrderId, setActiveOrderId]         = useState(null);
  const [activeDineinOrderId, setActiveDineinOrderId] = useState(null);
  const [hasNewItems, setHasNewItems]   = useState(false);
  const [currentBatchTimestamp, setCurrentBatchTimestamp] = useState(null);
  const [tableOrders, setTableOrders]   = useState({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [dieterySubCategories, setDieterySubCategories] = useState([]);
  const [sidebarCategories, setSidebarCategories] = useState([]);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [invoiceOrderData, setInvoiceOrderData] = useState(null);
  const [inventoryMap, setInventoryMap] = useState({});
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);

  // ─── Utils ───────────────────────────────────────────────────────────────
  const flattenCategoryTree = (tree, level = 0, parentId = null) => {
    let flat = [];
    tree.forEach(c => {
      flat.push({ id: c.id, name: c.name, level, parentId, hasChildren: !!(c.subCategories?.length) });
      if (c.subCategories?.length) flat = flat.concat(flattenCategoryTree(c.subCategories, level + 1, c.id));
    });
    return flat;
  };

  const menuConfig = React.useMemo(() => clientId ? getMenuConfig(clientId) : null, [clientId]);

  const getAddonCategoryId = itemCategoryId => {
    let cur = itemCategoryId;
    while (cur) {
      const cat = categoriesFlat.find(c => c.id === cur);
      if (!cat) break;
      if (cat.id === 'AC_ROOT_ID')     return 'addons_ac';
      if (cat.id === 'NON_AC_ROOT_ID') return 'addons_non_ac';
      cur = cat.parentId;
    }
    return 'addons_ac';
  };

  const getCategoryAndChildrenIds = (categories, targetId) => {
    const result = new Set();
    const traverse = (nodes, found = false) => {
      for (const n of nodes) {
        const isT = n.id === targetId;
        if (isT || found) result.add(n.id);
        if (n.children?.length) traverse(n.children, found || isT);
      }
    };
    traverse(categories);
    return Array.from(result);
  };

  const findCategoryNode = (tree, matcher) => {
    for (const c of tree) {
      if (c.id?.toLowerCase() === matcher.toLowerCase() || c.name?.toLowerCase() === matcher.toLowerCase()) return c;
      if (c.children?.length) { const f = findCategoryNode(c.children, matcher); if (f) return f; }
    }
    return null;
  };

  const getCategoriesAtLevel = (node, tgt, cur = 0) => {
    if (!node) return [];
    if (cur === tgt) return [node];
    let r = [];
    for (const ch of node.children || []) r = r.concat(getCategoriesAtLevel(ch, tgt, cur + 1));
    return r;
  };

  const findNodeAndChildren = (nodes, id) => {
    for (const n of nodes) {
      if (n.id === id) return n;
      if (n.children?.length) { const f = findNodeAndChildren(n.children, id); if (f) return f; }
    }
    return null;
  };

  // ─── Fetch ───────────────────────────────────────────────────────────────
  const fetchTables = async () => {
    const res = await axios.get(`${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/read`, { headers: { Authorization: `Bearer ${token}` } });
    const list = Array.isArray(res.data?.data) ? res.data.data.map(t => ({ ...t, table_number: t.name || t.table_number || "-" })) : [];
    const tw = list.find(t => Number(t.id) === 500); if (tw) setTakeawayTableId(tw.id);
    list.sort((a, b) => a.table_number.localeCompare(b.table_number, undefined, { numeric: true }));
    setTables(list);
    await fetchTableOrders(list);
  };

  const fetchTableOrders = async (tableList) => {
    try {
      const r = await axios.get(`${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/table`, { headers: { Authorization: `Bearer ${token}` } });
      const allOrders = r.data?.data || [];
      const map = {};
      tableList.forEach(table => {
        const s = table.status?.toLowerCase();
        if (s === 'occupied' || s === 'served') {
          const o = allOrders
            .filter(o => o.table_id === table.id && o.status?.toLowerCase() !== 'completed')
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
          if (o) map[table.id] = {
            id:              o.id,
            dinein_order_id: o.dinein_order_id,
            status:          o.status,
            created_at:      o.created_at,     // ★ root created_at (oldest)
            order_count:     o.order_count || 1,
            total_price:     o.total_price || 0,
          };
        }
      });
      setTableOrders(map);
    } catch (err) { console.error("Failed to fetch table orders:", err); }
  };

  const handleDeleteOrder = async (orderId, tableId) => {
    try {
      await axios.delete(`${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/delete`,
        { params: { dinein_order_id: orderId, client_id: clientId }, headers: { Authorization: `Bearer ${token}` } });
      const tableObj = tables.find(t => t.id === tableId);
      if (tableObj) await axios.post(`${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/update`,
        { id: tableId, client_id: clientId, name: tableObj.name, table_type: tableObj.table_type, status: 'Vacant', location_zone: tableObj.location_zone },
        { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Order deleted');
      await fetchTables(); setShowDeleteConfirm(false); setOrderToDelete(null);
    } catch (err) { console.error(err); toast.error('Failed to delete order'); }
  };

  const handleMarkAsServed = async (orderId, tableId) => {
    try {
      await axios.post(`${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/update`,
        { id: orderId, client_id: clientId, status: 'served' }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Order marked as served');
      await fetchTables();
    } catch (err) { console.error(err); toast.error('Failed to mark as served'); }
  };

  const combineDuplicateItems = items => {
    const m = new Map();
    items.forEach(item => {
      const k = item.item_id.toString();
      if (m.has(k)) m.get(k).quantity += item.quantity || 0;
      else m.set(k, { ...item });
    });
    return Array.from(m.values());
  };

  const handlePrintBill = async (orderId, tableId) => {
    try {
      setLoading(true);
      const r = await axios.get(`${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/table`, { headers: { Authorization: `Bearer ${token}` } });
      const order = (r.data?.data || []).find(o => o.id === orderId);
      if (!order) { toast.error('Order not found'); return; }
      const enriched = (order.items || []).map(item => {
        const inv = inventoryMap[item.item_id] || {};
        return { ...item, unit_price: item.unit_price ?? inv.unit_price ?? 0, name: item.item_name ?? inv.name ?? "Unnamed Item" };
      });
      setInvoiceOrderData({ ...order, items: combineDuplicateItems(enriched) });
      setInvoiceModalOpen(true);
    } catch (e) { console.error(e); toast.error("Failed to load order"); }
    finally { setLoading(false); }
  };

  const handleBillFromCart = async () => {
    if (!activeOrderId) { toast.error('No active order'); return; }
    try {
      setLoading(true);
      const r = await axios.get(`${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/table`, { headers: { Authorization: `Bearer ${token}` } });
      const order = (r.data?.data || []).find(o => o.id === activeOrderId);
      if (!order) { toast.error('Order not found'); return; }
      const enriched = (order.items || []).map(item => {
        const inv = inventoryMap[item.item_id] || {};
        return { ...item, unit_price: item.unit_price ?? inv.unit_price ?? 0, name: item.item_name ?? inv.name ?? "Unnamed" };
      });
      setInvoiceOrderData({ ...order, items: combineDuplicateItems(enriched) });
      setInvoiceModalOpen(true);
    } catch (e) { console.error(e); toast.error("Failed to load order"); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    const onBack = e => { if (currentView === 'order') { e.preventDefault(); setCurrentView('floor'); setShowCart(false); window.history.pushState({ view: 'floor' }, ''); } };
    window.addEventListener('popstate', onBack); return () => window.removeEventListener('popstate', onBack);
  }, [currentView]);
  useEffect(() => { window.history.pushState({ view: 'floor' }, ''); }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!clientId || !token || !menuConfig) return;
      try {
        setLoading(true);
        await fetchTables();
        const [catRes, itemRes, invRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/read_category?category_id=${menuConfig.root}`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/menu/read?inventory_id=menu`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/inventory/read`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        const iMap = {}; (invRes.data?.data || []).forEach(i => (iMap[i.id] = i)); setInventoryMap(iMap);
        const fullTree = catRes.data.data.filter(c => c.name?.toLowerCase() !== "all");
        const subIds   = new Set(); fullTree.forEach(c => c.subCategories?.forEach(s => subIds.add(s.id)));
        const topLevel = fullTree.filter(c => !subIds.has(c.id));
        const flatCats = flattenCategoryTree(topLevel);
        setCategoriesFlat(flatCats.map(c => ({ id: c.id, name: (c.name || '').trim(), parentId: c.parentId ?? c.parent_id ?? null })));
        const enriched = itemRes.data.data.map(item => { const cat = flatCats.find(c => c.id === item.category_id); return { ...item, category_name: cat?.name || "Uncategorized" }; });
        setMenuItems(enriched);
        const buildTree = () => {
          const map = new Map(); flatCats.forEach(c => map.set(c.id, { ...c, count: enriched.filter(i => i.category_id === c.id).length, children: [] }));
          const tree = []; map.forEach(c => { if (c.parentId && map.has(c.parentId)) map.get(c.parentId).children.push(c); else tree.push(c); }); return tree;
        };
        const categoryTree = buildTree().map(c => (c.id === 'dietery' || c.name?.toLowerCase() === 'dietery') ? { ...c, name: 'All Categories', count: c.children.length } : c);
        setCategories(categoryTree); setSidebarCategories(categoryTree);
        const rootNode = findCategoryNode(categoryTree, menuConfig.root);
        let qc = [];
        if (rootNode) { let l = menuConfig.level; while (l >= 0) { qc = getCategoriesAtLevel(rootNode, l); if (qc.length > 0) break; l--; } }
        setDieterySubCategories(qc);
      } catch (err) { console.error("Fetch error:", err); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [clientId, token, realm, menuConfig]);

  const selectedCategoryName = categoriesFlat.find(c => c.id === selectedCategoryId)?.name || "All Categories";

  const getFilteredItems = () => {
    const q = (searchQuery || '').trim().toLowerCase();
    let items = menuItems;
    if (selectedCategoryId) { const ids = getCategoryAndChildrenIds(categories, selectedCategoryId); items = items.filter(i => ids.includes(i.category_id)); }
    if (!q) return items;
    return items.filter(i => (i.name || '').toLowerCase().includes(q) || (i.category_name || '').toLowerCase().includes(q) || String(i.code || '').toLowerCase().includes(q));
  };
  const filteredItems = getFilteredItems();

  // ─── Cart ops ─────────────────────────────────────────────────────────────
  const handleItemClick = item => {
    if (item.line_item_id && Array.isArray(item.line_item_id) && item.line_item_id.length > 0) {
      const addonCatId = getAddonCategoryId(item.category_id);
      const lineItems  = item.line_item_id.map(id => {
        const ai = menuItems.find(i => i.id === id); if (!ai) return null;
        const path = []; let cur = ai.category_id; const vis = new Set();
        while (cur && !vis.has(cur)) { vis.add(cur); const cat = categoriesFlat.find(c => c.id === cur); if (!cat) break; path.unshift(cat.id); cur = cat.parentId || cat.parent_id; }
        return path.includes(addonCatId) ? ai : null;
      }).filter(Boolean);
      if (lineItems.length > 0) { setSelectedMainItem(item); setLineItemsDetails(lineItems); setLineItemsModalOpen(true); }
      else addToCart(item);
    } else addToCart(item);
  };

  const addToCart = (item, parentItemKey = null) => {
    setHasNewItems(true);
    const ts   = Date.now() + Math.random();
    const uKey = `${item.id}_${ts}`;
    let batch  = currentBatchTimestamp;
    if (!batch) { batch = Date.now(); setCurrentBatchTimestamp(batch); }
    setCart(prev => [...prev, {
      id: Number(item.id), name: item.name, unit_price: item.unit_price || 0,
      image_id: item.image_id, discount: item.discount || 0, slug: item.slug,
      category: item.category_name, quantity: 1, note: "",
      frontend_unique_key: uKey, batch_timestamp: batch,
      is_new_item: true, saved_sub_order: false,
      parent_item_key: parentItemKey, is_addon: !!parentItemKey,
    }]);
    if (!isMobile) setShowCart(true);
  };

  const handleAddMainItemWithSelectedAddons = selectedAddonIds => {
    if (!selectedMainItem) return;
    const ts = Date.now() + Math.random(); const mKey = `${selectedMainItem.id}_${ts}`;
    let batch = currentBatchTimestamp; if (!batch) { batch = Date.now(); setCurrentBatchTimestamp(batch); }
    setCart(prev => [...prev, {
      id: Number(selectedMainItem.id), name: selectedMainItem.name, unit_price: selectedMainItem.unit_price || 0,
      image_id: selectedMainItem.image_id, discount: selectedMainItem.discount || 0, slug: selectedMainItem.slug,
      category: selectedMainItem.category_name, quantity: 1, note: "",
      frontend_unique_key: mKey, batch_timestamp: batch, is_new_item: true, saved_sub_order: false, has_addons: selectedAddonIds.length > 0,
    }]);
    lineItemsDetails.filter(i => selectedAddonIds.includes(i.id)).forEach(addon => {
      const ats = Date.now() + Math.random(); const aKey = `${addon.id}_${ats}`;
      setCart(prev => [...prev, {
        id: Number(addon.id), name: addon.name, unit_price: addon.unit_price || 0,
        image_id: addon.image_id, discount: addon.discount || 0, slug: addon.slug,
        category: addon.category_name, quantity: 1, note: "",
        frontend_unique_key: aKey, batch_timestamp: batch, is_new_item: true, saved_sub_order: false,
        parent_item_key: mKey, is_addon: true,
      }]);
    });
    setHasNewItems(true); setLineItemsModalOpen(false); setSelectedMainItem(null); setLineItemsDetails([]);
  };

  const handleAddMainItemOnly = () => {
    if (!selectedMainItem) return;
    const ts = Date.now() + Math.random(); const uKey = `${selectedMainItem.id}_${ts}`;
    let batch = currentBatchTimestamp; if (!batch) { batch = Date.now(); setCurrentBatchTimestamp(batch); }
    setHasNewItems(true);
    setCart(prev => [...prev, {
      id: Number(selectedMainItem.id), name: selectedMainItem.name || 'Unnamed Item', unit_price: selectedMainItem.unit_price || 0,
      image_id: selectedMainItem.image_id, discount: selectedMainItem.discount || 0, slug: selectedMainItem.slug,
      category: selectedMainItem.category_name, quantity: 1, note: "",
      frontend_unique_key: uKey, batch_timestamp: batch, is_new_item: true, saved_sub_order: false,
    }]);
    setLineItemsModalOpen(false); setSelectedMainItem(null); setLineItemsDetails([]);
    if (!isMobile) setShowCart(true);
  };

  const removeFromCart = (itemId, uniqueKey = null) => {
    setHasNewItems(true);
    if (uniqueKey) setCart(cart.filter(i => i.frontend_unique_key !== uniqueKey && i.parent_item_key !== uniqueKey));
    else setCart(cart.filter(i => i.id !== itemId));
  };

  const updateQuantity = (itemId, change, uniqueKey = null) => {
    setHasNewItems(true);
    setCart(cart.map(item => {
      const match = uniqueKey ? item.frontend_unique_key === uniqueKey : item.id === itemId && !item.frontend_unique_key;
      if (match) { const q = item.quantity + change; return q > 0 ? { ...item, quantity: q } : null; }
      return item;
    }).filter(Boolean));
  };

  // ★ Total = sum of unit_price * qty (no GST/CST)
  const getTotalPrice = () => cart.reduce((t, i) => t + (i.unit_price || 0) * i.quantity, 0).toFixed(2);

  // ─── Place order ──────────────────────────────────────────────────────────
  const handlePlaceOrder = async () => {
    if (isPlacingRef.current || !canPlaceOrder) return;
    isPlacingRef.current = true; setIsPlacingOrder(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };

      if (activeOrderId && activeDineinOrderId) {
        const newOnly = cart.filter(i => i.is_new_item && !i.saved_sub_order);
        if (newOnly.length > 0) {
          const r = await axios.post(
            `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/create-sub-order`,
            { items: newOnly.map(i => ({ item_id: i.id, item_name: i.name, quantity: i.quantity, unit_price: i.unit_price, line_total: i.unit_price * i.quantity, slug: i.slug, frontend_unique_key: i.frontend_unique_key })) },
            { headers, params: { client_id: clientId, parent_dinein_order_id: activeDineinOrderId } },
          );
          toast.success(`Sub-order ${r.data.data.dinein_order_id} created!`);
        }
      } else {
        // ★ Fresh order — total = sum of items, no GST/CST
        const total = cart.reduce((s, i) => s + (i.unit_price || 0) * i.quantity, 0);
        await axios.post(
          `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/create`,
          {
            client_id: clientId, table_id: Number(selectedTable),
            price: total, gst: 0, cst: 0, total_price: total,
            status: "pending",
            items: cart.map(i => ({ item_id: i.id, item_name: i.name, quantity: i.quantity, unit_price: i.unit_price, line_total: i.unit_price * i.quantity, status: "pending", slug: i.slug })),
          },
          { headers },
        );
        const tableToUpdate = tables.find(t => t.id.toString() === selectedTable);
        if (tableToUpdate) await axios.post(`${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/update`,
          { ...tableToUpdate, id: Number(selectedTable), status: "Occupied", table_type: tableToUpdate.table_type.toString() },
          { headers });
      }

      await fetchTables();
      setCart([]); setActiveOrderId(null); setActiveDineinOrderId(null);
      setShowCart(false); setCurrentView("floor"); setCurrentBatchTimestamp(null); setHasNewItems(false);
      toast.success('Order placed!');
    } catch (err) { console.error("ORDER ERROR:", err); toast.error("Order failed"); }
    finally { isPlacingRef.current = false; setIsPlacingOrder(false); }
  };

  const handleTableSelect  = table => { setSelectedTable(table.id.toString()); setCurrentView('order'); window.history.pushState({ view: 'order' }, ''); };
  const handleTakeawaySelect = () => { setOrderMode('takeaway'); setSelectedTable(takeawayTableId.toString()); setCurrentView('order'); window.history.pushState({ view: 'order' }, ''); };
  const handleClearCart    = () => { if (cart.length === 0) return; setShowClearConfirm(true); };
  const confirmClearCart   = () => {
    setCart([]); setSelectedTable(''); setCurrentView('floor'); setShowCart(false); setShowClearConfirm(false);
    setActiveOrderId(null); setActiveDineinOrderId(null); setCurrentBatchTimestamp(null); setHasNewItems(false);
  };

  const handleViewOrder = async table => {
    if (menuItems.length === 0) { alert("Menu still loading..."); return; }
    try {
      setLoading(true);
      const r = await axios.get(`${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/table`, { headers: { Authorization: `Bearer ${token}` } });
      const allOrders = r.data?.data || [];
      const tableGroups = allOrders.filter(o => o.table_id === table.id && o.status?.toLowerCase() !== 'completed');
      if (tableGroups.length === 0) { alert('No active order'); return; }
      const activeOrder = tableGroups.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

      setActiveOrderId(activeOrder.id);
      setActiveDineinOrderId(activeOrder.dinein_order_id);
      setHasNewItems(false);
      setCurrentBatchTimestamp(null);

      // ★ All server items are old/read-only + carry item status for display
      const reconstructedCart = (activeOrder.items || []).map(item => {
        const menuItem = menuItems.find(mi => Number(mi.id) === Number(item.item_id));
        return {
          id:                   Number(item.item_id),
          name:                 item.item_name || menuItem?.name || 'Unnamed Item',
          unit_price:           item.unit_price || menuItem?.unit_price || 0,
          quantity:             item.quantity || 1,
          note:                 item.note || '',
          image_id:             menuItem?.image_id,
          discount:             menuItem?.discount || 0,
          slug:                 item.slug || menuItem?.slug,
          category:             menuItem?.category_name,
          frontend_unique_key:  item.frontend_unique_key,
          batch_timestamp:      null,
          is_new_item:          false,
          saved_sub_order:      true,
          status:               item.status || "pending",    // ★ item-level status
          batch_label:          item.batch_label,            // ★ sub-order label
          sub_order_id:         item.sub_order_id,
        };
      });

      setCart(reconstructedCart);
      setSelectedTable(table.id.toString());
      setOrderMode('dinein');
      setCurrentView('order');
      setShowCart(true);
      window.history.pushState({ view: 'order' }, '');
    } catch (err) { console.error(err); alert('Failed to load order'); }
    finally { setLoading(false); }
  };

  const handleBackToTables = () => {
    setCurrentView('floor'); setShowCart(false); setSelectedTable(''); setCart([]);
    setActiveOrderId(null); setActiveDineinOrderId(null); setCurrentBatchTimestamp(null); setHasNewItems(false);
    setSelectedCategoryId("All Categories"); setSidebarCategories(categories);
  };

  // ─── Split cart ───────────────────────────────────────────────────────────
  const oldItems = cart.filter(i => !i.is_new_item || i.saved_sub_order);
  const newItems = cart.filter(i => i.is_new_item && !i.saved_sub_order);

  const groupedNewItems   = newItems.reduce((acc, item) => { const b = item.batch_timestamp || 'default'; if (!acc[b]) acc[b] = []; acc[b].push(item); return acc; }, {});
  const batchTimestamps   = Object.keys(groupedNewItems).sort();
  const canPlaceOrder     = orderMode === 'takeaway' ? cart.length > 0 : activeOrderId ? hasNewItems && newItems.length > 0 : selectedTable && cart.length > 0;

  const getGroupedCartItems = items => {
    const grouped = []; const processed = new Set();
    items.forEach(item => {
      if (processed.has(item.frontend_unique_key || item.id)) return;
      if (!item.is_addon && !item.parent_item_key) {
        const addons = items.filter(i => i.parent_item_key === item.frontend_unique_key);
        grouped.push({ main: { ...item }, addons });
        processed.add(item.frontend_unique_key || item.id);
        addons.forEach(a => processed.add(a.frontend_unique_key || a.id));
      }
    });
    return grouped;
  };

  // ─── Old item row (read-only) with status badge + batch label ────────────
  const OldItemRow = ({ group }) => {
    const { main, addons } = group;
    return (
      <div className="space-y-1">
        <div className="flex items-start gap-2 p-3 rounded-xl border bg-white shadow-sm">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-11 h-11 rounded-lg overflow-hidden border bg-white shrink-0">
              <ImagePreview clientId={clientId} imageId={main.image_id} token={token} alt={main.name}
                baseUrl={import.meta.env.VITE_API_DOCUMENT_SERVICE_URL}
                urlBuilder={({ baseUrl, clientId, imageId }) => `${baseUrl}/${clientId}/document/download?doc_id=${imageId}`}
                className="w-full h-full object-cover"/>
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-semibold truncate text-gray-800">{main.name}</h4>
              <p className="text-xs font-bold text-action-primary">₹{(main.unit_price - (main.discount || 0)).toFixed(2)}</p>
              {/* ★ Sub-order label + item status */}
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                {main.batch_label && main.batch_label !== activeDineinOrderId && (
                  <span className="text-xs text-orange-500 font-mono font-semibold">#{main.batch_label}</span>
                )}
                {main.status && <ItemStatusBadge status={main.status}/>}
              </div>
            </div>
          </div>
          <span className="text-sm font-semibold text-gray-500 self-center">×{main.quantity}</span>
        </div>
        {addons.map(addon => (
          <div key={addon.frontend_unique_key || addon.id} className="flex items-center gap-2 p-2 pl-8 rounded-lg border border-dashed bg-blue-50/50">
            <span className="text-xs text-blue-600">↳</span>
            <span className="text-sm text-gray-700 truncate flex-1">{addon.name}</span>
            <span className="text-xs font-semibold text-blue-600">₹{(addon.unit_price - (addon.discount || 0)).toFixed(2)}</span>
            <span className="text-xs text-gray-500 w-6 text-center">×{addon.quantity}</span>
          </div>
        ))}
      </div>
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="bg-bg-primary p-0 h-[calc(100vh-4rem)] overflow-x-hidden overflow-y-auto">
      {currentView === 'floor' && (
        <TableReservation
          tables={tables} onSelectTable={handleTableSelect} onSelectTakeaway={handleTakeawaySelect}
          onSelectDineIn={() => setOrderMode('dinein')} onViewOrder={handleViewOrder} orderMode={orderMode}
          tableOrders={tableOrders} onPrintBill={handlePrintBill}
          onDeleteOrder={(orderId, tableId) => { setOrderToDelete({ orderId, tableId }); setShowDeleteConfirm(true); }}
          onMarkAsServed={handleMarkAsServed}
        />
      )}

      {currentView === 'order' && (
        <div className="mx-auto px-2 py-2">
          <div className="grid lg:grid-cols-4 gap-1">
            {/* Category sidebar */}
            <div className="w-full lg:col-span-1">
              <div className="lg:h-[calc(98dvh-4rem)] lg:overflow-y-auto pr-1">
                <CategoryTree categories={sidebarCategories} selectedCategoryId={selectedCategoryId} onSelectCategory={setSelectedCategoryId} defaultOpenAll/>
              </div>
            </div>

            {/* Menu + cart */}
            <div className="lg:col-span-3 flex gap-2">
              {/* Menu grid */}
              <div className="transition-all duration-300 border-default border-border-default p-2 rounded-lg flex-1 overflow-y-auto h-[calc(98dvh-4rem)] lg:h-auto lg:max-h-[calc(98dvh-4rem)]">
                <div className="space-y-2">
                  {/* Sub-category pills */}
                  <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                    {dieterySubCategories.map(cat => (
                      <button key={cat.id} onClick={() => { setSelectedCategoryId(cat.id); const n = findNodeAndChildren(categories, cat.id); if (n) setSidebarCategories([n]); }}
                        className={`px-3 py-1.5 rounded-lg text-sm font-semibold border whitespace-nowrap transition-all flex-shrink-0
                          ${selectedCategoryId === cat.id ? 'bg-action-primary text-white border-action-primary' : 'bg-bg-tertiary text-text-primary hover:border-action-primary'}`}>
                        {cat.name}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center justify-between lg:flex-row flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <button onClick={handleBackToTables} className="p-2 rounded-lg bg-bg-tertiary border border-border-default hover:bg-bg-secondary"><ArrowLeft size={20}/></button>
                      <h2 className="text-xl font-semibold text-text-primary truncate">{selectedCategoryName}<span className="text-sm ml-2">({filteredItems.length})</span></h2>
                    </div>
                    <div className="relative w-64 max-w-full">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"/>
                      <input ref={searchInputRef} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search items..."
                        className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border-default bg-bg-primary focus:outline-none focus:ring-2 focus:ring-action-primary"/>
                    </div>
                  </div>
                </div>

                <div className={`grid gap-2 grid-cols-2 md:grid-cols-4 ${showCart ? 'lg:grid-cols-3' : 'lg:grid-cols-4'}`}>
                  {filteredItems.map(item => {
                    const dp = item.discount && item.unit_price && Number(item.discount) > 0 ? ((Number(item.discount) * 100) / Number(item.unit_price)).toFixed(0) : null;
                    const ac = item.line_item_id?.length || 0;
                    return (
                      <div onClick={() => handleItemClick(item)} key={item.id}
                        className="flex gap-2 items-center bg-bg-primary border-default border-border-default rounded-xl p-1 shadow-sm hover:shadow-md transition cursor-pointer">
                        <div className="w-14 h-16 rounded-lg overflow-hidden shrink-0 bg-gray-100">
                          <ImagePreview clientId={clientId} imageId={item.image_id} token={token} alt={item.name}
                            baseUrl={import.meta.env.VITE_API_DOCUMENT_SERVICE_URL}
                            urlBuilder={({ baseUrl, clientId, imageId }) => `${baseUrl}/${clientId}/document/download?doc_id=${imageId}`}
                            className="w-full h-full object-cover"/>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-text-primary line-clamp-2">{item.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            {dp ? (<><span className="text-sm font-bold text-action-primary">₹{(item.unit_price - item.discount).toFixed(0)}</span><span className="text-xs line-through text-text-secondary">₹{item.unit_price}</span><span className="text-xs text-action-danger font-semibold">{dp}% OFF</span></>) :
                              (<span className="text-sm font-bold text-action-primary">₹{item.unit_price}</span>)}
                          </div>
                          {ac > 0 && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">+{ac} addon{ac > 1 ? 's' : ''}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Cart panel */}
              {!isMobile && (
                <div className={`transition-all duration-300 ease-in-out ${showCart ? 'w-[22rem] opacity-100 z-30' : 'w-0 opacity-0'}`}>
                  <div className="border border-gray-300 rounded-xl bg-white shadow-xl lg:h-[calc(98dvh-4rem)] flex flex-col">
                    <div className="flex flex-col h-full p-4">
                      {/* Cart header */}
                      <div className="pb-3 border-b space-y-2">
                        <h2 className="text-lg font-semibold text-gray-800">Your Order</h2>
                        <div className="flex items-center justify-between text-sm bg-gray-50 px-3 py-2 rounded-lg">
                          <div className="flex items-center gap-2">
                            {orderMode === 'dinein' && selectedTable && (
                              <span className="font-semibold text-lg text-gray-700">{tables.find(t => t.id.toString() === selectedTable)?.table_number}</span>
                            )}
                            {activeDineinOrderId && <span className="text-xs text-gray-500 font-mono">#{activeDineinOrderId}</span>}
                          </div>
                          {/* ★ Total price — no GST/CST */}
                          <span className="text-base font-bold text-red-600">₹{getTotalPrice()}</span>
                        </div>
                      </div>

                      {/* Dine-in / takeaway toggle */}
                      <div className="mt-3">
                        <div className="flex bg-gray-100 rounded-lg p-1">
                          <button onClick={() => setOrderMode('dinein')} className={`flex-1 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2 ${orderMode === 'dinein' ? 'bg-action-primary text-white shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}><Users size={16}/>Dine In</button>
                          <button onClick={() => { setOrderMode('takeaway'); setSelectedTable(takeawayTableId?.toString()); }} className={`flex-1 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2 ${orderMode === 'takeaway' ? 'bg-action-primary text-white shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}><Package size={16}/>Takeaway</button>
                        </div>
                      </div>

                      {cart.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center text-sm text-gray-400">No items added</div>
                      ) : (
                        <>
                          <div className="flex-1 overflow-y-auto mt-4 space-y-2">
                            {/* OLD items — read-only with status badge */}
                            {getGroupedCartItems(oldItems).map((group, idx) => (
                              <OldItemRow key={`old-${idx}`} group={group}/>
                            ))}

                            {/* Divider */}
                            {activeOrderId && oldItems.length > 0 && newItems.length > 0 && (
                              <div className="flex items-center gap-2 my-2">
                                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-orange-400 to-transparent"/>
                                <span className="text-xs font-semibold text-orange-600 px-2">NEW ITEMS</span>
                                <div className="flex-1 h-px bg-gradient-to-r from-orange-400 via-transparent to-transparent"/>
                              </div>
                            )}

                            {/* NEW items — editable */}
                            {batchTimestamps.map((ts, bi) => (
                              <React.Fragment key={ts}>
                                {bi > 0 && (
                                  <div className="flex items-center gap-2 my-2">
                                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-orange-400 to-transparent"/>
                                    <span className="text-xs font-semibold text-orange-600 px-2">NEW ITEMS</span>
                                    <div className="flex-1 h-px bg-gradient-to-r from-orange-400 via-transparent to-transparent"/>
                                  </div>
                                )}
                                {getGroupedCartItems(groupedNewItems[ts]).map((group, idx) => (
                                  <div key={`new-${ts}-${idx}`} className="space-y-1">
                                    <div className="flex items-center gap-2 p-3 rounded-xl border bg-orange-50 shadow-sm">
                                      <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className="w-11 h-11 rounded-lg overflow-hidden border bg-white shrink-0">
                                          <ImagePreview clientId={clientId} imageId={group.main.image_id} token={token} alt={group.main.name}
                                            baseUrl={import.meta.env.VITE_API_DOCUMENT_SERVICE_URL}
                                            urlBuilder={({ baseUrl, clientId, imageId }) => `${baseUrl}/${clientId}/document/download?doc_id=${imageId}`}
                                            className="w-full h-full object-cover"/>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <h4 className="text-sm font-semibold truncate text-gray-800">{group.main.name}</h4>
                                          <p className="text-xs font-bold text-action-primary">₹{(group.main.unit_price - (group.main.discount || 0)).toFixed(2)}</p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <button onClick={() => updateQuantity(group.main.id, -1, group.main.frontend_unique_key)} className="w-7 h-7 flex items-center justify-center border rounded hover:bg-gray-100"><Minus size={14}/></button>
                                        <span className="w-6 text-center text-sm font-semibold">{group.main.quantity}</span>
                                        <button onClick={() => updateQuantity(group.main.id, 1, group.main.frontend_unique_key)} className="w-7 h-7 flex items-center justify-center border rounded hover:bg-gray-100"><Plus size={14}/></button>
                                      </div>
                                      <button onClick={() => removeFromCart(group.main.id, group.main.frontend_unique_key)} className="text-action-primary hover:text-red-700"><X size={16}/></button>
                                    </div>
                                    {group.addons.map(addon => (
                                      <div key={addon.frontend_unique_key} className="flex items-center gap-2 p-2 pl-8 rounded-lg border border-dashed bg-orange-100/50">
                                        <span className="text-xs text-orange-600">↳</span>
                                        <span className="text-sm text-gray-700 truncate flex-1">{addon.name}</span>
                                        <span className="text-xs font-semibold text-orange-600">₹{(addon.unit_price - (addon.discount || 0)).toFixed(2)}</span>
                                        <span className="text-xs text-gray-500 w-6 text-center">×{addon.quantity}</span>
                                      </div>
                                    ))}
                                  </div>
                                ))}
                              </React.Fragment>
                            ))}
                          </div>

                          {/* Cart actions */}
                          <div className="grid grid-cols-2 gap-2 mt-3">
                            <button onClick={handlePlaceOrder}
                              className={`py-2 rounded-lg text-sm font-semibold ${canPlaceOrder && !isPlacingOrder ? 'bg-action-primary text-white hover:bg-action-danger' : 'bg-gray-300 cursor-not-allowed'}`}
                              disabled={!canPlaceOrder || isPlacingOrder}>
                              {isPlacingOrder ? 'Placing...' : 'Place Order'}
                            </button>
                            <button onClick={handleBillFromCart} className="py-2 rounded-lg text-sm font-semibold bg-green-600 text-white hover:bg-green-700 flex items-center justify-center gap-1"><FileText size={16}/>Bill</button>
                            <button onClick={handleClearCart} className="py-2 border rounded-lg text-sm hover:bg-gray-100">Clear</button>
                            <button onClick={() => toast.info('Print KOT coming soon')} className="py-2 border rounded-lg text-sm hover:bg-gray-100 flex items-center justify-center gap-1"><PrinterIcon size={16}/>Print KOT</button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg p-6 w-80 shadow-xl">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Clear all items?</h3>
            <div className="flex gap-3">
              <button onClick={() => setShowClearConfirm(false)} className="flex-1 py-2 border rounded-lg hover:bg-gray-100">Cancel</button>
              <button onClick={confirmClearCart} className="flex-1 py-2 bg-action-primary text-white rounded-lg hover:bg-action-danger">Clear</button>
            </div>
          </div>
        </div>
      )}

      {cart.length > 0 && !showCart && (
        <button onClick={() => setShowCart(true)} className="fixed bottom-6 right-6 bg-action-primary text-white p-4 rounded-full shadow-lg z-40"><ShoppingCart size={24}/></button>
      )}

      <LineItemsModal isOpen={lineItemsModalOpen} onClose={() => { setLineItemsModalOpen(false); setSelectedMainItem(null); setLineItemsDetails([]); }} mainItem={selectedMainItem} lineItems={lineItemsDetails} onAddMainOnly={handleAddMainItemOnly} onAddWithSelectedAddons={handleAddMainItemWithSelectedAddons}/>
      <DeleteConfirmModal isOpen={showDeleteConfirm} onClose={() => { setShowDeleteConfirm(false); setOrderToDelete(null); }} onConfirm={() => { if (orderToDelete) handleDeleteOrder(orderToDelete.orderId, orderToDelete.tableId); }}/>

      {invoiceModalOpen && invoiceOrderData && (
        <InvoiceModal clientId={clientId} token={token} selectedOrder={invoiceOrderData}
          tablesMap={tables.reduce((m, t) => { m[t.id] = t; return m; }, {})} inventoryMap={inventoryMap}
          onClose={() => { setInvoiceModalOpen(false); setInvoiceOrderData(null); fetchTables(); }}
          onSave={id => { console.log('Invoice saved:', id); fetchTables(); }}/>
      )}
    </div>
  );
};

export default TakeOrder;