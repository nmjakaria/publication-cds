import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, runTransaction, doc, updateDoc, deleteDoc, increment } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Sale } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { ReceiptText, User, Calendar, ExternalLink, Search, X, Package, Trash2, Edit2, Check } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';

import { generateInvoice } from '../lib/invoice';

export const SalesHistory: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const { isAdmin } = useAuth();

  const handleDownloadLog = () => {
    if (!selectedSale) return;
    generateInvoice(
      selectedSale.invoiceId, 
      selectedSale.customerName, 
      selectedSale.items, 
      selectedSale.totalAmount, 
      selectedSale.paidAmount || selectedSale.totalAmount, 
      selectedSale.change || 0,
      'System', // We don't have the operator name saved here easily
      'pdf',
      selectedSale.discount || 0
    );
  };

  const handleDeleteSale = async (sale: Sale) => {
    if (!isAdmin) return;
    const itemCount = (sale.items || []).length;
    if (!confirm(`Are you sure you want to delete this sale? This will RESTOCK ${itemCount} items back to inventory.`)) return;

    setIsDeleting(sale.id);
    try {
      await runTransaction(db, async (transaction) => {
        // 1. Restock items
        if (sale.items && Array.isArray(sale.items)) {
          for (const item of sale.items) {
            const productRef = doc(db, 'products', item.productId);
            const productDoc = await transaction.get(productRef);
            if (productDoc.exists()) {
              transaction.update(productRef, {
                stockLevel: increment(item.quantity),
                updatedAt: new Date().toISOString()
              });
            }
          }
        }

        // 2. Delete the sale record
        transaction.delete(doc(db, 'sales', sale.id));
      });
      alert("Sale deleted and inventory restocked successfully.");
    } catch (err) {
      console.error("Delete failed:", err);
      alert(`Delete failed: ${err}`);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleUpdateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSale) return;

    try {
      await updateDoc(doc(db, 'sales', editingSale.id), {
        customerName: editingSale.customerName
      });
      setEditingSale(null);
    } catch (err) {
      console.error("Update failed:", err);
      alert("Failed to update sale details.");
    }
  };

  useEffect(() => {
    const q = query(collection(db, 'sales'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setSales(snap.docs.map(d => ({ id: d.id, ...d.data() } as Sale)));
    });
    return unsub;
  }, []);

  const filteredSales = sales.filter(s => 
    s.invoiceId.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.customerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-slate-800 tracking-tight uppercase">Sales Ledger</h2>
          <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Historical Transaction Repository</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-4 text-slate-400" />
        <input 
          type="text" 
          placeholder="Filter by Order ID or Client..."
          className="w-full bg-white border border-slate-200 rounded py-3 pl-10 pr-4 shadow-sm focus:ring-1 focus:ring-indigo-500 text-xs font-semibold"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-3">
        {filteredSales.map((sale) => (
          <div key={sale.id} className="bg-white p-4 rounded border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-indigo-200 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-50 rounded flex items-center justify-center text-slate-400 shrink-0 border border-slate-100">
                <ReceiptText className="w-5 h-5" />
              </div>
              <div>
                <p className="font-mono text-[9px] font-bold text-indigo-500 uppercase tracking-widest leading-none mb-1">{sale.invoiceId}</p>
                <h4 className="font-bold text-sm text-slate-800">{sale.customerName}</h4>
                <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400 font-medium uppercase tracking-tight">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(sale.createdAt), 'MMM dd, HH:mm')}
                  </div>
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    OP: {sale.handledBy?.slice(-4) || 'SYS'}
                  </div>
                </div>
              </div>
            </div>

              <div className="flex items-center gap-2">
                <div className="text-right">
                  <p className="text-lg font-black text-slate-900">{formatCurrency(sale.totalAmount).replace('$', '')}</p>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{(sale.items || []).length} units total</p>
                </div>
                
                <div className="flex items-center gap-1 ml-4">
                  <button 
                    onClick={() => setSelectedSale(sale)}
                    className="p-2 bg-white hover:bg-slate-50 rounded border border-slate-200 transition-all text-slate-400 hover:text-indigo-600 group"
                    title="View Details"
                  >
                    <ExternalLink className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                  </button>
                  
                  {isAdmin && (
                    <>
                      <button 
                        onClick={() => setEditingSale(sale)}
                        className="p-2 bg-white hover:bg-slate-50 rounded border border-slate-200 transition-all text-slate-400 hover:text-amber-600 group"
                        title="Edit Details"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        disabled={isDeleting === sale.id}
                        onClick={() => handleDeleteSale(sale)}
                        className="p-2 bg-white hover:bg-rose-50 rounded border border-slate-200 transition-all text-slate-400 hover:text-rose-600 group disabled:opacity-50"
                        title="Delete & Restock"
                      >
                        {isDeleting === sale.id ? (
                          <div className="w-3.5 h-3.5 border-2 border-slate-200 border-t-rose-500 rounded-full animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>
          </div>
        ))}

        {filteredSales.length === 0 && (
          <div className="py-16 text-center bg-white rounded border border-dashed border-slate-200">
            <ReceiptText className="w-8 h-8 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Archive empty</p>
          </div>
        )}
      </div>

      {/* Sale Details Modal */}
      <AnimatePresence>
        {selectedSale && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedSale(null)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded border border-slate-200 p-0 w-full max-w-md relative z-10 shadow-2xl overflow-hidden"
            >
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div>
                   <h3 className="text-xs font-bold text-slate-800 uppercase tracking-tight">Audit Transaction</h3>
                   <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{selectedSale.invoiceId}</p>
                </div>
                <button onClick={() => setSelectedSale(null)} className="p-1.5 hover:bg-slate-200 rounded text-slate-400 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-50 rounded border border-slate-100">
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">Customer</p>
                    <p className="text-[11px] font-bold text-slate-800">{selectedSale.customerName}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded border border-slate-100">
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">Transaction Date</p>
                    <p className="text-[11px] font-bold text-slate-800">{format(new Date(selectedSale.createdAt), 'MMM dd, yyyy HH:mm')}</p>
                  </div>
                </div>

                <div>
                   <div className="flex items-center gap-2 mb-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                     <Package className="w-3 h-3" />
                     Itemized Manifest
                   </div>
                   <div className="space-y-2 max-h-[200px] overflow-y-auto px-1">
                     {(selectedSale.items || []).map((item, idx) => (
                       <div key={idx} className="flex justify-between items-center text-[11px] py-1 border-b border-slate-50">
                          <div className="flex-1">
                             <p className="font-bold text-slate-700">{item.name}</p>
                             <p className="text-slate-400 font-medium">{formatCurrency(item.price)} × {item.quantity}</p>
                          </div>
                          <span className="font-bold text-slate-900">{formatCurrency(item.price * item.quantity)}</span>
                       </div>
                     ))}
                   </div>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-2">
                   <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <span>Gross total</span>
                      <span>{formatCurrency(selectedSale.totalAmount)}</span>
                   </div>
                   <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <span>Paid Amount</span>
                      <span className="text-indigo-600 font-black">{formatCurrency(selectedSale.paidAmount || selectedSale.totalAmount)}</span>
                   </div>
                   <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <span>Balance / Change</span>
                      <span className="text-emerald-600 font-black">{formatCurrency(selectedSale.change || 0)}</span>
                   </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
                 <button 
                   onClick={handleDownloadLog}
                   className="flex-1 py-2.5 bg-slate-900 text-white rounded font-bold text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all"
                 >
                   Download Log
                 </button>
                 <button onClick={() => setSelectedSale(null)} className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-500 rounded font-bold text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all">Dismiss</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingSale && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingSale(null)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded border border-slate-200 p-6 w-full max-w-sm relative z-10 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                   <h3 className="text-xs font-bold text-slate-800 uppercase tracking-tight">Edit Transaction</h3>
                   <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{editingSale.invoiceId}</p>
                </div>
                <button onClick={() => setEditingSale(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleUpdateSale} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Customer Name</label>
                  <input 
                    value={editingSale.customerName}
                    onChange={(e) => setEditingSale({...editingSale, customerName: e.target.value})}
                    required 
                    className="w-full bg-slate-50 border border-slate-200 rounded py-2 px-3 text-xs font-bold focus:ring-1 focus:ring-indigo-500" 
                  />
                </div>
                <div className="pt-4">
                   <button type="submit" className="w-full bg-slate-900 text-white py-2.5 rounded font-bold text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md flex items-center justify-center gap-2">
                     <Check className="w-3.5 h-3.5" />
                     Update Archive
                   </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
