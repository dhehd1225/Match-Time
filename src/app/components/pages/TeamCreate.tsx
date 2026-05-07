import { Camera, Instagram } from 'lucide-react';
import { useNavigate } from 'react-router'; // 1. useNavigate 임포트

export default function TeamCreate() {
  const navigate = useNavigate(); // 2. 이동 함수 정의

  const handleCreateTeam = () => {
    // 여기에 나중에 Supabase에 데이터를 저장하는 로직이 들어갑니다.
    alert('팀 생성이 완료되었습니다!'); 
    navigate('/app/mypage'); // 3. 생성 완료 후 마이페이지로 이동
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-red-600 p-4 text-white font-bold text-center">팀 생성</div>
      
      <div className="p-6">
        <div className="flex justify-center mb-8">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex flex-col items-center justify-center border-2 border-dashed border-gray-300 text-gray-400">
            <Camera size={24} />
            <span className="text-[10px] mt-1">로고 등록</span>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-bold text-gray-700 block mb-1">팀 이름 *</label>
            <input 
              type="text" 
              placeholder="팀 이름을 입력하세요" 
              className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-red-500 outline-none" 
            />
          </div>
          
          <div>
            <label className="text-sm font-bold text-gray-700 block mb-1">팀 설명 (선택)</label>
            <textarea 
              placeholder="우리 팀을 소개해주세요" 
              className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 h-24 outline-none" 
            />
          </div>

          <div>
            <label className="text-sm font-bold text-gray-700 block mb-1">인스타그램 계정 (선택)</label>
            <div className="relative">
              <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="username" 
                className="w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl bg-gray-50 outline-none" 
              />
            </div>
          </div>
        </div>

        {/* 버튼에 onClick 이벤트 연결 */}
        <button 
          onClick={handleCreateTeam}
          className="w-full bg-red-600 text-white py-4 rounded-xl font-bold mt-8 shadow-lg active:scale-[0.98] transition-transform"
        >
          팀 생성 완료
        </button>
      </div>
    </div>
  );
}