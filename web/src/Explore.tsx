import React, { useState, useMemo } from 'react';
import { Search, SlidersHorizontal, ArrowDownWideNarrow, ArrowUpNarrowWide, Compass } from 'lucide-react';
import { RaffleCard } from './RaffleCard';

const MOCK_RAFFLES = [
  { id: 1, title: "Whale Watcher", prize: 5000, price: 20, sold: 12, minTickets: 100, total: 200, deadline: Date.now() + 86400000 * 6, creator: "0x88", color: "gold" },
  { id: 2, title: "Weekend Jackpot", prize: 1000, price: 5, sold: 450, minTickets: 500, total: 1000, deadline: Date.now() + 86400000 * 2, creator: "0x12", color: "silver" },
  { id: 3, title: "Moonlight Special", prize: 500, price: 2, sold: 890, minTickets: 800, total: 1000, deadline: Date.now() + 3600000 * 5, creator: "0x4a", color: "bronze" },
  { id: 4, title: "Quickfire Draw", prize: 100, price: 1, sold: 48, minTickets: 40, total: 50, deadline: Date.now() + 1800000, creator: "0x99", color: "pink" },
];

type SortOption = 'pot_desc' | 'pot_asc' | 'time_asc' | 'time_desc' | 'price_asc' | 'price_desc' | 'softcap_near' | 'softcap_far';

export function Explore({ onNavigate }: { onNavigate: (id: string) => void }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('pot_desc');

  const filteredRaffles = useMemo(() => {
    let result = [...MOCK_RAFFLES];
    if (searchTerm) result = result.filter(r => r.title.toLowerCase().includes(searchTerm.toLowerCase()));
    result.sort((a, b) => {
      switch (sortBy) {
        case 'pot_desc': return b.prize - a.prize;
        case 'pot_asc': return a.prize - b.prize;
        case 'time_asc': return a.deadline - b.deadline;
        case 'time_desc': return b.deadline - a.deadline;
        case 'price_asc': return a.price - b.price;
        case 'price_desc': return b.price - a.price;
        case 'softcap_near': return (b.sold / b.minTickets) - (a.sold / a.minTickets);
        case 'softcap_far': return (a.sold / a.minTickets) - (b.sold / b.minTickets);
        default: return 0;
      }
    });
    return result;
  }, [searchTerm, sortBy]);

  const getEndsInString = (deadline: number) => {
    const diff = deadline - Date.now();
    const days = Math.floor(diff / (86400000));
    const hours = Math.floor((diff % 86400000) / 3600000);
    return days > 0 ? `${days}d ${hours}h` : `${hours}h ${(Math.floor((diff % 3600000) / 60000))}m`;
  };

  return (
    <div className="min-h-screen pt-24 pb-20 px-4">
      <div className="max-w-[100rem] mx-auto">
        <div className="mb-6 w-fit">
          <div className="bg-white/60 backdrop-blur-md rounded-2xl p-4 border border-white/60 shadow-lg relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2"><div className="p-2 rounded-xl bg-blue-500 text-white shadow-md rotate-[-6deg]"><Compass size={20} strokeWidth={3} /></div><h2 className="text-2xl font-black text-gray-800/90 tracking-tight uppercase drop-shadow-sm">Explore Market</h2></div>
              <p className="text-gray-600 font-bold text-xs md:text-sm leading-relaxed max-w-2xl pl-1">Discover hottest raffles, find hidden gems, or hunt for the biggest pots.</p>
            </div>
          </div>
        </div>

        <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-3 border border-white/60 shadow-xl flex flex-col md:flex-row items-center gap-3 sticky top-0 z-40 ring-1 ring-black/5 mb-8">
          <div className="relative flex-1 w-full group">
            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none"><Search size={22} className="text-gray-400 group-focus-within:text-blue-500 transition-colors" /></div>
            <input type="text" placeholder="Search by raffle name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-gray-50/50 border-2 border-transparent focus:border-blue-400 focus:bg-white rounded-2xl py-4 pl-14 pr-4 text-gray-800 font-bold text-lg focus:outline-none transition-all placeholder:text-gray-400" />
          </div>
          <div className="relative w-full md:w-auto min-w-[280px]">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10"><SlidersHorizontal size={20} className="text-amber-800" /></div>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortOption)} className="w-full appearance-none bg-amber-400 hover:bg-amber-500 border-b-4 border-amber-600 text-amber-950 font-black text-sm rounded-2xl py-4 pl-12 pr-10 cursor-pointer focus:outline-none focus:ring-4 focus:ring-amber-200 transition-all shadow-sm">
              <optgroup label="Winning Pot" className="bg-white text-gray-800"><option value="pot_desc">💰 Pot: Highest First</option><option value="pot_asc">💰 Pot: Lowest First</option></optgroup>
              <optgroup label="Soft Cap Progress" className="bg-white text-gray-800"><option value="softcap_near">🔥 Closest to Goal</option><option value="softcap_far">❄️ Furthest from Goal</option></optgroup>
            </select>
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-amber-900/60">{sortBy.includes('desc') || sortBy.includes('near') ? <ArrowDownWideNarrow size={20}/> : <ArrowUpNarrowWide size={20}/>}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 justify-items-center">
            {filteredRaffles.map((raffle) => (
              <div key={raffle.id} onClick={() => onNavigate(raffle.id.toString())} className="cursor-pointer w-full flex justify-center">
                <RaffleCard title={raffle.title} prize={`${raffle.prize} USDC`} ticketPrice={`${raffle.price} USDC`} sold={raffle.sold} total={raffle.total} endsIn={getEndsInString(raffle.deadline)} color={raffle.color as any} creator={`Player ${raffle.creator}`} />
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}