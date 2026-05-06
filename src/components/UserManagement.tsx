import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { User, UserRole } from '../types';
import { 
  Users as UsersIcon, 
  Shield, 
  ShieldCheck, 
  User as UserIcon,
  Search,
  Trash2,
  Mail,
  Calendar,
  Plus,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { user: currentUser } = useAuth();

  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setUsers(snap.docs.map(doc => ({ ...doc.data() } as User)));
    });
    return () => unsubscribe();
  }, []);

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const name = formData.get('name') as string;
    const role = formData.get('role') as UserRole;

    const tempUid = `user_${Date.now()}`;
    const path = `users/${tempUid}`;
    try {
      await setDoc(doc(db, 'users', tempUid), {
        uid: tempUid,
        email,
        name,
        role,
        createdAt: new Date().toISOString()
      });
      setIsModalOpen(false);
    } catch (err: any) {
      console.error("Error creating user:", err);
      if (err.message?.includes('permission')) {
        try {
          handleFirestoreError(err, OperationType.WRITE, path);
        } catch (formattedErr: any) {
          alert(`Registration failed: ${formattedErr.message}`);
          return;
        }
      }
      alert(`Registration failed: ${err.message || err}`);
    }
  };

  const updateUserRole = async (uid: string, newRole: UserRole) => {
    if (uid === currentUser?.uid) {
      alert("You cannot change your own role.");
      return;
    }
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole });
    } catch (err) {
      console.error("Error updating user role:", err);
      alert("Permission denied. Only admins can modify users.");
    }
  };

  const removeUser = async (uid: string) => {
    if (uid === currentUser?.uid) {
      alert("You cannot remove yourself.");
      return;
    }
    if (window.confirm("Are you sure you want to remove this user's record? This won't delete their Google account but will remove their access to this app.")) {
      try {
        await deleteDoc(doc(db, 'users', uid));
      } catch (err) {
        console.error("Error removing user:", err);
      }
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 tracking-tight uppercase">Access Control</h2>
          <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Personnel & Privilege Management</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-slate-900 text-white px-4 py-2 rounded font-bold text-xs flex items-center gap-2 hover:bg-slate-800 transition-all shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Personnel
        </button>
      </div>

      <div className="flex items-center gap-3 bg-white p-2 rounded border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by name or email..."
            className="w-full bg-slate-50 border-none rounded py-2 pl-9 pr-4 focus:ring-1 focus:ring-indigo-500 transition-all font-medium text-xs text-slate-700"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredUsers.map((u) => (
          <div key={u.uid} className="bg-white p-5 rounded border border-slate-200 shadow-sm relative group hover:border-indigo-200 transition-colors">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                {u.photoURL ? (
                  <img src={u.photoURL} alt={u.name} className="w-10 h-10 rounded border border-slate-100 object-cover" />
                ) : (
                  <div className={cn(
                    "w-10 h-10 rounded flex items-center justify-center border",
                    u.role === 'admin' ? "bg-indigo-50 border-indigo-100 text-indigo-600" : "bg-slate-50 border-slate-100 text-slate-500"
                  )}>
                    {u.role === 'admin' ? <ShieldCheck className="w-5 h-5" /> : <UserIcon className="w-5 h-5" />}
                  </div>
                )}
                <div>
                  <h4 className="text-[13px] font-bold text-slate-800 uppercase tracking-tight">{u.name}</h4>
                  <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                    {u.role === 'admin' ? <Shield className="w-2.5 h-2.5" /> : null}
                    {u.role}
                  </div>
                </div>
              </div>
              <div className="flex gap-1">
                 {u.uid !== currentUser?.uid && (
                   <button 
                     onClick={() => removeUser(u.uid)}
                     className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded transition-colors"
                     title="Remove Access"
                   >
                     <Trash2 className="w-3.5 h-3.5" />
                   </button>
                 )}
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                <Mail className="w-3 h-3 text-slate-300" />
                <span className="truncate">{u.email}</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                <Calendar className="w-3 h-3 text-slate-300" />
                <span>Joined {format(new Date(u.createdAt), 'MMM dd, yyyy')}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex gap-2">
              <button 
                onClick={() => updateUserRole(u.uid, 'admin')}
                className={cn(
                  "flex-1 py-1.5 rounded text-[9px] font-bold uppercase tracking-widest transition-all border",
                  u.role === 'admin' 
                    ? "bg-indigo-600 text-white border-indigo-700" 
                    : "bg-slate-50 text-slate-400 border-slate-100 hover:bg-indigo-50 hover:text-indigo-600"
                )}
              >
                Admin
              </button>
              <button 
                onClick={() => updateUserRole(u.uid, 'staff')}
                className={cn(
                  "flex-1 py-1.5 rounded text-[9px] font-bold uppercase tracking-widest transition-all border",
                  u.role === 'staff' 
                    ? "bg-slate-800 text-white border-slate-900" 
                    : "bg-slate-50 text-slate-400 border-slate-100 hover:bg-slate-200 hover:text-slate-700"
                )}
              >
                Staff
              </button>
            </div>
          </div>
        ))}
      </div>

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
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded border border-slate-200 p-6 w-full max-w-sm relative z-10 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                   <h3 className="text-xs font-bold text-slate-800 uppercase tracking-tight">Register Personnel</h3>
                   <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Access Provisioning</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400 hover:bg-slate-100 rounded">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Full Name</label>
                  <input name="name" required className="w-full bg-slate-50 border border-slate-200 rounded py-2 px-3 text-xs font-bold focus:ring-1 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Email Address</label>
                  <input name="email" type="email" required className="w-full bg-slate-50 border border-slate-200 rounded py-2 px-3 text-xs font-bold focus:ring-1 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Standard Privilege</label>
                  <select name="role" className="w-full bg-slate-50 border border-slate-200 rounded py-2 px-3 text-xs font-bold focus:ring-1 focus:ring-indigo-500">
                    <option value="staff">Staff (Standard Access)</option>
                    <option value="admin">Admin (Full Access)</option>
                  </select>
                </div>
                <div className="pt-4">
                   <button type="submit" className="w-full bg-indigo-600 text-white py-2.5 rounded font-bold text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-md">
                     Finalize Registration
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
