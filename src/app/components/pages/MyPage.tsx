import { Settings, UserCheck, UserX, ChevronRight } from 'lucide-react';

export default function MyPage({ isAdmin = true }) { // 관리자 여부에 따라 다른 UI 노출
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white p-6 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">9</div>
          <div className="flex-1">
            <h2 className="text-xl font-bold">서준영</h2>
            <p className="text-sm text-gray-500">FC 경축 · 포워드(FW) · No.9</p>
          </div>
          <button className="text-gray-400"><Settings size={20} /></button>
        </div>

        {isAdmin && (
          <div className="mt-6 p-4 bg-red-50 rounded-xl border border-red-100">
            <h3 className="text-sm font-bold text-red-700 mb-3 flex items-center gap-1">
              <UserCheck size={16} /> 신규 팀원 신청 (2건)
            </h3>
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="flex items-center justify-between bg-white p-3 rounded-lg shadow-sm">
                  <span className="text-sm font-medium">신규 유저 {i}</span>
                  <div className="flex gap-2">
                    <button className="p-1.5 bg-green-100 text-green-600 rounded-md"><UserCheck size={16} /></button>
                    <button className="p-1.5 bg-red-100 text-red-600 rounded-md"><UserX size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <button className="w-full mt-4 flex items-center justify-between p-4 bg-gray-100 rounded-xl font-bold text-gray-700 group">
          팀 페이지로 이동
          <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
      
      {/* 본인 스탯 섹션 (TeamManagement의 카드 디자인 활용) */}
      <div className="p-4 grid grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-xl text-center shadow-sm">
          <p className="text-[10px] text-gray-400">득점</p>
          <p className="text-lg font-black text-red-600">12</p>
        </div>
        {/* ... 추가 스탯 카드 */}
      </div>
    </div>
  );
}