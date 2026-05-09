import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Search, MapPin, Plus, X, SlidersHorizontal } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import type { Match } from '../../../lib/types';

const LEVELS = ['초급', '중급', '고급'];
const REGIONS = ['서울', '경기', '인천', '부산', '대구', '대전', '광주', '기타'];

const emptyForm = { date: '', time: '', region: '', stadium: '', level: '', format: '11v11' };

const levelStyle: Record<string, string> = {
  초급: 'text-emerald-400',
  중급: 'text-blue-400',
  고급: 'text-purple-400',
};

function getTimeCategory(time: string): 'morning' | 'afternoon' | 'evening' {
  const hour = parseInt(time.split(':')[0]);
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
}

function formatTime(timeStr: string): string {
  return timeStr.slice(0, 5);
}

export default function MatchList() {
  const navigate = useNavigate();
  const { user, team } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [timeFilter, setTimeFilter] = useState('전체');
  const [regionFilter, setRegionFilter] = useState('전체');
  const [levelFilter, setLevelFilter] = useState('전체');
  const [submitting, setSubmitting] = useState(false);

  const fetchMatches = async () => {
    const { data, error } = await supabase
      .from('matches')
      .select('*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)')
      .order('date', { ascending: true })
      .order('time', { ascending: true });

    if (!error && data) {
      setMatches(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMatches();

    const channel = supabase
      .channel('matches-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => {
        fetchMatches();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const filteredMatches = matches.filter(match => {
    const q = searchQuery.toLowerCase();
    const homeName = match.home_team?.name || '';
    const awayName = match.away_team?.name || '';
    const matchesSearch = !q || match.stadium.toLowerCase().includes(q) || homeName.toLowerCase().includes(q) || awayName.toLowerCase().includes(q);
    const tc = getTimeCategory(match.time);
    const matchesTime = timeFilter === '전체' ||
      (timeFilter === '오전' && tc === 'morning') ||
      (timeFilter === '오후' && tc === 'afternoon') ||
      (timeFilter === '저녁' && tc === 'evening');
    const matchesRegion = regionFilter === '전체' || match.region === regionFilter;
    const matchesLevel = levelFilter === '전체' || match.level === levelFilter;
    return matchesSearch && matchesTime && matchesRegion && matchesLevel;
  });

  const activeFilterCount = [timeFilter, regionFilter, levelFilter].filter(f => f !== '전체').length;

  const handleSubmit = async () => {
    if (!form.date || !form.time || !form.region || !form.stadium || !form.level || !user) return;
    if (!team) {
      alert('팀에 먼저 가입해주세요.');
      return;
    }
    setSubmitting(true);

    const { data: matchData, error } = await supabase.from('matches').insert({
      date: form.date,
      time: form.time,
      region: form.region,
      stadium: form.stadium,
      level: form.level,
      format: form.format,
      home_team_id: team.id,
      created_by: user.id,
      status: 'open',
    }).select('id').single();

    if (error || !matchData) {
      console.error('매치 생성 실패:', error);
      alert('매치 생성에 실패했습니다. 다시 시도해주세요.');
    } else {
      // 생성자 자동 참여 등록
      await supabase.from('match_attendance').insert({
        match_id: matchData.id,
        user_id: user.id,
        status: 'attending',
      });

      // 팀원들에게 참여 투표 알림 발송
      const { data: members } = await supabase
        .from('team_members')
        .select('user_id')
        .eq('team_id', team.id);

      if (members) {
        const notifs = members
          .filter(m => m.user_id !== user.id)
          .map(m => ({
            user_id: m.user_id,
            type: 'match_vote' as const,
            title: '시합 참여 투표',
            description: `${formatDate(form.date)} ${form.time.slice(0, 5)} ${form.stadium}에서 시합이 잡혔습니다.`,
            related_id: matchData.id,
          }));

        if (notifs.length > 0) {
          await supabase.from('notifications').insert(notifs);
        }
      }

      setForm(emptyForm);
      setShowForm(false);
    }
    setSubmitting(false);
  };

  const isFormValid = form.date && form.time && form.region && form.stadium && form.level;

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
      <div className="px-4 pt-5 pb-3 sticky top-0 z-10 bg-[#0a0a0a]">
        <h1 className="text-2xl font-black text-white mb-3">매치</h1>

        {/* Search + Filter */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
            <input
              type="text"
              placeholder="경기장, 팀 검색..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-[#111] border border-white/10 rounded-xl text-white text-sm placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-[#7B2D3B]/50"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`relative px-3 rounded-xl border transition-colors ${
              activeFilterCount > 0 ? 'bg-[#7B2D3B] border-[#7B2D3B] text-white' : 'bg-[#111] border-white/10 text-gray-500'
            }`}
          >
            <SlidersHorizontal size={16} />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-white text-black rounded-full text-[9px] font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-3 space-y-3 bg-[#111] rounded-xl p-3 border border-white/5">
            <div>
              <p className="text-[10px] text-gray-600 mb-1.5 font-semibold">시간대</p>
              <div className="flex gap-1.5">
                {['전체', '오전', '오후', '저녁'].map(f => (
                  <button key={f} onClick={() => setTimeFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium ${timeFilter === f ? 'bg-[#7B2D3B] text-white' : 'bg-white/5 text-gray-500'}`}
                  >{f}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] text-gray-600 mb-1.5 font-semibold">지역</p>
              <div className="flex gap-1.5 flex-wrap">
                {['전체', ...REGIONS].map(r => (
                  <button key={r} onClick={() => setRegionFilter(r)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium ${regionFilter === r ? 'bg-[#7B2D3B] text-white' : 'bg-white/5 text-gray-500'}`}
                  >{r}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] text-gray-600 mb-1.5 font-semibold">실력</p>
              <div className="flex gap-1.5">
                {['전체', ...LEVELS].map(l => (
                  <button key={l} onClick={() => setLevelFilter(l)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium ${levelFilter === l ? 'bg-[#7B2D3B] text-white' : 'bg-white/5 text-gray-500'}`}
                  >{l}</button>
                ))}
              </div>
            </div>
            {activeFilterCount > 0 && (
              <button onClick={() => { setTimeFilter('전체'); setRegionFilter('전체'); setLevelFilter('전체'); }}
                className="text-xs text-[#C4697A]">초기화</button>
            )}
          </div>
        )}
      </div>

      {/* Match List */}
      <div className="px-4 pt-2 pb-28 space-y-2">
        {filteredMatches.map((match) => (
          <div
            key={match.id}
            onClick={() => navigate(`/matches/${match.id}`)}
            className="bg-[#111] rounded-2xl border border-white/5 p-4 active:scale-[0.98] transition-transform cursor-pointer"
          >
            {/* Date + badges */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">{formatDate(match.date)}</span>
                <span className="text-sm text-gray-500">{formatTime(match.time)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {match.status === 'open' && !match.away_team_id && (
                  <span className="text-[10px] font-bold text-red-400 bg-[#7B2D3B]/10 px-2 py-0.5 rounded-full">모집중</span>
                )}
                <span className={`text-[10px] font-bold ${levelStyle[match.level] || 'text-gray-400'}`}>{match.level}</span>
              </div>
            </div>

            {/* VS matchup */}
            <div className="flex items-center py-2 mb-3">
              {/* Home team */}
              <div className="flex-1 flex items-center gap-2">
                <div className="text-2xl">{match.home_team?.logo || '⚽'}</div>
                <p className="font-bold text-white text-sm truncate">{match.home_team?.name || '팀'}</p>
              </div>

              <div className="px-3">
                <span className="text-xs font-black text-gray-600">VS</span>
              </div>

              {/* Away team */}
              <div className="flex-1 flex items-center gap-2 justify-end">
                {match.away_team ? (
                  <>
                    <p className="font-bold text-white text-sm truncate">{match.away_team.name}</p>
                    <div className="text-2xl">{match.away_team.logo || '⚽'}</div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-gray-500">상대 찾는 중</p>
                    <div className="w-8 h-8 rounded-full border border-dashed border-gray-600 flex items-center justify-center">
                      <span className="text-gray-600 text-xs">?</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Bottom */}
            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              <div className="flex items-center gap-1 text-gray-500">
                <MapPin size={12} />
                <span className="text-[11px]">{match.stadium}</span>
              </div>
              <span className="text-[10px] text-gray-600">{match.format}</span>
            </div>
          </div>
        ))}

        {filteredMatches.length === 0 && (
          <p className="text-center text-gray-600 py-12 text-sm">매치가 없습니다</p>
        )}
      </div>

      {/* FAB - 팀 생성자만 시합 생성 가능 */}
      {team?.created_by === user?.id && (
        <div className="fixed bottom-20 left-0 right-0 max-w-[430px] mx-auto z-20 pointer-events-none">
          <button
            onClick={() => setShowForm(true)}
            className="absolute right-4 bottom-0 pointer-events-auto bg-[#7B2D3B] text-white p-4 rounded-full shadow-lg active:scale-95 transition-transform"
          >
            <Plus size={20} />
          </button>
        </div>
      )}

      {/* New Match Form */}
      {showForm && (
        <div className="fixed inset-0 z-30 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowForm(false)} />
          <div className="relative bg-[#111] rounded-t-2xl px-5 pt-5 pb-10 max-h-[85vh] overflow-y-auto border-t border-white/10">
            <div className="w-10 h-1 bg-gray-700 rounded-full mx-auto mb-5" />
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">새 매치</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-500"><X size={20} /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">날짜</label>
                <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#7B2D3B]/50" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">시간</label>
                <input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#7B2D3B]/50" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">지역</label>
                <select value={form.region} onChange={e => setForm({ ...form, region: e.target.value })}
                  className="w-full appearance-none bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#7B2D3B]/50">
                  <option value="" className="bg-[#1a1a1a] text-white">선택</option>
                  {REGIONS.map(r => <option key={r} value={r} className="bg-[#1a1a1a] text-white">{r}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">구장</label>
                <input type="text" placeholder="구장 이름" value={form.stadium} onChange={e => setForm({ ...form, stadium: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-[#7B2D3B]/50" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">실력</label>
                <div className="flex gap-2">
                  {LEVELS.map(l => (
                    <button key={l} onClick={() => setForm({ ...form, level: l })}
                      className={`flex-1 py-3 rounded-xl text-sm font-semibold border ${form.level === l ? 'border-[#7B2D3B] bg-[#7B2D3B]/10 text-red-400' : 'border-white/10 text-gray-500'}`}
                    >{l}</button>
                  ))}
                </div>
              </div>
            </div>

            <button onClick={handleSubmit} disabled={!isFormValid || submitting}
              className={`mt-6 w-full py-3.5 rounded-xl font-bold text-sm ${isFormValid && !submitting ? 'bg-[#7B2D3B] text-white' : 'bg-white/5 text-gray-600'}`}
            >{submitting ? '생성 중...' : '매치 생성하기'}</button>
          </div>
        </div>
      )}
    </div>
  );
}
