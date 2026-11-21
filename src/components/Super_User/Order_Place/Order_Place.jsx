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
        pending: { dot: 'bg-status-pending', label: 'Pending' },
        preparing: { dot: 'bg-status-preparing', label: 'Preparing' },
        ready: { dot: 'bg-status-ready', label: 'Ready' },
        served: { dot: 'bg-status-served', label: 'Served' },
        cancelled: { dot: 'bg-ink-faint', label: 'Cancelled' },
    }[status] || { dot: 'bg-ink-faint', label: status || '—' };

    return (
        <span className="inline-flex items-center gap-1 text-micro font-bold px-2 py-0.5 rounded-badge bg-brand-light text-brand-dark border border-brand-line">
            <span className={`h-1.5 w-1.5 rounded-badge ${cfg.dot}`} />
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
        <div className="px-3 py-2 rounded-panel border border-brand-line bg-brand-tint shadow-panel">
            <select
                value={selectedAddressId}
                onChange={e => setSelectedAddressId(e.target.value)}
                className="w-full text-ui px-2 py-1.5 rounded-button-sm border border-brand-line bg-surface text-ink focus:outline-none focus:border-brand-ring focus:shadow-focus-ring"
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
            <div className="flex items-start gap-2 p-3 rounded-panel border border-line bg-surface shadow-panel">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-11 h-11 rounded-button-sm overflow-hidden border border-line bg-surface shrink-0">
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
                        <h4 className="text-ui font-bold truncate text-ink">{main.name}</h4>
                        <p className="text-ui-sm font-bold text-brand-dark">
                            ₹{(main.unit_price * (1 - (Number(main.discount) || 0) / 100)).toFixed(2)}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            {main.batch_label && main.batch_label !== activeDineinOrderId && (
                                <span className="text-micro text-ink-muted font-mono font-semibold">
                                    #{main.batch_label}
                                </span>
                            )}
                            {main.status && <ItemStatusBadge status={main.status} />}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 self-center">
                    <span className="text-ui font-semibold text-ink-muted">×{main.quantity}</span>
                    <button
                        onClick={() => onRequestDelete && onRequestDelete(main)}
                        className="text-ink-muted hover:text-brand-dark transition-colors"
                        title="Remove item"
                    >
                        <Trash2 size={15} />
                    </button>
                </div>
            </div>

            {addons.map(addon => (
                <div
                    key={addon.frontend_unique_key || addon.id}
                    className="flex items-center gap-2 p-2 pl-8 rounded-button-sm border border-dashed border-brand-line bg-brand-tint"
                >
                    <span className="text-ui-sm text-brand">↳</span>
                    <span className="text-ui text-ink-soft truncate flex-1">{addon.name}</span>
                    <span className="text-ui-sm font-semibold text-brand-dark">
                        ₹{(addon.unit_price * (1 - (Number(addon.discount) || 0) / 100)).toFixed(2)}
                    </span>
                    <span className="text-ui-sm text-ink-muted w-6 text-center">×{addon.quantity}</span>
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
            <div className="flex items-center gap-2 p-3 rounded-panel border border-brand-line bg-brand-tint shadow-panel">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-11 h-11 rounded-button-sm overflow-hidden border border-line bg-surface shrink-0">
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
                        <h4 className="text-ui font-bold truncate text-ink">{main.name}</h4>
                        <p className="text-ui-sm font-bold text-brand-dark">
                            ₹{(main.unit_price * (1 - (Number(main.discount) || 0) / 100)).toFixed(2)}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={() => onUpdateQuantity(main.id, -1, main.frontend_unique_key)}
                        className="grid place-items-center w-7 h-7 border border-brand-line rounded-button-sm bg-surface text-brand-dark hover:bg-brand-light transition-colors"
                    >
                        <Minus size={14} />
                    </button>
                    <span className="w-6 text-center text-ui font-semibold text-ink">{main.quantity}</span>
                    <button
                        onClick={() => onUpdateQuantity(main.id, 1, main.frontend_unique_key)}
                        className="grid place-items-center w-7 h-7 border border-brand-line rounded-button-sm bg-surface text-brand-dark hover:bg-brand-light transition-colors"
                    >
                        <Plus size={14} />
                    </button>
                </div>

                <button
                    onClick={() => onRemove(main.id, main.frontend_unique_key)}
                    className="text-ink-muted hover:text-brand-dark transition-colors"
                >
                    <X size={16} />
                </button>
            </div>

            {addons.map(addon => (
                <div
                    key={addon.frontend_unique_key}
                    className="flex items-center gap-2 p-2 pl-8 rounded-button-sm border border-dashed border-brand-line bg-brand-light"
                >
                    <span className="text-ui-sm text-brand">↳</span>
                    <span className="text-ui text-ink-soft truncate flex-1">{addon.name}</span>
                    <span className="text-ui-sm font-semibold text-brand-dark">
                        ₹{(addon.unit_price * (1 - (Number(addon.discount) || 0) / 100)).toFixed(2)}
                    </span>
                    <span className="text-ui-sm text-ink-muted w-6 text-center">×{addon.quantity}</span>
                </div>
            ))}
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Shared cart pieces (markup identical for the desktop / mobile carts)
// ─────────────────────────────────────────────────────────────────────────────

const NewItemsDivider = () => (
    <div className="flex items-center gap-2 my-2">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-brand-ring to-transparent" />
        <span className="text-micro font-bold text-brand px-2">NEW ITEMS</span>
        <div className="flex-1 h-px bg-gradient-to-r from-brand-ring via-transparent to-transparent" />
    </div>
);

// Table / takeaway select + transfer + order id + total
const CartTableBar = ({ o }) => {
    const [, setShowTransfer] = o.modals.transfer;
    return (
        <div className="flex items-center justify-between text-ui bg-brand-tint border border-brand-line px-3 py-2 rounded-panel">
            <div className="flex items-center gap-2">
                {o.orderMode === 'dinein' && o.selectedTable && (
                    <span className="font-bold text-body text-brand-dark">
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
                        className="border-none outline-none rounded-button-sm px-2 py-1 text-ui font-semibold bg-surface text-ink"
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
                        className="text-ui font-semibold text-brand hover:underline"
                    >
                        Transfer
                    </button>
                )}
                {o.activeDineinOrderId && (
                    <span className="text-ui-sm text-ink-muted font-mono">
                        #{o.activeDineinOrderId}
                    </span>
                )}
            </div>
            <span className="text-body font-bold text-brand-dark">₹{o.getTotalPrice()}</span>
        </div>
    );
};

const CartDraftBadge = ({ o, className = '' }) =>
    o.draftSavedAt ? (
        <div className={`flex items-center gap-1.5 text-ui-sm text-state-vacant bg-state-vacant-bg px-2 py-1 rounded-button-sm ${className}`}>
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
        <div className={`ui-toggle w-full ${className}`}>
            <button
                onClick={() => {
                    o.setOrderMode('dinein');
                    if (o.dineinTableId) o.setSelectedTable(o.dineinTableId);
                }}
                className={`ui-toggle-btn flex-1 flex items-center justify-center gap-2
        ${o.orderMode === 'dinein' ? 'ui-toggle-btn-active' : ''}`}
            >
                <Users size={16} /> Dine In
            </button>
            <button
                onClick={() => {
                    o.setOrderMode('takeaway');
                    o.setSelectedTable(o.takeawayTableId?.toString());
                }}
                className={`ui-toggle-btn flex-1 flex items-center justify-center gap-2
        ${o.orderMode === 'takeaway' ? 'ui-toggle-btn-active' : ''}`}
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
            className={`ui-btn ui-btn-add
        ${o.canPlaceOrder && !o.isPlacingOrder ? 'shadow-button' : 'cursor-not-allowed'}`}
        >
            {o.isPlacingOrder ? 'Placing...' : 'Place Order'}
        </button>

        <button
            onClick={o.handleBillFromCart}
            className="ui-btn gap-1"
        >
            <FileText size={16} /> Bill
        </button>

        <button
            onClick={o.handleSaveDraft}
            disabled={o.cart.length === 0}
            title={withSaveTitle ? 'Save draft — items will be here even after a page refresh' : undefined}
            className={`ui-btn gap-1 transition-colors
        ${o.cart.length > 0 ? 'border-state-reserved/30' : 'opacity-40 cursor-not-allowed'}`}
        >
            <Save size={15} /> Save
        </button>

        <button
            onClick={o.handleClearCart}
            className="ui-btn"
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
        <div className="border border-line border-t-panel border-t-line-panel rounded-panel bg-surface shadow-panel lg:h-[calc(98dvh-4rem)] flex flex-col">
            <div className="flex flex-col h-full p-4">

                {/* Cart header */}
                <div className="pb-3 border-b border-line-divider space-y-2">
                    <div className="flex justify-between gap-2">
                        <h2 className="text-panel-title text-brand-dark">Your Order</h2>

                        <div className="mb-3">
                            <CustomerCapturePanel
                                addresses={o.customerAddresses}
                                selectedAddressId={o.selectedAddressId}
                                setSelectedAddressId={o.setSelectedAddressId}
                            />{o.customerDetails.customer_name && (
                                <span className="text-ui-sm text-ink-muted flex items-center gap-1">
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
                    <div className="flex-1 flex items-center justify-center text-ui text-ink-muted">
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
            className="absolute inset-0 bg-backdrop"
            onClick={() => o.setShowCart(false)}
        />
        <div className="absolute bottom-0 left-0 right-0 bg-surface rounded-t-modal-lg shadow-modal-lg flex flex-col max-h-[90dvh]">
            {/* Sheet handle + close */}
            <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-line-divider flex-shrink-0">
                <h2 className="text-panel-title text-brand-dark">Your Order</h2>
                <button
                    onClick={() => o.setShowCart(false)}
                    className="p-1 rounded-button-sm hover:bg-brand-light text-ink-muted"
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

const pillClass = (active) =>
    `px-3 py-1.5 rounded-badge text-ui font-semibold whitespace-nowrap flex-shrink-0 transition-all border
${active
        ? 'bg-brand-soft text-brand-darker border-brand-ring shadow-seg-active'
        : 'bg-brand-light text-ink-toggle border-brand-line hover:border-brand-ring'}`;

const MenuPanel = ({ o, clientId, token, screenIds }) => (
    <div className="transition-all duration-300 border border-line border-t-panel border-t-line-panel bg-surface shadow-panel p-2 sm:p-3 rounded-panel flex-1 w-full min-w-0 overflow-x-hidden overflow-y-auto h-[calc(100dvh-10rem)] xl:h-[calc(98dvh-4rem)]">

        {/* Top controls */}
        <div className="space-y-2 mb-2">
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full min-w-0">
                {!screenIds?.includes('super_user_v1') && (<button
                    onClick={o.handleBackToTables}
                    className="ui-btn w-9 px-0 flex-shrink-0"
                >
                    <ArrowLeft size={20} />
                </button>)}

                {/* Dietary type pills */}
                <div className="flex gap-1.5 overflow-x-auto scrollbar-hide flex-1 min-w-0 whitespace-nowrap py-1">
                    <button
                        onClick={() => o.setSelectedDietary(null)}
                        className={pillClass(!o.selectedDietary)}
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
                                className={`${pillClass(o.selectedDietary === key)} flex items-center gap-1.5`}
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
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                    <input
                        ref={o.searchInputRef}
                        value={o.searchQuery}
                        onChange={e => o.setSearchQuery(e.target.value)}
                        placeholder="Search items..."
                        className="ui-input"
                    />
                </div>
            </div>
        </div>

        {/* Item grid */}
        <div className="grid grid-cols-tiles gap-tiles w-full min-w-0">
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
                        className="ui-card flex gap-2 items-center p-2 min-w-0 w-full overflow-hidden cursor-pointer"
                    >
                        <div className={`w-[4px] self-stretch rounded-l-panel flex-shrink-0 ${dietaryColor}`} />
                        <div className="w-14 h-16 rounded-button-sm overflow-hidden shrink-0 bg-brand-light">
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
                            <h3 className="text-body-sm font-bold text-ink line-clamp-2">
                                {item.name}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                                {dp ? (
                                    <>
                                        <span className="text-body-sm font-bold text-brand-dark">
                                            ₹{(item.unit_price * (1 - Number(item.discount) / 100)).toFixed(0)}
                                        </span>
                                        <span className="text-ui line-through text-ink-muted">
                                            ₹{item.unit_price}
                                        </span>
                                        <span className="text-ui text-state-vacant font-semibold">{dp}% OFF</span>
                                    </>
                                ) : (
                                    <span className="text-body-sm font-bold text-brand-dark">
                                        ₹{item.unit_price}
                                    </span>
                                )}
                            </div>
                            {item.availability != null && (
                                <p className={`text-micro font-semibold mt-0.5
${Number(item.availability) <= 5
                                        ? 'text-state-occupied'
                                        : 'text-ink-muted'}`}>
                                    Qty: {Number(item.availability)}
                                </p>
                            )}
                            {ac > 0 && (
                                <span className={`text-micro px-2 py-0.5 rounded-badge font-bold
                  ${o.isComboCategoryId(item.category_id)
                                        ? 'bg-brand-soft text-brand-darker'
                                        : 'bg-brand-pill text-brand-dark'}`}>
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
        <div className="bg-canvas p-0 h-[calc(100vh-4rem)] overflow-y-auto">

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
                    className="fixed bottom-6 right-6 bg-brand text-white p-4 rounded-full shadow-soft z-40 lg:hidden flex items-center gap-2"
                >
                    <ShoppingCart size={24} />
                    <span className="text-body-sm font-bold">{o.cart.length}</span>
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