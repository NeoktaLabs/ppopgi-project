import React, { useState } from 'react';
import { User, Wallet, Ticket, PenTool, Coins, Zap, AlertCircle } from 'lucide-react';
import { RaffleCard } from './RaffleCard';

export function Profile({ onNavigate }: { onNavigate: (id: string) => void }) {
  const [activeTab, setActiveTab] = useState<'vault' | 'tickets' | 'created'>('vault');
  const vaultData = { usdc: 1550, xtz: 4.2 };
  const myTickets = [{ id: 1, title: "Whale Watcher", prize: 5000, price: 20, sold: 12, total: 200, deadline: Date.now() + 86400000 * 6, color: "gold", myCount: 5 }];
  const myRaffles = [{ id: 99, title: "My First Raffle", prize: 500, price: 5, sold: 20, total: 100, deadline: Date.now() - 100000, color: "purple", status: "Ended" }];

  const handleClaim = (asset: 'USDC' | 'XTZ') => alert(`Triggering contract: withdraw${asset === 'USDC' ? 'Funds' : 'Native'}()`);

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 animate-fade-in-up">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-white shadow-lg border-4 border-white"><User size={32} /></div>
          <div><h1 className="text-3xl font-black text-white uppercase tracking-tight drop-shadow-md">Player ...8821</h1><p className="text-white/80 font-bold text-sm flex items-center gap-1 drop-shadow-sm"><span className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-[0_0_8px_#4ade80]"></span> Connected via MetaMask</p></div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-4 md:pb-0 mb-8 no-scrollbar">
          <button onClick={() => setActiveTab('vault')} className={`px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'vault' ? 'bg-amber-500 text-white shadow-lg shadow-amber-200 scale-105' : 'bg-white text-gray-500 hover:bg-gray-50'}`}><Wallet size={18} /> The Vault {vaultData.usdc > 0 && <span className="w-2 h-2 bg-red-500 rounded-full"></span>}</button>
          <button onClick={() => setActiveTab('tickets')} className={`px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'tickets' ? 'bg-blue-500 text-white shadow-lg shadow-blue-200 scale-105' : 'bg-white text-gray-500 hover:bg-gray-50'}`}><Ticket size={18} /> My Tickets <span className="bg-white/20 px-1.5 rounded text-xs">{myTickets.length}</span></button>
          <button onClick={() => setActiveTab('created')} className={`px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'created' ? 'bg-purple-500 text-white shadow-lg shadow-purple-200 scale-105' : 'bg-white text-gray-500 hover:bg-gray-50'}`}><PenTool size={18} /> Created <span className="bg-white/20 px-1.5 rounded text-xs">{myRaffles.length}</span></button>
        </div>

        {activeTab === 'vault' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
            <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] p-8 border border-white shadow-xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform"><Coins size={120} className="text-amber-500" /></div>
               <div className="relative z-10">
                 <div className="flex items-center gap-2 mb-2"><div className="bg-amber-100 p-2 rounded-xl text-amber-600"><Coins size={20} /></div><span className="font-bold text-gray-400 uppercase text-xs tracking-wider">Claimable Winnings</span></div>
                 <div className="text-5xl font-black text-gray-800 mb-1">{vaultData.usdc}</div>
                 <div className="text-amber-600 font-bold mb-8">USDC</div>
                 <button onClick={() => handleClaim('USDC')} className="w-full bg-amber-500 hover:bg-amber-600 text-white font-black py-4 rounded-xl shadow-[0_4px_0_0_#b45309] active:shadow-none active:translate-y-1 transition-all">WITHDRAW FUNDS</button>
               </div>
            </div>
            <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] p-8 border border-white shadow-xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform"><Zap size={120} className="text-green-500" /></div>
               <div className="relative z-10">
                 <div className="flex items-center gap-2 mb-2"><div className="bg-green-100 p-2 rounded-xl text-green-600"><Zap size={20} /></div><span className="font-bold text-gray-400 uppercase text-xs tracking-wider">Gas Refunds</span></div>
                 <div className="text-5xl font-black text-gray-800 mb-1">{vaultData.xtz}</div>
                 <div className="text-green-600 font-bold mb-8">XTZ</div>
                 <button onClick={() => handleClaim('XTZ')} className="w-full bg-green-500 hover:bg-green-600 text-white font-black py-4 rounded-xl shadow-[0_4px_0_0_#15803d] active:shadow-none active:translate-y-1 transition-all">WITHDRAW NATIVE</button>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'tickets' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
             {myTickets.map(ticket => (
               <div key={ticket.id} className="relative group"><div onClick={() => onNavigate(ticket.id.toString())} className="cursor-pointer transform hover:-translate-y-1 transition-transform"><RaffleCard {...ticket} ticketPrice={`${ticket.price} USDC`} prize={`${ticket.prize} USDC`} endsIn="06d 12h" color={ticket.color as any}/></div></div>
             ))}
          </div>
        )}

        {activeTab === 'created' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
             {myRaffles.map(raffle => (
               <div key={raffle.id} className="relative group"><div onClick={() => onNavigate(raffle.id.toString())} className="cursor-pointer transform hover:-translate-y-1 transition-transform"><RaffleCard {...raffle} ticketPrice={`${raffle.price} USDC`} prize={`${raffle.prize} USDC`} endsIn={raffle.status === 'Active' ? "02d 05h" : "Ended"} color={raffle.color as any} creator="You"/></div></div>
             ))}
          </div>
        )}

      </div>
    </div>
  );
}