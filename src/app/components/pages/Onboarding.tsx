import { PlusCircle, Search } from 'lucide-react';
import { useNavigate } from 'react-router'; // 1. useNavigate 임포트

export default function Onboarding() {
  const navigate = useNavigate(); // 2. 이동 함수 정의

  return (
    <div className="min-h-screen bg-gray-50 p-6 flex flex-col justify-center">
      <h2 className="text-2xl font-bold mb-8 text-center text-gray-900">
        반가워요! 👋<br/>팀을 선택해주세요.
      </h2>
      
      <div className="grid gap-4">
        {/* 새로운 팀 생성하기 버튼에 onClick 추가 */}
        <button 
          onClick={() => navigate('/team/create')} 
          className="bg-white p-6 rounded-2xl shadow-sm border-2 border-transparent hover:border-red-500 transition-all text-left group active:scale-[0.98]"
        >
          <PlusCircle className="text-red-600 mb-3" size={32} />
          <h3 className="font-bold text-lg text-gray-900">새로운 팀 생성하기</h3>
          <p className="text-gray-500 text-sm">팀을 직접 만들고 팀원을 모집하세요.</p>
        </button>

        {/* 기존 팀 가입하기 (현재는 테스트를 위해 TeamManagement 등으로 연결 가능) */}
        <button 
          className="bg-white p-6 rounded-2xl shadow-sm border-2 border-transparent hover:border-red-500 transition-all text-left active:scale-[0.98]"
        >
          <Search className="text-red-600 mb-3" size={32} />
          <h3 className="font-bold text-lg text-gray-900">기존 팀 가입하기</h3>
          <p className="text-gray-500 text-sm">이미 생성된 팀을 찾아 가입 신청을 보내세요.</p>
        </button>
      </div>
    </div>
  );
}