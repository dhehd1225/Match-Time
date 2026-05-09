import { useState, useEffect } from 'react';
import { Search, Users, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import type { Team } from '../../../lib/types';

interface TeamWithCount extends Team {
  memberCount: number;
  presidentName: string;
}

export function TeamJoin() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedTeamIds, setAppliedTeamIds] = useState<Set<string>>(new Set());
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [teams, setTeams] = useState<TeamWithCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeams = async () => {
      const { data: teamsData } = await supabase
        .from('teams')
        .select('*')
        .order('created_at', { ascending: false });

      if (teamsData) {
        const enriched: TeamWithCount[] = [];
        for (const team of teamsData) {
          const { count } = await supabase
            .from('team_members')
            .select('*', { count: 'exact', head: true })
            .eq('team_id', team.id);

          const { data: president } = await supabase
            .from('team_members')
            .select('profile:profiles(name)')
            .eq('team_id', team.id)
            .eq('role', 'president')
            .limit(1)
            .maybeSingle();

          enriched.push({
            ...team,
            memberCount: count || 0,
            presidentName: (president?.profile as any)?.name || '미정',
          });
        }
        setTeams(enriched);
      }
      setLoading(false);
    };

    fetchTeams();
  }, []);

  const filteredTeams = teams.filter(team =>
    team.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleJoinRequest = async (teamId: string) => {
    if (!user || appliedTeamIds.has(teamId) || sendingId) return;
    setSendingId(teamId);

    // 신청자 프로필 가져오기
    const { data: myProfile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', user.id)
      .single();

    const myName = myProfile?.name || '알 수 없는 유저';

    // 해당 팀 회장에게 알림 보내기
    const { data: presidents } = await supabase
      .from('team_members')
      .select('user_id')
      .eq('team_id', teamId)
      .eq('role', 'president');

    const targetTeam = teams.find(t => t.id === teamId);

    if (presidents) {
      for (const p of presidents) {
        // 중복 알림 체크
        const { data: existing } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', p.user_id)
          .eq('type', 'team_join')
          .eq('related_id', user.id)
          .eq('status', 'pending')
          .maybeSingle();

        if (!existing) {
          await supabase.from('notifications').insert({
            user_id: p.user_id,
            type: 'team_join',
            title: '팀 가입 신청',
            description: `${myName}님이 ${targetTeam?.name || '팀'}에 가입을 신청했습니다.`,
            related_id: user.id,
          });
        }
      }
    }

    setAppliedTeamIds(prev => new Set(prev).add(teamId));
    setSendingId(null);
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
      {/* 헤더 */}
      <div className="bg-[#7B2D3B] p-4 text-white shadow-md">
        <h1 className="text-xl font-bold text-center">팀 가입하기</h1>
      </div>

      <div className="p-4">
        {/* 검색창 */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={20} />
          <input
            type="text"
            placeholder="가입할 팀 이름을 검색하세요"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-white/10 rounded-xl bg-[#111] text-white focus:outline-none focus:ring-2 focus:ring-[#7B2D3B] placeholder:text-gray-600"
          />
        </div>

        {/* 팀 리스트 */}
        <div className="space-y-3">
          {filteredTeams.map((team) => {
            const isApplied = appliedTeamIds.has(team.id);
            const isSending = sendingId === team.id;
            return (
              <div
                key={team.id}
                className={`bg-[#111] p-4 rounded-2xl border transition-all ${
                  isApplied ? 'border-emerald-500/50' : 'border-white/5'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{team.logo}</span>
                      <h3 className="font-bold text-lg text-white">{team.name}</h3>
                    </div>
                    {team.description && (
                      <p className="text-sm text-gray-500 mb-2">{team.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Users size={14} /> {team.memberCount}명
                      </span>
                      <span>회장: {team.presidentName}</span>
                    </div>
                  </div>

                  {isApplied ? (
                    <div className="flex flex-col items-end gap-1 text-emerald-400">
                      <CheckCircle2 size={24} />
                      <span className="text-[10px] font-bold">신청 완료</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleJoinRequest(team.id)}
                      disabled={isSending}
                      className="bg-[#7B2D3B] text-white px-4 py-2 rounded-lg text-sm font-bold active:scale-95 transition-transform disabled:opacity-50"
                    >
                      {isSending ? '신청 중...' : '신청하기'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {filteredTeams.length === 0 && (
            <div className="text-center py-12 text-gray-600">
              {teams.length === 0 ? '등록된 팀이 없습니다' : '검색 결과와 일치하는 팀이 없습니다.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
