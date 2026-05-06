import React from 'react';
import { signInWithGoogle } from '../lib/firebase';
import { LogIn } from 'lucide-react';
import { motion } from 'motion/react';

export const Login: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900 border border-slate-800 rounded-xl p-10 shadow-2xl text-center"
        >
          <div className="w-14 h-14 bg-indigo-600 rounded mx-auto flex items-center justify-center mb-8 shadow-indigo-500/10 shadow-xl">
            <span className="text-white text-2xl font-bold">P</span>
          </div>
          
          <h1 className="text-xl font-bold text-white mb-1 tracking-tight uppercase">Publication CDS</h1>
          <p className="text-[11px] text-slate-500 mb-10 font-bold uppercase tracking-widest">Digital Distribution & Inventory Infrastructure</p>

          <button
            onClick={signInWithGoogle}
            className="w-full bg-white text-slate-950 font-bold py-4 rounded text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-100 transition-all active:scale-[0.98] shadow-lg"
          >
            <LogIn className="w-4 h-4" />
            Authenticate via Google
          </button>

          <div className="mt-12 flex items-center justify-center gap-4 text-slate-600">
             <div className="h-[1px] flex-1 bg-slate-800" />
             <span className="text-[9px] font-bold uppercase tracking-tighter">Secure Link Established</span>
             <div className="h-[1px] flex-1 bg-slate-800" />
          </div>
        </motion.div>
      </div>
    </div>
  );
};
