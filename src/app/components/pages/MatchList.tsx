import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Search, MapPin, Plus, X, Trash2, SlidersHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { trackEvent } from '../../../hooks/useAnalytics';
import type { Match } from '../../../lib/types';
import { MatchCardSkeleton, ListSkeleton } from '../Skeleton';

const LEVELS = ['초급', '중급', '고급', '선출', '비선출'];
const REGIONS = ['강남구', '강동구', '강북구', '강서구', '관악구', '광진구', '구로구', '금천구', '노원구', '도봉구', '동대문구', '동작구', '마포구', '서대문구', '서초구', '성동구', '성북구', '송파구', '양천구', '영등포구', '용산구', '은평구', '종로구', '중구', '중랑구'];

const emptyForm = { date: '', time: '', region: '', stadium: '', level: '', format: '11v11', playerType: '' };

const TIME_SLOTS = [
  '06:00','06:30','07:00','07:30','08:00','08:30','09:00','09:30','10:00','10:30',
  '11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30',
  '16:00','16:30','17:00','17:30','18:00','18:30','19:00','19:30','20:00','20:30',
  '21:00','21:30','22:00','22:30','23:00',
];

const STADIUM_REGION_MAP: Record<string, string> = {
  // 강남구
  '강남': '강남구', '역삼': '강남구', '삼성': '강남구', '대치': '강남구', '개포': '강남구', '수서': '강남구', '일원': '강남구',
  // 강동구
  '강동': '강동구', '천호': '강동구', '길동': '강동구', '둔촌': '강동구', '암사': '강동구', '고덕': '강동구',
  // 강북구
  '강북': '강북구', '수유': '강북구', '미아': '강북구', '번동': '강북구',
  // 강서구
  '강서': '강서구', '화곡': '강서구', '등촌': '강서구', '마곡': '강서구', '발산': '강서구', '방화': '강서구',
  // 관악구
  '관악': '관악구', '신림': '관악구', '봉천': '관악구', '서울대': '관악구', '낙성대': '관악구',
  // 광진구
  '광진': '광진구', '건대': '광진구', '건국대': '광진구', '구의': '광진구', '자양': '광진구', '능동': '광진구', '화양': '광진구', '어린이대공원': '광진구',
  // 구로구
  '구로': '구로구', '고척': '구로구', '개봉': '구로구', '오류': '구로구', '신도림': '구로구',
  // 금천구
  '금천': '금천구', '가산': '금천구', '독산': '금천구', '시흥': '금천구',
  // 노원구
  '노원': '노원구', '상계': '노원구', '중계': '노원구', '하계': '노원구', '공릉': '노원구', '월계': '노원구',
  // 도봉구
  '도봉': '도봉구', '창동': '도봉구', '쌍문': '도봉구', '방학': '도봉구',
  // 동대문구
  '동대문': '동대문구', '회기': '동대문구', '청량리': '동대문구', '전농': '동대문구', '경희대': '동대문구', '외대': '동대문구', '이문': '동대문구',
  // 동작구
  '동작': '동작구', '사당': '동작구', '노량진': '동작구', '상도': '동작구', '흑석': '동작구', '중앙대': '동작구',
  // 마포구
  '마포': '마포구', '상암': '마포구', '합정': '마포구', '망원': '마포구', '연남': '마포구', '홍대': '마포구', '월드컵': '마포구', '서교': '마포구', '성산': '마포구',
  // 서대문구
  '서대문': '서대문구', '신촌': '서대문구', '연세대': '서대문구', '연대': '서대문구', '이대': '서대문구', '이화여대': '서대문구', '충정': '서대문구', '홍은': '서대문구', '북아현': '서대문구',
  // 서초구
  '서초': '서초구', '반포': '서초구', '양재': '서초구', '잠원': '서초구', '방배': '서초구', '내곡': '서초구',
  // 성동구
  '성동': '성동구', '왕십리': '성동구', '한양대': '성동구', '행당': '성동구', '응봉': '성동구', '옥수': '성동구', '금호': '성동구', '성수': '성동구',
  // 성북구
  '성북': '성북구', '고려대': '성북구', '고대': '성북구', '안암': '성북구', '보문': '성북구', '돈암': '성북구', '길음': '성북구', '정릉': '성북구', '삼선': '성북구', '국민대': '성북구',
  // 송파구
  '송파': '송파구', '잠실': '송파구', '방이': '송파구', '오금': '송파구', '문정': '송파구', '가락': '송파구', '석촌': '송파구', '풍납': '송파구', '올림픽': '송파구',
  // 양천구
  '양천': '양천구', '목동': '양천구', '신정': '양천구', '신월': '양천구',
  // 영등포구
  '영등포': '영등포구', '여의도': '영등포구', '당산': '영등포구', '문래': '영등포구', '양평': '영등포구', '대림': '영등포구',
  // 용산구
  '용산': '용산구', '이태원': '용산구', '한남': '용산구', '후암': '용산구', '남영': '용산구', '삼각지': '용산구', '숙대': '용산구', '숙명여대': '용산구',
  // 은평구
  '은평': '은평구', '불광': '은평구', '녹번': '은평구', '응암': '은평구', '역촌': '은평구', '구산': '은평구', '진관': '은평구',
  // 종로구
  '종로': '종로구', '혜화': '종로구', '광화문': '종로구', '대학로': '종로구', '성균관대': '종로구', '동숭': '종로구',
  // 중구
  '중구': '중구', '을지로': '중구', '명동': '중구', '충무로': '중구', '동국대': '중구', '약수': '중구', '신당': '중구',
  // 중랑구
  '중랑': '중랑구', '상봉': '중랑구', '면목': '중랑구', '망우': '중랑구', '묵동': '중랑구',
};

function detectRegion(stadium: string): string {
  for (const [keyword, region] of Object.entries(STADIUM_REGION_MAP)) {
    if (stadium.includes(keyword)) return region;
  }
  return '';
}

const levelStyle: Record<string, string> = {
  초급: 'text-emerald-400',
  중급: 'text-blue-400',
  고급: 'text-purple-400',
  선출: 'text-orange-500',
  비선출: 'text-teal-500',
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
  const location = useLocation();
  const { user, team, isTeamCreator } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [timeFilter, setTimeFilter] = useState('전체');
  const [regionSearch, setRegionSearch] = useState('');
  const [showRegionList, setShowRegionList] = useState(false);
  const regionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showRegionList) return;
    const handleClick = (e: MouseEvent) => {
      if (regionRef.current && !regionRef.current.contains(e.target as Node)) {
        setShowRegionList(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showRegionList]);
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

  // 페이지 진입할 때마다 새로고침
  useEffect(() => {
    fetchMatches();
  }, [location.pathname]);

  useEffect(() => {
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

  const displayMatches = filteredMatches;

  const handleSubmit = async () => {
    if (!form.date || !form.time || !form.stadium || !form.level || !user) return;
    if (!team) {
      toast.error('팀에 먼저 가입해주세요.');
      return;
    }
    setSubmitting(true);

    const { data: matchData, error } = await supabase.from('matches').insert({
      date: form.date,
      time: form.time,
      region: form.region || detectRegion(form.stadium) || null,
      stadium: form.stadium,
      level: form.level,
      player_type: form.playerType || null,
      format: form.format,
      home_team_id: team.id,
      created_by: user.id,
      status: 'open',
    }).select('id').single();

    if (error || !matchData) {
      console.error('매치 생성 실패:', error);
      toast.error('매치 생성에 실패했습니다.');
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

      trackEvent('match_create', { stadium: form.stadium, level: form.level, format: form.format });
      setForm(emptyForm);
      setShowForm(false);
      fetchMatches();
    }
    setSubmitting(false);
  };

  const handleDeleteMatch = async (e: React.MouseEvent, matchId: string) => {
    e.stopPropagation();
    if (!confirm('이 매치를 삭제하시겠습니까?')) return;
    await supabase.from('match_applications').delete().eq('match_id', matchId);
    await supabase.from('match_attendance').delete().eq('match_id', matchId);
    await supabase.from('lineups').delete().eq('match_id', matchId);
    await supabase.from('notifications').delete().eq('related_id', matchId);
    const { data: rooms } = await supabase.from('chat_rooms').select('id').eq('match_id', matchId);
    if (rooms?.length) {
      const roomIds = rooms.map(r => r.id);
      await supabase.from('chat_messages').delete().in('room_id', roomIds);
      await supabase.from('chat_rooms').delete().eq('match_id', matchId);
    }
    await supabase.from('matches').delete().eq('id', matchId);
    setMatches(prev => prev.filter(m => m.id !== matchId));
    toast.success('매치가 삭제되었습니다.');
  };

  const isFormValid = form.date && form.time && form.stadium && form.level;

  return (
    <div className="min-h-screen bg-[#F7F6F3]">
      {/* TopBar */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#E5E2DC]">
        <div className="px-4 pt-4 pb-3">
          <h1 className="font-title text-[30px] text-[#111] leading-none">MATCH</h1>
        </div>
        <div className="px-4 pb-3 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#CCC]" size={16} />
            <input
              type="text"
              placeholder="경기장, 팀 검색..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-[#F0EEE9] border-none rounded-lg text-[#111] text-sm placeholder:text-[#BBB] focus:outline-none"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`relative px-3 rounded-lg transition-colors ${
              activeFilterCount > 0 ? 'bg-[#111] text-white' : 'bg-[#F0EEE9] text-[#888]'
            }`}
          >
            <SlidersHorizontal size={16} />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#111] text-white rounded-full text-[9px] font-semibold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {showFilters && (
          <div className="mt-3 bg-white rounded-xl p-3 space-y-3">
            <div>
              <p className="text-[10px] text-gray-400 mb-1.5 font-semibold">시간대</p>
              <div className="flex gap-1.5">
                {['전체', '오전', '오후', '저녁'].map(f => (
                  <button key={f} onClick={() => setTimeFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium ${timeFilter === f ? 'bg-[#111] text-white' : 'bg-[#F0EEE9] text-[#555]'}`}
                  >{f}</button>
                ))}
              </div>
            </div>
            <div className="relative" ref={regionRef}>
              <p className="text-[10px] text-gray-400 mb-1.5 font-semibold">지역</p>
              <input
                type="text"
                placeholder={regionFilter === '전체' ? '지역 검색...' : regionFilter}
                value={regionSearch}
                onChange={e => { setRegionSearch(e.target.value); setShowRegionList(true); }}
                onFocus={() => setShowRegionList(true)}
                className="w-full bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400"
              />
              {regionFilter !== '전체' && !showRegionList && (
                <button onClick={() => { setRegionFilter('전체'); setRegionSearch(''); }}
                  className="absolute right-2 top-[26px] text-gray-400 p-1"><X size={14} /></button>
              )}
              {showRegionList && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto z-10">
                  <button onClick={() => { setRegionFilter('전체'); setRegionSearch(''); setShowRegionList(false); }}
                    className={`w-full text-left px-3 py-2 text-sm ${regionFilter === '전체' ? 'text-[#111] font-bold bg-[#111]/5' : 'text-gray-600'}`}>
                    전체
                  </button>
                  {REGIONS.filter(r => !regionSearch || r.includes(regionSearch)).map(r => (
                    <button key={r} onClick={() => { setRegionFilter(r); setRegionSearch(''); setShowRegionList(false); }}
                      className={`w-full text-left px-3 py-2 text-sm ${regionFilter === r ? 'text-[#111] font-bold bg-[#111]/5' : 'text-gray-600'}`}>
                      {r}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <p className="text-[10px] text-gray-400 mb-1.5 font-semibold">실력</p>
              <div className="flex gap-1.5">
                {['전체', ...LEVELS].map(l => (
                  <button key={l} onClick={() => setLevelFilter(l)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium ${levelFilter === l ? 'bg-[#111] text-white' : 'bg-[#F0EEE9] text-[#555]'}`}
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
      <div className="px-4 pt-4 pb-28">
        {loading ? (
          <ListSkeleton count={4}><MatchCardSkeleton /></ListSkeleton>
        ) : displayMatches.map((match) => (
          <div
            key={match.id}
            onClick={() => navigate(`/matches/${match.id}`)}
            className="flex items-center gap-4 p-[14px_16px] mb-2 bg-white rounded-xl border border-[#E5E2DC] active:scale-[0.98] transition-transform cursor-pointer"
          >
            {/* 시간 */}
            <div className="w-14 text-center shrink-0">
              <p className="text-lg font-bold text-[#111]">{formatTime(match.time)}</p>
              <p className="text-[11px] text-gray-400">{match.format}</p>
            </div>

            {/* 정보 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {match.home_team?.logo?.startsWith('http') ? (
                  <img src={match.home_team.logo} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />
                ) : (
                  <span className="text-sm shrink-0">{match.home_team?.logo || '⚽'}</span>
                )}
                <p className="font-bold text-gray-900 text-sm truncate">{match.home_team?.name || '팀'}</p>
                {match.away_team && match.status !== 'open' ? (
                  <>
                    <span className="text-xs text-gray-300">vs</span>
                    {match.away_team.logo?.startsWith('http') ? (
                      <img src={match.away_team.logo} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />
                    ) : (
                      <span className="text-sm shrink-0">{match.away_team.logo || '⚽'}</span>
                    )}
                    <p className="font-bold text-gray-900 text-sm truncate">{match.away_team.name}</p>
                  </>
                ) : (
                  <span className="text-xs text-[#9A3412] font-medium">상대 모집중</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span className="flex items-center gap-1"><MapPin size={11} />{match.stadium}</span>
                <span>·</span>
                <span>{formatDate(match.date)}</span>
                {match.level && <span className={`font-bold ${levelStyle[match.level] || 'text-gray-400'}`}>{match.level}</span>}
                {match.player_type && <span className={`font-bold ${levelStyle[match.player_type] || 'text-gray-400'}`}>{match.player_type}</span>}
              </div>
            </div>

            {/* 상태 */}
            <div className="shrink-0 flex items-center gap-1">
              {match.status === 'completed' ? (
                <span className="text-[11px] font-semibold text-[#888] bg-[#F0EEE9] px-2.5 py-1 rounded-full">완료</span>
              ) : match.status === 'confirmed' ? (
                <span className="text-[11px] font-semibold text-[#166534] bg-[#ECFDF4] px-2.5 py-1 rounded-full">확정</span>
              ) : (
                <span className="text-[11px] font-semibold text-[#9A3412] bg-[#FFF7ED] px-2.5 py-1 rounded-full">모집중</span>
              )}
              {match.created_by === user?.id && (
                <button onClick={(e) => handleDeleteMatch(e, match.id)}
                  className="p-1.5 text-gray-400 hover:text-red-400 transition-colors">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        ))}

        {!loading && displayMatches.length === 0 && (
          <p className="text-center text-gray-400 py-12 text-sm">매치가 없습니다</p>
        )}
      </div>

      {/* FAB - 팀장만 시합 생성 가능 */}
      {isTeamCreator && (
        <div className="fixed left-0 right-0 max-w-[430px] mx-auto z-20 pointer-events-none" style={{ bottom: '7.5rem' }}>
          <button
            onClick={() => setShowForm(true)}
            className="pointer-events-auto absolute right-4 bottom-0 bg-[#111] text-white p-4 rounded-full active:scale-95 transition-transform"
          >
            <Plus size={20} />
          </button>
        </div>
      )}

      {/* New Match Form */}
      {showForm && (
        <div className="fixed inset-0 z-30 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-t-2xl px-5 pt-5 pb-10 max-h-[85vh] overflow-y-auto max-w-[430px] mx-auto w-full">
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-5" />
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">새 매치</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-500"><X size={20} /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">날짜</label>
                <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                  onClick={e => (e.target as HTMLInputElement).showPicker?.()}
                  className="w-full bg-[#F5F3F0] border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none cursor-pointer" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">시간</label>
                <select value={form.time} onChange={e => setForm({ ...form, time: e.target.value })}
                  className="w-full bg-[#F5F3F0] border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none appearance-none">
                  <option value="">시간 선택</option>
                  {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">구장</label>
                <input type="text" placeholder="구장 이름" value={form.stadium} onChange={e => {
                  const stadium = e.target.value;
                  const detected = detectRegion(stadium);
                  setForm({ ...form, stadium, ...(detected ? { region: detected } : {}) });
                }}
                  className="w-full bg-[#F5F3F0] border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm placeholder:text-gray-400 outline-none" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">실력</label>
                <div className="flex gap-2">
                  {['초급', '중급', '고급'].map(l => (
                    <button key={l} onClick={() => setForm({ ...form, level: l })}
                      className={`flex-1 py-3 rounded-xl text-sm font-semibold border ${form.level === l ? 'border-[#111] bg-[#111]/5 text-[#111]' : 'border-gray-200 text-gray-500'}`}
                    >{l}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">구분</label>
                <div className="flex gap-2">
                  {['선출', '비선출'].map(t => (
                    <button key={t} onClick={() => setForm({ ...form, playerType: form.playerType === t ? '' : t })}
                      className={`flex-1 py-3 rounded-xl text-sm font-semibold border ${form.playerType === t ? 'border-[#111] bg-[#111]/5 text-[#111]' : 'border-gray-200 text-gray-500'}`}
                    >{t}</button>
                  ))}
                </div>
              </div>
            </div>

            <button onClick={handleSubmit} disabled={!isFormValid || submitting}
              className={`mt-6 w-full py-3.5 rounded-xl font-bold text-sm ${isFormValid && !submitting ? 'bg-[#111] text-white' : 'bg-[#F0EEE9] text-[#CCC]'}`}
            >{submitting ? '생성 중...' : '매치 생성하기'}</button>

          </div>
        </div>
      )}
    </div>
  );
}
