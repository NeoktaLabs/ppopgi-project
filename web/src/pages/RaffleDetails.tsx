import React, { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatUnits } from 'viem';
import { ArrowRight, Ticket, Clock, Trophy, ShieldCheck, AlertCircle, Loader2, Gavel, Undo2, Banknote } from 'lucide-react';
import { LOTTERY_ABI, ERC20_ABI, ENTROPY_ABI } from '../contracts/abis';
import { CONTRACT_ADDRESSES } from '../config/contracts';
import { addToHistory } from '../utils/history';

export function RaffleDetails({ onBack, raffleAddress }: { onBack: () => void, raffleAddress?: string }) {
  const { address } = useAccount();
  const [ticketCount, setTicketCount] = useState(1);
  const [txStep, setTxStep] = useState<'idle' | 'processing' | 'success'>('idle');
  const isValidAddress = raffleAddress?.startsWith('0x');

  const config = { address: raffleAddress as `0x${string}`, abi: LOTTERY_ABI, query: { enabled: isValidAddress } };
  const { data: status } = useReadContract({ ...config, functionName: 'status' });
  const { data: ticketPrice } = useReadContract({ ...config, functionName: 'ticketPrice' });
  const { data: winningPot } = useReadContract({ ...config, functionName: 'winningPot' });
  const { data: sold } = useReadContract({ ...config, functionName: 'getSold' });
  const { data: deadline } = useReadContract({ ...config, functionName: 'deadline' });
  const { data: raffleName } = useReadContract({ ...config, functionName: 'name' });
  const { data: maxTickets } = useReadContract({ ...config, functionName: 'maxTickets' });
  const { data: entropyProvider } = useReadContract({ ...config, functionName: 'entropyProvider' });
  
  const { data: myTickets } = useReadContract({ ...config, functionName: 'ticketsOwned', args: address ? [address] : undefined });
  const { data: claimableFunds } = useReadContract({ ...config, functionName: 'claimableFunds', args: address ? [address] : undefined });
  const { data: claimableNative } = useReadContract({ ...config, functionName: 'claimableNative', args: address ? [address] : undefined });

  const { data: drawFee } = useReadContract({ address: CONTRACT_ADDRESSES.entropy, abi: ENTROPY_ABI, functionName: 'getFee', args: entropyProvider ? [entropyProvider] : undefined, query: { enabled: !!entropyProvider } });

  const totalCost = ticketPrice ? (ticketPrice * BigInt(ticketCount)) : BigInt(0);
  const { data: allowance, refetch: refetchAllowance } = useReadContract({ address: CONTRACT_ADDRESSES.usdc, abi: ERC20_ABI, functionName: 'allowance', args: address && raffleAddress ? [address, raffleAddress as `0x${string}`] : undefined });

  const now = Math.floor(Date.now() / 1000);
  const isExpired = deadline ? now >= Number(deadline) : false;
  const isSoldOut = maxTickets && sold ? sold >= maxTickets : false;
  const canDraw = status === 1 && (isExpired || isSoldOut);
  const needsApproval = allowance ? allowance < totalCost : true;

  const { data: hash, writeContract, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => { if (isSuccess) { setTxStep('idle'); refetchAllowance(); if (raffleAddress) addToHistory(raffleAddress); } }, [isSuccess]);

  const execute = (fn: string, args: any[] = [], value: bigint = BigInt(0)) => { setTxStep('processing'); writeContract({ address: raffleAddress as `0x${string}`, abi: LOTTERY_ABI, functionName: fn, args, value }); };
  const handleApprove = () => { setTxStep('processing'); writeContract({ address: CONTRACT_ADDRESSES.usdc, abi: ERC20_ABI, functionName: 'approve', args: [raffleAddress as `0x${string}`, totalCost] }); };

  if (!isValidAddress) return <div className="p-10 text-center">Invalid Raffle</div>;

  return (
    <div className="min-h-screen pt-20 pb-20 px-4 animate-fade-in-up">
      <div className="max-w-4xl mx-auto mb-6 flex items-center gap-4"><button onClick={onBack} className="bg-white/50 p-2.5 rounded-full"><ArrowRight size={20} className="rotate-180" /></button><span className="text-white font-bold text-lg">Back to Park</span></div>
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white rounded-[2.5rem] p-8 text-center border-4 border-dashed border-amber-200">
           <div className="bg-amber-100 p-4 rounded-full text-amber-600 mb-6 shadow-inner mx-auto w-fit"><Trophy size={48} /></div>
           <h1 className="text-3xl font-black text-gray-800 uppercase mb-2">{raffleName || 'Loading...'}</h1>
           <div className="text-5xl font-black text-amber-500 mb-6">{winningPot ? formatUnits(winningPot, 6) : '0'} <span className="text-lg text-gray-400">USDC</span></div>
           <div className="grid grid-cols-2 gap-4 text-left"><div className="bg-gray-50 p-3 rounded-xl"><div className="text-xs font-bold text-gray-400">My Tickets</div><div className="text-lg font-black">{myTickets?.toString() || '0'}</div></div><div className="bg-gray-50 p-3 rounded-xl"><div className="text-xs font-bold text-gray-400">Status</div><div className={`text-lg font-black ${status === 1 ? 'text-green-500' : 'text-gray-500'}`}>{status === 1 ? 'OPEN' : status === 2 ? 'DRAWING' : status === 3 ? 'ENDED' : 'CANCELED'}</div></div></div>
        </div>
        <div className="bg-white/90 backdrop-blur-xl rounded-[2.5rem] p-8 shadow-xl flex flex-col justify-center relative">
           {(isPending || isConfirming) && (<div className="absolute inset-0 z-50 bg-white/90 rounded-[2.5rem] flex flex-col items-center justify-center text-center p-6"><Loader2 size={40} className="animate-spin text-amber-500 mb-4"/><h3 className="text-lg font-bold">Processing Transaction...</h3></div>)}
           {status === 1 && !canDraw && (<div className="space-y-6"><div className="bg-gray-50 p-4 rounded-2xl flex justify-between items-center"><span className="font-bold text-gray-500">Tickets</span><div className="flex gap-4 items-center"><button onClick={() => setTicketCount(Math.max(1, ticketCount - 1))} className="w-8 h-8 bg-white rounded-full shadow font-bold">-</button><span className="text-xl font-black">{ticketCount}</span><button onClick={() => setTicketCount(ticketCount + 1)} className="w-8 h-8 bg-white rounded-full shadow font-bold">+</button></div></div><div className="flex justify-between px-2 text-sm font-bold text-gray-400"><span>Cost</span><span className="text-gray-800 text-xl">{ticketPrice ? formatUnits(ticketPrice * BigInt(ticketCount), 6) : '0'} USDC</span></div>{needsApproval ? (<button onClick={handleApprove} className="w-full bg-blue-500 text-white font-black py-4 rounded-xl shadow-lg flex justify-center gap-2"><ShieldCheck/> APPROVE USDC</button>) : (<button onClick={() => execute('buyTickets', [BigInt(ticketCount)])} className="w-full bg-amber-500 text-white font-black py-4 rounded-xl shadow-lg flex justify-center gap-2"><Ticket/> BUY TICKETS</button>)}</div>)}
           {canDraw && (<div className="text-center"><h3 className="text-xl font-bold text-gray-800 mb-2">Raffle Ready to Draw</h3><p className="text-sm text-gray-500 mb-6">Time to pick a winner! Anyone can trigger this.</p><button onClick={() => execute('finalize', [], drawFee || BigInt(0))} className="w-full bg-purple-500 text-white font-black py-4 rounded-xl shadow-lg flex justify-center gap-2"><Gavel/> DRAW WINNER</button><p className="text-xs text-gray-400 mt-2">Requires ~{drawFee ? formatUnits(drawFee, 18) : '0'} XTZ fee</p></div>)}
           {(Number(claimableFunds) > 0 || Number(claimableNative) > 0) && (<div className="space-y-4"><div className="bg-green-50 p-4 rounded-2xl border border-green-100"><h4 className="font-bold text-green-800 mb-2">You have claims!</h4>{Number(claimableFunds) > 0 && <div className="text-sm">💰 {formatUnits(claimableFunds || BigInt(0), 6)} USDC</div>}{Number(claimableNative) > 0 && <div className="text-sm">⚡ {formatUnits(claimableNative || BigInt(0), 18)} XTZ</div>}</div>{Number(claimableFunds) > 0 && <button onClick={() => execute('withdrawFunds')} className="w-full bg-green-500 text-white font-black py-3 rounded-xl shadow-lg">WITHDRAW USDC</button>}{Number(claimableNative) > 0 && <button onClick={() => execute('withdrawNative')} className="w-full bg-green-600 text-white font-black py-3 rounded-xl shadow-lg">WITHDRAW XTZ</button>}</div>)}
           {status === 4 && Number(myTickets) > 0 && Number(claimableFunds) === 0 && (<div className="text-center"><h3 className="text-xl font-bold text-gray-800 mb-2">Raffle Canceled</h3><p className="text-sm text-gray-500 mb-6">This raffle was canceled. You can claim a full refund.</p><button onClick={() => execute('claimTicketRefund')} className="w-full bg-gray-500 text-white font-black py-4 rounded-xl shadow-lg flex justify-center gap-2"><Undo2/> APPLY FOR REFUND</button></div>)}
           {status === 2 && <div className="text-center py-10"><Loader2 size={48} className="animate-spin text-purple-500 mx-auto mb-4"/><h3 className="font-bold text-gray-600">Picking Winner...</h3></div>}
           {status === 3 && Number(claimableFunds) === 0 && Number(claimableNative) === 0 && <div className="text-center py-10"><Banknote size={48} className="text-gray-300 mx-auto mb-4"/><h3 className="font-bold text-gray-400">Raffle Ended</h3></div>}
        </div>
      </div>
    </div>
  );
}
