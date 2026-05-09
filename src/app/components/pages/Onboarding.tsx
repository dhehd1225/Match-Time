import { PlusCircle, Search } from 'lucide-react';
import { useNavigate } from 'react-router';

export default function Onboarding() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6 flex flex-col justify-center">
      <h2 className="text-2xl font-bold mb-2 text-center text-white">
        반가워요!
      </h2>
      <p className="text-gray-500 text-center mb-10 text-sm">팀을 선택해주세요</p>

      <div className="space-y-3">
        <button
          onClick={() => navigate('/team/create')}
          className="w-full bg-[#111] p-5 rounded-2xl border border-white/5 text-left active:scale-[0.98] transition-transform"
        >
          <PlusCircle className="text-[#7B2D3B] mb-3" size={28} />
          <h3 className="font-bold text-white mb-1">새로운 팀 생성하기</h3>
          <p className="text-gray-500 text-sm">팀을 직접 만들고 팀원을 모집하세요.</p>
        </button>

        <button
          onClick={() => navigate('/team/join')}
          className="w-full bg-[#111] p-5 rounded-2xl border border-white/5 text-left active:scale-[0.98] transition-transform"
        >
          <Search className="text-[#7B2D3B] mb-3" size={28} />
          <h3 className="font-bold text-white mb-1">팀 가입하기</h3>
          <p className="text-gray-500 text-sm">이미 생성된 팀을 찾아 가입 신청을 보내세요.</p>
        </button>
      </div>
    </div>
  );
}
