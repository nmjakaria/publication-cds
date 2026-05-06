import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { 
  User as UserIcon, 
  Mail, 
  Shield, 
  Camera,
  Save,
  CheckCircle2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

export const Profile: React.FC = () => {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [photoURL, setPhotoURL] = useState(user?.photoURL || '');
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        name,
        photoURL
      });
      setUser({ ...user, name, photoURL });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error("Error updating profile:", err);
      alert("Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 tracking-tight uppercase">Security & Profile</h2>
          <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Manage your digital identity</p>
        </div>
      </div>

      <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
        <div className="h-24 bg-slate-900 border-b border-slate-800 relative">
          <div className="absolute -bottom-10 left-8">
            <div className="relative group">
              {photoURL ? (
                <img src={photoURL} alt={name} className="w-20 h-20 rounded border-4 border-white object-cover bg-white" />
              ) : (
                <div className="w-20 h-20 rounded border-4 border-white bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <UserIcon className="w-10 h-10" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 rounded opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                <Camera className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        </div>

        <div className="pt-14 p-8">
          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Full Display Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded py-2.5 pl-9 pr-4 text-xs font-bold text-slate-700 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5 opacity-60">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email Address (Primary)</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input 
                    type="email" 
                    value={user?.email}
                    disabled
                    className="w-full bg-slate-100 border border-slate-200 rounded py-2.5 pl-9 pr-4 text-xs font-bold text-slate-500 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Profile Image (URL)</label>
                <div className="relative">
                  <Camera className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="https://example.com/avatar.jpg"
                    value={photoURL}
                    onChange={(e) => setPhotoURL(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded py-2.5 pl-9 pr-4 text-xs font-bold text-slate-700 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5 opacity-60">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Administrative Role</label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input 
                    type="text" 
                    value={user?.role}
                    disabled
                    className="w-full bg-slate-100 border border-slate-200 rounded py-2.5 pl-9 pr-4 text-xs font-bold text-slate-500 cursor-not-allowed uppercase"
                  />
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                 {showSuccess && (
                   <motion.div 
                     initial={{ opacity: 0, x: -10 }}
                     animate={{ opacity: 1, x: 0 }}
                     className="flex items-center gap-1.5 text-emerald-600 text-[10px] font-bold uppercase tracking-widest"
                   >
                     <CheckCircle2 className="w-3.5 h-3.5" />
                     Profile Synchronized
                   </motion.div>
                 )}
              </div>
              <button 
                type="submit"
                disabled={isSaving}
                className="bg-slate-900 text-white px-6 py-2.5 rounded font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-slate-800 transition-all shadow-md disabled:opacity-50"
              >
                {isSaving ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : <Save className="w-3.5 h-3.5" />}
                Commit Changes
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="bg-rose-50 border border-rose-100 rounded p-6">
        <h4 className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-2">Security Advisory</h4>
        <p className="text-[11px] text-rose-700 leading-relaxed font-medium">
          Changes to your email or administrative status must be authorized by a Global Administrator. 
          Standard profiles are restricted to identity modification only.
        </p>
      </div>
    </div>
  );
};
