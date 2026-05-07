import { Camera, Instagram } from 'lucide-react';
import { useNavigate } from 'react-router';

// default 키워드 없이 export function으로 작성
export function TeamCreate() {
  const navigate = useNavigate();

  const handleCreateTeam = () => {
    // 알림창을 띄우고 확인을 누르면 이동합니다.
    alert('팀 생성이 완료되었습니다!'); 
    
    // App.tsx에서 <Route path="mypage" ... />로 설정했으므로 
    // 하단 탭바가 있는 메인 레이아웃 안의 마이페이지로 이동합니다.
    navigate('/mypage'); 
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

        <button 
          onClick={handleCreateTeam}
          className="w-full bg-red-600 text-white py-4 rounded-xl font-bold mt-8 shadow-lg active:scale-[0.98] transition-all"
        >
          팀 생성 완료
        </button>
      </div>
    </div>
  );
}