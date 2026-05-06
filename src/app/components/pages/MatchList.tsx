import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Search, MapPin, Clock, Users, Calendar, Filter, Star, TrendingUp } from 'lucide-react';

const mockMatches = [
  {
    id: 1,
    date: '5월 10일 (토)',
    time: '17:00',
    location: '서울 도봉 커뮤니티 스포츠센터',
    opponent: '서울대 FC',
    opponentLogo: '🐉',
    format: '11vs11',
    urgent: false,
  },
  {
    id: 2,
    date: '5월 11일 (일)',
    time: '17:00',
    location: '서울 송파 올림픽공원 축구장',
    opponent: '연세대 FC',
    opponentLogo: '🦅',
    format: '11vs11',
    urgent: false,
  },
  {
    id: 3,
    date: '5월 12일 (월)',
    time: '18:00',
    location: '서울 은평 월드컵경기장 보조구장',
    opponent: '고려대 United',
    opponentLogo: '🐯',
    format: '11vs11',
    urgent: true,
  },
  {
    id: 4,
    date: '5월 13일 (화)',
    time: '18:00',
    location: '경기 성남 탄천종합운동장',
    opponent: '성균관대 SC',
    opponentLogo: '🦁',
    format: '8vs8',
    urgent: true,
  },
  {
    id: 5,
    date: '5월 14일 (수)',
    time: '18:00',
    location: '서울 강동 천호공원 축구장',
    opponent: '한양대 FC',
    opponentLogo: '⚡',
    format: '11vs11',
    urgent: true,
  },
  {
    id: 6,
    date: '5월 15일 (목)',
    time: '19:00',
    location: '서울 강서 마곡 스포츠파크',
    opponent: '중앙대 United',
    opponentLogo: '💙',
    format: '11vs11',
    urgent: true,
  },
];

export default function MatchList() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(10);
  const [selectedLevel, setSelectedLevel] = useState('전체');

  const levels = ['전체', '초급', '중급', '고급'];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="bg-gradient-to-r from-red-700 to-red-600 text-white sticky top-0 z-10 shadow-lg">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">팀 매칭</h1>
              <p className="text-sm text-red-100">팀과 팀의 대결</p>
            </div>
            <button className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
              <Filter size={22} />
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="경기장, 팀 검색..."
              className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-300"
            />
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3 px-4 py-4">
        <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
          <div className="flex items-center justify-center mb-1">
            <Calendar className="text-red-600" size={20} />
          </div>
          <p className="text-center text-xs text-gray-600">오늘 경기</p>
          <p className="text-center text-lg font-bold text-gray-900">24</p>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
          <div className="flex items-center justify-center mb-1">
            <Users className="text-red-600" size={20} />
          </div>
          <p className="text-center text-xs text-gray-600">참여 팀</p>
          <p className="text-center text-lg font-bold text-gray-900">156</p>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
          <div className="flex items-center justify-center mb-1">
            <TrendingUp className="text-red-600" size={20} />
          </div>
          <p className="text-center text-xs text-gray-600">이번주</p>
          <p className="text-center text-lg font-bold text-gray-900">+42</p>
        </div>
      </div>

      {/* Match List */}
      <div className="px-4 pb-8">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-lg text-gray-900">진행중인 매치</h3>
          <span className="text-sm text-gray-500">{mockMatches.length}개</span>
        </div>

        <div className="space-y-3">
          {mockMatches.map((match) => (
            <div
              key={match.id}
              onClick={() => navigate(`/matches/${match.id}`)}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-md hover:border-red-200 transition-all overflow-hidden"
            >
              {/* Status Bar */}
              {match.urgent && (
                <div className="bg-gradient-to-r from-red-600 to-red-500 text-white px-4 py-1.5 text-xs font-semibold flex items-center gap-2">
                  <Clock size={14} />
                  마감 임박 · 서둘러 신청하세요!
                </div>
              )}

              <div className="p-4">
                {/* Date & Time */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="bg-red-100 text-red-700 px-3 py-1 rounded-lg font-bold text-sm">
                      {match.date}
                    </div>
                    <div className="bg-gray-100 text-gray-700 px-2 py-1 rounded-lg text-sm font-semibold">
                      {match.time}
                    </div>
                  </div>
                  <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <Star size={18} className="text-gray-400" />
                  </button>
                </div>

                {/* Opponent Team */}
                <div className="flex items-center justify-center py-4 mb-3 bg-gray-50 rounded-xl">
                  <div className="text-center">
                    <div className="text-4xl mb-2">{match.opponentLogo}</div>
                    <p className="text-lg font-bold text-gray-900">{match.opponent}</p>
                    <p className="text-xs text-gray-500 mt-1">상대팀</p>
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-start gap-2 pt-3 border-t border-gray-100">
                  <MapPin size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{match.location}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{match.format}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
