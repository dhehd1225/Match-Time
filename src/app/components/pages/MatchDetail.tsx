import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, MapPin, Users, Send, Check } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import type { Match } from '../../../lib/types';

export default function MatchDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, team, isPresident } = useAuth();
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchMatch = async () => {
      const { data } = await supabase
        .from('matches')
        .select('*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)')
        .eq('id', id)
        .single();

      if (data) setMatch(data);
      setLoading(false);
    };

    fetchMatch();

    const channel = supabase
      .channel(`match-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `id=eq.${id}` }, () => {
        fetchMatch();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id]);

  const handleApply = async () => {
    if (!match || !team || !user) return;
    setApplying(true);

    // 상대팀으로 등록 (away_team)
    const { error } = await supabase
      .from('matches')
      .update({ away_team_id: team.id, status: 'pending' })
      .eq('id', match.id)
      .is('away_team_id', null);

    if (!error) {
      setApplied(true);
      // 홈팀 회장에게 알림
      const { data: homePresidents } = await supabase
        .from('team_members')
        .select('user_id')
        .eq('team_id', match.home_team_id)
        .eq('role', 'president');

      if (homePresidents) {
        for (const p of homePresidents) {
          await supabase.from('notifications').insert({
            user_id: p.user_id,
            type: 'match_request',
            title: '시합 신청',
            description: `${team.name}이(가) 시합을 신청했습니다.`,
            related_id: match.id,
          });
        }
      }
    }
    setApplying(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-gray-500 text-sm">로딩 중...</div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-gray-500 text-sm">매치를 찾을 수 없습니다</div>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
  };

  const isMyTeamHome = team?.id === match.home_team_id;
  const isMyTeamAway = team?.id === match.away_team_id;
  const canApply = isPresident && team && !isMyTeamHome && !match.away_team_id && !applied;

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-8">
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3 border-b border-white/5 sticky top-0 z-10 bg-[#0a0a0a]">
        <button onClick={() => navigate(-1)} className="p-1 text-gray-400">
          <ArrowLeft size={22} />
        </button>
        <span className="text-sm text-gray-500">{formatDate(match.date)} {match.time?.slice(0, 5)}</span>
      </div>

      {/* VS */}
      <div className="px-4 py-6">
        <div className="bg-[#111] rounded-2xl border border-white/5 p-6">
          <div className="flex items-center justify-between">
            {/* Home */}
            <div className="flex-1 text-center">
              <div className="w-16 h-16 mx-auto mb-2 bg-[#7B2D3B]/20 rounded-2xl flex items-center justify-center text-3xl">
                {match.home_team?.logo || '⚽'}
              </div>
              <p className="font-bold text-white text-sm">{match.home_team?.name || '홈팀'}</p>
            </div>

            <div className="px-4">
              <p className="text-2xl font-black text-gray-600">VS</p>
            </div>

            {/* Away */}
            <div className="flex-1 text-center">
              {match.away_team ? (
                <>
                  <div className="w-16 h-16 mx-auto mb-2 bg-blue-500/20 rounded-2xl flex items-center justify-center text-3xl">
                    {match.away_team.logo || '⚽'}
                  </div>
                  <p className="font-bold text-white text-sm">{match.away_team.name}</p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 mx-auto mb-2 border-2 border-dashed border-gray-700 rounded-2xl flex items-center justify-center">
                    <span className="text-2xl text-gray-600">?</span>
                  </div>
                  <p className="text-sm text-gray-500">상대 모집중</p>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-white/5">
            <div className="flex items-center gap-1 text-gray-500 text-xs"><MapPin size={12} />{match.stadium}</div>
            <div className="flex items-center gap-1 text-gray-500 text-xs"><Users size={12} />{match.format}</div>
          </div>
        </div>

        {/* 시합 신청 */}
        {canApply && (
          <div className="mt-3">
            <button onClick={handleApply} disabled={applying}
              className="w-full bg-[#7B2D3B] text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50">
              <Send size={16} /> {applying ? '신청 중...' : '시합 신청하기'}
            </button>
          </div>
        )}

        {(applied || (isMyTeamAway && match.status === 'pending')) && (
          <div className="mt-3 bg-emerald-500/10 rounded-xl px-4 py-3 flex items-center justify-center gap-2">
            <Check size={16} className="text-emerald-400" />
            <span className="text-sm text-emerald-400 font-medium">시합 신청 완료 — 상대팀 수락 대기 중</span>
          </div>
        )}

        {match.status === 'confirmed' && (
          <div className="mt-3 bg-emerald-500/10 rounded-xl px-4 py-3 flex items-center justify-center gap-2">
            <Check size={16} className="text-emerald-400" />
            <span className="text-sm text-emerald-400 font-medium">매치 확정</span>
          </div>
        )}
      </div>

      {/* Match Info */}
      <div className="px-4 mb-4">
        <div className="bg-[#111] rounded-2xl border border-white/5 p-4">
          <h3 className="font-bold text-white text-sm mb-3">매치 정보</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">날짜</span>
              <span className="text-xs text-white">{formatDate(match.date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">시간</span>
              <span className="text-xs text-white">{match.time?.slice(0, 5)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">구장</span>
              <span className="text-xs text-white">{match.stadium}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">지역</span>
              <span className="text-xs text-white">{match.region || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">실력</span>
              <span className="text-xs text-white">{match.level}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">포맷</span>
              <span className="text-xs text-white">{match.format}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">상태</span>
              <span className="text-xs text-white">
                {match.status === 'open' ? '모집중' : match.status === 'pending' ? '수락 대기' : match.status === 'confirmed' ? '확정' : '완료'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
