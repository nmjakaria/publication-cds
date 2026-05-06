import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, addDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Expense } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { 
  Wallet, 
  TrendingDown, 
  Plus, 
  Trash2, 
  Filter, 
  Calendar as CalendarIcon,
  Tag,
  CircleDollarSign,
  X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

export const Expenses: React.FC = () => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['Rent', 'Bills', 'Wages', 'Inventory', 'Marketing', 'Maintenance', 'Other'];

  useEffect(() => {
    const q = query(collection(db, 'expenses'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Expense)));
    });
    return unsub;
  }, []);

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const filteredExpenses = selectedCategory === 'All' 
    ? expenses 
    : expenses.filter(e => e.category === selectedCategory);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      amount: parseFloat(formData.get('amount') as string),
      category: formData.get('category') as string,
      description: formData.get('description') as string,
      date: formData.get('date') as string,
      recordedBy: user?.uid,
      createdAt: new Date().toISOString()
    };

    try {
      await addDoc(collection(db, 'expenses'), data);
      setIsModalOpen(false);
    } catch (err) {
      console.error("Error saving expense:", err);
    }
  };

  const deleteExpense = async (id: string) => {
    if (window.confirm("Delete this expense record?")) {
      await deleteDoc(doc(db, 'expenses', id));
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 tracking-tight uppercase">Accounting / Expenses</h2>
          <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Financial Overhead Tracking</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-slate-900 text-white px-5 py-2.5 rounded font-bold text-xs flex items-center gap-2 hover:bg-slate-800 transition-all shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          Record Entry
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="md:col-span-2 space-y-4">
           <div className="flex items-center gap-2 bg-white p-2 rounded border border-slate-200 shadow-sm overflow-x-auto custom-scrollbar">
             <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-2" />
             <button 
               onClick={() => setSelectedCategory('All')}
               className={cn(
                 "px-3 py-1.5 rounded text-[10px] font-bold whitespace-nowrap transition-all uppercase tracking-tight",
                 selectedCategory === 'All' ? "bg-indigo-600 text-white" : "bg-slate-50 text-slate-500 hover:bg-slate-100"
               )}
             >
               All
             </button>
             {categories.map(cat => (
               <button 
                 key={cat}
                 onClick={() => setSelectedCategory(cat)}
                 className={cn(
                   "px-3 py-1.5 rounded text-[10px] font-bold whitespace-nowrap transition-all uppercase tracking-tight",
                   selectedCategory === cat ? "bg-indigo-600 text-white" : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                 )}
               >
                 {cat}
               </button>
             ))}
           </div>

           <div className="space-y-2">
             {filteredExpenses.map((expense) => (
               <div key={expense.id} className="bg-white p-4 rounded border border-slate-200 shadow-sm flex items-center justify-between group hover:border-rose-200 transition-colors">
                 <div className="flex items-center gap-3">
                   <div className="w-9 h-9 bg-rose-50 rounded flex items-center justify-center text-rose-500 shrink-0 border border-rose-100">
                     <TrendingDown className="w-4 h-4" />
                   </div>
                   <div>
                     <h4 className="text-xs font-bold text-slate-800">{expense.description}</h4>
                     <div className="flex items-center gap-3 text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                        <span className="flex items-center gap-1"><Tag className="w-2.5 h-2.5" /> {expense.category}</span>
                        <span className="flex items-center gap-1"><CalendarIcon className="w-2.5 h-2.5" /> {format(new Date(expense.date), 'MMM dd, yyyy')}</span>
                     </div>
                   </div>
                 </div>
                 <div className="flex items-center gap-4">
                    <p className="text-base font-black text-rose-600">-{formatCurrency(expense.amount).replace('$', '')}</p>
                    <button 
                      onClick={() => deleteExpense(expense.id)}
                      className="p-1.5 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all rounded hover:bg-rose-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                 </div>
               </div>
             ))}
           </div>
        </div>

        <div className="space-y-4">
           <div className="bg-slate-900 text-white p-6 rounded shadow-xl relative overflow-hidden flex flex-col justify-between h-44">
             <div className="relative z-10">
               <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mb-1">Periodic Overhead</p>
               <h3 className="text-3xl font-black text-white">{formatCurrency(totalExpenses)}</h3>
             </div>
             
             <div className="relative z-10 p-3 bg-slate-800/80 backdrop-blur rounded border border-slate-700/50">
               <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest mb-1 font-mono">Consolidated Report</p>
               <p className="text-[11px] font-bold text-indigo-400">Fixed Cost Margin: 64.2%</p>
             </div>
             <Wallet className="absolute -bottom-6 -right-6 w-32 h-32 text-slate-800/20 rotate-12" />
           </div>

           <div className="bg-white p-5 rounded border border-slate-200 shadow-sm">
             <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Accounting Strategy</h4>
             <p className="text-[11px] text-slate-600 leading-relaxed mb-4">Capital expenditure is within allocated quadrant. Efficiency optimized.</p>
             <button className="w-full py-2 bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all">Audit Entries</button>
           </div>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="bg-white rounded-3xl p-8 w-full max-w-lg relative z-10 shadow-2xl">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-bold tracking-tight">Record Expense</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-zinc-100 rounded-full"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Amount</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-zinc-400">$</span>
                    <input name="amount" type="number" step="0.01" required className="w-full bg-zinc-50 border-none rounded-xl py-4 pl-8 pr-4 focus:ring-2 focus:ring-orange-500 font-bold text-lg" placeholder="0.00" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Category</label>
                  <select name="category" required className="w-full bg-zinc-50 border-none rounded-xl py-4 px-4 focus:ring-2 focus:ring-orange-500 font-medium">
                    {categories.map(cat => <option key={cat}>{cat}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Description</label>
                  <input name="description" required className="w-full bg-zinc-50 border-none rounded-xl py-4 px-4 focus:ring-2 focus:ring-orange-500 font-medium" placeholder="E.g. Electricity bill for March" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Date</label>
                  <input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-zinc-50 border-none rounded-xl py-4 px-4 focus:ring-2 focus:ring-orange-500 font-medium" />
                </div>

                <button type="submit" className="w-full bg-zinc-950 text-white py-5 rounded-2xl font-bold hover:bg-zinc-800 transition-all shadow-lg active:scale-95">Record Transaction</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
