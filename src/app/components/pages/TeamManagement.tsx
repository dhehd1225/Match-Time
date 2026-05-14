import { useState, useEffect } from 'react';
import { Search, ArrowLeft, UserMinus, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import type { TeamMember } from '../../../lib/types';

const positionColors: Record<string, string> = {
  GK: 'text-yellow-500',
  DF: 'text-blue-400',
  MF: 'text-emerald-400',
  FW: 'text-red-400',
};

export default function TeamManagement() {
  const navigate = useNavigate();
  const { team, user, isTeamCreator } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPosition, setSelectedPosition] = useState<string>('전체');
  const positions = ['전체', 'GK', 'DF', 'MF', 'FW'];

  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleRemoveMember = async (memberId: string, memberUserId: string) => {
    if (memberUserId === user?.id) return;
    if (removingId === memberId) {
      // 두 번째 클릭 → 실제 삭제
      await supabase.from('team_members').delete().eq('id', memberId);
      setRemovingId(null);
      toast.success('팀원을 제거했습니다.');
    } else {
      // 첫 번째 클릭 → 확인 상태
      setRemovingId(memberId);
      setTimeout(() => setRemovingId(null), 3000);
    }
  };

  const fetchMembers = async () => {
    if (!team) { setLoading(false); return; }
    const { data } = await supabase
      .from('team_members')
      .select('*, profile:profiles(*)')
      .eq('team_id', team.id)
      .order('joined_at', { ascending: true });

    if (data) setMembers(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchMembers();

    if (!team) return;
    const channel = supabase
      .channel('team-members-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_members', filter: `team_id=eq.${team.id}` }, () => {
        fetchMembers();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [team]);

  const filteredMembers = members.filter(m => {
    const name = m.profile?.name || '';
    const pos = m.profile?.position || '';
    const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPosition = selectedPosition === '전체' || pos === selectedPosition;
    return matchesSearch && matchesPosition;
  });

  const topScorer = members.length > 0 ? members.reduce((prev, c) => (prev.goals > c.goals) ? prev : c) : null;
  const topAssist = members.length > 0 ? members.reduce((prev, c) => (prev.assists > c.assists) ? prev : c) : null;
  const mvp = members.length > 0 ? members.reduce((prev, c) => (prev.rating > c.rating) ? prev : c) : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF8]">
        <div className="px-4 py-3 border-b border-gray-200"><div className="bg-gray-200 rounded w-24 h-5 animate-pulse" /></div>
        <div className="p-4 space-y-3">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 p-3">
              <div className="w-5 h-4 bg-gray-200 rounded animate-pulse" />
              <div className="w-20 h-4 bg-gray-200 rounded animate-pulse" />
              <div className="w-8 h-3 bg-gray-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] pb-8">
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3 border-b border-gray-200">
        <button onClick={() => navigate(-1)} className="p-1 text-gray-400">
          <ArrowLeft size={22} />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-900">{team?.name || '팀'}</h1>
          <p className="text-xs text-gray-500">선수 {members.length}명</p>
        </div>
        <button onClick={() => navigate('/rankings')} className="p-2 text-gray-400 hover:text-gray-900 transition-colors">
          <BarChart3 size={20} />
        </button>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-3 gap-3 p-4">
        <div className="bg-white shadow-sm p-3 rounded-2xl text-center border border-gray-100">
          <p className="text-[10px] text-gray-400 mb-1">MVP</p>
          <p className="font-bold text-sm text-gray-900">{mvp?.profile?.name || '-'}</p>
          <p className="text-xs text-yellow-500">{mvp?.rating || '-'}</p>
        </div>
        <div className="bg-white shadow-sm p-3 rounded-2xl text-center border border-gray-100">
          <p className="text-[10px] text-gray-400 mb-1">득점왕</p>
          <p className="font-bold text-sm text-gray-900">{topScorer?.profile?.name || '-'}</p>
          <p className="text-xs text-red-400">{topScorer ? `${topScorer.goals}골` : '-'}</p>
        </div>
        <div className="bg-white shadow-sm p-3 rounded-2xl text-center border border-gray-100">
          <p className="text-[10px] text-gray-400 mb-1">도움왕</p>
          <p className="font-bold text-sm text-gray-900">{topAssist?.profile?.name || '-'}</p>
          <p className="text-xs text-emerald-400">{topAssist ? `${topAssist.assists}개` : '-'}</p>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="px-4 mb-4">
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="선수 검색"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-[#F5F3F0] border border-gray-200 rounded-xl text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-[#7B2D3B]/50"
          />
        </div>
        <div className="flex gap-2">
          {positions.map(pos => (
            <button
              key={pos}
              onClick={() => setSelectedPosition(pos)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                selectedPosition === pos
                  ? 'bg-[#7B2D3B] text-white'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {pos}
            </button>
          ))}
        </div>
      </div>

      {/* Player List */}
      <div className="px-4 space-y-2">
        {filteredMembers.map(member => {
          const profile = member.profile;
          return (
            <div key={member.id} className="bg-white shadow-sm rounded-2xl border border-gray-200 p-3 flex items-center gap-3">
              <div className="w-9 h-9 bg-[#F5F3F0] rounded-full flex items-center justify-center text-gray-900 font-bold text-sm">
                {profile?.back_number || '-'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm text-gray-900">{profile?.name || '이름 없음'}</p>
                  <span className={`text-[10px] font-bold ${positionColors[profile?.position || 'MF']}`}>{profile?.position || 'MF'}</span>
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-[11px] text-gray-500">{member.appearances}경기</span>
                  <span className="text-[11px] text-red-400">{member.goals}골</span>
                  <span className="text-[11px] text-emerald-400">{member.assists}도움</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-gray-900">{member.rating}</p>
                {isTeamCreator && member.user_id !== user?.id && (
                  <button
                    onClick={() => handleRemoveMember(member.id, member.user_id)}
                    className={`p-1.5 transition-colors text-xs font-bold ${removingId === member.id ? 'text-red-400' : 'text-gray-400 hover:text-red-400'}`}
                    title="팀원 제거"
                  >
                    {removingId === member.id ? '제거?' : <UserMinus size={14} />}
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {filteredMembers.length === 0 && (
          <p className="text-center text-gray-400 py-8 text-sm">
            {members.length === 0 ? '팀원이 없습니다' : '검색 결과가 없습니다'}
          </p>
        )}
      </div>
    </div>
  );
}
