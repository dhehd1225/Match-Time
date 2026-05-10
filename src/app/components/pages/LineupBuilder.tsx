import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { MapPin, ChevronRight, Plus, UserPlus, ArrowLeftRight, X, Copy } from 'lucide-react';
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
  '3-3-1': [
    { x: 50, y: 90 }, { x: 25, y: 70 }, { x: 50, y: 70 }, { x: 75, y: 70 },
    { x: 30, y: 45 }, { x: 50, y: 45 }, { x: 70, y: 45 }, { x: 50, y: 20 },
  ],
};

const posColors: Record<string, string> = { GK: 'text-yellow-500', DF: 'text-blue-400', MF: 'text-emerald-400', FW: 'text-red-400' };

export default function LineupBuilder() {
  const navigate = useNavigate();
  const { team, user } = useAuth();
  const [mainTab, setMainTab] = useState<'mymatches' | 'scrimmage'>('mymatches');
  const [myMatches, setMyMatches] = useState<Match[]>([]);
  const [teamMembers, setTeamMembers] = useState<PlayerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [attendanceCounts, setAttendanceCounts] = useState<Record<string, { attending: number; total: number }>>({});

  // Scrimmage state
  const [formation, setFormation] = useState('4-3-3');
  const [activeQuarter, setActiveQuarter] = useState<Quarter>('1Q');
  const [allPlayers, setAllPlayers] = useState<PlayerInfo[]>([]);
  const [quarterLineups, setQuarterLineups] = useState<Record<Quarter, (string | null)[]>>({
    '1Q': [], '2Q': [], '3Q': [], '4Q': [],
  });
  const [selectedSlot, setSelectedSlot] = useState<{ type: 'field' | 'bench'; index: number } | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newNumber, setNewNumber] = useState('');
  const [newPos, setNewPos] = useState('MF');
  const [newType, setNewType] = useState<'mercenary' | 'rookie'>('mercenary');

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    // 팀 없으면 자체전만 사용 가능
    if (!team) {
      setMainTab('scrimmage');
      const pos = formations['4-3-3'];
      const emptyLineup = pos.map(() => null);
      setQuarterLineups({ '1Q': [...emptyLineup], '2Q': [...emptyLineup], '3Q': [...emptyLineup], '4Q': [...emptyLineup] });
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      // Fetch my team's matches
      const { data: matchesData } = await supabase
        .from('matches')
        .select('*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)')
        .or(`home_team_id.eq.${team.id},away_team_id.eq.${team.id}`)
        .in('status', ['confirmed', 'pending', 'open'])
        .order('date', { ascending: true });

      if (matchesData) {
        // 내가 참여(attending)한 경기만 필터링
        const { data: userAttendance } = await supabase
          .from('match_attendance')
          .select('match_id')
          .eq('user_id', user.id)
          .eq('status', 'attending');

        const attendingMatchIds = new Set(userAttendance?.map(a => a.match_id) || []);
        const myFilteredMatches = matchesData.filter(m => attendingMatchIds.has(m.id));
        setMyMatches(myFilteredMatches);

        // Fetch attendance counts
        const counts: Record<string, { attending: number; total: number }> = {};
        for (const m of myFilteredMatches) {
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
        setAllPlayers(players);

        // Initialize scrimmage lineup
        const pos = formations['4-3-3'];
        const init = pos.map((_, i) => players[i]?.id ?? null);
        setQuarterLineups({ '1Q': [...init], '2Q': [...init], '3Q': [...init], '4Q': [...init] });
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
  const jerseyColor = (p: PlayerInfo) => p.type === 'mercenary' ? '#F59E0B' : p.type === 'rookie' ? '#3B82F6' : '#DC143C';
  const isTeamCreator = team?.created_by === user?.id;
  const canEdit = mainTab === 'scrimmage' || isTeamCreator;

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
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-gray-500 text-sm">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <div className="px-4 pt-5 pb-0 sticky top-0 z-10 bg-[#0a0a0a]">
        <h1 className="text-2xl font-black text-white mb-3">라인업</h1>
        <div className="flex gap-1 bg-[#111] p-1 rounded-xl mb-3">
          <button onClick={() => setMainTab('mymatches')}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold ${mainTab === 'mymatches' ? 'bg-[#7B2D3B] text-white' : 'text-gray-500'}`}>
            내 경기
          </button>
          <button onClick={() => setMainTab('scrimmage')}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold ${mainTab === 'scrimmage' ? 'bg-[#7B2D3B] text-white' : 'text-gray-500'}`}>
            자체전
          </button>
        </div>
      </div>

      {/* 내 경기 */}
      {mainTab === 'mymatches' && (
        <div className="px-4 pb-28 space-y-2">
          {myMatches.length === 0 && (
            <p className="text-center text-gray-600 py-12 text-sm">예정된 경기가 없습니다</p>
          )}
          {myMatches.map(match => {
            const opponent = match.home_team_id === team?.id ? match.away_team : match.home_team;
            const counts = attendanceCounts[match.id] || { attending: 0, total: 11 };
            const full = counts.attending >= counts.total;
            return (
              <div key={match.id} onClick={() => navigate(`/lineup/${match.id}`)}
                className="bg-[#111] rounded-2xl border border-white/5 p-4 active:scale-[0.98] transition-transform cursor-pointer">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{formatDate(match.date)}</span>
                    <span className="text-sm text-gray-500">{match.time?.slice(0, 5)}</span>
                  </div>
                  <span className="text-[10px] font-bold text-gray-500">{match.format}</span>
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="text-2xl">{opponent?.logo || '⚽'}</div>
                  <div className="flex-1">
                    <p className="font-bold text-white text-sm">vs {opponent?.name || '상대 미정'}</p>
                    <p className="text-[11px] text-gray-500 flex items-center gap-1"><MapPin size={11} />{match.stadium}</p>
                  </div>
                  <ChevronRight size={16} className="text-gray-600" />
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <span className="text-[11px] text-gray-500">참여 {counts.attending}/{counts.total}명</span>
                  {full ? <span className="text-[10px] text-emerald-400 font-medium">완료</span>
                    : <span className="text-[10px] text-red-400 font-medium">{counts.total - counts.attending}명 부족</span>}
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
                className={`flex-1 py-2 rounded-xl text-sm font-bold ${activeQuarter === q ? 'bg-[#7B2D3B] text-white' : 'bg-[#111] text-gray-500 border border-white/5'}`}>
                {q}
              </button>
            ))}
          </div>

          {isTeamCreator && activeQuarter !== '1Q' && (
            <div className="flex gap-2 mb-3">
              {quartersArr.filter(q => q !== activeQuarter).map(q => (
                <button key={q} onClick={() => setQuarterLineups(prev => ({ ...prev, [activeQuarter]: [...prev[q]] }))}
                  className="flex items-center gap-1 px-2.5 py-1 bg-white/5 rounded-lg text-[11px] text-gray-500">
                  <Copy size={10} />{q} 복사
                </button>
              ))}
            </div>
          )}

          {isTeamCreator ? (
            <div className="flex gap-2 mb-3">
              {Object.keys(formations).map(f => (
                <button key={f} onClick={() => handleFormationChange(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${formation === f ? 'bg-[#7B2D3B] text-white' : 'bg-white/5 text-gray-500'}`}>
                  {f}
                </button>
              ))}
            </div>
          ) : (
            <div className="mb-3 bg-[#111] rounded-xl border border-white/5 px-3 py-2">
              <span className="text-xs text-gray-500">포메이션: </span>
              <span className="text-xs font-bold text-white">{formation}</span>
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
          <div className="relative bg-gradient-to-b from-green-700 to-green-600 rounded-2xl overflow-hidden" style={{ aspectRatio: '3/4' }}>
            <div className="absolute inset-0">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 border-2 border-white/20 rounded-full" />
              <div className="absolute top-1/2 left-0 right-0 h-px bg-white/20" />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2/3 h-20 border-2 border-white/20 border-b-0" />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-20 border-2 border-white/20 border-t-0" />
            </div>
            <div className="absolute top-2 left-2 bg-black/30 text-white/70 px-2 py-0.5 rounded text-[10px] font-medium">
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
                        <JerseyIcon number={player.number} primaryColor={jerseyColor(player)} secondaryColor="#000" size="md" />
                      </div>
                      <div className={`mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold ${isSel ? 'bg-yellow-400 text-black' : 'bg-white text-gray-900'}`}>
                        {player.name}
                      </div>
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
              <span className="text-sm font-bold text-white">교체 <span className="text-gray-500 font-normal">{benchPlayers.length}명</span></span>
              {isTeamCreator && (
                <button onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-1 bg-[#7B2D3B] text-white px-3 py-1.5 rounded-lg text-[11px] font-bold">
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
                      className={`flex-shrink-0 w-[68px] flex flex-col items-center p-2 rounded-xl border cursor-pointer ${isSel ? 'border-yellow-400 bg-yellow-500/10' : 'border-white/5 bg-[#111]'}`}>
                      <JerseyIcon number={p.number} primaryColor={jerseyColor(p)} secondaryColor="#000" size="sm" />
                      <span className="text-[10px] font-medium mt-1 text-gray-300 truncate w-full text-center">{p.name}</span>
                      <span className={`text-[9px] font-bold ${posColors[p.position]}`}>{p.position}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-gray-600 text-center py-4">모든 선수 배치 완료</p>
            )}
          </div>

          <div className="mt-3 bg-[#111] rounded-xl border border-white/5 p-3 flex items-center justify-between">
            <span className="text-xs text-gray-500">{activeQuarter} 배치</span>
            <span className="text-xs font-bold text-white">{currentLineup.filter(p => p !== null).length}/{positions.length}명</span>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center" onClick={() => setShowAddModal(false)}>
          <div className="bg-[#111] rounded-t-2xl p-5 w-full max-w-[430px] border-t border-white/10" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white">선수 추가</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-500"><X size={18} /></button>
            </div>
            <div className="flex gap-2 mb-3">
              <button onClick={() => setNewType('mercenary')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold ${newType === 'mercenary' ? 'bg-amber-500 text-white' : 'bg-white/5 text-gray-500'}`}>용병</button>
              <button onClick={() => setNewType('rookie')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold ${newType === 'rookie' ? 'bg-blue-500 text-white' : 'bg-white/5 text-gray-500'}`}>신입</button>
            </div>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="이름"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-gray-600 mb-3 focus:outline-none" />
            <input value={newNumber} onChange={e => setNewNumber(e.target.value)} placeholder="등번호" type="number"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-gray-600 mb-3 focus:outline-none" />
            <div className="flex gap-2 mb-4">
              {['GK', 'DF', 'MF', 'FW'].map(p => (
                <button key={p} onClick={() => setNewPos(p)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold ${newPos === p ? 'bg-[#7B2D3B] text-white' : 'bg-white/5 text-gray-500'}`}>{p}</button>
              ))}
            </div>
            <button onClick={handleAddPlayer} disabled={!newName.trim() || !newNumber.trim()}
              className="w-full bg-[#7B2D3B] text-white py-3 rounded-xl font-bold text-sm disabled:opacity-30">추가하기</button>
          </div>
        </div>
      )}
    </div>
  );
}
