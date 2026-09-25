import axios from 'axios';
import { menuCache } from './menuCache';

export async function returnRentalItems({items,menuItemsMap,clientId,token,reason = 'Rental item returned',}) {
    if (!items?.length) return null;

    // ── 1. Cancel each order-item row on the backend ──
    await Promise.all(
        items.map(i =>
            axios.delete(
                `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/order_item/delete`,
                {
                    params: {
                        client_id: clientId,
                        order_item_id: i.id,
                        transaction_type: 'ORDER_RETURNED',
                        reason,
                    },
                    headers: { Authorization: `Bearer ${token}` },
                }
            )
        )
    );

    // ── 2. Compute restored availability for each affected menu item ──
    const changedRecords = items
        .map(i => ({ qty: i.quantity || 1, record: menuItemsMap[String(i.item_id)] }))
        .filter(({ record }) => record && record.availability != null);

    if (changedRecords.length === 0) return null;

    const idToAvailability = {};
    const updatedById = {};

    changedRecords.forEach(({ qty, record }) => {
        const restored = Number(record.availability) + qty;
        idToAvailability[record.id] = restored;
        updatedById[record.id] = { ...record, availability: restored };
    });

    // ── 3. Build the merged map (caller applies it via setState) ──
    const nextMap = { ...menuItemsMap };
    Object.entries(updatedById).forEach(([id, updated]) => {
        nextMap[String(id)] = updated;
        nextMap[Number(id)] = updated;
    });

    // ── 4. Patch the persisted cache too ──
    menuCache.patchAvailability(clientId, idToAvailability);

    return nextMap;
}