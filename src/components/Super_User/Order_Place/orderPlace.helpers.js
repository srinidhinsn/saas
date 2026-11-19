import axios from 'axios';
import { toast } from 'react-toastify';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

export function getUserIdFromToken(token) {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.user_id || payload.sub || null;
    } catch {
        return null;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Draft helpers
// ─────────────────────────────────────────────────────────────────────────────

export async function readDraft(tableId, clientId, token) {
    try {
        const r = await axios.get(
            `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/table`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        const allOrders = r.data?.data || [];
        return allOrders.find(
            o => o.status === 'draft' && String(o.table_id) === String(tableId)
        ) || null;
    } catch {
        return null;
    }
}

export async function writeDraft(tableId, cart, clientId, token, customerDetails = {}, selectedAddressId = "", formattedAddress = "") {
    try {
        const existing = await readDraft(tableId, clientId, token);
        if (existing) {
            await axios.post(
                `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/update`,
                { id: existing.id, status: 'cancelled' },
                { headers: { Authorization: `Bearer ${token}` } }
            );
        }

        // Only send parent (non-addon) items in the draft — addons are stored
        // as metadata on the parent via parent_item_key so they can be restored
        const parentItems = cart.filter(i => !i.is_addon);
        const total = parentItems.reduce((s, i) => s + (i.unit_price || 0) * i.quantity, 0);

        await axios.post(
            `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/create`,
            {
                client_id: clientId,
                table_id: Number(tableId),
                price: total,
                gst: 0,
                cst: 0,
                total_price: total,
                status: 'draft', customer_id:
                    customerDetails.customer_id ||
                    getUserIdFromToken(token) ||
                    "",
                delivery_address: selectedAddressId || '',
                items: parentItems.map(i => ({
                    item_id: i.id,
                    item_name: i.name,
                    quantity: i.quantity,
                    unit_price: i.unit_price,
                    line_total: (i.unit_price || 0) * i.quantity,
                    status: 'draft',
                    slug: i.slug || '',
                    frontend_unique_key: i.frontend_unique_key,
                    line_item_id: cart
                        .filter(a => a.is_addon && a.parent_item_key === i.frontend_unique_key)
                        .map(a => a.id),
                })),
            },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return true;
    } catch (err) {
        console.error('writeDraft failed:', err);
        return false;
    }
}

export async function deleteDraftFromDB(tableId, clientId, token) {
    try {
        const existing = await readDraft(tableId, clientId, token);
        if (!existing) return;
        await axios.post(
            `${import.meta.env.VITE_API_ORDER_SERVICE_URL}/${clientId}/dinein/update`,
            { id: existing.id, status: 'cancelled' },
            { headers: { Authorization: `Bearer ${token}` } }
        );
    } catch (err) {
        console.warn('deleteDraft warning:', err?.response?.data || err.message);
    }
}

export function getDraftTableIdsFromOrders(allOrders) {
    return (allOrders || [])
        .filter(o => o.status === 'draft')
        .map(o => String(o.table_id));
}

export async function upsertBillingDocumentForCustomer({
    clientId,
    token,
    orderId,
    tableRef,
    customerDetails, selectedAddressId,
    orderSubtotal = 0,
}) {
    try {
        const payload = {
            client_id: clientId,
            document_type: 'Invoice',
            document_date: new Date().toISOString(),
            order_id: orderId.toString(),
            reference_number: tableRef || `Order ${orderId}`,
            subtotal: orderSubtotal,
            tax_amount: 0,
            tax_rate: 18,
            discount_amount: 0,
            discount: 0,
            total_amount: orderSubtotal,
            payment_status: 'Pending',
            status: 'Draft',
            customer_id:
                customerDetails.customer_id ||
                getUserIdFromToken(token) ||
                "",
            contact_email: customerDetails.contact_email || '',
            contact_phone: customerDetails.contact_phone || '',
            shipping_address: selectedAddressId || "",
        };

        const res = await axios.post(
            `${import.meta.env.VITE_API_BILLING_SERVICE_URL}/${clientId}/invoice/create_document`,
            payload,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return res?.data?.data?.id ?? null;
    } catch (err) {
        console.warn('[upsertBillingDocumentForCustomer] failed:', err?.response?.data || err.message);
        return null;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// printKOT
//
// Items store category_name (e.g. "Juices") in category_id field instead
// of the actual DB category ID (e.g. "juices_veg"). We resolve the real ID by
// looking up the category by name in categoriesFlat before walking ancestors.
// ─────────────────────────────────────────────────────────────────────────────

export const printKOT = ({ counterTree, categoriesFlat, itemsToPrint, meta }) => {

    // Build a name→id map from categoriesFlat so we can resolve category names
    // that items store in their category_id field
    const categoryNameToId = {};
    categoriesFlat.forEach(c => {
        if (c.name) categoryNameToId[c.name.trim().toLowerCase()] = c.id;
    });

    // Resolve the real category ID for an item, handling both actual IDs and
    // category names stored in the category_id field
    const resolveRealCategoryId = (rawCategoryId) => {
        if (!rawCategoryId) return null;
        // Check if it already exists as a real category ID
        const directMatch = categoriesFlat.find(c => c.id === rawCategoryId);
        if (directMatch) return rawCategoryId;
        // Otherwise treat it as a category name and look up the ID
        const nameKey = String(rawCategoryId).trim().toLowerCase();
        return categoryNameToId[nameKey] || null;
    };

    // Walk from a category ID up through all ancestor IDs (inclusive)
    const getCategoryAncestors = (categoryId) => {
        const ancestors = new Set();
        let cur = categoryId;
        const visited = new Set();
        while (cur && !visited.has(cur)) {
            visited.add(cur);
            ancestors.add(cur);
            const cat = categoriesFlat.find(c => c.id === cur);
            cur = cat?.parentId || null;
        }
        return ancestors;
    };

    // Map counter id → set of assigned sub-category IDs
    const counterCategoryMap = {};
    counterTree.forEach(counter => {
        counterCategoryMap[counter.id] = new Set(
            (counter.subCategories || []).map(sc => sc.id)
        );
    });

    // Find which counter an item belongs to by resolving its real category ID
    // first, then walking ancestors to match against counter assignments
    const findCounterForItem = (item) => {
        // Resolve the actual category ID (item.category_id may be a name)
        const realCategoryId = resolveRealCategoryId(item.category_id || item.category);
        if (!realCategoryId) return null;

        const ancestors = getCategoryAncestors(realCategoryId);
        for (const counter of counterTree) {
            const assigned = counterCategoryMap[counter.id];
            for (const catId of assigned) {
                if (ancestors.has(catId)) return counter;
            }
        }
        return null;
    };

    // Build addon map keyed by parent's frontend_unique_key
    const addonsByParentKey = {};
    itemsToPrint.forEach(item => {
        if (item.is_addon && item.parent_item_key) {
            if (!addonsByParentKey[item.parent_item_key]) {
                addonsByParentKey[item.parent_item_key] = [];
            }
            addonsByParentKey[item.parent_item_key].push(item);
        }
    });

    // Only route parent / standalone items to counters
    const parentItems = itemsToPrint.filter(item => !item.is_addon);

    const groups = {};
    parentItems.forEach(item => {
        const counter = findCounterForItem(item);
        const key = counter ? counter.id : '__unassigned__';
        const name = counter ? counter.name : 'General Kitchen';
        if (!groups[key]) groups[key] = { counterName: name, items: [] };
        groups[key].items.push({
            ...item,
            linkedAddons: addonsByParentKey[item.frontend_unique_key] || [],
        });
    });

    const groupEntries = Object.entries(groups);
    if (groupEntries.length === 0) {
        toast.warn('No items to print KOT for.');
        return;
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString();

    const slipHtml = groupEntries.map(([, group]) => {
        const rows = group.items.map(item => {
            const mainRow = `
        <tr>
          <td style="padding:4px 2px;border-bottom:1px dashed #ccc;font-size:13px;font-weight:bold;">
            ${item.name}
          </td>
          <td style="padding:4px 2px;border-bottom:1px dashed #ccc;font-size:13px;text-align:center;font-weight:bold;">
            ${item.quantity}
          </td>
          ${item.note
                    ? `<td style="padding:4px 2px;border-bottom:1px dashed #ccc;font-size:11px;color:#555;font-style:italic;">${item.note}</td>`
                    : '<td></td>'}
        </tr>
      `;
            const addonRows = (item.linkedAddons || []).map(addon => `
        <tr>
          <td style="padding:2px 2px 2px 16px;border-bottom:1px dashed #eee;font-size:11px;color:#555;">
            ↳ ${addon.name}
          </td>
          <td style="padding:2px 2px;border-bottom:1px dashed #eee;font-size:11px;text-align:center;color:#555;">
            ${addon.quantity}
          </td>
          <td></td>
        </tr>
      `).join('');
            return mainRow + addonRows;
        }).join('');

        return `
      <div class="kot-slip">
        <div style="text-align:center;border-bottom:2px solid #000;padding-bottom:6px;margin-bottom:8px;">
          <div style="font-size:16px;font-weight:bold;letter-spacing:1px;">KOT</div>
          <div style="font-size:13px;font-weight:bold;margin-top:2px;">Counter: ${group.counterName}</div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:6px;">
          <span>${meta.orderMode === 'takeaway' ? '🛍 Takeaway' : `Table: ${meta.tableNumber}`}</span>
          <span>${dateStr} ${timeStr}</span>
        </div>
        ${meta.dineinOrderId
                ? `<div style="font-size:11px;margin-bottom:6px;color:#555;">Order #${meta.dineinOrderId}</div>`
                : ''}
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="border-bottom:2px solid #000;">
              <th style="text-align:left;font-size:12px;padding:3px 2px;">Item</th>
              <th style="text-align:center;font-size:12px;padding:3px 2px;">Qty</th>
              <th style="text-align:left;font-size:12px;padding:3px 2px;">Note</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div style="text-align:center;margin-top:10px;font-size:11px;color:#888;">— End of KOT —</div>
      </div>
    `;
    }).join('<div class="page-break"></div>');

    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) {
        toast.error('Popup blocked. Please allow popups to print KOT.');
        return;
    }
    printWindow.document.write(`
    <!DOCTYPE html><html><head><title>KOT</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Courier New', monospace; background: #fff; }
      .kot-slip { width: 72mm; padding: 8px; margin: 0 auto; }
      .page-break { page-break-after: always; }
      @media print {
        body { -webkit-print-color-adjust: exact; }
        .kot-slip { page-break-inside: avoid; }
        .page-break { page-break-after: always; height: 0; }
      }
    </style></head><body>
    ${slipHtml}
    <script>
      window.onload = function() {
        window.print();
        window.onafterprint = function() { window.close(); };
      };
    <\/script>
    </body></html>
  `);
    printWindow.document.close();
};