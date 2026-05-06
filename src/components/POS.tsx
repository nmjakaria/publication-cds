import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, doc, updateDoc, increment, runTransaction } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Product, SaleItem, Sale } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { 
  Search, 
  Plus, 
  Minus, 
  X, 
  ShoppingCart,
  User,
  CreditCard,
  History,
  Barcode,
  PackageCheck
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import { generateInvoice } from '../lib/invoice';

export const POS: React.FC = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [paidAmount, setPaidAmount] = useState<string>('');
  const [discount, setDiscount] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastSale, setLastSale] = useState<{ id: string, invoiceId: string, customer: string, items: SaleItem[], total: number, discount: number, paid: number, change: number } | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'products'));
    const unsub = onSnapshot(q, (snap) => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
    });
    return unsub;
  }, []);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addToCart = (product: Product) => {
    if (product.stockLevel <= 0) {
      alert("This item is out of stock!");
      return;
    }
    
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.stockLevel) {
          alert("Maximum available stock reached.");
          return prev;
        }
        return prev.map(item => 
          item.productId === product.id 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        );
      }
      return [...prev, {
        productId: product.id,
        name: product.name,
        quantity: 1,
        price: product.price
      }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.productId === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        const product = products.find(p => p.id === productId);
        if (product && newQty > product.stockLevel) {
          alert("Maximum available stock reached.");
          return item;
        }
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discountAmt = parseFloat(discount) || 0;
  const total = Math.max(0, subtotal - discountAmt);
  const paidInput = parseFloat(paidAmount) || 0;
  const change = Math.max(0, paidInput - total);

  const checkout = async () => {
    if (cart.length === 0) return;
    if (!customerName) {
      alert("Please enter customer name.");
      return;
    }
    
    if (paidInput < total && total > 0) {
      alert("Please enter a valid paid amount (greater than or equal to total).");
      return;
    }

    setIsProcessing(true);
    const invoiceId = `INV-${Date.now().toString().slice(-6)}`;

    try {
      await runTransaction(db, async (transaction) => {
        // 1. PERFORM ALL READS FIRST
        const productData: { ref: any, currentStock: number, item: SaleItem }[] = [];
        
        for (const item of cart) {
          const pRef = doc(db, 'products', item.productId);
          const pDoc = await transaction.get(pRef);
          if (!pDoc.exists()) throw `Product ${item.name} does not exist!`;
          
          const currentStock = pDoc.data().stockLevel;
          if (currentStock < item.quantity) {
             throw `Insufficient stock for ${item.name}! (Available: ${currentStock})`;
          }
          productData.push({ ref: pRef, currentStock, item });
        }

        // 2. PERFORM ALL WRITES AFTER ALL READS
        for (const p of productData) {
          transaction.update(p.ref, {
            stockLevel: increment(-p.item.quantity),
            updatedAt: new Date().toISOString()
          });
        }

        // 3. Create Sale Record
        const saleRef = doc(collection(db, 'sales'));
        transaction.set(saleRef, {
          invoiceId,
          customerName,
          items: cart,
          totalAmount: total,
          discount: discountAmt,
          paidAmount: paidInput,
          change: paidInput - total,
          handledBy: user?.uid,
          createdAt: new Date().toISOString()
        });
      });

      setLastSale({
        id: invoiceId,
        invoiceId,
        customer: customerName,
        items: [...cart],
        total,
        discount: discountAmt,
        paid: paidInput,
        change: paidInput - total
      });

      setCart([]);
      setCustomerName('');
      setPaidAmount('');
      setDiscount('');
    } catch (err: any) {
      console.error("Checkout failed:", err);
      if (err.message?.includes('permission')) {
        try {
          handleFirestoreError(err, OperationType.WRITE, 'sales/products');
        } catch (formattedErr: any) {
          alert(`Checkout failed: ${formattedErr.message}`);
          return;
        }
      }
      alert(`Checkout failed: ${err.message || err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col md:flex-row gap-5 overflow-hidden">
      {/* Product Selection */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        <div className="mb-4 space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Active Sale Terminal</h2>
            <div className="flex items-center gap-2 text-slate-400 bg-white border border-slate-200 px-2.5 py-1 rounded text-[10px] font-bold uppercase">
              <Barcode className="w-3 h-3" />
              Ready
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              autoFocus
              type="text" 
              placeholder="Search Items or Scan SKU..."
              className="w-full bg-white border border-slate-200 rounded py-3 pl-10 pr-4 focus:ring-1 focus:ring-indigo-500 text-xs font-semibold shadow-sm transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-1">
           <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 pb-4">
             {filteredProducts.map(product => (
               <motion.button
                 key={product.id}
                 whileTap={{ scale: 0.98 }}
                 onClick={() => addToCart(product)}
                 disabled={product.stockLevel <= 0}
                 className={cn(
                   "group bg-white p-3 rounded border border-slate-200 shadow-sm text-left transition-all hover:border-indigo-300",
                   product.stockLevel <= 0 && "opacity-50 grayscale cursor-not-allowed"
                 )}
               >
                 <div className="mb-2">
                   <div className="flex justify-between items-start mb-1">
                     <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{product.category}</span>
                   </div>
                   <h4 className="text-[11px] font-bold text-slate-700 group-hover:text-indigo-600 transition-colors line-clamp-2 min-h-[2rem] leading-tight">
                     {product.name}
                   </h4>
                 </div>
                 <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-50">
                   <p className="text-sm font-bold text-slate-900">{formatCurrency(product.price).replace('$', '')}</p>
                   <span className={cn(
                       "text-[9px] font-bold px-1.5 py-0.5 rounded",
                       product.stockLevel <= 5 ? "bg-rose-50 text-rose-600" : "bg-slate-50 text-slate-500"
                     )}>{product.stockLevel}</span>
                 </div>
               </motion.button>
             ))}
           </div>
        </div>
      </div>

      {/* Cart Panel */}
      <motion.aside 
        initial={{ x: 20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="w-full md:w-[320px] flex flex-col bg-white border border-slate-200 rounded shadow-sm overflow-hidden"
      >
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-600">Cart Summary</h3>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">{cart.length} Items</span>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
          <AnimatePresence>
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center py-10">
                <PackageCheck className="w-10 h-10 mb-3 opacity-20" />
                <p className="text-[10px] font-bold uppercase tracking-widest">Cart is empty</p>
              </div>
            ) : (
              cart.map(item => (
                <motion.div 
                  key={item.productId}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-3 mb-3 p-2 bg-slate-50 rounded border border-slate-100 group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[11px] text-slate-700 truncate">{item.name}</p>
                    <p className="text-slate-500 text-[10px] font-medium">{formatCurrency(item.price)} × {item.quantity}</p>
                  </div>
                  <div className="flex items-center gap-2">
                     <div className="flex items-center gap-1.5 bg-white border border-slate-200 p-0.5 rounded">
                        <button onClick={() => updateQuantity(item.productId, -1)} className="p-1 hover:text-indigo-600"><Minus className="w-3 h-3"/></button>
                        <input 
                          type="number" 
                          value={item.quantity}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            if (!isNaN(val) && val > 0) {
                              const diff = val - item.quantity;
                              updateQuantity(item.productId, diff);
                            }
                          }}
                          className="text-[10px] font-bold w-10 text-center text-slate-700 bg-transparent border-none focus:ring-0 p-0"
                        />
                        <button onClick={() => updateQuantity(item.productId, 1)} className="p-1 hover:text-indigo-600"><Plus className="w-3 h-3"/></button>
                     </div>
                     <button onClick={() => removeFromCart(item.productId)} className="text-slate-300 hover:text-rose-500 transition-colors">
                        <X className="w-3.5 h-3.5" />
                     </button>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-4">
           <div className="space-y-2">
             <div className="relative">
               <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
               <input 
                 type="text" 
                 placeholder="Customer Identifier..."
                 className="w-full bg-white border border-slate-200 rounded py-2 pl-9 pr-3 text-[11px] focus:ring-1 focus:ring-indigo-500 font-semibold"
                 value={customerName}
                 onChange={(e) => setCustomerName(e.target.value)}
                 required
               />
             </div>

             <div className="relative">
               <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
               <input 
                 type="number" 
                 placeholder="Discount Amount..."
                 className="w-full bg-white border border-slate-200 rounded py-2 pl-9 pr-3 text-[11px] focus:ring-1 focus:ring-indigo-500 font-semibold"
                 value={discount}
                 onChange={(e) => setDiscount(e.target.value)}
               />
             </div>

             <div className="relative">
               <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
               <input 
                 type="number" 
                 placeholder="Paid Amount..."
                 className="w-full bg-white border border-slate-200 rounded py-2 pl-9 pr-3 text-[11px] focus:ring-1 focus:ring-indigo-500 font-semibold"
                 value={paidAmount}
                 onChange={(e) => setPaidAmount(e.target.value)}
                 required
               />
             </div>

             <div className="space-y-1 bg-white p-3 rounded border border-slate-100 shadow-inner">
               <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                 <span>Subtotal</span>
                 <span>{formatCurrency(subtotal)}</span>
               </div>
               {discountAmt > 0 && (
                 <div className="flex justify-between text-[10px] text-rose-500 font-bold uppercase tracking-widest">
                   <span>Discount</span>
                   <span>-{formatCurrency(discountAmt)}</span>
                 </div>
               )}
               <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                 <span>Change</span>
                 <span className="text-emerald-600">{formatCurrency(change)}</span>
               </div>
               <div className="flex justify-between items-baseline pt-1 border-t border-slate-50">
                 <span className="text-xs font-bold text-slate-600">Total Due</span>
                 <span className="text-xl font-black text-indigo-600">{formatCurrency(total).replace('$', '')}</span>
               </div>
             </div>
           </div>

           <button 
             onClick={checkout}
             disabled={isProcessing || cart.length === 0}
             className="w-full bg-slate-900 text-white px-4 py-3.5 rounded font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md active:scale-95 uppercase tracking-widest"
           >
             {isProcessing ? (
               <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
             ) : (
               <>
                 <CreditCard className="w-4 h-4" />
                 Finalize Order
               </>
             )}
           </button>
        </div>
      </motion.aside>

      {/* Success Modal */}
      <AnimatePresence>
        {lastSale && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setLastSale(null)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded border border-slate-200 p-8 w-full max-w-sm relative z-10 shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <PackageCheck className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 uppercase tracking-tight mb-1">Transaction Successful</h3>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-8">{lastSale.invoiceId}</p>
              
              <div className="grid grid-cols-2 gap-3 mb-8">
                <button 
                  onClick={() => generateInvoice(lastSale.invoiceId, lastSale.customer, lastSale.items, lastSale.total, lastSale.paid, lastSale.change, user?.name, 'pdf', lastSale.discount)}
                  className="flex flex-col items-center gap-2 p-4 bg-slate-50 rounded border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all group"
                >
                  <CreditCard className="w-5 h-5 text-slate-400 group-hover:text-indigo-600" />
                  <span className="text-[10px] font-bold uppercase tracking-tight">Invoice PDF</span>
                </button>
                <button 
                  onClick={() => generateInvoice(lastSale.invoiceId, lastSale.customer, lastSale.items, lastSale.total, lastSale.paid, lastSale.change, user?.name, 'memo', lastSale.discount)}
                  className="flex flex-col items-center gap-2 p-4 bg-slate-50 rounded border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all group"
                >
                  <History className="w-5 h-5 text-slate-400 group-hover:text-indigo-600" />
                  <span className="text-[10px] font-bold uppercase tracking-tight">Print Memo</span>
                </button>
              </div>

              <button 
                onClick={() => setLastSale(null)}
                className="w-full py-3 bg-slate-900 text-white rounded font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-all"
              >
                New Transaction
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
