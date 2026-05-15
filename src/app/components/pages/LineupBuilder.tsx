import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { MapPin, ChevronRight, Plus, UserPlus, ArrowLeftRight, X, Copy, Save, Camera, Zap } from 'lucide-react';
import { toPng } from 'html-to-image';
import { toast } from 'sonner';
import JerseyIcon from '../JerseyIcon';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import type { Match, TeamMember } from '../../../lib/types';

interface PlayerInfo {
  id: string;
  name: string;
  number: number;
  position: string;
  type?: 'regular' | 'mercenary' | 'rookie';
}

type Quarter = '1Q' | '2Q' | '3Q' | '4Q';
const quartersArr: Quarter[] = ['1Q', '2Q', '3Q', '4Q'];

const formations: Record<string, { x: number; y: number }[]> = {
  '4-3-3': [
    { x: 50, y: 90 }, { x: 20, y: 70 }, { x: 40, y: 70 }, { x: 60, y: 70 }, { x: 80, y: 70 },
    { x: 30, y: 45 }, { x: 50, y: 45 }, { x: 70, y: 45 }, { x: 30, y: 20 }, { x: 50, y: 20 }, { x: 70, y: 20 },
  ],
  '4-4-2': [
    { x: 50, y: 90 }, { x: 20, y: 70 }, { x: 40, y: 70 }, { x: 60, y: 70 }, { x: 80, y: 70 },
    { x: 20, y: 45 }, { x: 40, y: 45 }, { x: 60, y: 45 }, { x: 80, y: 45 }, { x: 40, y: 20 }, { x: 60, y: 20 },
  ],
  '3-4-3': [
    { x: 50, y: 90 }, { x: 30, y: 70 }, { x: 50, y: 70 }, { x: 70, y: 70 },
    { x: 20, y: 45 }, { x: 40, y: 45 }, { x: 60, y: 45 }, { x: 80, y: 45 }, { x: 30, y: 20 }, { x: 50, y: 20 }, { x: 70, y: 20 },
  ],
  '4-2-3-1': [
    { x: 50, y: 90 }, { x: 20, y: 72 }, { x: 40, y: 72 }, { x: 60, y: 72 }, { x: 80, y: 72 },
    { x: 35, y: 55 }, { x: 65, y: 55 }, { x: 20, y: 35 }, { x: 50, y: 35 }, { x: 80, y: 35 }, { x: 50, y: 15 },
  ],
  '3-5-2': [
    { x: 50, y: 90 }, { x: 30, y: 72 }, { x: 50, y: 72 }, { x: 70, y: 72 },
    { x: 15, y: 45 }, { x: 35, y: 45 }, { x: 50, y: 45 }, { x: 65, y: 45 }, { x: 85, y: 45 }, { x: 40, y: 20 }, { x: 60, y: 20 },
  ],
  '5-3-2': [
    { x: 50, y: 90 }, { x: 15, y: 70 }, { x: 30, y: 72 }, { x: 50, y: 72 }, { x: 70, y: 72 }, { x: 85, y: 70 },
    { x: 30, y: 45 }, { x: 50, y: 45 }, { x: 70, y: 45 }, { x: 40, y: 20 }, { x: 60, y: 20 },
  ],
};

const posColors: Record<string, string> = { GK: 'text-yellow-500', DF: 'text-blue-400', MF: 'text-emerald-400', FW: 'text-red-400' };

export default function LineupBuilder() {
  const navigate = useNavigate();
  const { team, user, isTeamCreator } = useAuth();
  const [mainTab, setMainTab] = useState<'mymatches' | 'scrimmage'>('mymatches');
  const [myMatches, setMyMatches] = useState<Match[]>([]);
  const [teamMembers, setTeamMembers] = useState<PlayerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [attendanceCounts, setAttendanceCounts] = useState<Record<string, { attending: number; total: number }>>({});

  // Scrimmage state
  const [jerseyPrimary, setJerseyPrimary] = useState('#DC143C');
  const [jerseySecondary, setJerseySecondary] = useState('#000000');
  const [formation, setFormation] = useState('4-3-3');
  const [activeQuarter, setActiveQuarter] = useState<Quarter>('1Q');
  const [allPlayers, setAllPlayers] = useState<PlayerInfo[]>([]);
  const [quarterLineups, setQuarterLineups] = useState<Record<Quarter, (string | null)[]>>({
    '1Q': [], '2Q': [], '3Q': [], '4Q': [],
  });
  const [selectedSlot, setSelectedSlot] = useState<{ type: 'field' | 'bench'; index: number } | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const fieldRef = useRef<HTMLDivElement>(null);
  const [newName, setNewName] = useState('');
  const [newNumber, setNewNumber] = useState('');
  const [newPos, setNewPos] = useState('MF');
  const [newType, setNewType] = useState<'mercenary' | 'rookie'>('mercenary');
  const storageKey = user ? `scrimmage_data_${user.id}` : 'scrimmage_data';

  const handleAutoLineup = () => {
    if (allPlayers.length === 0) { toast.error('선수가 없습니다.'); return; }
    const posArr = formations[formation] || formations['4-3-3'];
    const pool = [...allPlayers];
    const getSlotPos = (idx: number): string => {
      if (idx === 0) return 'GK';
      const parts = formation.split('-').map(Number);
      let count = 1;
      if (idx < count + parts[0]) return 'DF';
      count += parts[0];
      const mfParts = parts.length <= 3 ? parts[1] : parts.slice(1, -1).reduce((a: number, b: number) => a + b, 0);
      if (idx < count + mfParts) return 'MF';
      return 'FW';
    };
    const newLineup: (string | null)[] = posArr.map(() => null);
    const used = new Set<string>();
    // 1차: 포지션 매칭
    for (const p of pool) {
      if (used.has(p.id)) continue;
      for (let i = 0; i < posArr.length; i++) {
        if (newLineup[i] === null && getSlotPos(i) === p.position) {
          newLineup[i] = p.id; used.add(p.id); break;
        }
      }
    }
    // 2차: 남은 선수 빈 슬롯
    for (const p of pool) {
      if (used.has(p.id)) continue;
      const emptyIdx = newLineup.findIndex(s => s === null);
      if (emptyIdx !== -1) { newLineup[emptyIdx] = p.id; used.add(p.id); }
    }
    setQuarterLineups(prev => ({ ...prev, [activeQuarter]: newLineup }));
    toast.success('자동 배치 완료!');
  };

  const handleSave = () => {
    localStorage.setItem(storageKey, JSON.stringify({
      formation, quarterLineups, allPlayers, jerseyPrimary,
    }));
    toast.success('저장 완료!');
  };

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    // 팀 없으면 자체전만 사용 가능
    if (!team) {
      setMainTab('scrimmage');
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const data = JSON.parse(saved);
          if (data.formation) setFormation(data.formation);
          if (data.quarterLineups) setQuarterLineups(data.quarterLineups);
          if (data.allPlayers) setAllPlayers(data.allPlayers);
          if (data.jerseyPrimary) setJerseyPrimary(data.jerseyPrimary);
        } catch { /* ignore */ }
      } else {
        const pos = formations['4-3-3'];
        const emptyLineup = pos.map(() => null);
        setQuarterLineups({ '1Q': [...emptyLineup], '2Q': [...emptyLineup], '3Q': [...emptyLineup], '4Q': [...emptyLineup] });
      }
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      // Fetch my team's matches
      const { data: matchesData } = await supabase
        .from('matches')
        .select('*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)')
        .or(`home_team_id.eq.${team.id},away_team_id.eq.${team.id}`)
        .in('status', ['confirmed', 'open'])
        .order('date', { ascending: true });

      if (matchesData) {
        setMyMatches(matchesData);

        // Fetch attendance counts
        const counts: Record<string, { attending: number; total: number }> = {};
        for (const m of matchesData) {
          const { data: att } = await supabase
            .from('match_attendance')
            .select('status')
            .eq('match_id', m.id);
          counts[m.id] = {
            attending: att?.filter(a => a.status === 'attending').length || 0,
            total: parseInt(m.format?.split('v')[0]) || 11,
          };
        }
        setAttendanceCounts(counts);
      }

      // Fetch team members
      const { data: membersData } = await supabase
        .from('team_members')
        .select('*, profile:profiles(*)')
        .eq('team_id', team.id);

      if (membersData) {
        const players: PlayerInfo[] = membersData.map(m => ({
          id: m.user_id,
          name: m.profile?.name || '이름 없음',
          number: m.profile?.back_number || 0,
          position: m.profile?.position || 'MF',
          type: 'regular' as const,
        }));
        setTeamMembers(players);

        // localStorage에서 저장된 데이터 불러오기
        const savedData = localStorage.getItem(storageKey);
        if (savedData) {
          try {
            const data = JSON.parse(savedData);
            const savedPlayers: PlayerInfo[] = data.allPlayers || [];
            // DB 선수 + 저장된 임시선수(용병/신입) 합치기
            const merged = [...players];
            savedPlayers.filter(sp => sp.type !== 'regular').forEach(sp => {
              if (!merged.find(p => p.id === sp.id)) merged.push(sp);
            });
            setAllPlayers(merged);
            if (data.quarterLineups) setQuarterLineups(data.quarterLineups);
            if (data.formation) setFormation(data.formation);
            if (data.jerseyPrimary) setJerseyPrimary(data.jerseyPrimary);
          } catch {
            setAllPlayers(players);
            const pos = formations['4-3-3'];
            const init = pos.map((_, i) => players[i]?.id ?? null);
            setQuarterLineups({ '1Q': [...init], '2Q': [...init], '3Q': [...init], '4Q': [...init] });
          }
        } else {
          setAllPlayers(players);
          const pos = formations['4-3-3'];
          const init = pos.map((_, i) => players[i]?.id ?? null);
          setQuarterLineups({ '1Q': [...init], '2Q': [...init], '3Q': [...init], '4Q': [...init] });
        }
      }

      setLoading(false);
    };

    fetchData();
  }, [team, user]);

  const positions = formations[formation] || formations['4-3-3'];
  const currentLineup = quarterLineups[activeQuarter];
  const fieldIds = new Set(currentLineup.filter((pid): pid is string => pid !== null));
  const benchPlayers = allPlayers.filter(p => !fieldIds.has(p.id));
  const getPlayer = (pid: string) => allPlayers.find(p => p.id === pid);
  // 모든 플레이어 타입(팀원, 용병, 신입)에 관계없이 동일한 색상을 반환합니다.
  const jerseyColor = (p: PlayerInfo) => jerseyPrimary;
  const canEdit = mainTab === 'scrimmage' || isTeamCreator;
  const getSlotPos = (idx: number): string => {
    if (idx === 0) return 'GK';
    const parts = formation.split('-').map(Number);
    let count = 1;
    if (idx < count + parts[0]) return 'DF';
    count += parts[0];
    const mfParts = parts.length <= 3 ? parts[1] : parts.slice(1, -1).reduce((a: number, b: number) => a + b, 0);
    if (idx < count + mfParts) return 'MF';
    return 'FW';
  };

  const handleFieldTap = (i: number) => {
    if (!canEdit) return;
    if (!selectedSlot) { setSelectedSlot({ type: 'field', index: i }); return; }
    if (selectedSlot.type === 'field' && selectedSlot.index === i) { setSelectedSlot(null); return; }
    const nl = [...currentLineup];
    if (selectedSlot.type === 'field') { [nl[selectedSlot.index], nl[i]] = [nl[i], nl[selectedSlot.index]]; }
    else { const bp = benchPlayers[selectedSlot.index]; if (bp) nl[i] = bp.id; }
    setQuarterLineups(prev => ({ ...prev, [activeQuarter]: nl }));
    setSelectedSlot(null);
  };

  const handleBenchTap = (i: number) => {
    if (!canEdit) return;
    if (!selectedSlot) { setSelectedSlot({ type: 'bench', index: i }); return; }
    if (selectedSlot.type === 'bench' && selectedSlot.index === i) { setSelectedSlot(null); return; }
    if (selectedSlot.type === 'field') {
      const nl = [...currentLineup]; const bp = benchPlayers[i]; if (bp) nl[selectedSlot.index] = bp.id;
      setQuarterLineups(prev => ({ ...prev, [activeQuarter]: nl }));
    }
    setSelectedSlot(null);
  };

  const handleFormationChange = (f: string) => {
    setFormation(f);
    const np = formations[f] || formations['4-3-3'];
    setQuarterLineups(prev => {
      const u = { ...prev };
      for (const q of quartersArr) {
        const o = prev[q];
        u[q] = np.length > o.length ? [...o, ...Array(np.length - o.length).fill(null)] : o.slice(0, np.length);
      }
      return u;
    });
    setSelectedSlot(null);
  };

  const handleAddPlayer = () => {
    if (!newName.trim() || !newNumber.trim()) return;
    const newPlayer: PlayerInfo = { id: `temp-${Date.now()}`, name: newName.trim(), number: parseInt(newNumber), position: newPos, type: newType };
    setAllPlayers(prev => [...prev, newPlayer]);
    setNewName(''); setNewNumber(''); setNewPos('MF'); setNewType('mercenary'); setShowAddModal(false);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F6F3]">
        <div className="px-4 pt-5 pb-3"><div className="w-20 h-7 bg-[#E5E2DC] rounded animate-pulse mb-3" /><div className="h-10 bg-[#E5E2DC] rounded-xl animate-pulse" /></div>
        <div className="px-4 pt-3 space-y-2">
          {[1,2,3].map(i => (
            <div key={i} className="bg-white rounded-xl border border-[#E5E2DC] p-4 space-y-2">
              <div className="flex justify-between"><div className="w-28 h-4 bg-[#E5E2DC] rounded animate-pulse" /><div className="w-12 h-4 bg-[#E5E2DC] rounded animate-pulse" /></div>
              <div className="flex items-center gap-3"><div className="w-8 h-8 bg-[#E5E2DC] rounded-full animate-pulse" /><div className="w-32 h-4 bg-[#E5E2DC] rounded animate-pulse" /></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F6F3]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#E5E2DC] px-4 pt-5 pb-3">
        <h1 className="font-title text-[30px] text-[#111] leading-none">LINEUP</h1>
      </div>
      <div className="px-4 pt-3">
        <div className="flex gap-1 bg-[#F0EEE9] p-1 rounded-xl">
          <button onClick={() => setMainTab('mymatches')}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold ${mainTab === 'mymatches' ? 'bg-[#111] text-white' : 'bg-[#F0EEE9] text-[#555]'}`}>
            내 경기
          </button>
          <button onClick={() => setMainTab('scrimmage')}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold ${mainTab === 'scrimmage' ? 'bg-[#111] text-white' : 'bg-[#F0EEE9] text-[#555]'}`}>
            자체전
          </button>
        </div>
      </div>

      {/* 내 경기 */}
      {mainTab === 'mymatches' && (
        <div className="px-4 pb-28 space-y-2">
          {myMatches.length === 0 && (
            <p className="text-center text-[#CCC] py-12 text-sm">예정된 경기가 없습니다</p>
          )}
          {myMatches.map(match => {
            const opponent = match.home_team_id === team?.id ? match.away_team : match.home_team;
            const counts = attendanceCounts[match.id] || { attending: 0, total: 11 };
            const full = counts.attending >= counts.total;
            return (
              <div key={match.id} onClick={() => navigate(`/lineup/${match.id}`)}
                className="bg-white rounded-xl border border-[#E5E2DC] p-4 active:scale-[0.98] transition-transform cursor-pointer">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#111]">{formatDate(match.date)}</span>
                    <span className="text-sm text-[#888]">{match.time?.slice(0, 5)}</span>
                  </div>
                  <span className="text-[10px] font-bold text-[#888]">{match.format}</span>
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="text-2xl">{opponent?.logo || '⚽'}</div>
                  <div className="flex-1">
                    <p className="font-bold text-[#111] text-sm">vs {opponent?.name || '상대 미정'}</p>
                    <p className="text-[11px] text-[#888] flex items-center gap-1"><MapPin size={11} />{match.stadium}</p>
                  </div>
                  <ChevronRight size={16} className="text-[#CCC]" />
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-[#E5E2DC]">
                  <span className="text-[11px] text-[#888]">참여 {counts.attending}/{counts.total}명</span>
                  {full ? <span className="text-[10px] text-[#166534] font-medium">완료</span>
                    : <span className="text-[10px] text-[#991B1B] font-medium">{counts.total - counts.attending}명 부족</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 자체전 */}
      {mainTab === 'scrimmage' && (
        <div className="px-4 pb-28">
          <div className="flex gap-2 mb-3">
            {quartersArr.map(q => (
              <button key={q} onClick={() => { setActiveQuarter(q); setSelectedSlot(null); }}
                className={`flex-1 py-2 rounded-xl text-sm font-bold ${activeQuarter === q ? 'bg-[#111] text-white' : 'bg-[#F0EEE9] text-[#555] border border-[#E5E2DC]'}`}>
                {q}
              </button>
            ))}
          </div>

          {isTeamCreator && activeQuarter !== '1Q' && (
            <div className="flex gap-2 mb-3">
              {quartersArr.filter(q => q !== activeQuarter).map(q => (
                <button key={q} onClick={() => setQuarterLineups(prev => ({ ...prev, [activeQuarter]: [...prev[q]] }))}
                  className="flex items-center gap-1 px-2.5 py-1 bg-[#F0EEE9] rounded-lg text-[11px] text-[#888]">
                  <Copy size={10} />{q} 복사
                </button>
              ))}
            </div>
          )}

          {/* 유니폼 색상 */}
          <div className="flex items-center gap-3 mb-3">
            <span className="text-[10px] text-[#888] font-bold">유니폼</span>
            <div className="flex gap-1.5">
              {['#DC143C', '#1E40AF', '#000000', '#FFFFFF', '#F59E0B', '#7B2D3B', '#059669', '#7C3AED', '#F97316'].map(c => (
                <button key={c} onClick={() => setJerseyPrimary(c)}
                  className={`w-6 h-6 rounded-full border-2 ${jerseyPrimary === c ? 'border-[#111] scale-110' : 'border-[#E5E2DC]'}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>

          {canEdit ? (
            <div className="flex gap-2 mb-3">
              {Object.keys(formations).map(f => (
                <button key={f} onClick={() => handleFormationChange(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${formation === f ? 'bg-[#111] text-white' : 'bg-[#F0EEE9] text-[#555]'}`}>
                  {f}
                </button>
              ))}
            </div>
          ) : (
            <div className="mb-3 bg-white rounded-xl border border-[#E5E2DC] px-3 py-2">
              <span className="text-xs text-[#888]">포메이션: </span>
              <span className="text-xs font-bold text-[#111]">{formation}</span>
            </div>
          )}

          {selectedSlot && (
            <div className="mb-3 bg-yellow-500/10 rounded-xl px-3 py-2 flex items-center gap-2">
              <ArrowLeftRight size={14} className="text-yellow-500" />
              <span className="text-xs text-yellow-400">교체할 선수를 선택하세요</span>
              <button onClick={() => setSelectedSlot(null)} className="ml-auto text-yellow-500"><X size={14} /></button>
            </div>
          )}

          {/* Field */}
          <div ref={fieldRef} className="relative rounded-xl overflow-hidden" style={{ aspectRatio: '3/4', background: 'linear-gradient(180deg, #1a5c2a 0%, #228b3b 20%, #26913f 40%, #228b3b 60%, #26913f 80%, #1a5c2a 100%)' }}>
            <div className="absolute inset-0" style={{ backgroundImage: 'repeating-linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.04) 8.33%, transparent 8.33%, transparent 16.66%)', backgroundSize: '100% 100%' }} />
            <div className="absolute inset-0">
              <div className="absolute inset-3 border-2 border-white/30 rounded-sm" />
              <div className="absolute top-1/2 left-3 right-3 h-0 border-t-2 border-white/30" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 border-2 border-white/30 rounded-full" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white/30 rounded-full" />
              <div className="absolute top-1 left-1/2 -translate-x-1/2 w-16 h-3 border-2 border-white/30 border-t-0 rounded-b-sm" />
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[55%] h-16 border-2 border-white/30 border-t-0" />
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[30%] h-8 border-2 border-white/30 border-t-0" />
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-[55%] h-16 border-2 border-white/30 border-b-0" />
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-[30%] h-8 border-2 border-white/30 border-b-0" />
              <div className="absolute top-1.5 left-1.5 w-4 h-4 border-r-2 border-b-2 border-white/30 rounded-br-full" />
              <div className="absolute top-1.5 right-1.5 w-4 h-4 border-l-2 border-b-2 border-white/30 rounded-bl-full" />
              <div className="absolute bottom-1.5 left-1.5 w-4 h-4 border-r-2 border-t-2 border-white/30 rounded-tr-full" />
              <div className="absolute bottom-1.5 right-1.5 w-4 h-4 border-l-2 border-t-2 border-white/30 rounded-tl-full" />
            </div>
            <div className="absolute top-3 left-3 bg-black/30 backdrop-blur-sm text-white px-2 py-0.5 rounded text-[10px] font-semibold" style={{ fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 1 }}>
              {activeQuarter} · {formation}
            </div>

            {positions.map((pos, idx) => {
              const pid = currentLineup[idx];
              const player = pid != null ? getPlayer(pid) : null;
              const isSel = selectedSlot?.type === 'field' && selectedSlot.index === idx;
              return (
                <div key={`${activeQuarter}-${idx}`} onClick={() => handleFieldTap(idx)}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform ${isSel ? 'scale-110 z-10' : ''}`}
                  style={{ left: `${pos.x}%`, top: `${pos.y}%` }}>
                  {player ? (
                    <div className="flex flex-col items-center">
                      <div className={`${isSel ? 'ring-2 ring-yellow-400 rounded-xl' : ''}`}>
                        <JerseyIcon number={player.number} primaryColor={jerseyColor(player)} secondaryColor={jerseySecondary} size="md" />
                      </div>
                      <div className={`mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 ${isSel ? 'bg-yellow-400 text-black' : 'bg-white text-[#111]'}`}>
                        <span className={`text-[9px] font-black ${
                          getSlotPos(idx) === 'GK' ? 'text-yellow-500' :
                          getSlotPos(idx) === 'DF' ? 'text-blue-500' :
                          getSlotPos(idx) === 'MF' ? 'text-emerald-500' : 'text-red-500'
                        }`}>{getSlotPos(idx)}</span>{player.name}
                      </div>
                      {isSel && (
                        <button onClick={(e) => { e.stopPropagation();
                          setQuarterLineups(prev => { const nl = [...prev[activeQuarter]]; nl[idx] = null; return { ...prev, [activeQuarter]: nl }; });
                          setSelectedSlot(null);
                        }}
                          className="mt-1 px-2 py-0.5 bg-[#111]/90 text-white rounded text-[9px] font-bold">벤치로</button>
                      )}
                      {player.type !== 'regular' && (
                        <span className={`text-[8px] px-1 rounded-full mt-0.5 font-bold ${player.type === 'mercenary' ? 'bg-amber-500 text-white' : 'bg-blue-500 text-white'}`}>
                          {player.type === 'mercenary' ? '용병' : '신입'}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-12 border-2 border-dashed rounded flex items-center justify-center ${isSel ? 'border-yellow-400 bg-yellow-400/20' : 'border-white/30 bg-white/10'}`}>
                        <Plus className="text-white/50" size={16} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bench */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-[#111]">교체 <span className="text-[#888] font-normal">{benchPlayers.length}명</span></span>
              {canEdit && (
                <button onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-1 bg-[#111] text-white px-3 py-1.5 rounded-lg text-[11px] font-bold">
                  <UserPlus size={12} /> 추가
                </button>
              )}
            </div>
            {benchPlayers.length > 0 ? (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {benchPlayers.map((p, i) => {
                  const isSel = selectedSlot?.type === 'bench' && selectedSlot.index === i;
                  return (
                    <div key={p.id} onClick={() => handleBenchTap(i)}
                      className={`flex-shrink-0 w-[68px] flex flex-col items-center p-2 rounded-xl border cursor-pointer ${isSel ? 'border-yellow-400 bg-yellow-500/10' : 'border-[#E5E2DC] bg-white'}`}>
                      <JerseyIcon number={p.number} primaryColor={jerseyColor(p)} secondaryColor={jerseySecondary} size="sm" />
                      <span className="text-[10px] font-medium mt-1 text-[#555] truncate w-full text-center">{p.name}</span>
                      <span className={`text-[9px] font-bold ${posColors[p.position]}`}>{p.position}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-[#CCC] text-center py-4">모든 선수 배치 완료</p>
            )}
          </div>

          <div className="mt-3 bg-white rounded-xl border border-[#E5E2DC] p-3 flex items-center justify-between">
            <span className="text-xs text-[#888]">{activeQuarter} 배치</span>
            <span className="text-xs font-bold text-[#111]">{currentLineup.filter(p => p !== null).length}/{positions.length}명</span>
          </div>

          <div className="mt-3 space-y-2">
            <button onClick={handleAutoLineup}
              className="w-full bg-[#111] text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform">
              <Zap size={16} /> 자동 배치
            </button>
            <div className="flex gap-2">
            <button onClick={handleSave}
              className="flex-1 bg-[#111] text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform">
              <Save size={16} /> 라인업 저장
            </button>
            <button onClick={async () => {
              if (!fieldRef.current) return;
              setSelectedSlot(null);
              try {
                const dataUrl = await toPng(fieldRef.current, { pixelRatio: 2 });
                const link = document.createElement('a');
                link.download = `lineup_${activeQuarter}_${formation}.png`;
                link.href = dataUrl;
                link.click();
                toast.success('이미지 저장 완료!');
              } catch {
                toast.error('이미지 저장에 실패했습니다.');
              }
            }}
              className="bg-white text-[#111] py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform border border-[#E5E2DC]">
              <Camera size={16} />
            </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-t-2xl p-5 w-full max-w-[430px] border-t border-[#E5E2DC]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[#111]">선수 추가</h3>
              <button onClick={() => setShowAddModal(false)} className="text-[#888]"><X size={18} /></button>
            </div>
            <div className="flex gap-2 mb-3">
              <button onClick={() => setNewType('mercenary')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold ${newType === 'mercenary' ? 'bg-amber-500 text-white' : 'bg-[#F0EEE9] text-[#555]'}`}>용병</button>
              <button onClick={() => setNewType('rookie')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold ${newType === 'rookie' ? 'bg-blue-500 text-white' : 'bg-[#F0EEE9] text-[#555]'}`}>신입</button>
            </div>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="이름"
              className="w-full bg-[#F0EEE9] border-none rounded-lg px-4 py-2.5 text-sm text-[#111] placeholder:text-[#CCC] mb-3 focus:outline-none" />
            <input value={newNumber} onChange={e => setNewNumber(e.target.value)} placeholder="등번호" type="number"
              className="w-full bg-[#F0EEE9] border-none rounded-lg px-4 py-2.5 text-sm text-[#111] placeholder:text-[#CCC] mb-3 focus:outline-none" />
            <div className="flex gap-2 mb-4">
              {['GK', 'DF', 'MF', 'FW'].map(p => (
                <button key={p} onClick={() => setNewPos(p)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold ${newPos === p ? 'bg-[#111] text-white' : 'bg-[#F0EEE9] text-[#555]'}`}>{p}</button>
              ))}
            </div>
            <button onClick={handleAddPlayer} disabled={!newName.trim() || !newNumber.trim()}
              className="w-full bg-[#111] text-white py-3 rounded-xl font-bold text-sm disabled:opacity-30">추가하기</button>
          </div>
        </div>
      )}
    </div>
  );
}
