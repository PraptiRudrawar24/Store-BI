import type { CompletedSale } from '../types/pos';
import { formatPaiseToRupee } from './money';

/**
 * Generates and downloads a high-resolution PNG image of the thermal receipt
 * using HTML5 Canvas. Zero external dependencies, instantaneous, and offline-compatible.
 */
export function downloadReceiptImage(sale: CompletedSale): void {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Thermal 80mm receipt proportional canvas width
  const width = 560;
  // Calculate dynamic height based on line items
  const baseHeight = 360;
  const itemRowHeight = 28;
  const height = baseHeight + sale.items.length * itemRowHeight + (sale.customer.name ? 24 : 0);

  // Set 2x resolution for ultra-sharp retina rendering
  const scale = 2;
  canvas.width = width * scale;
  canvas.height = height * scale;
  ctx.scale(scale, scale);

  // Background - Real White Paper
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Styling helpers
  ctx.fillStyle = '#0f172a'; // Deep slate ink
  ctx.textBaseline = 'top';

  let y = 24;

  // 1. Store Header
  ctx.font = 'bold 17px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(sale.storeName.toUpperCase(), width / 2, y);
  y += 22;

  ctx.font = '11px "JetBrains Mono", monospace';
  ctx.fillStyle = '#475569';
  ctx.fillText(sale.storeDivision, width / 2, y);
  y += 20;

  ctx.font = 'bold 12px "JetBrains Mono", monospace';
  ctx.fillStyle = '#1e293b';
  ctx.fillText('TAX INVOICE / CASH RECEIPT', width / 2, y);
  y += 18;

  ctx.font = '10px "JetBrains Mono", monospace';
  ctx.fillStyle = '#64748b';
  ctx.fillText(`Bill: ${sale.billNumber} | ${sale.timestamp}`, width / 2, y);
  y += 16;

  if (sale.customer.name || sale.customer.phone) {
    const custText = `Customer: ${sale.customer.name || 'Walk-in'}${
      sale.customer.phone ? ` (+91 ${sale.customer.phone})` : ''
    }`;
    ctx.fillText(custText, width / 2, y);
    y += 18;
  }

  // Dashed separator helper
  const drawDashedLine = (currentY: number) => {
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(24, currentY);
    ctx.lineTo(width - 24, currentY);
    ctx.stroke();
    ctx.setLineDash([]);
  };

  y += 6;
  drawDashedLine(y);
  y += 12;

  // 2. Table Column Headers
  ctx.font = 'bold 11px "JetBrains Mono", monospace';
  ctx.fillStyle = '#475569';
  ctx.textAlign = 'left';
  ctx.fillText('ITEM', 24, y);

  ctx.textAlign = 'center';
  ctx.fillText('QTY', 320, y);

  ctx.textAlign = 'right';
  ctx.fillText('PRICE', 420, y);
  ctx.fillText('TOTAL', width - 24, y);
  y += 18;

  // 3. Line Items
  ctx.font = '11px "JetBrains Mono", monospace';
  ctx.fillStyle = '#0f172a';

  sale.items.forEach((item) => {
    ctx.textAlign = 'left';
    // Truncate name if too long for column
    let displayName = item.product.name;
    if (displayName.length > 28) {
      displayName = displayName.substring(0, 26) + '..';
    }
    ctx.fillText(displayName, 24, y);

    ctx.textAlign = 'center';
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.fillText(String(item.quantity), 320, y);

    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#475569';
    ctx.fillText(formatPaiseToRupee(item.product.pricePaise), 420, y);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    const lineTotal = item.product.pricePaise * item.quantity;
    ctx.fillText(formatPaiseToRupee(lineTotal), width - 24, y);

    y += itemRowHeight;
  });

  y += 4;
  drawDashedLine(y);
  y += 12;

  // 4. Totals Breakdown
  ctx.font = '11px "JetBrains Mono", monospace';
  ctx.fillStyle = '#475569';
  ctx.textAlign = 'left';
  ctx.fillText('Subtotal:', 24, y);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 11px "JetBrains Mono", monospace';
  ctx.fillText(formatPaiseToRupee(sale.totals.subtotalPaise), width - 24, y);
  y += 18;

  if (sale.totals.discountPaise > 0) {
    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.fillStyle = '#059669';
    ctx.textAlign = 'left';
    ctx.fillText('Discount (Promo):', 24, y);
    ctx.textAlign = 'right';
    ctx.fillText(`-${formatPaiseToRupee(sale.totals.discountPaise)}`, width - 24, y);
    y += 18;
  }

  ctx.font = '11px "JetBrains Mono", monospace';
  ctx.fillStyle = '#475569';
  ctx.textAlign = 'left';
  ctx.fillText('GST (5%) [CGST 2.5% + SGST 2.5%]:', 24, y);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 11px "JetBrains Mono", monospace';
  ctx.fillText(formatPaiseToRupee(sale.totals.gstPaise), width - 24, y);
  y += 18;

  if (sale.totals.roundOffPaise !== 0) {
    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'left';
    ctx.fillText('Round-off to nearest rupee:', 24, y);
    ctx.textAlign = 'right';
    const sign = sale.totals.roundOffPaise > 0 ? '+' : '';
    ctx.fillText(`${sign}${formatPaiseToRupee(sale.totals.roundOffPaise)}`, width - 24, y);
    y += 18;
  }

  // Solid double line
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(24, y + 2);
  ctx.lineTo(width - 24, y + 2);
  ctx.stroke();
  y += 14;

  // 5. Grand Total
  ctx.font = 'bold 15px "JetBrains Mono", monospace';
  ctx.fillStyle = '#0f172a';
  ctx.textAlign = 'left';
  ctx.fillText('GRAND TOTAL:', 24, y);
  ctx.textAlign = 'right';
  ctx.font = 'bold 20px "JetBrains Mono", monospace';
  ctx.fillText(formatPaiseToRupee(sale.totals.grandTotalPaise), width - 24, y - 2);
  y += 26;

  // Payment method
  ctx.font = '11px "JetBrains Mono", monospace';
  ctx.fillStyle = '#475569';
  ctx.textAlign = 'left';
  ctx.fillText('Payment Method:', 24, y);
  ctx.textAlign = 'right';
  ctx.font = 'bold 11px "JetBrains Mono", monospace';
  ctx.fillStyle = '#0f172a';
  ctx.fillText(sale.paymentMethod, width - 24, y);
  y += 20;

  drawDashedLine(y);
  y += 14;

  // 6. Footer
  ctx.font = '11px "JetBrains Mono", monospace';
  ctx.fillStyle = '#334155';
  ctx.textAlign = 'center';
  ctx.fillText('Thank you for shopping with us!', width / 2, y);
  y += 16;

  ctx.font = '10px "JetBrains Mono", monospace';
  ctx.fillStyle = '#64748b';
  ctx.fillText('Powered by Store BI • Inventra Retail Intelligence', width / 2, y);

  // Trigger browser download
  const dataUrl = canvas.toDataURL('image/png');
  const downloadLink = document.createElement('a');
  downloadLink.href = dataUrl;
  downloadLink.download = `Bill_${sale.billNumber.replace(/[^a-zA-Z0-9-]/g, '_')}.png`;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
}

/**
 * Builds a formatted WhatsApp text message with the complete bill summary
 * and returns the wa.me link.
 */
export function getWhatsAppBillUrl(sale: CompletedSale): string {
  const phone = sale.customer.phone ? `91${sale.customer.phone.replace(/\D/g, '')}` : '';
  
  let text = `🧾 *${sale.storeName}*\n`;
  text += `📍 ${sale.storeDivision}\n`;
  text += `📄 Bill No: ${sale.billNumber}\n`;
  text += `📅 Date: ${sale.timestamp}\n`;
  if (sale.customer.name) {
    text += `👤 Customer: ${sale.customer.name}\n`;
  }
  text += `--------------------------------\n`;

  sale.items.forEach((item, index) => {
    const lineTotal = formatPaiseToRupee(item.product.pricePaise * item.quantity);
    const unitPrice = formatPaiseToRupee(item.product.pricePaise);
    text += `${index + 1}. *${item.product.name}*\n`;
    text += `   Qty: ${item.quantity} x ${unitPrice} = *${lineTotal}*\n`;
  });

  text += `--------------------------------\n`;
  text += `Subtotal: ${formatPaiseToRupee(sale.totals.subtotalPaise)}\n`;
  if (sale.totals.discountPaise > 0) {
    text += `Discount: -${formatPaiseToRupee(sale.totals.discountPaise)}\n`;
  }
  text += `GST (5%): ${formatPaiseToRupee(sale.totals.gstPaise)}\n`;
  if (sale.totals.roundOffPaise !== 0) {
    const sign = sale.totals.roundOffPaise > 0 ? '+' : '';
    text += `Round-off: ${sign}${formatPaiseToRupee(sale.totals.roundOffPaise)}\n`;
  }
  text += `*GRAND TOTAL: ${formatPaiseToRupee(sale.totals.grandTotalPaise)}*\n`;
  text += `Payment Mode: ${sale.paymentMethod}\n`;
  text += `--------------------------------\n`;
  text += `Thank you for shopping with us! 🙏`;

  const encoded = encodeURIComponent(text);
  return phone ? `https://wa.me/${phone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
}
