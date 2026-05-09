import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Download, ChevronRight, MapPin, Plus, X, Sparkles } from 'lucide-react';
import html2canvas from 'html2canvas';
import { supabase } from '../../../lib/supabase';
import { trackEvent } from '../../../hooks/useAnalytics';
import { useAuth } from '../../../contexts/AuthContext';
import type { Match } from '../../../lib/types';

interface GoalEntry { name: string; minute: string; }
interface CardPlayer { name: string; position: string; number: number; }

const posOrder = ['FW', 'MF', 'DF', 'GK'];
const posLabel: Record<string, string> = { FW: 'FW', MF: 'MF', DF: 'DF', GK: 'GK' };
const posColor: Record<string, string> = { FW: '#F87171', MF: '#34D399', DF: '#60A5FA', GK: '#FBBF24' };

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
}

export default function MatchCard() {
  const { team, user } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [cardType, setCardType] = useState<'pre' | 'post'>('pre');
  const [homeScore, setHomeScore] = useState('0');
  const [awayScore, setAwayScore] = useState('0');
  const [goals, setGoals] = useState<GoalEntry[]>([]);
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalMinute, setNewGoalMinute] = useState('');
  const [players, setPlayers] = useState<CardPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!team) { setLoading(false); return; }
    const fetchMatches = async () => {
      const { data } = await supabase
        .from('matches')
        .select('*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)')
        .or(`home_team_id.eq.${team.id},away_team_id.eq.${team.id}`)
        .order('date', { ascending: false });
      if (data) setMatches(data);
      setLoading(false);
    };
    fetchMatches();
  }, [team]);

  useEffect(() => {
    if (!selectedMatch || !team) return;
    const fetchPlayers = async () => {
      const { data: attendance } = await supabase
        .from('match_attendance')
        .select('user_id')
        .eq('match_id', selectedMatch.id)
        .eq('status', 'attending');

      if (attendance && attendance.length > 0) {
        const userIds = attendance.map(a => a.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, position, back_number')
          .in('id', userIds);
        if (profiles) {
          setPlayers(profiles.map(p => ({ name: p.name || '이름 없음', position: p.position || 'MF', number: p.back_number || 0 })));
        }
      } else {
        const { data: members } = await supabase
          .from('team_members')
          .select('*, profile:profiles(*)')
          .eq('team_id', team.id);
        if (members) {
          setPlayers(members.map(m => ({ name: m.profile?.name || '이름 없음', position: m.profile?.position || 'MF', number: m.profile?.back_number || 0 })));
        }
      }

      const matchDate = new Date(selectedMatch.date + 'T' + (selectedMatch.time || '00:00'));
      setCardType(matchDate < new Date() ? 'post' : 'pre');
      setHomeScore('0');
      setAwayScore('0');
      setGoals([]);
    };
    fetchPlayers();
  }, [selectedMatch, team]);

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(cardRef.current, { scale: 3, backgroundColor: null, useCORS: true });
      const link = document.createElement('a');
      link.download = `match-card.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      trackEvent('card_download', { type: cardType });
    } catch (err) {
      console.error('Card generation failed:', err);
    }
    setDownloading(false);
  };

  const addGoal = () => {
    if (!newGoalName.trim()) return;
    setGoals(prev => [...prev, { name: newGoalName.trim(), minute: newGoalMinute.trim() }]);
    setNewGoalName('');
    setNewGoalMinute('');
  };

  const groupedPlayers = posOrder
    .map(pos => ({ position: pos, players: players.filter(p => p.position === pos) }))
    .filter(g => g.players.length > 0);

  if (loading) {
    return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center"><span className="text-gray-500 text-sm">로딩 중...</span></div>;
  }

  // 카드 생성 뷰
  if (selectedMatch) {
    const isHome = selectedMatch.home_team_id === team?.id;
    const myTeam = isHome ? selectedMatch.home_team : selectedMatch.away_team;
    const opponentTeam = isHome ? selectedMatch.away_team : selectedMatch.home_team;

    return (
      <div className="min-h-screen bg-[#0a0a0a] pb-20">
        <div className="px-4 py-3 flex items-center gap-3 border-b border-white/5 sticky top-0 z-10 bg-[#0a0a0a]">
          <button onClick={() => setSelectedMatch(null)} className="p-1 text-gray-400"><ArrowLeft size={22} /></button>
          <h1 className="text-lg font-bold text-white">매치 카드</h1>
        </div>

        {/* 카드 타입 토글 */}
        <div className="px-4 pt-4">
          <div className="flex gap-1 bg-[#111] p-1 rounded-xl mb-4">
            <button onClick={() => setCardType('pre')}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold ${cardType === 'pre' ? 'bg-[#7B2D3B] text-white' : 'text-gray-500'}`}>
              시합 전
            </button>
            <button onClick={() => setCardType('post')}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold ${cardType === 'post' ? 'bg-[#7B2D3B] text-white' : 'text-gray-500'}`}>
              시합 후
            </button>
          </div>
        </div>

        {/* 시합 후 입력 */}
        {cardType === 'post' && (
          <div className="px-4 mb-4 space-y-3">
            <div className="bg-[#111] rounded-xl border border-white/5 p-3">
              <p className="text-[10px] text-gray-500 font-bold mb-2">스코어</p>
              <div className="flex items-center gap-3 justify-center">
                <div className="text-center">
                  <p className="text-[10px] text-gray-500 mb-1">{myTeam?.name}</p>
                  <input type="number" value={homeScore} onChange={e => setHomeScore(e.target.value)}
                    className="w-14 text-center text-2xl font-black bg-white/5 border border-white/10 rounded-lg py-1 text-white outline-none" />
                </div>
                <span className="text-gray-600 font-bold text-xl">:</span>
                <div className="text-center">
                  <p className="text-[10px] text-gray-500 mb-1">{opponentTeam?.name || '상대'}</p>
                  <input type="number" value={awayScore} onChange={e => setAwayScore(e.target.value)}
                    className="w-14 text-center text-2xl font-black bg-white/5 border border-white/10 rounded-lg py-1 text-white outline-none" />
                </div>
              </div>
            </div>

            <div className="bg-[#111] rounded-xl border border-white/5 p-3">
              <p className="text-[10px] text-gray-500 font-bold mb-2">골 기록</p>
              {goals.map((g, i) => (
                <div key={i} className="flex items-center gap-2 mb-2">
                  <span className="text-sm text-white flex-1">⚽ {g.name} {g.minute && `${g.minute}'`}</span>
                  <button onClick={() => setGoals(prev => prev.filter((_, j) => j !== i))} className="text-gray-600"><X size={14} /></button>
                </div>
              ))}
              <div className="flex gap-2">
                <input value={newGoalName} onChange={e => setNewGoalName(e.target.value)} placeholder="선수 이름"
                  className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-gray-600 outline-none" />
                <input value={newGoalMinute} onChange={e => setNewGoalMinute(e.target.value)} placeholder="분" type="number"
                  className="w-14 px-2 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-gray-600 outline-none text-center" />
                <button onClick={addGoal} disabled={!newGoalName.trim()}
                  className="bg-[#7B2D3B] text-white px-3 py-2 rounded-lg disabled:opacity-30"><Plus size={16} /></button>
              </div>
            </div>
          </div>
        )}

        {/* 카드 프리뷰 */}
        <div className="px-4 mb-4">
          <div ref={cardRef} style={{ aspectRatio: '4/5' }}
            className="w-full rounded-2xl overflow-hidden relative">
            {/* 배경 */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#150a0e] to-[#1a0f14]" />
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#7B2D3B]/8 rounded-full blur-[80px]" />
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-[#7B2D3B]/5 rounded-full blur-[60px]" />

            {/* 카드 콘텐츠 */}
            <div className="relative z-10 h-full flex flex-col p-5">
              {/* 헤더 */}
              <p className="text-center font-bold tracking-[0.4em] text-[#C4697A] mb-4" style={{ fontSize: 10 }}>
                {cardType === 'pre' ? 'M A T C H   D A Y' : 'F U L L   T I M E'}
              </p>

              {/* 팀 + 스코어 */}
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="text-center flex-1">
                  <div style={{ fontSize: 36 }} className="mb-1">{myTeam?.logo || '⚽'}</div>
                  <p style={{ fontSize: 12 }} className="font-bold text-white truncate">{myTeam?.name}</p>
                </div>
                <div className="text-center px-2">
                  {cardType === 'post' ? (
                    <p style={{ fontSize: 28 }} className="font-black text-white">{homeScore} : {awayScore}</p>
                  ) : (
                    <p style={{ fontSize: 20 }} className="font-black text-gray-600">VS</p>
                  )}
                </div>
                <div className="text-center flex-1">
                  <div style={{ fontSize: 36 }} className="mb-1">{opponentTeam?.logo || '❓'}</div>
                  <p style={{ fontSize: 12 }} className="font-bold text-white truncate">{opponentTeam?.name || '상대 미정'}</p>
                </div>
              </div>

              {/* 시합 정보 */}
              <div className="text-center mb-3">
                <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-2" />
                <p style={{ fontSize: 11 }} className="text-gray-400">
                  {formatDate(selectedMatch.date)} · {selectedMatch.time?.slice(0, 5)}
                </p>
                <p style={{ fontSize: 11 }} className="text-gray-500">{selectedMatch.stadium}</p>
                <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mt-2" />
              </div>

              {/* 골 기록 (시합 후) */}
              {cardType === 'post' && goals.length > 0 && (
                <div className="mb-3">
                  <p className="font-bold tracking-[0.3em] text-gray-500 text-center mb-2" style={{ fontSize: 9 }}>G O A L S</p>
                  <div className="space-y-0.5">
                    {goals.map((g, i) => (
                      <p key={i} className="text-center text-amber-400" style={{ fontSize: 12 }}>
                        ⚽ {g.name} {g.minute && <span className="text-gray-500">{g.minute}'</span>}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* 라인업 */}
              <div className="flex-1 min-h-0">
                <p className="font-bold tracking-[0.3em] text-gray-500 text-center mb-2" style={{ fontSize: 9 }}>L I N E U P</p>
                <div className="space-y-1.5">
                  {groupedPlayers.map(group => (
                    <div key={group.position} className="flex items-start gap-2">
                      <span className="font-bold w-6 text-right flex-shrink-0" style={{ fontSize: 10, color: posColor[group.position] }}>
                        {posLabel[group.position]}
                      </span>
                      <div className="flex-1 flex flex-wrap gap-x-2 gap-y-0.5">
                        {group.players.map((p, i) => (
                          <span key={i} className="text-gray-300" style={{ fontSize: 11 }}>
                            {p.name}<span className="text-gray-600" style={{ fontSize: 9 }}>({p.number})</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                  {players.length === 0 && (
                    <p className="text-center text-gray-600" style={{ fontSize: 11 }}>라인업 미정</p>
                  )}
                </div>
              </div>

              {/* 하단 브랜딩 */}
              <div className="text-center pt-2">
                <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-2" />
                <p className="text-gray-600 tracking-[0.2em]" style={{ fontSize: 9 }}>
                  {cardType === 'pre' ? '⚽ KICK OFF' : '⚽ GG'} · Match Time
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 다운로드 버튼 */}
        <div className="px-4">
          <button onClick={handleDownload} disabled={downloading}
            className="w-full bg-[#7B2D3B] text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50">
            <Download size={16} />
            {downloading ? '생성 중...' : '카드 저장하기'}
          </button>
        </div>
      </div>
    );
  }

  // 매치 목록
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="px-4 pt-5 pb-3">
        <h1 className="text-2xl font-black text-white mb-1">매치 카드</h1>
        <p className="text-xs text-gray-500">시합 정보를 카드로 만들어 공유하세요</p>
      </div>

      <div className="px-4 pb-28 space-y-2">
        {matches.length === 0 && (
          <p className="text-center text-gray-600 py-12 text-sm">매치가 없습니다</p>
        )}
        {matches.map(match => {
          const isHome = match.home_team_id === team?.id;
          const opponent = isHome ? match.away_team : match.home_team;
          const isPast = new Date(match.date + 'T00:00:00') < new Date();
          return (
            <div key={match.id} onClick={() => setSelectedMatch(match)}
              className="bg-[#111] rounded-2xl border border-white/5 p-4 active:scale-[0.98] transition-transform cursor-pointer">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">{formatDate(match.date)}</span>
                  <span className="text-sm text-gray-500">{match.time?.slice(0, 5)}</span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isPast ? 'text-gray-400 bg-white/5' : 'text-emerald-400 bg-emerald-500/10'
                }`}>
                  {isPast ? '시합 후' : '시합 전'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-2xl">{opponent?.logo || '⚽'}</div>
                <div className="flex-1">
                  <p className="font-bold text-white text-sm">vs {opponent?.name || '상대 미정'}</p>
                  <p className="text-[11px] text-gray-500 flex items-center gap-1"><MapPin size={11} />{match.stadium}</p>
                </div>
                <div className="flex items-center gap-1 text-[#7B2D3B]">
                  <Sparkles size={14} />
                  <ChevronRight size={14} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
