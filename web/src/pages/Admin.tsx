import React, { useState } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { Shield, Settings, AlertTriangle, Save, Lock } from 'lucide-react';
// FIX: Correct Import Paths
import { FACTORY_ABI } from '../contracts/abis';
import { CONTRACT_ADDRESSES } from '../config/contracts';

export function Admin({ onBack }: { onBack: () => void }) {
  // ... (Rest of code remains identical, logic was fine, just imports were broken)
  const { address } = useAccount();
  const [activeSection, setActiveSection] = useState<'config' | 'emergency'>('config');
  const { data: factoryOwner } = useReadContract({ address: CONTRACT_ADDRESSES.factory, abi: FACTORY_ABI, functionName: 'owner' });
  const isOwner = address && factoryOwner && (address.toLowerCase() === (factoryOwner as string).toLowerCase());

  if (!isOwner) return <div className="min-h-screen pt-24 px-4 flex justify-center"><div className="bg-red-50 p-8 rounded-3xl text-center"><Lock size={32} className="mx-auto mb-4 text-red-500"/><h1 className="text-2xl font-black text-red-900">Access Denied</h1><button onClick={onBack} className="mt-6 px-6 py-2 bg-white text-red-700 font-bold rounded-xl">Back</button></div></div>;

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 animate-fade-in-up">
       <div className="max-w-5xl mx-auto">
         <div className="flex items-center gap-4 mb-8"><div className="w-14 h-14 bg-slate-800 text-white rounded-2xl flex items-center justify-center shadow-lg rotate-3"><Shield size={28} /></div><h1 className="text-3xl font-black text-gray-800 uppercase">Admin Console</h1></div>
         <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
           <div className="lg:col-span-3 space-y-2"><button onClick={() => setActiveSection('config')} className={`w-full text-left px-4 py-3 rounded-xl font-bold flex items-center gap-3 ${activeSection === 'config' ? 'bg-blue-600 text-white' : 'bg-white'}`}><Settings size={18} /> Config</button><button onClick={() => setActiveSection('emergency')} className={`w-full text-left px-4 py-3 rounded-xl font-bold flex items-center gap-3 ${activeSection === 'emergency' ? 'bg-red-600 text-white' : 'bg-white'}`}><AlertTriangle size={18} /> Emergency</button></div>
           <div className="lg:col-span-9 bg-white rounded-3xl p-8 border border-gray-200 shadow-xl">{activeSection === 'config' ? <h2 className="font-black">Global Parameters</h2> : <h2 className="font-black">Rescue Registration</h2>}</div>
         </div>
       </div>
    </div>
  );
}
