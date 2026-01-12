import React, { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatUnits } from 'viem';
import { ArrowRight, Ticket, Clock, Trophy, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { LOTTERY_ABI, ERC20_ABI } from '../contracts/abis';
import { CONTRACT_ADDRESSES } from '../config/contracts';

export function RaffleDetails({ onBack, raffleAddress }: { onBack: () => void, raffleAddress?: string }) {
  const { address } = useAccount();
  const [ticketCount, setTicketCount] = useState(1);
  const [txStep, setTxStep] = useState<'idle' | 'approving' | 'buying' | 'success'>('idle');
  const isValidAddress = raffleAddress?.startsWith('0x');

  const contractConfig = { address: raffleAddress as `0x${string}`, abi: LOTTERY_ABI, query: { enabled: isValidAddress } };
  const { data: ticketPrice } = useReadContract({ ...contractConfig, functionName: 'ticketPrice' });
  const { data: winningPot } = useReadContract({ ...contractConfig, functionName: 'winningPot' });
  const { data: sold } = useReadContract({ ...contractConfig, functionName: 'getSold' });
  const { data: deadline } = useReadContract({ ...contractConfig, functionName: 'deadline' });
  const { data: raffleName } = useReadContract({ ...contractConfig, functionName: 'name' });
  const { data: deployer } = useReadContract({ ...contractConfig, functionName: 'deployer' });

  const totalCost = ticketPrice ? (ticketPrice * BigInt(ticketCount)) : BigInt(0);

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: CONTRACT_ADDRESSES.usdc,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address && raffleAddress ? [address, raffleAddress as `0x${string}`] : undefined,
    query: { enabled: !!address && isValidAddress }
  });

  const needsApproval = allowance ? allowance < totalCost : true;
  const { data: hash, writeContract, isPending: isWritePending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  useEffect(() => { if (isConfirmed) { if (txStep === 'approving') { refetchAllowance(); setTxStep('idle'); } else if (txStep === 'buying') setTxStep('success'); } }, [isConfirmed]);

  const handleApprove = () => { setTxStep('approving'); writeContract({ address: CONTRACT_ADDRESSES.usdc, abi: ERC20_ABI, functionName: 'approve', args: [raffleAddress as `0x${string}`, totalCost] }); };
  const handleBuy = () => { setTxStep('buying'); writeContract({ address: raffleAddress as `0x${string}`, abi: LOTTERY_ABI, functionName: 'buyTickets', args: [BigInt(ticketCount)] }); };

  if (txStep === 'success') return <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4"><div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-6 shadow-xl"><Ticket size={48} /></div><h2 className="text-3xl font-black text-gray-800 mb-2">Tickets Secured!</h2><button onClick={onBack} className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 px-8 rounded-xl transition-all">Back to Park</button></div>;
  if (!isValidAddress) return <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4"><AlertCircle size={48} className="text-gray-300 mb-4"/><h2 className="text-xl font-bold text-gray-600">Preview Mode</h2><button onClick={onBack} className="mt-6 text-amber-600 font-bold hover:underline">Go Back</button></div>;

  return (
    <div className="min-h-screen pt-20 pb-20 px-4 animate-fade-in-up">
      <div className="max-w-4xl mx-auto mb-6 flex items-center gap-4"><button onClick={onBack} className="bg-white/50 hover:bg-white/80 p-2.5 rounded-full backdrop-blur-sm transition-all shadow-sm"><ArrowRight size={20} className="rotate-180 text-gray-700" /></button><span className="text-white font-bold text-lg drop-shadow-md">Back to Park</span></div>
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="relative group perspective-1000"><div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-[2.5rem] p-1 shadow-2xl"><div className="bg-white rounded-[2.3rem] p-8 h-full relative overflow-hidden flex flex-col items-center justify-center text-center min-h-[400px] border-4 border-dashed border-amber-200"><div className="bg-amber-100 p-4 rounded-full text-amber-600 mb-6 shadow-inner"><Trophy size={48} /></div><h1 className="text-3xl font-black text-gray-800 uppercase tracking-tight mb-2 leading-none">{raffleName || 'Loading...'}</h1><div className="text-5xl font-black text-amber-500 drop-shadow-sm mb-6">{winningPot ? formatUnits(winningPot, 6) : '...'} <span className="text-lg text-gray-400 font-bold">USDC</span></div></div></div></div>
        <div className="bg-white/90 backdrop-blur-xl rounded-[2.5rem] p-8 border border-white shadow-xl flex flex-col relative">
           {(isWritePending || isConfirming) && (<div className="absolute inset-0 z-50 bg-white/90 backdrop-blur-sm rounded-[2.5rem] flex flex-col items-center justify-center text-center p-6"><div className="animate-spin text-amber-500 mb-4"><Loader2 size={40} /></div><h3 className="text-lg font-bold text-gray-800">{txStep === 'approving' ? 'Approving USDC...' : 'Buying Tickets...'}</h3></div>)}
           <div className="mt-auto space-y-6">
             <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex items-center justify-between"><span className="font-bold text-gray-500 uppercase text-xs">Quantity</span><div className="flex items-center gap-4"><button onClick={() => setTicketCount(Math.max(1, ticketCount - 1))} className="w-8 h-8 rounded-full bg-white shadow text-gray-600 font-bold hover:bg-gray-100">-</button><span className="text-xl font-black text-gray-800 w-8 text-center">{ticketCount}</span><button onClick={() => setTicketCount(ticketCount + 1)} className="w-8 h-8 rounded-full bg-white shadow text-gray-600 font-bold hover:bg-gray-100">+</button></div></div>
             <div className="flex justify-between items-end px-2"><span className="text-sm font-bold text-gray-400">Total Cost</span><div className="text-2xl font-black text-gray-800">{ticketPrice ? formatUnits(ticketPrice * BigInt(ticketCount), 6) : '...'} <span className="text-sm text-gray-400">USDC</span></div></div>
             {needsApproval ? (
               <button onClick={handleApprove} disabled={isWritePending || isConfirming} className="w-full bg-blue-500 hover:bg-blue-600 text-white font-black py-4 rounded-xl shadow-[0_4px_0_0_#1d4ed8] active:shadow-none active:translate-y-1 transition-all flex items-center justify-center gap-2"><ShieldCheck size={20} /> APPROVE USDC</button>
             ) : (
               <button onClick={handleBuy} disabled={isWritePending || isConfirming} className="w-full bg-amber-500 hover:bg-amber-600 text-white font-black py-4 rounded-xl shadow-[0_4px_0_0_#b45309] active:shadow-none active:translate-y-1 transition-all flex items-center justify-center gap-2"><Ticket size={20} /> BUY TICKETS</button>
             )}
           </div>
        </div>
      </div>
    </div>
  );
}
