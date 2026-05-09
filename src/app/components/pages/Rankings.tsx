import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import type { Ranking } from '../../../lib/types';

type RankingTab = 'overall' | 'campus' | 'regional';

export default function Rankings() {
  const { team } = useAuth();
  const [activeTab, setActiveTab] = useState<RankingTab>('overall');
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRankings = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('rankings')
        .select('*, team:teams(*)')
        .eq('category', activeTab)
        .order('rank', { ascending: true });

      if (data) setRankings(data);
      setLoading(false);
    };

    fetchRankings();
  }, [activeTab]);

  const myTeamRanking = rankings.find(r => r.team_id === team?.id);

  const getRankChange = (current: number, previous: number) => {
    if (current < previous) return 'up';
    if (current > previous) return 'down';
    return 'stable';
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-8">
      <div className="px-4 pt-5 pb-4">
        <h1 className="text-2xl font-black text-white">순위</h1>
      </div>

      {myTeamRanking && myTeamRanking.team && (
        <div className="mx-4 mb-4 bg-[#111] rounded-2xl border border-white/5 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-3xl">{myTeamRanking.team.logo}</div>
              <div>
                <p className="font-bold text-white">{myTeamRanking.team.name}</p>
                <p className="text-xs text-gray-500">{myTeamRanking.power_rating} pts</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-black text-white">{myTeamRanking.rank}<span className="text-sm text-gray-500 font-normal">위</span></p>
              {getRankChange(myTeamRanking.rank, myTeamRanking.previous_rank) === 'up' && (
                <p className="text-xs text-emerald-400 flex items-center justify-end gap-0.5">
                  <TrendingUp size={12} /> {myTeamRanking.previous_rank - myTeamRanking.rank}단계 상승
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="px-4 mb-4">
        <div className="flex gap-2 bg-[#111] p-1 rounded-xl">
          {[
            { key: 'overall' as RankingTab, label: '전체' },
            { key: 'campus' as RankingTab, label: '교내' },
            { key: 'regional' as RankingTab, label: '지역' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-colors ${
                activeTab === tab.key ? 'bg-[#7B2D3B] text-white' : 'text-gray-500'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 space-y-2">
        {loading ? (
          <p className="text-center text-gray-600 py-12 text-sm">로딩 중...</p>
        ) : rankings.length === 0 ? (
          <p className="text-center text-gray-600 py-12 text-sm">순위 데이터가 없습니다</p>
        ) : (
          rankings.map((r) => {
            const change = getRankChange(r.rank, r.previous_rank);
            const isMyTeam = r.team_id === team?.id;

            return (
              <div
                key={r.id}
                className={`flex items-center gap-3 p-3 rounded-2xl border transition-colors ${
                  isMyTeam ? 'bg-[#7B2D3B]/10 border-[#7B2D3B]/20' : 'bg-[#111] border-white/5'
                }`}
              >
                <div className="w-8 text-center">
                  {r.rank <= 3 ? (
                    <span className={`text-lg font-black ${
                      r.rank === 1 ? 'text-yellow-500' : r.rank === 2 ? 'text-gray-400' : 'text-orange-500'
                    }`}>
                      {r.rank}
                    </span>
                  ) : (
                    <span className="text-sm font-bold text-gray-500">{r.rank}</span>
                  )}
                </div>
                <div className="text-2xl">{r.team?.logo || '⚽'}</div>
                <div className="flex-1">
                  <p className={`font-semibold text-sm ${isMyTeam ? 'text-red-400' : 'text-white'}`}>{r.team?.name || '팀'}</p>
                </div>
                <div className="text-right flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-400">{r.power_rating}</span>
                  {change === 'up' && <TrendingUp size={14} className="text-emerald-400" />}
                  {change === 'down' && <TrendingDown size={14} className="text-red-400" />}
                  {change === 'stable' && <Minus size={14} className="text-gray-600" />}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
