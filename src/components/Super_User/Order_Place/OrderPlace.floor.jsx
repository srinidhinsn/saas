import React, { useState } from 'react';
import { Check, Clock, Package, Trash2, Eye, Lock, Printer } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

// clickable / viewable drive behaviour only — colours now come from the theme tokens
const TABLE_STATUS_CONFIG = {
    vacant: { clickable: true },
    available: { clickable: true },
    occupied: { clickable: false, viewable: true },
    served: { clickable: false, viewable: true },
    reserved: { clickable: false },
    cancelled: { clickable: true },
};

// Order-status colours — same map as the Order floor / KDS (status-* tokens)
const ORDER_STATUS_BAR = {
    pending: { bar: 'border-t-status-pending', dot: 'bg-status-pending' },
    preparing: { bar: 'border-t-status-preparing', dot: 'bg-status-preparing' },
    ready: { bar: 'border-t-status-ready', dot: 'bg-status-ready' },
    served: { bar: 'border-t-status-served', dot: 'bg-status-served' },
    cancelled: { bar: 'border-t-line-strong', dot: 'bg-ink-faint' },
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

    const modeBtn = (active) => `ui-tab inline-flex items-center gap-1 ${active ? 'ui-tab-active' : ''}`;
    const isSuperUser = screenIds?.includes('super_user_v1');

    return (
        <div className="ui-page !min-h-0 h-[calc(100vh-4rem)] overflow-y-auto">

            {/* ── Filter bar ── */}
            {!isSuperUser && (
                <section className="ui-panel sticky top-0 z-10">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="ui-tabs" role="group" aria-label="Filter by section">
                            <button
                                type="button"
                                aria-pressed={selectedSections.length === 0 && selectedZones.length === 0}
                                onClick={() => { setSelectedSections([]); setSelectedZones([]); }}
                                className={`ui-tab ${selectedSections.length === 0 && selectedZones.length === 0 ? 'ui-tab-active' : ''}`}
                            >
                                All
                            </button>
                            {sectionsFromDB.map(sec => (
                                <button
                                    key={sec}
                                    type="button"
                                    aria-pressed={selectedSections.includes(sec)}
                                    onClick={() => toggleFilter(sec, setSelectedSections)}
                                    className={`ui-tab ${selectedSections.includes(sec) ? 'ui-tab-active' : ''}`}
                                >
                                    {sec}
                                </button>
                            ))}
                            {/* {zonesFromDB.map(zone => (
                                <button
                                    key={zone}
                                    type="button"
                                    onClick={() => toggleFilter(zone, setSelectedZones)}
                                    className={`ui-tab ${selectedZones.includes(zone) ? 'ui-tab-active' : ''}`}
                                >
                                    {zone}
                                </button>
                            ))} */}
                        </div>

                        {/* Status legend */}
                        <div className="flex items-center gap-x-3 gap-y-1 text-micro text-ink-muted">
                            {Object.entries(ORDER_STATUS_BAR).map(([status, s]) => (
                                <span key={status} className="inline-flex items-center gap-1 capitalize">
                                    <span className={`h-2 w-2 rounded-badge ${s.dot}`} />
                                    {status}
                                </span>
                            ))}
                            <span className="inline-flex items-center gap-1">
                                <span className="h-2 w-2 rounded-badge bg-state-reserved" /> Draft
                            </span>
                        </div>

                        {/* Dine-in / Takeaway toggle */}
                        <div className="ui-tabs" role="group" aria-label="Order type">
                            <button type="button" aria-pressed={orderMode === 'dinein'} onClick={onSelectDineIn} className={modeBtn(orderMode === 'dinein')}>
                                Dine In
                            </button>
                            <button type="button" aria-pressed={orderMode === 'takeaway'} onClick={onSelectTakeaway} className={modeBtn(orderMode === 'takeaway')}>
                                <Package size={12} /> Takeaway
                            </button>
                        </div>
                    </div>
                </section>
            )}

            {/* ── Zones → sections → table cards ── */}
            {orderMode === 'dinein' && visibleZones.map(zone => {
                const sections = getSectionsByZone(zone);
                const zoneTables = filteredTables.filter(t => getZone(t) === zone);
                const isVac = t => ['vacant', 'available'].includes(t.status?.toLowerCase().trim());
                const vac = zoneTables.filter(isVac).length;
                const occ = zoneTables.filter(t => t.status?.toLowerCase() === 'occupied').length;

                return (
                    <section key={zone} className="ui-panel">
                        {/* Zone header */}
                        <div className="flex items-center gap-2.5 pb-2.5 mb-3 border-b border-line-divider">
                            <h3 className="text-panel-title text-brand-dark">{zone}</h3>
                            <span className="text-micro font-bold px-2 py-0.5 rounded-badge bg-brand-light text-brand-dark border border-brand-line">
                                {zoneTables.length} table{zoneTables.length !== 1 ? 's' : ''}
                            </span>
                            <div className="ml-auto hidden sm:flex gap-2.5 text-ui-sm text-ink-muted">
                                <span><b className="text-ink-soft">{vac}</b> vacant</span>
                                <span><b className="text-ink-soft">{occ}</b> occupied</span>
                            </div>
                        </div>

                        {sections.map(section => {
                            const sectionTables = zoneTables.filter(t => getSection(t) === section);
                            return (
                                <div key={section} className="mb-3.5 last:mb-0">
                                    <div className="flex items-center gap-2 mb-2">
                                        <h4 className="text-ui font-bold text-ink-soft">{section}</h4>
                                        <span className="text-micro text-ink-muted">
                                            {sectionTables.length} table{sectionTables.length !== 1 ? 's' : ''}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-tiles gap-tiles">
                                        {sectionTables.map(table => {
                                            const statusKey = table.status?.toLowerCase();
                                            const config = TABLE_STATUS_CONFIG[statusKey] || TABLE_STATUS_CONFIG.vacant;
                                            const isVacant = statusKey === 'vacant' || statusKey === 'available';
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
                                            const orderStatus = orderInfo?.status?.toLowerCase();
                                            const statusCfg = ORDER_STATUS_BAR[orderStatus];
                                            const bar = hasViewableOrder
                                                ? (statusCfg?.bar || 'border-t-line-strong')
                                                : 'border-t-line-strong';

                                            const handleCardClick = () => {
                                                if (config.clickable) onSelectTable(table);
                                                else if (hasViewableOrder && onViewOrder) onViewOrder(table);
                                            };

                                            return (
                                                <div
                                                    key={table.id}
                                                    className={`flex flex-col overflow-hidden ui-card ${bar}`}
                                                >
                                                    {/* Clickable area: header + body */}
                                                    <div
                                                        onClick={handleCardClick}
                                                        className={config.clickable || hasViewableOrder ? 'cursor-pointer' : ''}
                                                    >
                                                        {/* Header: table name + order id / draft */}
                                                        <div className="flex items-center justify-between gap-2 p-2">
                                                            <span className="text-body-sm font-bold text-brand-dark break-words">
                                                                {table.table_number}
                                                            </span>

                                                            {hasViewableOrder && (
                                                                <span className="flex items-center gap-1.5">
                                                                    <span className="inline-flex items-center gap-1 text-micro font-bold px-2 py-0.5 rounded-badge bg-brand-light text-brand-dark border border-brand-line capitalize">
                                                                        <span className={`h-1.5 w-1.5 rounded-badge ${statusCfg?.dot || 'bg-line-strong'}`} />
                                                                        {orderInfo.status}
                                                                    </span>
                                                                    <span className="text-body-sm font-bold text-brand-dark">
                                                                        #{orderInfo.dinein_order_id || orderInfo.id}
                                                                    </span>
                                                                </span>
                                                            )}
                                                            {tableHasDraft && !hasViewableOrder && (
                                                                <span className="ui-chip bg-state-reserved-bg text-state-reserved">Draft</span>
                                                            )}
                                                        </div>

                                                        {/* Body */}
                                                        <div className="grid gap-0.5 px-3 pb-2.5 text-ui-sm text-ink-muted min-h-[1.75rem]">
                                                            {hasViewableOrder ? (
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <span><b className="text-ink-soft">{orderCount} time ordered</b></span>
                                                                    {elapsedTime && (
                                                                        <span className="inline-flex items-center gap-1 text-micro font-bold text-ink-muted whitespace-nowrap">
                                                                            <Clock size={12} className="text-brand" />
                                                                            {elapsedTime}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            ) : statusKey === 'reserved' ? (
                                                                <span className="inline-flex items-center gap-1.5 text-ui-sm font-semibold text-state-reserved">
                                                                    <Lock size={14} /> Reserved
                                                                </span>
                                                            ) : isVacant ? (
                                                                <span className="text-heading-sm leading-none text-brand-soft">—</span>
                                                            ) : (statusKey === 'occupied' || statusKey === 'served') ? (
                                                                <Eye size={18} className="text-brand" />
                                                            ) : (
                                                                <span className="text-heading-sm leading-none text-brand-soft">—</span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Action strip */}
                                                    {showConfirmPayment && (
                                                        <button
                                                            onClick={e => {
                                                                e.stopPropagation();
                                                                onConfirmPayment?.(orderInfo.id, table.id);
                                                            }}
                                                            className="flex items-center justify-center gap-1 w-full py-2 bg-brand text-text-white text-micro font-bold tracking-wide hover:bg-brand-dark transition-colors"
                                                        >
                                                            <Check size={13} />
                                                            CONFIRM PAYMENT
                                                        </button>
                                                    )}

                                                    {hasViewableOrder && orderInfo.status === 'ready' && !showConfirmPayment && (
                                                        <button
                                                            onClick={e => { e.stopPropagation(); onMarkAsServed?.(orderInfo.id, table.id); }}
                                                            className="w-full py-2 bg-brand text-text-white text-micro font-bold tracking-wide hover:bg-brand-dark transition-colors"
                                                        >
                                                            MARK AS SERVED
                                                        </button>
                                                    )}

                                                    {/* Footer: print | total | cancel */}
                                                    {hasViewableOrder && (
                                                        <div className="grid grid-cols-3 mt-auto border-t border-line-soft text-micro font-bold tracking-wide">
                                                            <button
                                                                className="flex items-center justify-center gap-1 py-2 bg-canvas/40 text-brand-dark hover:bg-brand-light transition-colors"
                                                                onClick={e => { e.stopPropagation(); onPrintBill?.(orderInfo.id, table.id); }}
                                                                title="Print Bill"
                                                            >
                                                                <Printer size={12} />
                                                            </button>
                                                            <span className="flex items-center justify-center py-2 border-l border-line-soft text-ui font-bold text-brand-dark">
                                                                {totalPrice}
                                                            </span>
                                                            <button
                                                                className="flex items-center justify-center gap-1 py-2 bg-canvas/40 text-brand-dark border-l border-line-soft hover:bg-brand-soft transition-colors"
                                                                onClick={e => { e.stopPropagation(); onCancelOrder?.(orderInfo.id, table.id); }}
                                                                title="Cancel Order"
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </section>
                );
            })}

            {orderMode === 'takeaway' && (
                <section className="ui-panel text-center py-10 text-ui text-ink-muted">
                    Takeaway selected. Opening menu…
                </section>
            )}
        </div>
    );
};