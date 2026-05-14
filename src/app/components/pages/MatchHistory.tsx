import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Trophy, MapPin, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import type { Match, MatchEvent } from '../../../lib/types';

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
}

export default function MatchHistory() {
  const navigate = useNavigate();
  const { team } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [events, setEvents] = useState<Record<string, MatchEvent[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!team) { setLoading(false); return; }

    const fetch = async () => {
      const { data } = await supabase
        .from('matches')
        .select('*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)')
        .or(`home_team_id.eq.${team.id},away_team_id.eq.${team.id}`)
        .eq('status', 'completed')
        .order('date', { ascending: false });

      if (data) {
        setMatches(data);

        // 전체 이벤트 로드
        const matchIds = data.map(m => m.id);
        if (matchIds.length > 0) {
          const { data: evts } = await supabase
            .from('match_events')
            .select('*, scorer:profiles!match_events_scorer_id_fkey(id, name), assister:profiles!match_events_assister_id_fkey(id, name)')
            .in('match_id', matchIds)
            .order('minute', { ascending: true });

          if (evts) {
            const grouped: Record<string, MatchEvent[]> = {};
            evts.forEach(e => {
              if (!grouped[e.match_id]) grouped[e.match_id] = [];
              grouped[e.match_id].push(e);
            });
            setEvents(grouped);
          }
        }
      }
      setLoading(false);
    };

    fetch();
  }, [team]);

  const getResult = (match: Match): { label: string; color: string; icon: typeof TrendingUp; myScore: number; opScore: number } => {
    const isHome = match.home_team_id === team?.id;
    const myScore = isHome ? (match.home_score ?? 0) : (match.away_score ?? 0);
    const opScore = isHome ? (match.away_score ?? 0) : (match.home_score ?? 0);
    if (myScore > opScore) return { label: '승', color: 'text-emerald-400', icon: TrendingUp, myScore, opScore };
    if (myScore < opScore) return { label: '패', color: 'text-red-400', icon: TrendingDown, myScore, opScore };
    return { label: '무', color: 'text-gray-400', icon: Minus, myScore, opScore };
  };

  const wins = matches.filter(m => getResult(m).label === '승').length;
  const draws = matches.filter(m => getResult(m).label === '무').length;
  const losses = matches.filter(m => getResult(m).label === '패').length;
  const totalGoals = Object.values(events).flat().length;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <div className="px-4 py-3 border-b border-white/5"><div className="w-24 h-5 bg-white/5 rounded animate-pulse" /></div>
        <div className="p-4 space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-white/5 rounded-2xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-20">
      <div className="px-4 py-3 flex items-center gap-3 border-b border-white/5 sticky top-0 z-10 bg-[#0a0a0a]">
        <button onClick={() => navigate(-1)} className="p-1 text-gray-400"><ArrowLeft size={22} /></button>
        <h1 className="text-lg font-bold text-white">전적</h1>
      </div>

      {/* 요약 통계 */}
      <div className="px-4 pt-4">
        <div className="bg-[#111] rounded-2xl border border-white/5 p-4 mb-4">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Trophy size={16} className="text-[#7B2D3B]" />
            <span className="text-sm font-bold text-white">{team?.name} 시즌 기록</span>
          </div>
          <div className="grid grid-cols-4 gap-3 text-center">
            <div>
              <p className="text-[10px] text-gray-500">경기</p>
              <p className="text-xl font-black text-white">{matches.length}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500">승</p>
              <p className="text-xl font-black text-emerald-400">{wins}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500">무</p>
              <p className="text-xl font-black text-gray-400">{draws}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500">패</p>
              <p className="text-xl font-black text-red-400">{losses}</p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-white/5 flex justify-center gap-6">
            <div className="text-center">
              <p className="text-[10px] text-gray-500">총 득점</p>
              <p className="text-sm font-bold text-[#7B2D3B]">{totalGoals}골</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-gray-500">승률</p>
              <p className="text-sm font-bold text-white">{matches.length > 0 ? Math.round((wins / matches.length) * 100) : 0}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* 매치 리스트 */}
      <div className="px-4 space-y-2">
        {matches.length === 0 && (
          <p className="text-center text-gray-600 py-12 text-sm">완료된 경기가 없습니다</p>
        )}
        {matches.map(match => {
          const result = getResult(match);
          const isHome = match.home_team_id === team?.id;
          const opponent = isHome ? match.away_team : match.home_team;
          const matchEvents = events[match.id] || [];
          const expanded = expandedId === match.id;
          const Icon = result.icon;

          return (
            <div key={match.id} className="bg-[#111] rounded-2xl border border-white/5 overflow-hidden">
              <div
                onClick={() => setExpandedId(expanded ? null : match.id)}
                className="p-4 active:scale-[0.98] transition-transform cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{formatDate(match.date)}</span>
                    <span className="text-sm text-gray-500">{match.time?.slice(0, 5)}</span>
                  </div>
                  <span className={`text-xs font-black px-2.5 py-1 rounded-full ${
                    result.label === '승' ? 'bg-emerald-500/15 text-emerald-400' :
                    result.label === '패' ? 'bg-red-500/15 text-red-400' :
                    'bg-gray-500/15 text-gray-400'
                  }`}>
                    {result.label}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{opponent?.logo || '⚽'}</div>
                  <div className="flex-1">
                    <p className="font-bold text-white text-sm">vs {opponent?.name || '상대'}</p>
                    <p className="text-[11px] text-gray-500 flex items-center gap-1"><MapPin size={11} />{match.stadium}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-black text-white">{result.myScore} : {result.opScore}</p>
                  </div>
                </div>
              </div>

              {/* 확장: 골/어시 상세 */}
              {expanded && matchEvents.length > 0 && (
                <div className="border-t border-white/5 px-4 py-3 space-y-1.5">
                  {matchEvents.map(evt => (
                    <div key={evt.id} className="flex items-center gap-2 text-xs">
                      <span className="text-gray-600 w-8 text-right">{evt.minute ? `${evt.minute}'` : ''}</span>
                      <span className="text-yellow-400">⚽</span>
                      <span className="text-white font-medium">{(evt.scorer as any)?.name || '?'}</span>
                      {(evt.assister as any)?.name && (
                        <>
                          <span className="text-gray-600">←</span>
                          <span className="text-emerald-400">🅰️ {(evt.assister as any).name}</span>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {expanded && matchEvents.length === 0 && (
                <div className="border-t border-white/5 px-4 py-3">
                  <p className="text-xs text-gray-600 text-center">골 기록이 없습니다</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
