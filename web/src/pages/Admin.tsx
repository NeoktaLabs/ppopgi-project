import React, { useState } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { Shield, Settings, AlertTriangle, Save, Lock, Activity, Ban } from 'lucide-react';
import { FACTORY_ABI, CONTRACT_ADDRESSES } from './contracts/abis';

export function Admin({ onBack }: { onBack: () => void }) {
  const { address } = useAccount();
  const [activeSection, setActiveSection] = useState<'config' | 'emergency'>('config');

  const { data: factoryOwner } = useReadContract({ address: CONTRACT_ADDRESSES.factory, abi: FACTORY_ABI, functionName: 'owner' });
  const isOwner = address && factoryOwner && (address.toLowerCase() === (factoryOwner as string).toLowerCase());

  if (!isOwner) {
    return (
      <div className="min-h-screen pt-24 pb-20 px-4 flex items-center justify-center">
        <div className="bg-red-50 border border-red-100 p-8 rounded-3xl text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4"><Lock size={32} /></div>
          <h1 className="text-2xl font-black text-red-900 uppercase">Access Denied</h1>
          <p className="text-red-700/80 mt-2 text-sm">Restricted to Protocol Owner.</p>
          <button onClick={onBack} className="mt-6 px-6 py-2 bg-white border border-red-200 text-red-700 font-bold rounded-xl hover:bg-red-50 transition-colors">Return to Park</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 animate-fade-in-up">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 bg-slate-800 text-white rounded-2xl flex items-center justify-center shadow-lg rotate-3"><Shield size={28} /></div>
          <div><h1 className="text-3xl font-black text-gray-800 uppercase tracking-tight">Admin Console</h1></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-3 space-y-2">
            <button onClick={() => setActiveSection('config')} className={`w-full text-left px-4 py-3 rounded-xl font-bold flex items-center gap-3 transition-colors ${activeSection === 'config' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500'}`}><Settings size={18} /> Configuration</button>
            <button onClick={() => setActiveSection('emergency')} className={`w-full text-left px-4 py-3 rounded-xl font-bold flex items-center gap-3 transition-colors ${activeSection === 'emergency' ? 'bg-red-600 text-white' : 'bg-white text-gray-500'}`}><AlertTriangle size={18} /> Emergency</button>
          </div>
          <div className="lg:col-span-9">
            {activeSection === 'config' && (
              <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-xl space-y-8">
                <h2 className="text-xl font-black text-gray-800 mb-1">Global Parameters</h2>
                <button className="bg-blue-600 text-white font-bold py-3 px-6 rounded-xl flex items-center gap-2 shadow-lg"><Save size={18} /> Save Config</button>
              </div>
            )}
            {activeSection === 'emergency' && (
              <div className="bg-white rounded-3xl p-8 border border-red-100 shadow-xl space-y-4">
                 <h2 className="text-xl font-black text-gray-800">Rescue Registration</h2>
                 <button className="w-full bg-red-500 text-white font-bold py-3 rounded-xl shadow-lg">Force Register</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}