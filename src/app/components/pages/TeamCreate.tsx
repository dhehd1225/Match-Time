import { useState } from 'react';
import { Camera, Instagram } from 'lucide-react';
import { useNavigate } from 'react-router';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';

export function TeamCreate() {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [instagram, setInstagram] = useState('');
  const [logo, setLogo] = useState('⚽');
  const [submitting, setSubmitting] = useState(false);

  const handleCreateTeam = async () => {
    if (!name.trim() || !user) return;
    setSubmitting(true);

    // 1. 팀 생성
    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .insert({
        name: name.trim(),
        logo,
        description: description.trim() || null,
        instagram: instagram.trim() || null,
        created_by: user.id,
      })
      .select('id')
      .single();

    if (teamError || !teamData) {
      console.error('팀 생성 실패:', teamError);
      alert('팀 생성에 실패했습니다.');
      setSubmitting(false);
      return;
    }

    // 2. 회장으로 team_members에 추가
    const { error: memberError } = await supabase
      .from('team_members')
      .insert({
        team_id: teamData.id,
        user_id: user.id,
        role: 'president',
      });

    if (memberError) {
      console.error('팀 멤버 추가 실패:', memberError);
    }

    setSubmitting(false);
    alert('팀 생성이 완료되었습니다!');
    await refreshProfile();
    navigate('/mypage');
  };

  const emojis = ['⚽', '🐆', '🦅', '🐯', '🦁', '💙', '⚡', '🔥', '🐉', '⭐'];

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="bg-[#7B2D3B] p-4 text-white font-bold text-center">팀 생성</div>

      <div className="p-6">
        {/* 로고 선택 */}
        <div className="flex justify-center mb-4">
          <div className="w-24 h-24 bg-[#111] rounded-full flex items-center justify-center border-2 border-white/10 text-4xl">
            {logo}
          </div>
        </div>
        <div className="flex justify-center gap-2 mb-8 flex-wrap">
          {emojis.map(e => (
            <button key={e} onClick={() => setLogo(e)}
              className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${logo === e ? 'bg-[#7B2D3B] ring-2 ring-[#C4697A]' : 'bg-[#111] border border-white/10'}`}>
              {e}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-bold text-gray-300 block mb-1">팀 이름 *</label>
            <input
              type="text"
              placeholder="팀 이름을 입력하세요"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full p-3 border border-white/10 rounded-xl bg-[#111] text-white placeholder:text-gray-600 focus:ring-2 focus:ring-[#7B2D3B] outline-none"
            />
          </div>

          <div>
            <label className="text-sm font-bold text-gray-300 block mb-1">팀 설명 (선택)</label>
            <textarea
              placeholder="우리 팀을 소개해주세요"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full p-3 border border-white/10 rounded-xl bg-[#111] text-white placeholder:text-gray-600 h-24 outline-none"
            />
          </div>

          <div>
            <label className="text-sm font-bold text-gray-300 block mb-1">인스타그램 계정 (선택)</label>
            <div className="relative">
              <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input
                type="text"
                placeholder="username"
                value={instagram}
                onChange={e => setInstagram(e.target.value)}
                className="w-full pl-10 pr-3 py-3 border border-white/10 rounded-xl bg-[#111] text-white placeholder:text-gray-600 outline-none"
              />
            </div>
          </div>
        </div>

        <button
          onClick={handleCreateTeam}
          disabled={!name.trim() || submitting}
          className="w-full bg-[#7B2D3B] text-white py-4 rounded-xl font-bold mt-8 shadow-lg active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {submitting ? '생성 중...' : '팀 생성 완료'}
        </button>
      </div>
    </div>
  );
}
