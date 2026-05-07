import { MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router'; // 1. 네비게이트 도구 임포트

export default function Auth() {
  const navigate = useNavigate(); // 2. 이동 함수 초기화

  const handleLogin = () => {
    // 카카오 로그인 로직이 구현되기 전까지는 
    // 버튼을 누르면 무조건 다음 페이지로 넘어가도록 설정합니다.
    console.log("로그인 버튼 클릭됨!"); 
    navigate('/onboarding'); 
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-4xl font-black text-red-600 mb-2 italic">경축</h1>
        <p className="text-gray-500 mb-12">우리 팀의 모든 기록을 한눈에</p>

        {/* 3. onClick 이벤트에 handleLogin 연결 */}
        <button 
          onClick={handleLogin}
          className="w-full bg-[#FEE500] text-[#191919] py-4 rounded-xl font-bold flex items-center justify-center gap-3 mb-4 hover:opacity-90 transition-all active:scale-95"
        >
          <MessageCircle className="fill-current" size={20} />
          카카오톡으로 시작하기
        </button>
        
        <p className="text-xs text-gray-400 px-4 leading-relaxed">
          로그인 시 이용약관 및 개인정보 처리방침에 동의하게 됩니다.
        </p>
      </div>
    </div>
  );
}