import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SaleItem } from '../types';
import { formatCurrency } from './utils';

export const generateInvoice = (
  id: string, 
  customer: string, 
  items: SaleItem[], 
  totalAmt: number, 
  paid: number, 
  changeAmt: number, 
  attendantName: string = 'Staff',
  type: 'pdf' | 'memo' = 'pdf',
  discountAmt: number = 0
) => {
  const doc = new jsPDF({
    format: type === 'memo' ? [80, 150] : 'a4',
    unit: 'mm'
  });
  
  const primaryColor: [number, number, number] = [79, 70, 229]; // Indigo
  const accentColor: [number, number, number] = [15, 23, 42]; // Slate 900

  if (type === 'pdf') {
    // Decorative Header Background
    doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('PUBLICATION CDS', 105, 18, { align: 'center' });
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('PROFESSIONAL BUSINESS MANAGEMENT SOLUTIONS', 105, 25, { align: 'center' });
    doc.text('Smart. Scalable. Secure.', 105, 30, { align: 'center' });

    // Details Section
    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE TO:', 20, 50);
    
    doc.setFont('helvetica', 'normal');
    doc.text(`Customer: ${customer}`, 20, 56);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 62);
    
    doc.text('INVOICE DETAILS:', 140, 50);
    doc.text(`Invoice ID: ${id}`, 140, 56);
    doc.text(`Attendant: ${attendantName}`, 140, 62);

    // Table
    autoTable(doc, {
      startY: 75,
      head: [['Product Description', 'Price', 'Qty', 'Total']],
      body: items.map(item => [
        item.name, 
        formatCurrency(item.price), 
        item.quantity, 
        formatCurrency(item.price * item.quantity)
      ]),
      foot: [
        ['', '', 'Subtotal', formatCurrency(totalAmt + discountAmt)],
        ['', '', 'Discount', formatCurrency(discountAmt)],
        ['', '', 'Grand Total', formatCurrency(totalAmt)],
        ['', '', 'Paid Amount', formatCurrency(paid)],
        ['', '', 'Change Due', formatCurrency(changeAmt)]
      ],
      theme: 'grid',
      headStyles: { 
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontSize: 10,
        fontStyle: 'bold',
        halign: 'center'
      },
      footStyles: {
        fillColor: [248, 250, 252],
        textColor: accentColor,
        fontSize: 10,
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { halign: 'center' },
        2: { halign: 'center' },
        3: { halign: 'right' }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;
    
    // Footer
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Thank you for your business!', 105, finalY, { align: 'center' });
    
    doc.setDrawColor(226, 232, 240);
    doc.line(20, finalY + 5, 190, finalY + 5);
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('This is a computer-generated invoice. No signature required.', 105, finalY + 12, { align: 'center' });
    
    doc.save(`invoice-${id}.pdf`);
  } else {
    // Memo (Thermal Style) 80mm
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('PUBLICATION CDS', 40, 10, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Invoice ID: ${id}`, 5, 20);
    doc.text(`Date: ${new Date().toLocaleString()}`, 5, 24);
    doc.text(`Customer: ${customer}`, 5, 28);
    
    doc.setLineWidth(0.5);
    doc.line(5, 32, 75, 32);
    
    let y = 38;
    doc.setFontSize(7);
    items.forEach(item => {
      doc.text(`${item.name.slice(0, 25)}`, 5, y);
      doc.text(`${item.quantity} x ${item.price}`, 5, y + 4);
      doc.text(`${(item.quantity * item.price).toFixed(2)}`, 75, y + 4, { align: 'right' });
      y += 9;
    });
    
    doc.line(5, y, 75, y);
    y += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('SUBTOTAL:', 5, y);
    doc.text(`${(totalAmt + discountAmt).toFixed(2)}`, 75, y, { align: 'right' });
    y += 5;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('DISCOUNT:', 5, y);
    doc.text(`${discountAmt.toFixed(2)}`, 75, y, { align: 'right' });
    y += 5;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL:', 5, y);
    doc.text(`${totalAmt.toFixed(2)}`, 75, y, { align: 'right' });
    y += 5;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('PAID:', 5, y);
    doc.text(`${paid.toFixed(2)}`, 75, y, { align: 'right' });
    y += 5;
    doc.text('CHANGE:', 5, y);
    doc.text(`${changeAmt.toFixed(2)}`, 75, y, { align: 'right' });
    
    y += 12;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('*** THANK YOU ***', 40, y, { align: 'center' });
    
    const pdfBlob = doc.output('blob');
    const url = URL.createObjectURL(pdfBlob);
    window.open(url);
  }
};
