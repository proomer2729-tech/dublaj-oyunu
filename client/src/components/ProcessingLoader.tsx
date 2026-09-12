'use client';

import { motion } from 'framer-motion';
import { Film } from 'lucide-react';

export default function ProcessingLoader() {
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)]">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
        className="mb-8"
      >
        <Film size={80} className="text-pink-500" />
      </motion.div>
      <h2 className="text-3xl font-black mb-4">Videolar Birleştiriliyor...</h2>
      <p className="text-slate-400 text-lg">Ses kayıtlarınız orijinal sahne ile harmanlanıyor. Lütfen bekleyin.</p>
      
      <div className="w-64 h-3 bg-slate-800 rounded-full mt-8 overflow-hidden relative">
        <motion.div 
          animate={{ x: ['-100%', '100%'] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
          className="absolute inset-0 w-1/2 bg-gradient-to-r from-pink-500 to-violet-500 rounded-full"
        />
      </div>
    </div>
  );
}
