import { useState } from 'react';
import { Settings, UserCheck, UserX, ChevronRight, Save } from 'lucide-react';
import { useNavigate } from 'react-router';

export function MyPage({ isAdmin = true }) {
  const navigate = useNavigate();

  // 수정 가능한 상태(State) 관리
  const [position, setPosition] = useState('포워드(FW)');
  const [backNumber, setBackNumber] = useState('9');

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 상단 프로필 섹션 */}
      <div className="bg-white p-6 border-b border-gray-200">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
            {backNumber}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold">서준영</h2>
            <p className="text-sm text-gray-500 font-medium">FC 경축</p>
          </div>
          <button className="text-gray-400"><Settings size={20} /></button>
        </div>

        {/* 정보 수정 섹션 */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">포지션</label>
            <select 
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-red-500 outline-none appearance-none"
            >
              <option>포워드(FW)</option>
              <option>미드필더(MF)</option>
              <option>수비수(DF)</option>
              <option>골키퍼(GK)</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">등번호</label>
            <input 
              type="number"
              value={backNumber}
              onChange={(e) => setBackNumber(e.target.value)}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-red-500 outline-none"
            />
          </div>
        </div>

        {/* 관리자 권한 섹션 (기존 유지) */}
        {isAdmin && (
          <div className="mt-2 p-4 bg-red-50 rounded-xl border border-red-100 mb-4">
            <h3 className="text-sm font-bold text-red-700 mb-3 flex items-center gap-1">
              <UserCheck size={16} /> 신규 팀원 신청 (2건)
            </h3>
            <div className="space-y-2">
              {[1, 2].map(i => (
                <div key={i} className="flex items-center justify-between bg-white p-3 rounded-lg shadow-sm border border-red-50">
                  <span className="text-sm font-medium">신규 유저 {i}</span>
                  <div className="flex gap-2">
                    <button className="p-1.5 bg-green-100 text-green-600 rounded-md hover:bg-green-200"><UserCheck size={16} /></button>
                    <button className="p-1.5 bg-red-100 text-red-600 rounded-md hover:bg-red-200"><UserX size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 팀 페이지 이동 버튼 (TeamManagement로 이동) */}
        <button 
          onClick={() => navigate('/team')}
          className="w-full flex items-center justify-between p-4 bg-gray-900 rounded-xl font-bold text-white group hover:bg-gray-800 transition-all active:scale-[0.98]"
        >
          우리 팀 명단 보기
          <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform text-red-500" />
        </button>
      </div>
      
      {/* 통계 요약 (임시 데이터) */}
      <div className="p-4 grid grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-xl text-center shadow-sm border border-gray-100">
          <p className="text-[10px] text-gray-400 font-bold mb-1">득점</p>
          <p className="text-xl font-black text-red-600">12</p>
        </div>
        <div className="bg-white p-4 rounded-xl text-center shadow-sm border border-gray-100">
          <p className="text-[10px] text-gray-400 font-bold mb-1">도움</p>
          <p className="text-xl font-black text-green-600">7</p>
        </div>
        <div className="bg-white p-4 rounded-xl text-center shadow-sm border border-gray-100">
          <p className="text-[10px] text-gray-400 font-bold mb-1">평점</p>
          <p className="text-xl font-black text-blue-600">8.5</p>
        </div>
      </div>
    </div>
  );
}