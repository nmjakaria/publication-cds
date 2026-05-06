import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, updateDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Product, Category } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Filter, 
  MoreVertical,
  X,
  PackageCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const Inventory: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  useEffect(() => {
    const unsubProducts = onSnapshot(collection(db, 'products'), (snap) => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
    });
    const unsubCats = onSnapshot(collection(db, 'categories'), (snap) => {
      const cats = snap.docs.map(d => ({ id: d.id, ...d.data() } as Category));
      setCategories(cats);
    });
    return () => { unsubProducts(); unsubCats(); };
  }, []);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
    (selectedCategory === 'All' || p.category === selectedCategory)
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    let category = formData.get('category') as string;
    
    if (category === 'NEW' && newCategoryName.trim()) {
      const catRef = await addDoc(collection(db, 'categories'), {
        name: newCategoryName.trim(),
        createdAt: new Date().toISOString()
      });
      category = newCategoryName.trim();
    }

    const data = {
      name: formData.get('name') as string,
      sku: formData.get('sku') as string,
      category: category,
      price: parseFloat(formData.get('price') as string),
      cost: parseFloat(formData.get('cost') as string),
      stockLevel: parseInt(formData.get('stockLevel') as string),
      minStockAlert: parseInt(formData.get('minStockAlert') as string),
      updatedAt: new Date().toISOString()
    };

    try {
      if (editingProduct) {
        await updateDoc(doc(db, 'products', editingProduct.id), data);
      } else {
        await addDoc(collection(db, 'products'), {
          ...data,
          createdAt: new Date().toISOString()
        });
      }
      setIsModalOpen(false);
      setEditingProduct(null);
      setShowNewCategoryInput(false);
      setNewCategoryName('');
    } catch (err) {
      console.error("Error saving product:", err);
    }
  };

  const deleteProduct = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      await deleteDoc(doc(db, 'products', id));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 tracking-tight uppercase">Inventory Catalog</h2>
          <p className="text-[10px] text-slate-500 font-medium tracking-wide uppercase">Managing {products.length} Active SKUs</p>
        </div>
        <button 
          onClick={() => { setEditingProduct(null); setShowNewCategoryInput(false); setIsModalOpen(true); }}
          className="bg-indigo-600 text-white px-4 py-2 rounded font-bold text-xs flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Item
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 bg-white p-2 rounded border border-slate-200 shadow-sm font-bold">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search SKUs, product names..."
            className="w-full bg-slate-50 border-none rounded py-2 pl-9 pr-4 focus:ring-1 focus:ring-indigo-500 transition-all font-medium text-xs text-slate-700"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 pr-2">
          <span className="text-[9px] font-bold text-slate-400 uppercase">Filter:</span>
          <select 
            className="bg-slate-100 border-none rounded py-1.5 px-3 text-[10px] font-bold text-slate-600 focus:ring-1 focus:ring-indigo-500 uppercase"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option>All</option>
            {categories.map(cat => <option key={cat.id}>{cat.name}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded shadow-sm overflow-hidden min-h-[400px] flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
              <tr className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                <th className="px-4 py-3">Product Description</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-center">Stock</th>
                <th className="px-4 py-3">Retail Price</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="text-[11px] divide-y divide-slate-100 uppercase tracking-tight">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors uppercase">{product.name}</p>
                      <p className="text-[9px] text-slate-400 font-mono mt-0.5 tracking-widest">{product.sku}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[9px] font-bold px-2 py-0.5 bg-slate-100 text-slate-500 rounded uppercase border border-slate-200">
                      {product.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={cn(
                      "font-mono font-bold text-xs",
                      product.stockLevel <= product.minStockAlert ? "text-rose-600" : "text-slate-600"
                    )}>{product.stockLevel.toString().padStart(3, '0')}</span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-bold text-slate-900">{formatCurrency(product.price).replace('$', '')}</p>
                    <p className="text-[9px] text-slate-400 font-bold">COST: {formatCurrency(product.cost).replace('$', '')}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[8px] font-bold border",
                      product.stockLevel <= product.minStockAlert 
                        ? "bg-rose-50 text-rose-700 border-rose-100" 
                        : product.stockLevel <= 10 
                          ? "bg-amber-50 text-amber-700 border-amber-100"
                          : "bg-emerald-50 text-emerald-700 border-emerald-100"
                    )}>
                      {product.stockLevel <= product.minStockAlert ? 'REORDER' : 'IN STOCK'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => { setEditingProduct(product); setShowNewCategoryInput(false); setIsModalOpen(true); }}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 bg-white border border-slate-100 rounded hover:border-indigo-100 shadow-sm transition-all"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => deleteProduct(product.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 bg-white border border-slate-100 rounded hover:border-rose-100 shadow-sm transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded border border-slate-200 p-6 w-full max-w-lg relative z-10 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">
                    {editingProduct ? 'Modifying Entry' : 'New Catalog Entry'}
                  </h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Asset Registration</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-slate-100 rounded text-slate-400">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                   <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">Product Identifier</label>
                    <input 
                      name="name" 
                      required 
                      defaultValue={editingProduct?.name} 
                      placeholder="Product Name..."
                      className="w-full bg-slate-50 border border-slate-200 rounded py-2.5 px-3 focus:ring-1 focus:ring-indigo-500 font-bold text-xs text-slate-700" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">SKU / Code</label>
                    <input 
                      name="sku" 
                      required 
                      defaultValue={editingProduct?.sku} 
                      className="w-full bg-slate-50 border border-slate-200 rounded py-2.5 px-3 focus:ring-1 focus:ring-indigo-500 font-mono text-xs text-slate-600" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">Grouping</label>
                    <select 
                      name="category" 
                      defaultValue={editingProduct?.category} 
                      className="w-full bg-slate-50 border border-slate-200 rounded py-2.5 px-3 focus:ring-1 focus:ring-indigo-500 font-bold text-xs text-slate-700"
                      onChange={(e) => setShowNewCategoryInput(e.target.value === 'NEW')}
                    >
                      {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                      <option value="NEW">+ CREATE CUSTOM CATEGORY</option>
                    </select>
                  </div>

                  {showNewCategoryInput && (
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-indigo-500 uppercase mb-1.5 tracking-wider">New Category Name</label>
                      <input 
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="Enter custom category name..."
                        className="w-full bg-indigo-50 border border-indigo-100 rounded py-2.5 px-3 focus:ring-1 focus:ring-indigo-500 font-bold text-xs text-slate-700" 
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">Unit Price</label>
                    <input 
                      name="price" 
                      type="number" 
                      step="0.01" 
                      required 
                      defaultValue={editingProduct?.price} 
                      className="w-full bg-slate-50 border border-slate-200 rounded py-2.5 px-3 focus:ring-1 focus:ring-indigo-500 font-bold text-xs text-slate-700" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">Cost Base</label>
                    <input 
                      name="cost" 
                      type="number" 
                      step="0.01" 
                      required 
                      defaultValue={editingProduct?.cost} 
                      className="w-full bg-slate-50 border border-slate-200 rounded py-2.5 px-3 focus:ring-1 focus:ring-indigo-500 font-bold text-xs text-slate-700" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">Initial Units</label>
                    <input 
                      name="stockLevel" 
                      type="number" 
                      required 
                      defaultValue={editingProduct?.stockLevel} 
                      className="w-full bg-slate-50 border border-slate-200 rounded py-2.5 px-3 focus:ring-1 focus:ring-indigo-500 font-bold text-xs text-slate-700" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">Alert Threshold</label>
                    <input 
                      name="minStockAlert" 
                      type="number" 
                      required 
                      defaultValue={editingProduct?.minStockAlert} 
                      className="w-full bg-slate-50 border border-slate-200 rounded py-2.5 px-3 focus:ring-1 focus:ring-indigo-500 font-bold text-xs text-slate-700" 
                    />
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-3 border border-slate-200 rounded font-bold text-slate-400 hover:bg-slate-50 transition-colors text-[10px] uppercase">Cancel</button>
                  <button type="submit" className="flex-[2] px-4 py-3 bg-slate-900 text-white rounded font-bold hover:bg-slate-800 transition-colors text-[10px] uppercase">
                    {editingProduct ? 'Commit Changes' : 'Execute Registration'}
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
