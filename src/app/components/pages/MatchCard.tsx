import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Download, ChevronRight, MapPin, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../../lib/supabase';
import { trackEvent } from '../../../hooks/useAnalytics';
import { useAuth } from '../../../contexts/AuthContext';
import type { Match } from '../../../lib/types';

interface GoalEntry { scorer_name: string; assister_name: string; minute: string; }
interface CardPlayer { id: string; name: string; position: string; number: number; }
interface CardData { starters: CardPlayer[]; bench: CardPlayer[]; }

const posOrder = ['FW', 'MF', 'DF', 'GK'];
const posBg: Record<string, string> = { FW: 'rgba(200,16,46,0.15)', MF: 'rgba(34,197,94,0.12)', DF: 'rgba(59,130,246,0.12)', GK: 'rgba(234,179,8,0.15)' };
const posClr: Record<string, string> = { FW: '#C8102E', MF: '#4ade80', DF: '#60a5fa', GK: '#EAB308' };

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
}

// ── 헬퍼 ──
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function line(ctx: CanvasRenderingContext2D, y: number, s: number, color = '#1e1e1e') {
  ctx.strokeStyle = color; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(s, y); ctx.stroke();
}

// ── Canvas 드로잉 (1080×1080) ──
async function drawCard(
  canvas: HTMLCanvasElement,
  opts: {
    cardType: 'pre' | 'post';
    myTeamName: string; myTeamLogo: string;
    oppTeamName: string; oppTeamLogo: string;
    date: string; time: string; stadium: string; format: string;
    homeScore: string; awayScore: string;
    goals: GoalEntry[];
    players: { name: string; number: number; position: string }[];
    bench: { name: string; number: number; position: string }[];
  }
) {
  // 웹폰트 로드 대기
  await document.fonts.ready;

  const S = 1080;
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d')!;
  const P = 52; // padding

  // ── 배경 ──
  ctx.fillStyle = '#0c0c0c';
  ctx.fillRect(0, 0, S, S);
  // 미세 대각선 패턴
  ctx.strokeStyle = 'rgba(255,255,255,0.018)';
  ctx.lineWidth = 1;
  for (let i = -S; i < S * 2; i += 48) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + S * 0.6, S); ctx.stroke();
  }

  // 상단 레드 악센트 라인
  ctx.fillStyle = '#C8102E';
  ctx.fillRect(0, 0, S, 4);

  ctx.textBaseline = 'middle';
  let y = 0;

  // ── 상단: 팀 배너 ──
  // 배경 그라디언트 영역
  const headerH = 140;
  const grad = ctx.createLinearGradient(0, 0, S, 0);
  grad.addColorStop(0, '#141414'); grad.addColorStop(1, '#1a1a1a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 4, S, headerH);

  // 팀 로고 (큰 원)
  const drawCircle = (cx: number, cy: number, emoji: string, size: number) => {
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.arc(cx, cy, size, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#333'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, size, 0, Math.PI * 2); ctx.stroke();
    ctx.font = `${size}px sans-serif`; ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
    ctx.fillText(emoji, cx, cy + 3); ctx.textAlign = 'left';
  };
  drawCircle(P + 40, 4 + headerH / 2, opts.myTeamLogo || '⚽', 40);

  // 팀 이름 (크고 굵게)
  ctx.font = '800 42px sans-serif'; ctx.fillStyle = '#fff';
  ctx.fillText(opts.myTeamName.toUpperCase(), P + 100, 4 + headerH / 2 - 12);

  // 날짜/장소 (팀명 아래)
  ctx.font = '400 22px sans-serif'; ctx.fillStyle = '#777';
  ctx.fillText(`${formatDate(opts.date)}  ·  ${opts.time?.slice(0, 5) || ''}  ·  ${opts.stadium}`, P + 100, 4 + headerH / 2 + 22);

  // 포맷 뱃지 (우측)
  ctx.font = '700 20px sans-serif';
  const fmtText = opts.format || '11v11';
  const fmtW = ctx.measureText(fmtText).width + 24;
  roundRect(ctx, S - P - fmtW, 4 + headerH / 2 - 15, fmtW, 30, 6);
  ctx.fillStyle = 'rgba(200,16,46,0.15)'; ctx.fill();
  ctx.fillStyle = '#C8102E'; ctx.textAlign = 'center';
  ctx.fillText(fmtText, S - P - fmtW / 2, 4 + headerH / 2);
  ctx.textAlign = 'left';

  y = 4 + headerH;
  line(ctx, y, S, '#C8102E');

  // ── 타이틀 ──
  y += 40;
  ctx.font = '700 20px sans-serif'; ctx.fillStyle = '#C8102E';
  const label = opts.cardType === 'pre' ? 'MATCHDAY' : 'FULL TIME';
  let lx = P;
  for (const ch of label) { ctx.fillText(ch, lx, y); lx += ctx.measureText(ch).width + 5; }

  y += 28;
  if (opts.cardType === 'post') {
    // 스코어
    ctx.font = '800 96px sans-serif'; ctx.fillStyle = '#fff';
    ctx.fillText(opts.homeScore, P, y + 60);
    const sw = ctx.measureText(opts.homeScore).width;
    ctx.fillStyle = '#C8102E';
    ctx.fillText(':', P + sw + 20, y + 56);
    ctx.fillStyle = '#fff';
    ctx.fillText(opts.awayScore, P + sw + 20 + ctx.measureText(':').width + 20, y + 60);
    y += 110;
    // vs 팀명
    y += 6;
    ctx.font = '400 24px sans-serif'; ctx.fillStyle = '#666';
    ctx.fillText(`${opts.myTeamName}  vs  ${opts.oppTeamName || '상대'}`, P, y);
    y += 36;
  } else {
    ctx.font = '800 96px sans-serif'; ctx.fillStyle = '#fff';
    ctx.fillText('STARTING', P, y + 60);
    const lw = ctx.measureText('STARTING').width;
    ctx.fillStyle = '#C8102E';
    ctx.fillText(' XI', P + lw, y + 60);
    y += 110;
    // vs 상대
    y += 6;
    ctx.font = '400 24px sans-serif'; ctx.fillStyle = '#666';
    const vsText = opts.oppTeamName ? `vs ${opts.oppTeamName}` : '선발 명단';
    drawCircle(P + 14, y, opts.oppTeamLogo || '⚽', 14);
    ctx.font = '400 24px sans-serif'; ctx.fillStyle = '#666';
    ctx.fillText(vsText, P + 36, y);
    y += 36;
  }

  line(ctx, y, S);
  y += 2;

  // ── 골 기록 ──
  const activeGoals = opts.cardType === 'post' ? opts.goals.filter(g => g.scorer_name) : [];
  if (activeGoals.length > 0) {
    y += 20;
    for (const g of activeGoals) {
      ctx.font = '24px sans-serif'; ctx.fillStyle = '#EAB308';
      ctx.fillText('⚽', P, y + 16);
      let gx = P + 38;
      ctx.font = '700 32px sans-serif'; ctx.fillStyle = '#fff';
      ctx.fillText(g.scorer_name, gx, y + 16); gx += ctx.measureText(g.scorer_name).width;
      if (g.assister_name) {
        ctx.font = '400 26px sans-serif'; ctx.fillStyle = '#555';
        ctx.fillText(`  (${g.assister_name})`, gx, y + 16); gx += ctx.measureText(`  (${g.assister_name})`).width;
      }
      if (g.minute) {
        ctx.font = '400 26px sans-serif'; ctx.fillStyle = '#444';
        ctx.fillText(`  ${g.minute}'`, gx, y + 16);
      }
      y += 38;
    }
    y += 12;
    line(ctx, y, S); y += 2;
  }

  // ── STARTING XI (1Q) ──
  const footerH = 76;
  const hasBench = opts.bench.length > 0;
  const benchLabelH = hasBench ? 32 : 0;
  const benchRowH = 28;
  const benchBlockH = hasBench ? benchLabelH + opts.bench.length * benchRowH : 0;
  const avail = S - y - footerH - benchBlockH;
  const sorted: typeof opts.players = [];
  for (const pos of posOrder) sorted.push(...opts.players.filter(p => p.position === pos));
  const pc = sorted.length;
  const rowH = pc > 0 ? Math.min(62, Math.floor(avail / pc) - 2) : 50;
  const blockH = pc * (rowH + 2);
  const padTop = Math.max(6, Math.floor((avail - blockH) / 2));
  y += padTop;

  if (pc === 0) {
    ctx.font = '400 28px sans-serif'; ctx.fillStyle = '#555'; ctx.textAlign = 'center';
    ctx.fillText('라인업 미정', S / 2, y + avail / 2); ctx.textAlign = 'left';
  } else {
    for (const p of sorted) {
      line(ctx, y + rowH, S);
      const cy = y + rowH / 2;

      const numFs = Math.min(28, rowH - 8);
      ctx.font = `600 ${numFs}px sans-serif`; ctx.fillStyle = '#555'; ctx.textAlign = 'right';
      ctx.fillText(String(p.number), P + 52, cy + 1); ctx.textAlign = 'left';

      const nameFs = Math.min(32, rowH - 4);
      ctx.font = `700 ${nameFs}px sans-serif`; ctx.fillStyle = '#eee';
      ctx.fillText(p.name, P + 72, cy + 1);

      const bFs = Math.min(18, rowH * 0.35);
      ctx.font = `700 ${bFs}px sans-serif`;
      const tw = ctx.measureText(p.position).width;
      const bw = tw + 20, bh = bFs + 10;
      const bx = S - P - bw, by = cy - bh / 2;
      ctx.fillStyle = posBg[p.position] || posBg.FW;
      roundRect(ctx, bx, by, bw, bh, 5); ctx.fill();
      ctx.fillStyle = posClr[p.position] || posClr.FW;
      ctx.textAlign = 'center'; ctx.fillText(p.position, bx + bw / 2, cy + 1); ctx.textAlign = 'left';

      y += rowH + 2;
    }
  }

  // ── BENCH (2Q~4Q 선수) ──
  if (hasBench) {
    y = S - footerH - benchBlockH;
    line(ctx, y, S, '#1a1a1a');
    y += 8;
    ctx.font = '700 18px sans-serif'; ctx.fillStyle = '#555';
    let bLx = P;
    for (const ch of 'BENCH') { ctx.fillText(ch, bLx, y + 10); bLx += ctx.measureText(ch).width + 3; }
    y += benchLabelH;

    for (const p of opts.bench) {
      const cy = y + benchRowH / 2;
      ctx.font = '500 20px sans-serif'; ctx.fillStyle = '#444'; ctx.textAlign = 'right';
      ctx.fillText(String(p.number), P + 44, cy); ctx.textAlign = 'left';
      ctx.font = '500 22px sans-serif'; ctx.fillStyle = '#777';
      ctx.fillText(p.name, P + 60, cy);
      ctx.font = '600 14px sans-serif'; ctx.fillStyle = posClr[p.position] || '#555';
      ctx.textAlign = 'right'; ctx.fillText(p.position, S - P, cy); ctx.textAlign = 'left';
      y += benchRowH;
    }
  }

  // ── 푸터 ──
  const fy = S - footerH;
  ctx.fillStyle = '#0c0c0c';
  ctx.fillRect(0, fy, S, footerH);
  line(ctx, fy, S, '#1a1a1a');
  const fcy = fy + footerH / 2;
  ctx.fillStyle = '#C8102E';
  ctx.beginPath(); ctx.arc(S / 2 - 76, fcy, 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.font = '700 24px sans-serif'; ctx.fillStyle = '#444'; ctx.textAlign = 'center';
  ctx.fillText('MATCH TIME', S / 2, fcy + 1);
  ctx.fillStyle = '#C8102E';
  ctx.beginPath(); ctx.arc(S / 2 + 76, fcy, 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.textAlign = 'left';
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
  const [benchPlayers, setBenchPlayers] = useState<CardPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
      // 1Q 라인업에서 STARTING XI 가져오기
      const { data: lineups } = await supabase
        .from('lineups')
        .select('quarter, positions')
        .eq('match_id', selectedMatch.id);

      const allLineupUserIds = new Set<string>();
      const q1UserIds = new Set<string>();
      const otherQUserIds = new Set<string>();

      if (lineups && lineups.length > 0) {
        for (const lu of lineups) {
          const positions = (lu.positions as any[]) || [];
          const uids = positions.map((p: any) => p.user_id).filter(Boolean) as string[];
          uids.forEach(id => allLineupUserIds.add(id));
          if (lu.quarter === '1Q') uids.forEach(id => q1UserIds.add(id));
          else uids.forEach(id => otherQUserIds.add(id));
        }
      }

      // 벤치 = 2Q~4Q에 있지만 1Q에는 없는 선수
      const benchIds = new Set([...otherQUserIds].filter(id => !q1UserIds.has(id)));

      if (allLineupUserIds.size > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, position, back_number')
          .in('id', [...allLineupUserIds]);
        if (profiles) {
          const toPlayer = (p: any): CardPlayer => ({ id: p.id, name: p.name || '이름 없음', position: p.position || 'MF', number: p.back_number || 0 });
          setPlayers(profiles.filter(p => q1UserIds.has(p.id)).map(toPlayer));
          setBenchPlayers(profiles.filter(p => benchIds.has(p.id)).map(toPlayer));
        }
      } else {
        // 라인업 없으면 참석자 전원 표시
        const { data: attendance } = await supabase
          .from('match_attendance')
          .select('user_id')
          .eq('match_id', selectedMatch.id)
          .eq('status', 'attending');
        if (attendance && attendance.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, name, position, back_number')
            .in('id', attendance.map(a => a.user_id));
          if (profiles) setPlayers(profiles.map(p => ({ id: p.id, name: p.name || '이름 없음', position: p.position || 'MF', number: p.back_number || 0 })));
        } else {
          const { data: members } = await supabase
            .from('team_members')
            .select('*, profile:profiles(*)')
            .eq('team_id', team.id);
          if (members) setPlayers(members.map(m => ({ id: m.user_id, name: m.profile?.name || '이름 없음', position: m.profile?.position || 'MF', number: m.profile?.back_number || 0 })));
        }
        setBenchPlayers([]);
      }

      const matchDate = new Date(selectedMatch.date + 'T' + (selectedMatch.time || '00:00'));
      setCardType(matchDate < new Date() ? 'post' : 'pre');

      if (selectedMatch.home_score !== null) {
        const isHome = selectedMatch.home_team_id === team.id;
        setHomeScore(String(isHome ? selectedMatch.home_score : selectedMatch.away_score ?? 0));
        setAwayScore(String(isHome ? selectedMatch.away_score ?? 0 : selectedMatch.home_score));
      } else {
        setHomeScore('0');
        setAwayScore('0');
      }

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

  const getCardOpts = useCallback(() => {
    if (!selectedMatch || !team) return null;
    const isHome = selectedMatch.home_team_id === team.id;
    const myTeam = isHome ? selectedMatch.home_team : selectedMatch.away_team;
    const oppTeam = isHome ? selectedMatch.away_team : selectedMatch.home_team;
    return {
      cardType,
      myTeamName: myTeam?.name || '팀',
      myTeamLogo: myTeam?.logo?.startsWith('http') ? '⚽' : (myTeam?.logo || '⚽'),
      oppTeamName: oppTeam?.name || '상대',
      oppTeamLogo: oppTeam?.logo?.startsWith('http') ? '⚽' : (oppTeam?.logo || '?'),
      date: selectedMatch.date,
      time: selectedMatch.time || '',
      stadium: selectedMatch.stadium || '',
      format: selectedMatch.format || '',
      homeScore, awayScore, goals,
      players: players.map(p => ({ name: p.name, number: p.number, position: p.position })),
      bench: benchPlayers.map(p => ({ name: p.name, number: p.number, position: p.position })),
    };
  }, [selectedMatch, team, cardType, homeScore, awayScore, goals, players, benchPlayers]);

  // 프리뷰 캔버스 업데이트
  useEffect(() => {
    const opts = getCardOpts();
    if (!opts || !canvasRef.current) return;
    drawCard(canvasRef.current, opts).catch(() => {});
  }, [getCardOpts]);

  const handleDownload = async () => {
    const opts = getCardOpts();
    if (!opts) return;
    setDownloading(true);
    try {
      const offscreen = document.createElement('canvas');
      await drawCard(offscreen, opts);
      const link = document.createElement('a');
      link.href = offscreen.toDataURL('image/png');
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F6F3]">
        <div className="px-4 pt-5 pb-3"><div className="w-24 h-6 bg-[#E5E2DC] rounded animate-pulse" /></div>
        <div className="px-4 space-y-2">
          {[1,2].map(i => (
            <div key={i} className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-4 space-y-3">
              <div className="flex justify-between"><div className="w-28 h-4 bg-[#E5E2DC] rounded animate-pulse" /><div className="w-12 h-4 bg-[#E5E2DC] rounded animate-pulse" /></div>
              <div className="flex items-center gap-3"><div className="w-8 h-8 bg-[#E5E2DC] rounded-full animate-pulse" /><div className="w-32 h-4 bg-[#E5E2DC] rounded animate-pulse" /></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (selectedMatch) {
    return (
      <div className="min-h-screen bg-[#F7F6F3] pb-20">
        <div className="px-4 py-3 flex items-center gap-3 border-b border-[#E5E2DC] sticky top-0 z-10 bg-white">
          <button onClick={() => setSelectedMatch(null)} className="p-1 text-[#888]"><ArrowLeft size={22} /></button>
          <h1 className="text-lg font-bold text-[#111]">매치 카드</h1>
        </div>

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

        {/* 캔버스 프리뷰 */}
        <div className="px-4 mb-4">
          <canvas ref={canvasRef} width={1080} height={1080}
            className="w-full max-w-[360px] mx-auto rounded-xl" />
        </div>

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
      <div className="px-4 pt-4 pb-28 space-y-2">
        {matches.length === 0 && (
          <p className="text-center text-[#CCC] py-12 text-sm">매치가 없습니다</p>
        )}
        {matches.map(match => {
          const isHome = match.home_team_id === team?.id;
          const opponent = isHome ? match.away_team : match.home_team;
          const isPast = new Date(match.date + 'T00:00:00') < new Date();
          return (
            <div key={match.id} onClick={() => setSelectedMatch(match)}
              className="bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-4 active:scale-[0.98] transition-transform cursor-pointer">
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
