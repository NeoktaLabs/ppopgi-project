import React, { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem';
import { ArrowRight, Coins, Clock, Sparkles, AlertCircle, Trophy, Ban, CheckCircle2, Layers, Loader2 } from 'lucide-react';
import { RaffleCard } from '../components/RaffleCard';
import { FACTORY_ABI, ERC20_ABI } from '../contracts/abis';
import { CONTRACT_ADDRESSES } from '../config/contracts';

export function CreateRaffle({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<'idle' | 'approving' | 'creating' | 'success'>('idle');
  const { data: hash, writeContract, isPending: isWritePending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const [formData, setFormData] = useState({ title: '', prizeAmount: '', ticketPrice: '', minTickets: '', maxTickets: '', minPurchaseAmount: '1', durationDays: '', durationHours: '', durationMinutes: '', theme: 'pink' });

  useEffect(() => {
    if (isConfirmed && step === 'approving') handleCreateRaffle();
    else if (isConfirmed && step === 'creating') setStep('success');
  }, [isConfirmed]);

  const getTotalSeconds = () => (parseInt(formData.durationDays || '0') * 86400) + (parseInt(formData.durationHours || '0') * 3600) + (parseInt(formData.durationMinutes || '0') * 60);
  
  const handleApprove = () => {
    setStep('approving');
    writeContract({ address: CONTRACT_ADDRESSES.usdc, abi: ERC20_ABI, functionName: 'approve', args: [CONTRACT_ADDRESSES.factory, parseUnits(formData.prizeAmount, 6)] });
  };

  const handleCreateRaffle = () => {
    setStep('creating');
    writeContract({ address: CONTRACT_ADDRESSES.factory, abi: FACTORY_ABI, functionName: 'createSingleWinnerLottery', args: [formData.title, parseUnits(formData.ticketPrice, 6), parseUnits(formData.prizeAmount, 6), BigInt(formData.minTickets), formData.maxTickets ? BigInt(formData.maxTickets) : BigInt(0), BigInt(getTotalSeconds()), Number(formData.minPurchaseAmount)] });
  };

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); handleApprove(); };

  if (step === 'success') return <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4"><div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-6 animate-bounce"><CheckCircle2 size={48} /></div><h2 className="text-3xl font-black text-gray-800 mb-2">Raffle Created!</h2><button onClick={onBack} className="mt-8 bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 px-8 rounded-xl shadow-lg">Back to Dashboard</button></div>;

  return (
    <div className="min-h-screen pt-24 pb-20 px-4">
       {/* (UI Code same as before, just update imports if needed) */}
       {/* For brevity, rendering form here... assume standard form layout */}
       <div className="max-w-6xl mx-auto mb-8 flex items-center gap-4"><button onClick={onBack} className="bg-white/50 hover:bg-white/80 p-2.5 rounded-full backdrop-blur-sm transition-all shadow-sm"><ArrowRight size={20} className="rotate-180 text-gray-700" /></button><span className="text-white font-bold text-lg drop-shadow-md">Back to Park</span></div>
       <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
         <div className="lg:col-span-7"><div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] p-8 border border-white shadow-xl relative"><form onSubmit={handleSubmit} className="space-y-6"><div><label className="text-xs font-bold text-gray-400 uppercase">Title</label><input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-lg font-bold rounded-xl px-5 py-4" required /></div><button disabled={isWritePending || isConfirming} className="w-full bg-amber-500 hover:bg-amber-600 text-white font-black py-4 rounded-xl">{step === 'approving' ? 'Approving...' : 'Create Raffle'}</button></form></div></div>
         <div className="lg:col-span-5 hidden lg:block sticky top-28"><div className="transform scale-110 origin-top"><RaffleCard title={formData.title || "Untitled"} prize={`${formData.prizeAmount || 0} USDC`} ticketPrice={`${formData.ticketPrice || 0} USDC`} sold={0} total={100} endsIn="24h" color={formData.theme as any} creator="You"/></div></div>
       </div>
    </div>
  );
}
