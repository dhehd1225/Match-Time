import { useState } from 'react';
import { ArrowLeft, Search, CheckCircle2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import type { Team } from '../../../lib/types';

export function TeamJoin() {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [joinedTeam, setJoinedTeam] = useState<Team | null>(null);

  const handleJoin = async () => {
    if (!user || !code.trim()) return;
    const normalizedCode = code.trim().toUpperCase();
    if (normalizedCode.length < 6) {
      setError('6자리 팀 코드를 입력해주세요.');
      return;
    }

    setSubmitting(true);
    setError('');

    // 모든 팀을 가져와서 코드 매칭
    const { data: allTeams } = await supabase.from('teams').select('*');
    const matched = allTeams?.find(t =>
      t.id.replace(/-/g, '').substring(0, 6).toUpperCase() === normalizedCode
    );

    if (!matched) {
      setError('해당 코드의 팀을 찾을 수 없습니다.');
      setSubmitting(false);
      return;
    }

    // 이미 가입되어 있는지 확인
    const { data: existing } = await supabase
      .from('team_members')
      .select('id')
      .eq('team_id', matched.id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      setError('이미 가입된 팀입니다.');
      setSubmitting(false);
      return;
    }

    // 팀 멤버로 추가
    const { error: insertError } = await supabase
      .from('team_members')
      .insert({
        team_id: matched.id,
        user_id: user.id,
        role: 'member',
      });

    if (insertError) {
      console.error('팀 가입 실패:', insertError);
      setError('팀 가입에 실패했습니다.');
      setSubmitting(false);
      return;
    }

    await refreshProfile();
    setJoinedTeam(matched);
    setSubmitting(false);
  };

  // 가입 완료 화면
  if (joinedTeam) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-6">
        <CheckCircle2 size={64} className="text-emerald-400 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">가입 완료!</h2>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-3xl">{joinedTeam.logo}</span>
          <span className="text-xl font-bold text-white">{joinedTeam.name}</span>
        </div>
        <p className="text-gray-400 text-sm mb-8">팀에 성공적으로 가입했습니다.</p>
        <button
          onClick={() => navigate('/mypage')}
          className="w-full max-w-xs bg-[#7B2D3B] text-white py-4 rounded-xl font-bold shadow-lg active:scale-[0.98] transition-all"
        >
          확인
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* 헤더 */}
      <div className="px-4 py-3 flex items-center gap-3 border-b border-white/5">
        <button onClick={() => navigate(-1)} className="p-1 text-gray-400">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-lg font-bold text-white">팀 가입하기</h1>
      </div>

      <div className="p-6 flex flex-col items-center">
        <div className="w-16 h-16 bg-[#111] rounded-full flex items-center justify-center border-2 border-white/10 mb-6">
          <Search size={28} className="text-[#7B2D3B]" />
        </div>

        <h2 className="text-lg font-bold text-white mb-2">팀 코드 입력</h2>
        <p className="text-sm text-gray-500 text-center mb-8">
          팀 생성자에게 받은 6자리 코드를 입력하세요.
        </p>

        <div className="w-full max-w-xs mb-4">
          <input
            type="text"
            placeholder="예: A3B5C7"
            value={code}
            onChange={e => {
              setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6));
              setError('');
            }}
            maxLength={6}
            className="w-full text-center text-2xl font-black tracking-[0.3em] p-4 border border-white/10 rounded-xl bg-[#111] text-white placeholder:text-gray-600 placeholder:text-base placeholder:tracking-normal placeholder:font-normal focus:ring-2 focus:ring-[#7B2D3B] outline-none"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm mb-4">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <button
          onClick={handleJoin}
          disabled={code.length < 6 || submitting}
          className="w-full max-w-xs bg-[#7B2D3B] text-white py-4 rounded-xl font-bold shadow-lg active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {submitting ? '가입 중...' : '팀 가입'}
        </button>
      </div>
    </div>
  );
}
