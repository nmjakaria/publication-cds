import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  ReceiptText, 
  Wallet, 
  Users,
  User as UserIcon,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { auth } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { user, isAdmin } = useAuth();
  const [isOpen, setIsOpen] = React.useState(true);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'staff'] },
    { id: 'inventory', label: 'Inventory', icon: Package, roles: ['admin', 'staff'] },
    { id: 'pos', label: 'Sales & POS', icon: ShoppingCart, roles: ['admin', 'staff'] },
    { id: 'history', label: 'Sales History', icon: ReceiptText, roles: ['admin', 'staff'] },
    { id: 'expenses', label: 'Expenses', icon: Wallet, roles: ['admin'] },
    { id: 'users', label: 'Users', icon: Users, roles: ['admin'] },
    { id: 'profile', label: 'Profile', icon: UserIcon, roles: ['admin', 'staff'] },
  ];

  const filteredItems = menuItems.filter(item => 
    item.roles.includes(user?.role || 'staff')
  );

  return (
    <>
      {/* Mobile Toggle */}
      <button 
        className="fixed top-4 left-4 z-50 p-2 bg-white rounded-md shadow-md lg:hidden"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      <motion.aside 
        initial={false}
        animate={{ width: isOpen ? 256 : 80 }}
        className={cn(
          "h-screen bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 transition-all duration-300 z-40 fixed lg:relative shadow-xl",
          !isOpen && "items-center"
        )}
      >
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-500 rounded flex items-center justify-center font-bold text-white shrink-0">
            <span className="text-lg">P</span>
          </div>
          {isOpen && <h1 className="font-bold text-lg tracking-tight text-white uppercase">Publication CDS</h1>}
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1">
          {isOpen && <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2 mb-2">Management</div>}
          {filteredItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition-all group relative",
                activeTab === item.id 
                  ? "bg-slate-800 text-white" 
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
            >
              <item.icon className={cn("w-4 h-4 shrink-0 transition-transform group-hover:scale-110", activeTab === item.id ? "text-indigo-400" : "")} />
              {isOpen && <span>{item.label}</span>}
              {activeTab === item.id && (
                <motion.div 
                  layoutId="active-nav"
                  className="absolute left-0 w-1 h-4 bg-indigo-500 rounded-r-full"
                />
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={() => setActiveTab('profile')}
            className={cn(
              "w-full flex items-center gap-3 p-2 rounded-lg border transition-all mb-4 group",
              activeTab === 'profile' 
                ? "bg-slate-800 border-indigo-500/50 text-white" 
                : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
            )}
          >
             {user?.photoURL ? (
               <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full border border-slate-700 object-cover" />
             ) : (
               <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white uppercase group-hover:bg-indigo-600 transition-colors">
                 {user?.name.charAt(0)}
               </div>
             )}
             {isOpen && (
               <div className="truncate text-left">
                 <div className={cn("text-[11px] font-bold truncate tracking-tight transition-colors", activeTab === 'profile' ? "text-white" : "group-hover:text-white")}>{user?.name}</div>
                 <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{user?.role}</div>
               </div>
             )}
          </button>
          <button
            onClick={() => auth.signOut()}
            className="w-full flex items-center gap-3 px-3 py-2 text-slate-400 hover:text-rose-400 transition-colors rounded text-[11px] font-bold uppercase tracking-widest group"
          >
            <LogOut className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
            {isOpen && <span>Terminate Session</span>}
          </button>
        </div>
      </motion.aside>
    </>
  );
};
