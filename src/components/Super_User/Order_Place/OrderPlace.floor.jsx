import React, { useState } from 'react';
import { Check, Clock, Package, Trash2, Eye, Lock, Printer } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const TABLE_STATUS_CONFIG = {
    vacant: { clickable: true, bg: 'bg-action-success', border: 'border-border-default', badge: 'bg-green-100 text-action-success' },
    available: { clickable: true, bg: 'bg-action-success', border: 'border-border-default', badge: 'bg-green-100 text-green-700' },
    occupied: { clickable: false, bg: 'bg-action-primary', border: 'border-action-primary', badge: 'bg-red-100 text-action-primary', viewable: true },
    served: { clickable: false, bg: 'bg-blue-50', border: 'border-blue-400', badge: 'bg-blue-100 text-blue-700', viewable: true },
    reserved: { clickable: false, bg: 'bg-yellow-50', border: 'border-yellow-400', badge: 'bg-yellow-100 text-yellow-700' },
    cancelled: { clickable: true, bg: 'bg-action-success', border: 'border-border-default', badge: 'bg-gray-100 text-gray-500' },
};

// ─────────────────────────────────────────────────────────────────────────────
// TableReservation — floor view
// ─────────────────────────────────────────────────────────────────────────────

export const TableReservation = ({
    tables = [],
    orderMode = 'dinein',
    tableOrders = {},
    draftTableIds = [],
    onSelectTable,
    onSelectTakeaway,
    onSelectDineIn,
    onViewOrder,
    onPrintBill,
    onCancelOrder,
    onMarkAsServed,
    onConfirmPayment, screenIds
}) => {
    const [selectedSections, setSelectedSections] = useState([]);
    const [selectedZones, setSelectedZones] = useState([]);

    const getZone = t => t.location_zone?.trim() || 'Unassigned';
    const getSection = t => t.section?.trim() || 'Other';

    const zonesFromDB = [...new Set(tables.map(t => t.location_zone).filter(Boolean))];
    const sectionsFromDB = [...new Set(tables.map(t => t.section).filter(Boolean))];

    const toggleFilter = (value, setter) => {
        setter(prev =>
            prev.includes(value) ? prev.filter(x => x !== value) : [...prev, value]
        );
    };

    const filteredTables = tables.filter(t => {
        const z = getZone(t);
        const s = getSection(t);
        return (selectedZones.length === 0 || selectedZones.includes(z))
            && (selectedSections.length === 0 || selectedSections.includes(s));
    });

    const visibleZones = [...new Set(filteredTables.map(t => getZone(t)))];
    const getSectionsByZone = zone =>
        [...new Set(filteredTables.filter(t => getZone(t) === zone).map(t => getSection(t)))];

    const calcElapsed = (createdAt) => {
        if (!createdAt) return null;
        const utc = typeof createdAt === 'string'
            ? createdAt.replace(' ', 'T').split('.')[0] + 'Z'
            : createdAt;
        const diff = Date.now() - new Date(utc).getTime();
        if (diff < 0) return 'Just now';
        const s = Math.floor(diff / 1000);
        const m = Math.floor(s / 60);
        const h = Math.floor(m / 60);
        const d = Math.floor(h / 24);
        if (s < 60) return 'Just now';
        if (m === 1) return '1 min ago';
        if (m < 60) return `${m} mins ago`;
        if (h === 1) return '1 hr ago';
        if (h < 24) return `${h} hrs ago`;
        if (d === 1) return '1 day ago';
        return `${d} days ago`;
    };

    const getOrderStatusStyle = (status) => {
        const map = {
            pending: 'bg-orange-100 text-orange-700',
            preparing: 'bg-blue-100 text-blue-700',
            ready: 'bg-green-100 text-green-700',
            served: 'bg-purple-100 text-purple-700',
            cancelled: 'bg-gray-100 text-gray-500',
        };
        return map[status] || 'bg-gray-100 text-gray-700';
    };

    return (
        <div className="p-4 bg-bg-primary overflow-y-auto h-[calc(100vh-4rem)]">

            {/* ── Filter bar ── */}
            {!screenIds?.includes('super_user_v1') && (
                <div className="mb-3 sticky top-0 z-10 bg-bg-primary">
                    <div className="flex flex-wrap gap-2 p-2 rounded-xl border border-border-default bg-bg-tertiary">
                        <div className="flex flex-wrap items-center gap-2 p-2 rounded-xl">
                            <button
                                onClick={() => { setSelectedSections([]); setSelectedZones([]); }}
                                className={`px-3 py-1 rounded-full text-xs font-semibold transition
                ${selectedSections.length === 0 && selectedZones.length === 0
                                        ? 'bg-action-primary text-white'
                                        : 'bg-white text-text-secondary hover:bg-gray-100'}`}
                            >
                                All
                            </button>
                            <div className="w-px bg-border-default mx-1" />
                            {sectionsFromDB.map(sec => (
                                <button
                                    key={sec}
                                    onClick={() => toggleFilter(sec, setSelectedSections)}
                                    className={`px-3 py-1 rounded-full text-xs font-semibold transition
                  ${selectedSections.includes(sec)
                                            ? 'bg-action-primary text-white'
                                            : 'bg-white text-text-secondary hover:bg-gray-100'}`}
                                >
                                    {sec}
                                </button>
                            ))}
                            <div className="w-px bg-border-default mx-1" />
                            {/* {zonesFromDB.map(zone => (
              <button
                key={zone}
                onClick={() => toggleFilter(zone, setSelectedZones)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition
                  ${selectedZones.includes(zone)
                    ? 'bg-action-primary text-white'
                    : 'bg-white text-text-secondary hover:bg-gray-100'}`}
              >
                {zone}
              </button>
            ))} */}
                        </div>

                        {/* Dine-in / Takeaway toggle */}
                        <div className="ml-auto flex bg-bg-primary border-2 rounded-full border-action-primary p-1 shadow-sm">
                            <button
                                onClick={onSelectDineIn}
                                className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all
                ${orderMode === 'dinein'
                                        ? 'bg-action-primary text-text-white shadow'
                                        : 'text-text-secondary hover:bg-gray-100'}`}
                            >
                                Dine In
                            </button>
                            <button
                                onClick={onSelectTakeaway}
                                className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all flex items-center gap-1
                ${orderMode === 'takeaway'
                                        ? 'bg-orange-500 text-white shadow'
                                        : 'text-gray-600 hover:bg-gray-100'}`}
                            >
                                <Package size={12} /> Takeaway
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* ── Table grid ── */}
            {orderMode === 'dinein' && visibleZones.map(zone => {
                const sections = getSectionsByZone(zone);
                return (
                    <div key={zone} className="mb-10">
                        <h3 className="text-xl font-bold mb-4 text-gray-800">{zone}</h3>
                        {sections.map(section => (
                            <div key={section} className="mb-6">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-sm font-semibold px-3 py-1 rounded-full bg-gray-200">
                                        {section}
                                    </span>
                                </div>
                                <div className="grid gap-4 grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-5">
                                    {filteredTables
                                        .filter(t => getZone(t) === zone && getSection(t) === section)
                                        .map(table => {
                                            const statusKey = table.status?.toLowerCase();
                                            const config = TABLE_STATUS_CONFIG[statusKey] || TABLE_STATUS_CONFIG.vacant;
                                            const orderInfo = tableOrders[table.id];
                                            const hasViewableOrder = (statusKey === 'occupied' || statusKey === 'served') && orderInfo;
                                            const tableHasDraft = draftTableIds.includes(table.id.toString());
                                            const elapsedTime = orderInfo?.created_at ? calcElapsed(orderInfo.created_at) : null;
                                            const orderCount = orderInfo?.order_count || 1;
                                            const totalPrice = orderInfo?.total_price
                                                ? `₹${Number(orderInfo.total_price).toFixed(0)}`
                                                : null;

                                            const invoiceStatus = orderInfo?.invoice_status?.toLowerCase();
                                            const showConfirmPayment = hasViewableOrder && invoiceStatus === 'pending';

                                            const handleCardClick = () => {
                                                if (config.clickable) onSelectTable(table);
                                                else if (hasViewableOrder && onViewOrder) onViewOrder(table);
                                            };

                                            return (
                                                <div
                                                    key={table.id}
                                                    className="rounded-xl overflow-hidden border shadow-sm hover:shadow-md transition bg-white"
                                                >
                                                    <div
                                                        onClick={handleCardClick}
                                                        className={config.clickable || hasViewableOrder ? 'cursor-pointer' : ''}
                                                    >
                                                        {/* Card header */}
                                                        <div className="flex justify-between items-center px-3 py-2 bg-action-primary text-white">
                                                            <span className="font-bold text-lg tracking-wide">{table.table_number}</span>
                                                            {tableHasDraft && !hasViewableOrder && (
                                                                <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-yellow-300 text-yellow-900">
                                                                    DRAFT
                                                                </span>
                                                            )}
                                                            {hasViewableOrder && (
                                                                <>
                                                                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${getOrderStatusStyle(orderInfo.status)}`}>
                                                                        {orderInfo.status?.toUpperCase()}
                                                                    </span>
                                                                    <span className="text-xl opacity-80 font-bold">
                                                                        #{orderInfo.dinein_order_id || orderInfo.id}
                                                                    </span>
                                                                </>
                                                            )}
                                                        </div>

                                                        {/* Card body */}
                                                        <div
                                                            className={`p-3 flex items-center justify-between gap-2
                                ${statusKey === 'occupied' ? 'text-blue-600 bg-blue-50'
                                                                    : statusKey === 'served' ? 'text-purple-600 bg-purple-50'
                                                                        : statusKey === 'reserved' ? 'text-yellow-600 bg-yellow-50'
                                                                            : 'text-green-600 bg-green-50'}`}
                                                        >
                                                            {statusKey === 'vacant' && <span className="text-2xl text-green-400">—</span>}
                                                            {(statusKey === 'occupied' || statusKey === 'served') && <Eye size={22} />}
                                                            {statusKey === 'reserved' && <Lock size={22} />}

                                                            {hasViewableOrder && (
                                                                <div className="flex flex-col items-center flex-1">
                                                                    <span className="text-xs font-bold text-gray-700">
                                                                        {orderCount} time ordered
                                                                    </span>
                                                                    {totalPrice && (
                                                                        <span className="text-sm font-bold text-action-primary">{totalPrice}</span>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {hasViewableOrder && (
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        onClick={e => { e.stopPropagation(); onPrintBill?.(orderInfo.id, table.id); }}
                                                                        className="text-yellow-600 hover:scale-110 transition-transform"
                                                                        title="Print Bill"
                                                                    >
                                                                        <Printer size={22} />
                                                                    </button>
                                                                    <button
                                                                        onClick={e => { e.stopPropagation(); onCancelOrder?.(orderInfo.id, table.id); }}
                                                                        className="text-red-600 hover:scale-110 transition-transform"
                                                                        title="Cancel Order"
                                                                    >
                                                                        <Trash2 size={22} />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Elapsed time */}
                                                        {hasViewableOrder && elapsedTime && (
                                                            <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-100">
                                                                <div className="flex items-center justify-center gap-1 text-xs font-semibold text-gray-600">
                                                                    <Clock size={13} className="text-orange-500" />
                                                                    <span>{elapsedTime}</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {showConfirmPayment && (
                                                        <button
                                                            onClick={e => {
                                                                e.stopPropagation();
                                                                onConfirmPayment?.(orderInfo.id, table.id);
                                                            }}
                                                            className="w-full px-4 py-2 bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-1"
                                                        >
                                                            <Check size={14} />
                                                            Confirm Payment
                                                        </button>
                                                    )}

                                                    {hasViewableOrder && orderInfo.status === 'ready' && !showConfirmPayment && (
                                                        <button
                                                            onClick={e => { e.stopPropagation(); onMarkAsServed?.(orderInfo.id, table.id); }}
                                                            className="w-full px-4 py-2 bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors"
                                                        >
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

            {orderMode === 'takeaway' && (
                <div className="text-center mt-10 text-gray-500 text-sm">
                    Takeaway selected. Opening menu…
                </div>
            )}
        </div>
    );
};