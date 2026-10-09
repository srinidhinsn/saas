import React from 'react';
import {
    ShoppingCart, Plus, Minus, X, Search,
    Users, Package, Trash2, ArrowLeft, FileText,
    Save, User,
} from 'lucide-react';
import CategoryTree from '../../MainComponents/InventoryServices/CategoryTree';
import ImagePreview from '../../utils/ImagePreview';
import CustomerChat from '../../Constants/Chatbots/CustomerChat';
import { getDietaryFromSlug, getGroupedCartItems } from '../../utils/Menu-utils/menuUtils';
import { useOrderPlace } from './orderPlace.handlers';
import { TableReservation } from './OrderPlace.floor';
import { OrderModals } from './OrderPlace.modals';

// ─────────────────────────────────────────────────────────────────────────────
// ItemStatusBadge
// ─────────────────────────────────────────────────────────────────────────────

const ItemStatusBadge = ({ status }) => {
    const cfg = {
        pending: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Pending' },
        preparing: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Preparing' },
        ready: { bg: 'bg-green-100', text: 'text-green-700', label: 'Ready' },
        served: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Served' },
        cancelled: { bg: 'bg-red-50', text: 'text-red-400', label: 'Cancelled' },
    }[status] || { bg: 'bg-gray-100', text: 'text-gray-500', label: status || '—' };

    return (
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
            {cfg.label}
        </span>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// CustomerCapturePanel
// ─────────────────────────────────────────────────────────────────────────────

const CustomerCapturePanel = ({
    addresses, selectedAddressId, setSelectedAddressId
}) => {
    if (!addresses || addresses.length === 0) return null;

    return (
        <div className="px-3 py-2 rounded-xl border border-border-default bg-bg-tertiary shadow-sm">
            <select
                value={selectedAddressId}
                onChange={e => setSelectedAddressId(e.target.value)}
                className="w-full text-sm px-2 py-1.5 rounded-lg border border-border-default bg-bg-primary focus:outline-none focus:ring-2 focus:ring-action-primary"
            >
                <option value="">Select Address</option>
                {addresses.map(addr => (
                    <option key={addr.id} value={addr.id}>
                        {[addr.name]
                            .filter(Boolean).join(', ') || 'Address'}
                    </option>
                ))}
            </select>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// OldItemRow — previously placed items (read-only in cart)
// ─────────────────────────────────────────────────────────────────────────────

const OldItemRow = ({ group, clientId, token, activeDineinOrderId, onRequestDelete }) => {
    const { main, addons } = group;
    return (
        <div className="space-y-1">
            <div className="flex items-start gap-2 p-3 rounded-xl border bg-white shadow-sm">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-11 h-11 rounded-lg overflow-hidden border bg-white shrink-0">
                        <ImagePreview
                            clientId={clientId}
                            imageId={main.image_id}
                            token={token}
                            alt={main.name}
                            baseUrl={import.meta.env.VITE_API_DOCUMENT_SERVICE_URL}
                            urlBuilder={({ baseUrl, clientId, imageId }) =>
                                `${baseUrl}/${clientId}/document/download?doc_id=${imageId}`}
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-semibold truncate text-gray-800">{main.name}</h4>
                        <p className="text-xs font-bold text-action-primary">
                            ₹{(main.unit_price * (1 - (Number(main.discount) || 0) / 100)).toFixed(2)}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            {main.batch_label && main.batch_label !== activeDineinOrderId && (
                                <span className="text-xs text-orange-500 font-mono font-semibold">
                                    #{main.batch_label}
                                </span>
                            )}
                            {main.status && <ItemStatusBadge status={main.status} />}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 self-center">
                    <span className="text-sm font-semibold text-gray-500">×{main.quantity}</span>
                    <button
                        onClick={() => onRequestDelete && onRequestDelete(main)}
                        className="text-red-400 hover:text-red-600 transition-colors"
                        title="Remove item"
                    >
                        <Trash2 size={15} />
                    </button>
                </div>
            </div>

            {addons.map(addon => (
                <div
                    key={addon.frontend_unique_key || addon.id}
                    className="flex items-center gap-2 p-2 pl-8 rounded-lg border border-dashed bg-blue-50/50"
                >
                    <span className="text-xs text-blue-600">↳</span>
                    <span className="text-sm text-gray-700 truncate flex-1">{addon.name}</span>
                    <span className="text-xs font-semibold text-blue-600">
                        ₹{(addon.unit_price * (1 - (Number(addon.discount) || 0) / 100)).toFixed(2)}
                    </span>
                    <span className="text-xs text-gray-500 w-6 text-center">×{addon.quantity}</span>
                </div>
            ))}
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// NewItemRow — newly added items (editable quantity / removable)
// ─────────────────────────────────────────────────────────────────────────────

const NewItemRow = ({ group, clientId, token, onUpdateQuantity, onRemove }) => {
    const { main, addons } = group;
    return (
        <div className="space-y-1">
            <div className="flex items-center gap-2 p-3 rounded-xl border bg-orange-50 shadow-sm">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-11 h-11 rounded-lg overflow-hidden border bg-white shrink-0">
                        <ImagePreview
                            clientId={clientId}
                            imageId={main.image_id}
                            token={token}
                            alt={main.name}
                            baseUrl={import.meta.env.VITE_API_DOCUMENT_SERVICE_URL}
                            urlBuilder={({ baseUrl, clientId, imageId }) =>
                                `${baseUrl}/${clientId}/document/download?doc_id=${imageId}`}
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-semibold truncate text-gray-800">{main.name}</h4>
                        <p className="text-xs font-bold text-action-primary">
                            ₹{(main.unit_price * (1 - (Number(main.discount) || 0) / 100)).toFixed(2)}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={() => onUpdateQuantity(main.id, -1, main.frontend_unique_key)}
                        className="w-7 h-7 flex items-center justify-center border rounded hover:bg-gray-100"
                    >
                        <Minus size={14} />
                    </button>
                    <span className="w-6 text-center text-sm font-semibold">{main.quantity}</span>
                    <button
                        onClick={() => onUpdateQuantity(main.id, 1, main.frontend_unique_key)}
                        className="w-7 h-7 flex items-center justify-center border rounded hover:bg-gray-100"
                    >
                        <Plus size={14} />
                    </button>
                </div>

                <button
                    onClick={() => onRemove(main.id, main.frontend_unique_key)}
                    className="text-action-primary hover:text-red-700"
                >
                    <X size={16} />
                </button>
            </div>

            {addons.map(addon => (
                <div
                    key={addon.frontend_unique_key}
                    className="flex items-center gap-2 p-2 pl-8 rounded-lg border border-dashed bg-orange-100/50"
                >
                    <span className="text-xs text-orange-600">↳</span>
                    <span className="text-sm text-gray-700 truncate flex-1">{addon.name}</span>
                    <span className="text-xs font-semibold text-orange-600">
                        ₹{(addon.unit_price * (1 - (Number(addon.discount) || 0) / 100)).toFixed(2)}
                    </span>
                    <span className="text-xs text-gray-500 w-6 text-center">×{addon.quantity}</span>
                </div>
            ))}
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Shared cart pieces (markup identical to the original desktop/mobile carts)
// ─────────────────────────────────────────────────────────────────────────────

const NewItemsDivider = () => (
    <div className="flex items-center gap-2 my-2">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-orange-400 to-transparent" />
        <span className="text-xs font-semibold text-orange-600 px-2">NEW ITEMS</span>
        <div className="flex-1 h-px bg-gradient-to-r from-orange-400 via-transparent to-transparent" />
    </div>
);

// Table / takeaway select + transfer + order id + total
const CartTableBar = ({ o }) => {
    const [, setShowTransfer] = o.modals.transfer;
    return (
        <div className="flex items-center justify-between text-sm bg-gray-50 px-3 py-2 rounded-lg">
            <div className="flex items-center gap-2">
                {o.orderMode === 'dinein' && o.selectedTable && (
                    <span className="font-semibold text-lg text-gray-700">
                        {o.tables.find(t => t.id.toString() === o.selectedTable)?.table_number}
                    </span>
                )}

                {o.orderMode === 'takeaway' && (
                    <select
                        value={o.selectedTable}
                        onChange={(e) => {
                            o.setSelectedTable(e.target.value);
                            o.setTakeawayTableId(e.target.value);
                        }}
                        className="border-none outline-none rounded px-2 py-1 text-sm bg-white"
                    >
                        <option value="">Select Table</option>
                        {o.takeawayTables.map(t => (
                            <option key={t.id} value={t.id}>
                                {t.table_number}
                            </option>
                        ))}
                    </select>
                )}
                {o.activeOrderId && (
                    <button
                        onClick={() => setShowTransfer(true)}
                        className="text-sm text-red-600 hover:underline"
                    >
                        Transfer
                    </button>
                )}
                {o.activeDineinOrderId && (
                    <span className="text-xs text-gray-500 font-mono">
                        #{o.activeDineinOrderId}
                    </span>
                )}
            </div>
            <span className="text-base font-bold text-red-600">₹{o.getTotalPrice()}</span>
        </div>
    );
};

const CartDraftBadge = ({ o, className = '' }) =>
    o.draftSavedAt ? (
        <div className={`flex items-center gap-1.5 text-xs text-green-700 bg-green-50 px-2 py-1 rounded-lg ${className}`}>
            <Save size={11} />
            <span>
                Draft saved ·{' '}
                {new Date(o.draftSavedAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                })}
            </span>
        </div>
    ) : null;

// Dine In / Takeaway toggle (hidden for super user)
const CartModeToggle = ({ o, screenIds, className = '' }) => {
    if (screenIds?.includes('super_user_v1')) return null;
    return (
        <div className={`flex bg-gray-100 rounded-lg p-1 ${className}`}>
            <button
                onClick={() => {
                    o.setOrderMode('dinein');
                    if (o.dineinTableId) o.setSelectedTable(o.dineinTableId);
                }}
                className={`flex-1 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2
        ${o.orderMode === 'dinein'
                        ? 'bg-action-primary text-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-800'}`}
            >
                <Users size={16} /> Dine In
            </button>
            <button
                onClick={() => {
                    o.setOrderMode('takeaway');
                    o.setSelectedTable(o.takeawayTableId?.toString());
                }}
                className={`flex-1 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2
        ${o.orderMode === 'takeaway'
                        ? 'bg-action-primary text-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-800'}`}
            >
                <Package size={16} /> Takeaway
            </button>
        </div>
    );
};

// Old rows + "NEW ITEMS" dividers + new rows (container div supplied by caller)
const CartItemRows = ({ o, clientId, token }) => (
    <>
        {getGroupedCartItems(o.oldItems).map((group, idx) => (
            <OldItemRow
                key={`old-${idx}`}
                group={group}
                clientId={clientId}
                token={token}
                activeDineinOrderId={o.activeDineinOrderId}
                onRequestDelete={o.handleOldItemRequestDelete}
            />
        ))}

        {o.activeOrderId && o.oldItems.length > 0 && o.newItems.length > 0 && <NewItemsDivider />}

        {o.batchTimestamps.map((ts, bi) => (
            <React.Fragment key={ts}>
                {bi > 0 && <NewItemsDivider />}
                {getGroupedCartItems(o.groupedNewItems[ts]).map((group, idx) => (
                    <NewItemRow
                        key={`new-${ts}-${idx}`}
                        group={group}
                        clientId={clientId}
                        token={token}
                        onUpdateQuantity={o.updateQuantity}
                        onRemove={o.removeFromCart}
                    />
                ))}
            </React.Fragment>
        ))}
    </>
);

// Place Order / Bill / Save / Clear
const CartActionButtons = ({ o, className = '', withSaveTitle = false }) => (
    <div className={`grid grid-cols-2 gap-2 mt-3 ${className}`}>
        <button
            onClick={o.handlePlaceOrder}
            disabled={!o.canPlaceOrder || o.isPlacingOrder}
            className={`py-2 rounded-lg text-sm font-semibold
        ${o.canPlaceOrder && !o.isPlacingOrder
                    ? 'bg-action-primary text-white hover:bg-action-danger'
                    : 'bg-gray-300 cursor-not-allowed'}`}
        >
            {o.isPlacingOrder ? 'Placing...' : 'Place Order'}
        </button>

        <button
            onClick={o.handleBillFromCart}
            className="py-2 rounded-lg text-sm font-semibold bg-green-600 text-white hover:bg-green-700 flex items-center justify-center gap-1"
        >
            <FileText size={16} /> Bill
        </button>

        <button
            onClick={o.handleSaveDraft}
            disabled={o.cart.length === 0}
            title={withSaveTitle ? 'Save draft — items will be here even after a page refresh' : undefined}
            className={`py-2 border rounded-lg text-sm flex items-center justify-center gap-1 font-semibold transition-colors
        ${o.cart.length > 0
                    ? 'bg-yellow-50 border-yellow-400 text-yellow-700 hover:bg-yellow-100'
                    : 'opacity-40 cursor-not-allowed text-gray-400 border-gray-200'}`}
        >
            <Save size={15} /> Save
        </button>

        <button
            onClick={o.handleClearCart}
            className="py-2 border rounded-lg text-sm hover:bg-gray-100"
        >
            Clear
        </button>
    </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// DesktopCart — the slide-in panel next to the menu (lg and up)
// ─────────────────────────────────────────────────────────────────────────────

const DesktopCart = ({ o, clientId, token, screenIds }) => (
    <div
        className={`hidden lg:block transition-all duration-300 ease-in-out
      ${o.showCart ? 'w-[22rem] opacity-100' : 'w-0 opacity-0 pointer-events-none'}`}
    >
        <div className="border border-gray-300 rounded-xl bg-white shadow-xl lg:h-[calc(98dvh-4rem)] flex flex-col">
            <div className="flex flex-col h-full p-4">

                {/* Cart header */}
                <div className="pb-3 border-b space-y-2">
                    <div className="flex justify-between">
                        <h2 className="text-lg font-semibold text-gray-800">Your Order</h2>

                        <div className="mb-3">
                            <CustomerCapturePanel
                                addresses={o.customerAddresses}
                                selectedAddressId={o.selectedAddressId}
                                setSelectedAddressId={o.setSelectedAddressId}
                            />{o.customerDetails.customer_name && (
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                    <User size={11} /> {o.customerDetails.customer_name}
                                </span>
                            )}
                        </div>
                    </div>
                    <CartTableBar o={o} />
                    <CartDraftBadge o={o} />
                </div>

                {/* Dine-in / Takeaway toggle */}
                {!screenIds?.includes('super_user_v1') && (
                    <div className="mt-3">
                        <CartModeToggle o={o} screenIds={screenIds} />
                    </div>
                )}

                {/* Cart body */}
                {o.cart.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
                        No items added
                    </div>
                ) : (
                    <>
                        <div className="flex-1 overflow-y-auto mt-4 space-y-2">
                            <CartItemRows o={o} clientId={clientId} token={token} />
                        </div>
                        <CartActionButtons o={o} withSaveTitle />
                    </>
                )}
            </div>
        </div>
    </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// MobileCartSheet — bottom sheet (below lg)
//
// NOTE: the original mobile sheet has no address picker. handlePlaceOrder
// requires an address, so set SHOW_ADDRESS_ON_MOBILE to true if you want it.
// ─────────────────────────────────────────────────────────────────────────────

const SHOW_ADDRESS_ON_MOBILE = false;

const MobileCartSheet = ({ o, clientId, token, screenIds }) => (
    <div className="fixed inset-0 z-50 lg:hidden">
        <div
            className="absolute inset-0 bg-black/50"
            onClick={() => o.setShowCart(false)}
        />
        <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl flex flex-col max-h-[90dvh]">
            {/* Sheet handle + close */}
            <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b flex-shrink-0">
                <h2 className="text-lg font-semibold text-gray-800">Your Order</h2>
                <button
                    onClick={() => o.setShowCart(false)}
                    className="p-1 rounded-lg hover:bg-gray-100 text-gray-500"
                >
                    ✕
                </button>
            </div>

            <div className="flex flex-col flex-1 overflow-hidden p-4">
                {SHOW_ADDRESS_ON_MOBILE && (
                    <div className="mb-3">
                        <CustomerCapturePanel
                            addresses={o.customerAddresses}
                            selectedAddressId={o.selectedAddressId}
                            setSelectedAddressId={o.setSelectedAddressId}
                        />
                    </div>
                )}

                {/* Table info + total */}
                <div className="mb-3">
                    <CartTableBar o={o} />
                </div>

                <CartDraftBadge o={o} className="mb-3" />

                {/* Dine-in / Takeaway toggle */}
                <CartModeToggle o={o} screenIds={screenIds} className="mb-3 flex-shrink-0" />

                {/* Scrollable cart items */}
                <div className="flex-1 overflow-y-auto space-y-2">
                    <CartItemRows o={o} clientId={clientId} token={token} />
                </div>

                {/* Action buttons */}
                <CartActionButtons o={o} className="flex-shrink-0" />
            </div>
        </div>
    </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// MenuPanel — dietary pills, search, item grid
// ─────────────────────────────────────────────────────────────────────────────

const MenuPanel = ({ o, clientId, token, screenIds }) => (
    <div className="transition-all duration-300 border-default border-border-default p-2 sm:p-3 rounded-lg flex-1 w-full min-w-0 overflow-x-hidden overflow-y-auto h-[calc(100dvh-10rem)] xl:h-[calc(98dvh-4rem)]">

        {/* Top controls */}
        <div className="space-y-2 mb-2">
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full min-w-0">
                {!screenIds?.includes('super_user_v1') && (<button
                    onClick={o.handleBackToTables}
                    className="p-2 rounded-lg bg-bg-tertiary border border-border-default hover:bg-bg-secondary flex-shrink-0"
                >
                    <ArrowLeft size={20} />
                </button>)}

                {/* Dietary type pills */}
                <div className="flex gap-1.5 overflow-x-auto scrollbar-hide flex-1 min-w-0 whitespace-nowrap py-1">
                    <button
                        onClick={() => o.setSelectedDietary(null)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-all border
${!o.selectedDietary
                                ? 'bg-action-primary text-white border-action-primary'
                                : 'bg-bg-tertiary text-text-primary border-border-default hover:border-action-primary'}`}
                    >
                        All
                    </button>
                    {o.dietaryOptions.map(type => {
                        const key = type.toLowerCase().replace(/[-_\s]/g, '');
                        const count = o.menuItems.filter(item => getDietaryFromSlug(item, o.dietaryOptions) === key).length;
                        return (
                            <button
                                key={key}
                                onClick={() => o.setSelectedDietary(o.selectedDietary === key ? null : key)}
                                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 flex items-center gap-1.5 transition-all border
${o.selectedDietary === key
                                        ? 'bg-action-primary text-white border-action-primary'
                                        : 'bg-bg-tertiary text-text-primary border-border-default hover:border-action-primary'}`}
                            >
                                {o.dietaryColorMap[key] && (
                                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${o.dietaryColorMap[key]}`} />
                                )}
                                {type}
                            </button>
                        );
                    })}
                </div>

                {/* Search */}
                <div className="relative w-full sm:w-64 md:w-72 lg:w-80 xl:w-72 flex-shrink-0">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                    <input
                        ref={o.searchInputRef}
                        value={o.searchQuery}
                        onChange={e => o.setSearchQuery(e.target.value)}
                        placeholder="Search items..."
                        className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border-default bg-bg-primary focus:outline-none focus:ring-2 focus:ring-action-primary"
                    />
                </div>
            </div>
        </div>

        {/* Item grid */}
        <div className={`grid gap-2 grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 ${o.showCart ? 'xl:grid-cols-3' : 'xl:grid-cols-4'} w-full min-w-0`}>
            {o.filteredItems.map(item => {
                const dp = item.discount && Number(item.discount) > 0
                    ? Number(item.discount).toFixed(0) : null;
                const ac = item.line_item_id?.length || 0;
                const dietary = getDietaryFromSlug(item, o.dietaryOptions);
                const dietaryColor = dietary ? (o.dietaryColorMap[dietary] || '') : '';
                return (
                    <div
                        key={`${item.id}_${item.zone_config_id ?? 0}`}
                        onClick={() => o.handleItemClick(item)}
                        className="flex gap-2 items-center bg-bg-primary border-default border-border-default rounded-xl p-2 min-w-0 w-full overflow-hidden shadow-sm hover:shadow-md transition cursor-pointer"
                    >
                        <div className={`w-[4px] self-stretch rounded-l-xl flex-shrink-0 ${dietaryColor}`} />
                        <div className="w-14 h-16 rounded-lg overflow-hidden shrink-0 bg-gray-100">
                            <ImagePreview
                                clientId={clientId}
                                imageId={item.image_id}
                                token={token}
                                alt={item.name}
                                baseUrl={import.meta.env.VITE_API_DOCUMENT_SERVICE_URL}
                                urlBuilder={({ baseUrl, clientId, imageId }) =>
                                    `${baseUrl}/${clientId}/document/download?doc_id=${imageId}`}
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-text-primary line-clamp-2">
                                {item.name}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                                {dp ? (
                                    <>
                                        <span className="text-sm font-bold text-action-primary">
                                            ₹{(item.unit_price * (1 - Number(item.discount) / 100)).toFixed(0)}
                                        </span>
                                        <span className="text-xs line-through text-text-secondary">
                                            ₹{item.unit_price}
                                        </span>
                                        <span className="text-xs text-action-danger font-semibold">{dp}% OFF</span>
                                    </>
                                ) : (
                                    <span className="text-sm font-bold text-action-primary">
                                        ₹{item.unit_price}
                                    </span>
                                )}
                            </div>
                            {item.availability != null && (
                                <p className={`text-[10px] font-semibold mt-0.5
${Number(item.availability) <= 5
                                        ? 'text-red-500'
                                        : 'text-text-secondary'}`}>
                                    Qty: {Number(item.availability)}
                                </p>
                            )}
                            {ac > 0 && (
                                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold
                  ${o.isComboCategoryId(item.category_id)
                                        ? 'bg-violet-100 text-violet-700'
                                        : 'bg-blue-100 text-blue-700'}`}>
                                    {o.isComboCategoryId(item.category_id) ? `${ac} items` : `+${ac} addon${ac > 1 ? 's' : ''}`}
                                </span>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Order_Place — main component
// ─────────────────────────────────────────────────────────────────────────────

const Order_Place = (props) => {
    const { clientId, token, screenIds } = props;
    const o = useOrderPlace(props);

    return (
        <div className="bg-bg-primary p-0 h-[calc(100vh-4rem)] overflow-y-auto">

            {/* ══════════════ FLOOR VIEW ══════════════ */}
            {o.currentView === 'floor' && (
                <TableReservation
                    tables={o.tables.filter(t => !o.takeawayTables.some(tw => tw.id === t.id))}
                    orderMode={o.orderMode}
                    tableOrders={o.tableOrders}
                    draftTableIds={o.draftTableIds}
                    onSelectTable={o.handleTableSelect}
                    onSelectTakeaway={o.handleTakeawaySelect}
                    onSelectDineIn={() => o.setOrderMode('dinein')}
                    onViewOrder={o.handleViewOrder}
                    onPrintBill={o.handlePrintBill}
                    onCancelOrder={(orderId, tableId) =>
                        o.modals.cancelOrder[1]({ isOpen: true, orderId, tableId })
                    } screenIds={screenIds}
                    onMarkAsServed={o.handleMarkAsServed}
                    onConfirmPayment={(orderId, tableId) =>
                        o.modals.payConfirm[1]({ isOpen: true, orderId, tableId })
                    }
                />
            )}

            {/* ══════════════ ORDER VIEW ══════════════ */}
            {o.currentView === 'order' && (
                <div className="w-full max-w-screen-2xl mx-auto px-2 sm:px-3 md:px-4 lg:px-5 py-2 overflow-x-hidden">
                    <div className="grid grid-cols-1 xl:grid-cols-4 gap-2 w-full min-w-0">

                        {/* ── Category sidebar ── */}
                        <div className="xl:col-span-1 min-w-0 w-full overflow-hidden">
                            <div className="lg:h-[calc(98dvh-4rem)] lg:overflow-y-auto pr-1">
                                <CategoryTree
                                    categories={o.sidebarCategories}
                                    selectedCategoryId={o.selectedCategoryId}
                                    onSelectCategory={o.setSelectedCategoryId}
                                    defaultOpenAll
                                    zoneConfigId={o.zoneConfigId}
                                    dietaryColorMap={o.dietaryColorMap}
                                    selectedDietary={o.selectedDietary}
                                    onSelectDietary={o.setSelectedDietary}
                                />
                            </div>
                        </div>

                        {/* ── Menu panel + Cart panel ── */}
                        <div className="xl:col-span-3 w-full min-w-0 flex flex-col xl:flex-row overflow-hidden gap-2">
                            <MenuPanel o={o} clientId={clientId} token={token} screenIds={screenIds} />
                            <DesktopCart o={o} clientId={clientId} token={token} screenIds={screenIds} />
                        </div>
                    </div>
                </div>
            )}

            {/* ── Floating cart button (mobile) ── */}
            {o.currentView === 'order' && o.cart.length > 0 && (
                <button
                    onClick={() => o.setShowCart(true)}
                    className="fixed bottom-6 right-6 bg-action-primary text-white p-4 rounded-full shadow-lg z-40 lg:hidden flex items-center gap-2"
                >
                    <ShoppingCart size={24} />
                    <span className="text-sm font-bold">{o.cart.length}</span>
                </button>
            )}

            {/* ── Mobile cart bottom sheet ── */}
            {o.currentView === 'order' && o.showCart && (
                <MobileCartSheet o={o} clientId={clientId} token={token} screenIds={screenIds} />
            )}

            {/* ── All modals ── */}
            <OrderModals o={o} clientId={clientId} token={token} />

            <CustomerChat clientId={clientId} token={token} />
        </div>
    );
};

export default Order_Place;