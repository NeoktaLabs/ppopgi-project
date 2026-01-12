import React, { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem';
import { ArrowRight, Coins, Clock, Sparkles, AlertCircle, Trophy, Ban, CheckCircle2, Layers, Loader2 } from 'lucide-react';
import { RaffleCard } from './RaffleCard';
import { FACTORY_ABI, ERC20_ABI, CONTRACT_ADDRESSES } from './contracts/abis';

export function CreateRaffle({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<'idle' | 'approving' | 'creating' | 'success'>('idle');
  const { data: hash, writeContract, isPending: isWritePending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const MAX_TITLE_LENGTH = 50; 
  const MIN_DURATION_SECONDS = 600; 
  const MAX_BATCH_BUY = 1000;
  const USDC_DECIMALS = 6; 

  const [formData, setFormData] = useState({
    title: '', prizeAmount: '', ticketPrice: '', minTickets: '', maxTickets: '', minPurchaseAmount: '1',
    durationDays: '', durationHours: '', durationMinutes: '', theme: 'pink' as const
  });

  useEffect(() => {
    if (isConfirmed && step === 'approving') handleCreateRaffle();
    else if (isConfirmed && step === 'creating') setStep('success');
  }, [isConfirmed]);

  const getTotalSeconds = () => (parseInt(formData.durationDays || '0') * 86400) + (parseInt(formData.durationHours || '0') * 3600) + (parseInt(formData.durationMinutes || '0') * 60);
  const formatDuration = () => `${formData.durationDays ? formData.durationDays + 'd' : ''} ${formData.durationHours ? formData.durationHours + 'h' : ''}`.trim() || '24h';
  
  const titlePreview = formData.title || "Untitled Raffle";
  const prizePreview = formData.prizeAmount ? `${formData.prizeAmount} USDC` : "0 USDC";
  const pricePreview = formData.ticketPrice ? `${formData.ticketPrice} USDC` : "0 USDC";
  const totalPreview = formData.maxTickets ? parseInt(formData.maxTickets) : (formData.minTickets ? parseInt(formData.minTickets) * 2 : 100); 

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleApprove = () => {
    setStep('approving');
    writeContract({
      address: CONTRACT_ADDRESSES.usdc,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [CONTRACT_ADDRESSES.factory, parseUnits(formData.prizeAmount, USDC_DECIMALS)],
    });
  };

  const handleCreateRaffle = () => {
    setStep('creating');
    writeContract({
      address: CONTRACT_ADDRESSES.factory,
      abi: FACTORY_ABI,
      functionName: 'createSingleWinnerLottery',
      args: [
        formData.title, parseUnits(formData.ticketPrice, USDC_DECIMALS), parseUnits(formData.prizeAmount, USDC_DECIMALS),
        BigInt(formData.minTickets), formData.maxTickets ? BigInt(formData.maxTickets) : BigInt(0), BigInt(getTotalSeconds()), Number(formData.minPurchaseAmount)
      ],
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (getTotalSeconds() < MIN_DURATION_SECONDS) return alert("Duration too short (< 10 mins).");
    if (!formData.minTickets || !formData.prizeAmount) return alert("Missing required fields.");
    handleApprove(); 
  };

  if (step === 'success') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-6 animate-bounce"><CheckCircle2 size={48} /></div>
        <h2 className="text-3xl font-black text-gray-800 mb-2">Raffle Created!</h2>
        <button onClick={onBack} className="mt-8 bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 px-8 rounded-xl shadow-lg">Back to Dashboard</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-20 px-4">
      <div className="max-w-6xl mx-auto mb-8 flex items-center gap-4">
        <button onClick={onBack} className="bg-white/50 hover:bg-white/80 p-2.5 rounded-full backdrop-blur-sm transition-all shadow-sm"><ArrowRight size={20} className="rotate-180 text-gray-700" /></button>
        <span className="text-white font-bold text-lg drop-shadow-md">Back to Park</span>
      </div>
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        <div className="lg:col-span-7">
          <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] p-8 border border-white shadow-xl relative">
             {(isWritePending || isConfirming) && (
               <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm rounded-[2.5rem] flex flex-col items-center justify-center text-center p-8">
                 <div className="animate-spin text-amber-500 mb-4"><Loader2 size={48} /></div>
                 <h3 className="text-xl font-bold text-gray-800">{step === 'approving' ? 'Approving USDC...' : 'Minting Raffle...'}</h3>
               </div>
             )}
             <div className="flex items-center gap-3 mb-8">
               <div className="bg-amber-100 p-3 rounded-2xl text-amber-600"><Sparkles size={24} /></div>
               <div><h1 className="text-2xl font-black text-gray-800 uppercase tracking-tight">Create Raffle</h1><p className="text-sm text-gray-500 font-medium">Mint a new ticket series to the blockchain.</p></div>
             </div>
             <form onSubmit={handleSubmit} className="space-y-6">
               <div>
                 <div className="flex justify-between items-center mb-2 ml-1"><label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Raffle Title</label><span className={`text-[10px] font-bold ${formData.title.length >= MAX_TITLE_LENGTH ? 'text-red-500' : 'text-gray-400'}`}>{formData.title.length}/{MAX_TITLE_LENGTH}</span></div>
                 <input type="text" name="title" value={formData.title} onChange={handleChange} maxLength={MAX_TITLE_LENGTH} required placeholder="e.g. Bored Ape Giveaway" className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-lg font-bold rounded-xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition-all" />
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div><label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Prize Pot (USDC)</label><div className="relative"><input type="number" name="prizeAmount" value={formData.prizeAmount} onChange={handleChange} required placeholder="1000" className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-lg font-bold rounded-xl px-5 py-4 pl-12 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition-all" /><div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"><Trophy size={20} /></div></div></div>
                 <div><label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Ticket Price (USDC)</label><div className="relative"><input type="number" name="ticketPrice" value={formData.ticketPrice} onChange={handleChange} required placeholder="5" className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-lg font-bold rounded-xl px-5 py-4 pl-12 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition-all" /><div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"><Coins size={20} /></div></div></div>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div><label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Min Tickets</label><div className="relative"><input type="number" name="minTickets" value={formData.minTickets} onChange={handleChange} required placeholder="10" className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-lg font-bold rounded-xl px-5 py-4 pl-12 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition-all" /><div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"><CheckCircle2 size={20} /></div></div></div>
                 <div><label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Max Tickets</label><div className="relative"><input type="number" name="maxTickets" value={formData.maxTickets} onChange={handleChange} placeholder="∞" className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-lg font-bold rounded-xl px-5 py-4 pl-12 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition-all" /><div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"><Ban size={20} className="rotate-90" /></div></div></div>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div><label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Min Buy Amount</label><div className="relative"><input type="number" name="minPurchaseAmount" value={formData.minPurchaseAmount} onChange={handleChange} required min="1" max={MAX_BATCH_BUY} placeholder="1" className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-lg font-bold rounded-xl px-5 py-4 pl-12 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition-all" /><div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"><Layers size={20} /></div></div></div>
                 <div><label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Duration</label><div className="grid grid-cols-3 gap-2"><div className="relative"><input type="number" name="durationDays" value={formData.durationDays} onChange={handleChange} placeholder="0" min="0" className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-lg font-bold rounded-xl px-2 py-4 text-center focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all" /><span className="absolute bottom-1 left-0 right-0 text-center text-[8px] font-bold text-gray-400 uppercase">Days</span></div><div className="relative"><input type="number" name="durationHours" value={formData.durationHours} onChange={handleChange} placeholder="0" min="0" max="23" className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-lg font-bold rounded-xl px-2 py-4 text-center focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all" /><span className="absolute bottom-1 left-0 right-0 text-center text-[8px] font-bold text-gray-400 uppercase">Hrs</span></div><div className="relative"><input type="number" name="durationMinutes" value={formData.durationMinutes} onChange={handleChange} placeholder="0" min="0" max="59" className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-lg font-bold rounded-xl px-2 py-4 text-center focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all" /><span className="absolute bottom-1 left-0 right-0 text-center text-[8px] font-bold text-gray-400 uppercase">Mins</span></div></div></div>
               </div>
               {writeError && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl flex items-center gap-2"><AlertCircle size={16} /> {writeError.message.split('.')[0]}</div>}
               <div className="pt-4 border-t border-gray-100 mt-6"><button disabled={isWritePending || isConfirming} className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-black py-4 rounded-xl shadow-[0_4px_0_0_#b45309] active:shadow-none active:translate-y-1 transition-all text-lg flex items-center justify-center gap-2">{step === 'approving' ? 'APPROVING USDC...' : step === 'creating' ? 'MINTING RAFFLE...' : 'APPROVE USDC & MINT'}</button></div>
             </form>
          </div>
        </div>
        <div className="lg:col-span-5 hidden lg:block sticky top-28">
           <div className="text-center mb-6"><h3 className="text-white font-bold text-xl drop-shadow-md">Live Preview</h3></div>
           <div className="transform scale-110 origin-top"><RaffleCard title={titlePreview} prize={prizePreview} ticketPrice={pricePreview} sold={0} total={totalPreview} endsIn={formatDuration()} color={formData.theme} creator="You"/></div>
        </div>
      </div>
    </div>
  );
}