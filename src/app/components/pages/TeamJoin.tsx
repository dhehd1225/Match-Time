import { useState } from 'react';
import { Search, Users, ChevronRight, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router';

// 임시 팀 데이터
const mockTeams = [
  { id: 1, name: 'FC 경축', memberCount: 22, description: '경희대 축구 동아리', leader: '김민수' },
  { id: 2, name: '아미쿠스', memberCount: 18, description: '즐거운 축구 모임', leader: '박지성' },
  { id: 3, name: '슈팅스타', memberCount: 25, description: '실력 중심 정기 모임', leader: '이강인' },
];

export function TeamJoin() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedTeamId, setAppliedTeamId] = useState<number | null>(null);

  const filteredTeams = mockTeams.filter(team =>
    team.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleJoinRequest = (teamId: number) => {
    setAppliedTeamId(teamId);
    // 2초 뒤에 수락되었다고 가정하고 마이페이지로 이동
    setTimeout(() => {
      alert('가입 신청이 승인되었습니다!');
      navigate('/mypage');
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-red-600 p-4 text-white shadow-md">
        <h1 className="text-xl font-bold text-center">팀 가입하기</h1>
      </div>

      <div className="p-4">
        {/* 검색창 */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="가입할 팀 이름을 검색하세요"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-red-500 shadow-sm"
          />
        </div>

        {/* 팀 리스트 */}
        <div className="space-y-3">
          {filteredTeams.map((team) => (
            <div
              key={team.id}
              className={`bg-white p-4 rounded-2xl border transition-all ${
                appliedTeamId === team.id ? 'border-green-500 bg-green-50' : 'border-gray-100'
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg text-gray-900">{team.name}</h3>
                  <p className="text-sm text-gray-500 mb-2">{team.description}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Users size={14} /> {team.memberCount}명
                    </span>
                    <span>방장: {team.leader}</span>
                  </div>
                </div>
                
                {appliedTeamId === team.id ? (
                  <div className="flex flex-col items-end gap-1 text-green-600 animate-pulse">
                    <CheckCircle2 size={24} />
                    <span className="text-[10px] font-bold">수락 대기중</span>
                  </div>
                ) : (
                  <button
                    onClick={() => handleJoinRequest(team.id)}
                    className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-600 transition-colors"
                  >
                    신청하기
                  </button>
                )}
              </div>
            </div>
          ))}

          {filteredTeams.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              검색 결과와 일치하는 팀이 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}