import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './components/Login';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Inventory } from './components/Inventory';
import { POS } from './components/POS';
import { SalesHistory } from './components/SalesHistory';
import { Expenses } from './components/Expenses';
import { UserManagement } from './components/UserManagement';
import { Profile } from './components/Profile';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { db } from './lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, Search, User as UserIcon } from 'lucide-react';

const MainContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    // Initial Setup: Add default categories if empty
    const checkCategories = async () => {
      const cats = await getDocs(collection(db, 'categories'));
      if (cats.empty) {
        const defaults = ['Electronics', 'Mobile', 'Laptops', 'Accessories', 'Services'];
        for (const name of defaults) {
          await addDoc(collection(db, 'categories'), { name });
        }
      }
    };
    if (user) checkCategories();
  }, [user]);

  if (loading) return (
     <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
     </div>
  );

  // if (!user) return <Login />;

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard onTabChange={setActiveTab} />;
      case 'inventory': return <Inventory />;
      case 'pos': return <POS />;
      case 'history': return <SalesHistory />;
      case 'expenses': return <Expenses />;
      case 'users': return <UserManagement />;
      case 'profile': return <Profile />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-white flex overflow-hidden">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-[#F1F5F9]">
        {/* Header */}
        <header className="h-14 shrink-0 border-b border-slate-200 flex items-center justify-between px-6 bg-white z-30">
           <div className="flex items-center gap-2">
             <h1 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
               System Overview / {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
             </h1>
           </div>

           <div className="flex items-center gap-6">
              <div className="hidden md:flex items-center gap-3 bg-slate-100 px-3 py-1.5 rounded border border-transparent focus-within:border-indigo-500 transition-all">
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search SKUs or Orders..." 
                  className="bg-transparent border-none focus:ring-0 text-xs font-medium w-48 outline-none"
                />
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="text-[11px] font-medium text-slate-600">Terminal 01: Active</span>
                </div>
                
                <div className="h-6 w-[1px] bg-slate-200" />
                
                <button className="relative text-slate-400 hover:text-indigo-600 transition-colors pt-1">
                  <Bell className="w-4 h-4" />
                  <span className="absolute top-0 -right-1 w-1.5 h-1.5 bg-rose-500 rounded-full border border-white" />
                </button>
              </div>
           </div>
        </header>

        {/* View Viewport */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  );
}
