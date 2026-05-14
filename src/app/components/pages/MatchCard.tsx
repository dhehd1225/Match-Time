import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Download, ChevronRight, MapPin, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import { supabase } from '../../../lib/supabase';
import { trackEvent } from '../../../hooks/useAnalytics';
import { useAuth } from '../../../contexts/AuthContext';
import type { Match } from '../../../lib/types';

interface GoalEntry { scorer_name: string; assister_name: string; minute: string; }
interface CardPlayer { id: string; name: string; position: string; number: number; }

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
        .order('date', { ascending: true })
        .order('time', { ascending: true });
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
          setPlayers(profiles.map(p => ({ id: p.id, name: p.name || '이름 없음', position: p.position || 'MF', number: p.back_number || 0 })));
        }
      } else {
        const { data: members } = await supabase
          .from('team_members')
          .select('*, profile:profiles(*)')
          .eq('team_id', team.id);
        if (members) {
          setPlayers(members.map(m => ({ id: m.user_id, name: m.profile?.name || '이름 없음', position: m.profile?.position || 'MF', number: m.profile?.back_number || 0 })));
        }
      }

      const matchDate = new Date(selectedMatch.date + 'T' + (selectedMatch.time || '00:00'));
      setCardType(matchDate < new Date() ? 'post' : 'pre');

      // 저장된 스코어 로드
      if (selectedMatch.home_score !== null) {
        const isHome = selectedMatch.home_team_id === team.id;
        setHomeScore(String(isHome ? selectedMatch.home_score : selectedMatch.away_score ?? 0));
        setAwayScore(String(isHome ? selectedMatch.away_score ?? 0 : selectedMatch.home_score));
      } else {
        setHomeScore('0');
        setAwayScore('0');
      }

      // 저장된 골/어시 이벤트 로드
      const { data: events } = await supabase
        .from('match_events')
        .select('*, scorer:profiles!match_events_scorer_id_fkey(id, name), assister:profiles!match_events_assister_id_fkey(id, name)')
        .eq('match_id', selectedMatch.id)
        .order('minute', { ascending: true });

      if (events && events.length > 0) {
        setGoals(events.map(e => ({
          scorer_name: (e.scorer as any)?.name || '',
          assister_name: (e.assister as any)?.name || '',
          minute: e.minute ? String(e.minute) : '',
        })));
      } else {
        setGoals([]);
      }
    };
    fetchPlayers();
  }, [selectedMatch, team]);

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 3,
        backgroundColor: '#0a0a0a',
        useCORS: true,
        logging: false,
        allowTaint: true,
        onclone: (clonedDoc) => {
          // Tailwind의 oklch 색상이 html2canvas에서 에러나므로 스타일시트 제거
          clonedDoc.querySelectorAll('style, link[rel="stylesheet"]').forEach(el => el.remove());
        },
      });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `match-card-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('카드가 저장되었습니다.');
      trackEvent('card_download', { type: cardType });
    } catch (err: any) {
      toast.error(`카드 생성 실패: ${err?.message || '알 수 없는 오류'}`);
    }
    setDownloading(false);
  };

  const groupedPlayers = posOrder
    .map(pos => ({ position: pos, players: players.filter(p => p.position === pos) }))
    .filter(g => g.players.length > 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F6F3]">
        <div className="px-4 pt-5 pb-3"><div className="w-24 h-6 bg-[#E5E2DC] rounded animate-pulse" /></div>
        <div className="px-4 space-y-2">
          {[1,2].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-[#E5E2DC] p-4 space-y-3">
              <div className="flex justify-between"><div className="w-28 h-4 bg-[#E5E2DC] rounded animate-pulse" /><div className="w-12 h-4 bg-[#E5E2DC] rounded animate-pulse" /></div>
              <div className="flex items-center gap-3"><div className="w-8 h-8 bg-[#E5E2DC] rounded-full animate-pulse" /><div className="w-32 h-4 bg-[#E5E2DC] rounded animate-pulse" /></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 카드 생성 뷰
  if (selectedMatch) {
    const isHome = selectedMatch.home_team_id === team?.id;
    const myTeam = isHome ? selectedMatch.home_team : selectedMatch.away_team;
    const opponentTeam = isHome ? selectedMatch.away_team : selectedMatch.home_team;

    return (
      <div className="min-h-screen bg-[#F7F6F3] pb-20">
        <div className="px-4 py-3 flex items-center gap-3 border-b border-[#E5E2DC] sticky top-0 z-10 bg-white">
          <button onClick={() => setSelectedMatch(null)} className="p-1 text-[#888]"><ArrowLeft size={22} /></button>
          <h1 className="text-lg font-bold text-[#111]">매치 카드</h1>
        </div>

        {/* 카드 타입 토글 */}
        <div className="px-4 pt-4">
          <div className="flex gap-1 bg-[#F0EEE9] p-1 rounded-xl mb-4">
            <button onClick={() => setCardType('pre')}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold ${cardType === 'pre' ? 'bg-[#111] text-white' : 'text-[#555]'}`}>
              시합 전
            </button>
            <button onClick={() => setCardType('post')}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold ${cardType === 'post' ? 'bg-[#111] text-white' : 'text-[#555]'}`}>
              시합 후
            </button>
          </div>
        </div>

        {/* 카드 프리뷰 - 인라인 스타일 (html2canvas oklch 호환) */}
        <div style={{ padding: '0 16px', marginBottom: 16 }}>
          <div ref={cardRef} style={{ aspectRatio: '4/5', width: '100%', maxWidth: 375, margin: '0 auto', borderRadius: 16, overflow: 'hidden', position: 'relative', background: '#0a0a0a' }}>
            {/* 배경 */}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #0a0a0a, #150a0e, #1a0f14)' }} />

            {/* 카드 콘텐츠 */}
            <div style={{ position: 'relative', zIndex: 10, height: '100%', display: 'flex', flexDirection: 'column', padding: 20 }}>
              {/* 헤더 */}
              <p style={{ textAlign: 'center', fontWeight: 700, letterSpacing: '0.4em', color: '#C4697A', marginBottom: 16, fontSize: 10 }}>
                {cardType === 'pre' ? 'M A T C H   D A Y' : 'F U L L   T I M E'}
              </p>

              {/* 팀 + 스코어 */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{ fontSize: 36, marginBottom: 4 }}>{myTeam?.logo || '⚽'}</div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{myTeam?.name}</p>
                </div>
                <div style={{ textAlign: 'center', padding: '0 8px' }}>
                  {cardType === 'post' ? (
                    <p style={{ fontSize: 28, fontWeight: 900, color: '#fff' }}>{homeScore} : {awayScore}</p>
                  ) : (
                    <p style={{ fontSize: 20, fontWeight: 900, color: '#666' }}>VS</p>
                  )}
                </div>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{ fontSize: 36, marginBottom: 4 }}>{opponentTeam?.logo || '❓'}</div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opponentTeam?.name || '상대 미정'}</p>
                </div>
              </div>

              {/* 시합 정보 */}
              <div style={{ textAlign: 'center', marginBottom: 12 }}>
                <div style={{ height: 1, background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.1), transparent)', marginBottom: 8 }} />
                <p style={{ fontSize: 11, color: '#999' }}>
                  {formatDate(selectedMatch.date)} · {selectedMatch.time?.slice(0, 5)}
                </p>
                <p style={{ fontSize: 11, color: '#777' }}>{selectedMatch.stadium}</p>
                <div style={{ height: 1, background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.1), transparent)', marginTop: 8 }} />
              </div>

              {/* 골 + 어시스트 기록 (시합 후) */}
              {cardType === 'post' && goals.filter(g => g.scorer_name).length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.3em', color: '#777', textAlign: 'center', marginBottom: 8 }}>G O A L S</p>
                  {goals.filter(g => g.scorer_name).map((g, i) => (
                    <p key={i} style={{ textAlign: 'center', fontSize: 12, marginBottom: 2 }}>
                      <span style={{ color: '#FBBF24' }}>⚽ {g.scorer_name}</span>
                      {g.minute && <span style={{ color: '#777' }}> {g.minute}'</span>}
                    </p>
                  ))}
                  {goals.some(g => g.assister_name) && (
                    <>
                      <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.3em', color: '#777', textAlign: 'center', marginBottom: 6, marginTop: 8 }}>A S S I S T S</p>
                      {goals.filter(g => g.assister_name).map((g, i) => (
                        <p key={i} style={{ textAlign: 'center', fontSize: 12, color: '#34D399', marginBottom: 2 }}>
                          🅰️ {g.assister_name}
                          {g.minute && <span style={{ color: '#777' }}> {g.minute}'</span>}
                        </p>
                      ))}
                    </>
                  )}
                </div>
              )}

              {/* 라인업 */}
              <div style={{ flex: 1, minHeight: 0 }}>
                <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.3em', color: '#777', textAlign: 'center', marginBottom: 8 }}>L I N E U P</p>
                {groupedPlayers.map(group => (
                  <div key={group.position} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, width: 24, textAlign: 'right', flexShrink: 0, color: posColor[group.position] }}>
                      {posLabel[group.position]}
                    </span>
                    <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: '2px 8px' }}>
                      {group.players.map((p, i) => (
                        <span key={i} style={{ fontSize: 11, color: '#ccc' }}>
                          {p.name}<span style={{ fontSize: 9, color: '#666' }}>({p.number})</span>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
                {players.length === 0 && (
                  <p style={{ textAlign: 'center', color: '#666', fontSize: 11 }}>라인업 미정</p>
                )}
              </div>

              {/* 하단 브랜딩 */}
              <div style={{ textAlign: 'center', paddingTop: 8 }}>
                <div style={{ height: 1, background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.1), transparent)', marginBottom: 8 }} />
                <p style={{ color: '#555', letterSpacing: '0.2em', fontSize: 9 }}>
                  {cardType === 'pre' ? '⚽ KICK OFF' : '⚽ GG'} · Match Time
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 다운로드 버튼 */}
        <div className="px-4">
          <button onClick={handleDownload} disabled={downloading}
            className="w-full bg-[#111] text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50">
            <Download size={16} />
            {downloading ? '생성 중...' : '카드 저장하기'}
          </button>
        </div>
      </div>
    );
  }

  // 매치 목록
  return (
    <div className="min-h-screen bg-[#F7F6F3]">
      <div className="px-4 pt-4 pb-3 bg-white border-b border-[#E5E2DC]">
        <h1 className="font-title text-[30px] text-[#111] leading-none">MATCH CARD</h1>
      </div>

      <div className="px-4 pb-28 space-y-2">
        {matches.length === 0 && (
          <p className="text-center text-[#CCC] py-12 text-sm">매치가 없습니다</p>
        )}
        {matches.map(match => {
          const isHome = match.home_team_id === team?.id;
          const opponent = isHome ? match.away_team : match.home_team;
          const isPast = new Date(match.date + 'T00:00:00') < new Date();
          return (
            <div key={match.id} onClick={() => setSelectedMatch(match)}
              className="bg-white rounded-xl border border-[#E5E2DC] p-4 active:scale-[0.98] transition-transform cursor-pointer">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[#111]">{formatDate(match.date)}</span>
                  <span className="text-sm text-[#888]">{match.time?.slice(0, 5)}</span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isPast ? 'text-[#888] bg-[#F0EEE9]' : 'text-[#166534] bg-[#ECFDF4]'
                }`}>
                  {isPast ? '시합 후' : '시합 전'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-2xl">{opponent?.logo || '⚽'}</div>
                <div className="flex-1">
                  <p className="font-bold text-[#111] text-sm">vs {opponent?.name || '상대 미정'}</p>
                  <p className="text-[11px] text-[#888] flex items-center gap-1"><MapPin size={11} />{match.stadium}</p>
                </div>
                <div className="flex items-center gap-1 text-[#111]">
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
