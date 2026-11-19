import jsPDF from 'jspdf';
import { toast } from 'react-toastify';

const generatePdf = ({
  clientId,
  gstNumber,
  invoiceNumber,
  tableName,
  orderMode,
  orderId,
  items,
  addonsByParent,
  subtotal,
  discount,
  taxPercent,
  gstAmount,
  total,
  paymentInfo,
  paymentStatus,
  customerId,
  contactPhone,
  contactEmail,
}) => {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const x = 40;
  let y = 50;

  doc.setFillColor(102, 126, 234);
  doc.rect(0, 0, pageWidth, 120, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.setTextColor(255, 255, 255);
  doc.text(clientId.toUpperCase(), x, y);

  doc.setFontSize(18);
  doc.text('INVOICE', x, y + 30);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Invoice No: ${invoiceNumber}`, pageWidth - x, y, { align: 'right' });
  doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth - x, y + 20, { align: 'right' });
  doc.text(
    `Time: ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
    pageWidth - x,
    y + 35,
    { align: 'right' }
  );

  y = 140;
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('FROM', x, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(localStorage.getItem('restaurant_address') || 'Address not available', x, y + 15);
  if (gstNumber) {
    doc.text(`GSTIN: ${gstNumber}`, x, y + 28);
  }

  y += 50;

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(1);
  doc.line(x, y, pageWidth - x, y);

  y += 25;

  // Customer details — PDF only, the thermal slip skips this block entirely
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('BILL TO', x, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Customer: ${customerId || 'Walk-in Customer'}`, x, y + 18);
  doc.text(`Phone: ${contactPhone || 'N/A'}`, x, y + 32);
  doc.text(`Email: ${contactEmail || 'N/A'}`, x, y + 46);

  doc.setFont('helvetica', 'bold');
  doc.text('ORDER DETAILS', pageWidth - 180, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`Table: ${tableName || 'N/A'}`, pageWidth - 180, y + 18);
  doc.text(`Type: ${orderMode || 'Dine-In'}`, pageWidth - 180, y + 32);
  doc.text(`Order #${orderId}`, pageWidth - 180, y + 46);

  y += 70;

  doc.setFillColor(248, 250, 252);
  doc.rect(x, y - 5, pageWidth - 80, 25, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('ITEM', 45, y + 10);
  doc.text('QTY', pageWidth - 260, y + 10);
  doc.text('PRICE', pageWidth - 180, y + 10);
  doc.text('AMOUNT', pageWidth - 80, y + 10);

  y += 30;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);

  items.forEach((item, index) => {
    if (y > pageHeight - 150) {
      doc.addPage();
      y = 50;
    }
    if (index % 2 === 0) {
      doc.setFillColor(249, 250, 251);
      doc.rect(x, y - 8, pageWidth - 80, 20, 'F');
    }
    doc.text(item.name || 'Unnamed', 45, y);
    doc.text(`${item.quantity || 0}`, pageWidth - 260, y);
    doc.text(`₹${(item.unit_price ?? 0).toFixed(2)}`, pageWidth - 180, y);
    doc.text(`₹${((item.unit_price ?? 0) * (item.quantity ?? 0)).toFixed(2)}`, pageWidth - 80, y);
    y += 20;

    // Addons indented below the parent item
    const addons = addonsByParent[item.frontend_unique_key] || [];
    addons.forEach((addon) => {
      doc.setTextColor(100, 100, 200);
      doc.text(`  ↳ ${addon.name}`, 55, y);
      doc.text(`${addon.quantity || 0}`, pageWidth - 260, y);
      doc.text(`₹${(addon.unit_price ?? 0).toFixed(2)}`, pageWidth - 180, y);
      doc.text(`+₹${((addon.unit_price ?? 0) * (addon.quantity ?? 0)).toFixed(2)}`, pageWidth - 80, y);
      y += 16;
      doc.setTextColor(0, 0, 0);
    });
  });

  y += 15;
  doc.setDrawColor(200, 200, 200);
  doc.line(x, y, pageWidth - x, y);
  y += 20;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Subtotal:', pageWidth - 200, y);
  doc.text(`₹${subtotal.toFixed(2)}`, pageWidth - 80, y, { align: 'right' });
  y += 18;

  doc.text('Discount:', pageWidth - 200, y);
  doc.setTextColor(239, 68, 68);
  doc.text(`-₹${discount.toFixed(2)}`, pageWidth - 80, y, { align: 'right' });
  y += 18;

  doc.setTextColor(0, 0, 0);
  doc.text(`GST (${taxPercent}%):`, pageWidth - 200, y);
  doc.text(`₹${gstAmount.toFixed(2)}`, pageWidth - 80, y, { align: 'right' });
  y += 25;

  doc.setFillColor(239, 246, 255);
  doc.rect(pageWidth - 220, y - 12, 180, 30, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(59, 130, 246);
  doc.text('TOTAL:', pageWidth - 200, y);
  doc.text(`₹${total.toFixed(2)}`, pageWidth - 80, y, { align: 'right' });

  y += 40;
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('PAYMENT INFORMATION', x, y);
  y += 18;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  if (paymentInfo.length > 1) {
    paymentInfo.forEach((split, idx) => {
      doc.text(`${idx + 1}. ${split.method}:`, 45, y);
      doc.text(`₹${Number(split.amount).toFixed(2)}`, 200, y);
      y += 15;
    });
  } else {
    const paymentMethod = paymentInfo[0]?.method;
    const paymentAmount = paymentInfo[0]?.amount ?? total;
    doc.text(`Payment Method: ${paymentMethod}`, 45, y);
    y += 15;
    doc.text(`Amount Paid: ₹${Number(paymentAmount).toFixed(2)}`, 45, y);
    y += 15;
  }

  doc.text(`Payment Status: ${paymentStatus}`, 45, y);
  y += 30;

  doc.setDrawColor(200, 200, 200);
  doc.line(x, pageHeight - 80, pageWidth - x, pageHeight - 80);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text('Thank you for your business!', pageWidth / 2, pageHeight - 50, { align: 'center' });
  doc.setFontSize(8);
  doc.text(`Generated on ${new Date().toLocaleString()}`, pageWidth / 2, pageHeight - 35, {
    align: 'center',
  });

  doc.save(`Invoice_${invoiceNumber}_${orderId}.pdf`);
};

// Thermal receipt-style print of the bill (mirrors printKOT).
// Excludes customer details; includes client info, items, prices, tax, discount, total.
const printSlip = ({
  clientId,
  gstNumber,
  invoiceNumber,
  tableName,
  orderMode,
  orderId,
  items,
  addonsByParent,
  subtotal,
  discount,
  taxPercent,
  gstAmount,
  total,
  paymentInfo,
  paymentStatus,
}) => {
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString();
  const restaurantAddress = localStorage.getItem('restaurant_address') || '';

  const rows = items
    .map((item) => {
      const price = Number(item.unit_price) || 0;
      const lineTotal = (price * item.quantity).toFixed(2);
      const mainRow = `
      <tr>
        <td style="padding:4px 2px;border-bottom:1px dashed #ccc;font-size:13px;font-weight:bold;">
          ${item.name}
        </td>
        <td style="padding:4px 2px;border-bottom:1px dashed #ccc;font-size:13px;text-align:center;font-weight:bold;">
          ${item.quantity}
        </td>
        <td style="padding:4px 2px;border-bottom:1px dashed #ccc;font-size:12px;text-align:right;">
          ₹${price.toFixed(2)}
        </td>
        <td style="padding:4px 2px;border-bottom:1px dashed #ccc;font-size:12px;text-align:right;font-weight:bold;">
          ₹${lineTotal}
        </td>
      </tr>
    `;
      const addons = addonsByParent[item.frontend_unique_key] || [];
      const addonRows = addons
        .map((addon) => {
          const aPrice = Number(addon.unit_price) || 0;
          const aTotal = (aPrice * addon.quantity).toFixed(2);
          return `
      <tr>
        <td style="padding:2px 2px 2px 16px;border-bottom:1px dashed #eee;font-size:11px;color:#555;">
          ↳ ${addon.name}
        </td>
        <td style="padding:2px 2px;border-bottom:1px dashed #eee;font-size:11px;text-align:center;color:#555;">
          ${addon.quantity}
        </td>
        <td style="padding:2px 2px;border-bottom:1px dashed #eee;font-size:11px;text-align:right;color:#555;">
          ₹${aPrice.toFixed(2)}
        </td>
        <td style="padding:2px 2px;border-bottom:1px dashed #eee;font-size:11px;text-align:right;color:#555;">
          ₹${aTotal}
        </td>
      </tr>`;
        })
        .join('');
      return mainRow + addonRows;
    })
    .join('');

  const paymentRows = (paymentInfo || [])
    .map(
      (p) => `
    <div style="display:flex;justify-content:space-between;font-size:12px;">
      <span>${p.method}</span>
      <span>₹${Number(p.amount).toFixed(2)}</span>
    </div>
  `
    )
    .join('');

  const slipHtml = `
    <div class="bill-slip">
      <div style="text-align:center;border-bottom:2px solid #000;padding-bottom:6px;margin-bottom:8px;">
        <div style="font-size:17px;font-weight:bold;letter-spacing:1px;">${clientId.toUpperCase()}</div>
        ${restaurantAddress ? `<div style="font-size:10px;color:#555;margin-top:2px;">${restaurantAddress}</div>` : ''}
        ${gstNumber ? `<div style="font-size:15px;font-weight:bold;color:#555;margin-top:2px;">GSTIN: ${gstNumber}</div>` : ''}
        <div style="font-size:14px;font-weight:bold;margin-top:6px;">BILL</div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:bold;margin-bottom:4px;">
        <span>${orderMode === 'takeaway' ? '🛍 Takeaway' : `Table: ${tableName}`}</span>
        <span>${dateStr} ${timeStr}</span>
      </div>
      <div style="font-size:12px;font-weight:bold;margin-bottom:2px;color:#333;">
        Order #${orderId}
      </div>
      <div style="font-size:11px;margin-bottom:6px;color:#555;">
        Invoice: ${invoiceNumber || 'Draft'}
      </div>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="border-bottom:2px solid #000;">
            <th style="text-align:left;font-size:12px;padding:3px 2px;">Item</th>
            <th style="text-align:center;font-size:12px;padding:3px 2px;">Qty</th>
            <th style="text-align:right;font-size:12px;padding:3px 2px;">Price</th>
            <th style="text-align:right;font-size:12px;padding:3px 2px;">Total</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <div style="margin-top:10px;padding-top:6px;border-top:1px dashed #000;font-size:12px;">
        <div style="display:flex;justify-content:space-between;">
          <span>Subtotal</span><span>₹${subtotal.toFixed(2)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;">
          <span>Discount</span><span>-₹${discount.toFixed(2)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;">
          <span>GST (${taxPercent}%)</span><span>₹${gstAmount.toFixed(2)}</span>
        </div>
      </div>

      <div style="display:flex;justify-content:space-between;margin-top:8px;padding-top:6px;border-top:2px solid #000;font-size:15px;font-weight:bold;">
        <span>TOTAL</span>
        <span>₹${total.toFixed(2)}</span>
      </div>

      <div style="margin-top:10px;padding-top:6px;border-top:1px dashed #000;font-size:11px;">
        ${paymentRows}
        <div style="display:flex;justify-content:space-between;font-weight:bold;margin-top:2px;">
          <span>Status</span><span>${paymentStatus}</span>
        </div>
      </div>

      <div style="text-align:center;margin-top:10px;font-size:11px;color:#888;">Thank you for your visit!</div>
    </div>
  `;

  const printWindow = window.open('', '_blank', 'width=400,height=600');
  if (!printWindow) {
    toast.error('Popup blocked. Please allow popups to print the bill.');
    return;
  }
  printWindow.document.write(`
    <!DOCTYPE html><html><head><title>Bill</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      @page { size: 80mm auto; margin: 0; }
      body { font-family: 'Courier New', monospace; background: #fff; }
      .bill-slip { width: 72mm; padding: 6px 8px; margin: 0 auto; }
      @media print {
        body { -webkit-print-color-adjust: exact; }
        .bill-slip { page-break-inside: avoid; }
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

/**
 * @param {object} data
 * @param {'pdf'|'slip'} data.type
 */
export const generateInvoiceOutput = ({ type, ...data }) => {
  if (type === 'pdf') return generatePdf(data);
  return printSlip(data);
};

export default generateInvoiceOutput;