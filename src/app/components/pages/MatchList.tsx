import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Search, MapPin, Clock, Star, Plus, X, ChevronDown } from 'lucide-react';

const LEVELS = ['초급', '중급', '고급'];
const REGIONS = ['서울', '경기', '인천', '부산', '대구', '대전', '광주', '기타'];

interface Match {
  id: number;
  date: string;
  time: string;
  region: string;
  stadium: string;
  opponent: string | null;
  opponentLogo: string | null;
  matchType: string;
  level: string;
  opponentNeeded: true;
  urgent: boolean;
}

const initialMatches: Match[] = [
  {
    id: 1,
    date: '5월 10일 (토)',
    time: '17:00',
    region: '서울 도봉',
    stadium: '커뮤니티 스포츠센터',
    opponent: '서울대 FC',
    opponentLogo: '🐉',
    matchType: '축구 11v11',
    level: '중급',
    opponentNeeded: true,
    urgent: false,
  },
  {
    id: 2,
    date: '5월 11일 (일)',
    time: '17:00',
    region: '서울 송파',
    stadium: '올림픽공원 축구장',
    opponent: '연세대 FC',
    opponentLogo: '🦅',
    matchType: '축구 11v11',
    level: '고급',
    opponentNeeded: true,
    urgent: false,
  },
  {
    id: 3,
    date: '5월 12일 (월)',
    time: '18:00',
    region: '서울 은평',
    stadium: '월드컵경기장 보조구장',
    opponent: '고려대 United',
    opponentLogo: '🐯',
    matchType: '축구 11v11',
    level: '고급',
    opponentNeeded: true,
    urgent: true,
  },
  {
    id: 4,
    date: '5월 13일 (화)',
    time: '18:00',
    region: '경기 성남',
    stadium: '탄천종합운동장',
    opponent: null,
    opponentLogo: null,
    matchType: '축구 11v11',
    level: '중급',
    opponentNeeded: true,
    urgent: true,
  },
  {
    id: 5,
    date: '5월 14일 (수)',
    time: '18:00',
    region: '서울 강동',
    stadium: '천호공원 축구장',
    opponent: '한양대 FC',
    opponentLogo: '⚡',
    matchType: '축구 11v11',
    level: '초급',
    opponentNeeded: true,
    urgent: true,
  },
  {
    id: 6,
    date: '5월 15일 (목)',
    time: '19:00',
    region: '서울 강서',
    stadium: '마곡 스포츠파크',
    opponent: null,
    opponentLogo: null,
    matchType: '축구 11v11',
    level: '중급',
    opponentNeeded: true,
    urgent: true,
  },
];

interface NewMatchForm {
  date: string;
  time: string;
  region: string;
  stadium: string;
  level: string;
}

const emptyForm: NewMatchForm = {
  date: '',
  time: '',
  region: '',
  stadium: '',
  level: '',
};

const levelColors: Record<string, string> = {
  초급: 'bg-green-100 text-green-700',
  중급: 'bg-blue-100 text-blue-700',
  고급: 'bg-purple-100 text-purple-700',
};

export default function MatchList() {
  const navigate = useNavigate();
  const [matches, setMatches] = useState<Match[]>(initialMatches);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NewMatchForm>(emptyForm);

  const handleSubmit = () => {
    if (!form.date || !form.time || !form.region || !form.stadium || !form.level) return;

    const newMatch: Match = {
      id: matches.length + 1,
      date: new Date(form.date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' }).replace(/\./g, '').trim(),
      time: form.time,
      region: form.region,
      stadium: form.stadium,
      opponent: null,
      opponentLogo: null,
      matchType: '축구 11v11',
      level: form.level,
      opponentNeeded: true,
      urgent: false,
    };

    setMatches([newMatch, ...matches]);
    setForm(emptyForm);
    setShowForm(false);
  };

  const isFormValid = form.date && form.time && form.region && form.stadium && form.level;

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

      {/* Match List */}
      <div className="px-4 pt-4 pb-28">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-lg text-gray-900">진행중인 매치</h3>
          <span className="text-sm text-gray-500">{matches.length}개</span>
        </div>

        <div className="space-y-3">
          {matches.map((match) => (
            <div
              key={match.id}
              onClick={() => navigate(`/matches/${match.id}`)}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-md hover:border-red-200 transition-all overflow-hidden"
            >
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
                  <button
                    onClick={(e) => e.stopPropagation()}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <Star size={18} className="text-gray-400" />
                  </button>
                </div>

                {/* Opponent */}
                <div className="flex items-center justify-center py-3 mb-3 bg-gray-50 rounded-xl">
                  {match.opponent ? (
                    <div className="text-center">
                      <div className="text-3xl mb-1">{match.opponentLogo}</div>
                      <p className="text-base font-bold text-gray-900">{match.opponent}</p>
                      <p className="text-xs text-gray-500 mt-0.5">상대팀</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="text-3xl mb-1">⚽</div>
                      <p className="text-base font-bold text-red-600">상대팀 모집중</p>
                      <p className="text-xs text-gray-500 mt-0.5">지금 신청하세요!</p>
                    </div>
                  )}
                </div>

                {/* Location & Badges */}
                <div className="flex items-start gap-2 pt-3 border-t border-gray-100">
                  <MapPin size={15} className="text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate">{match.stadium}</p>
                    <p className="text-xs text-gray-500">{match.region}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-medium">
                      {match.matchType}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${levelColors[match.level]}`}>
                      {match.level}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating CTA Button */}
      <button
        onClick={() => setShowForm(true)}
        className="fixed bottom-20 right-4 z-20 flex items-center gap-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white px-5 py-3.5 rounded-full shadow-lg transition-all font-semibold text-sm"
      >
        <Plus size={18} />
        매치 생성하기
      </button>

      {/* Bottom Sheet Overlay */}
      {showForm && (
        <div className="fixed inset-0 z-30 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowForm(false)}
          />

          {/* Sheet */}
          <div className="relative bg-white rounded-t-3xl px-5 pt-5 pb-10 shadow-xl max-h-[90vh] overflow-y-auto">
            {/* Handle */}
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

            {/* Title Row */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">새 매치 만들기</h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Fixed Badge */}
            <div className="flex items-center gap-2 mb-6 p-3 bg-red-50 rounded-xl">
              <span className="text-sm font-semibold text-red-600">축구 11v11</span>
              <span className="text-xs text-red-400">· 상대팀 매칭 포함</span>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              {/* 날짜 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">날짜</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-transparent"
                />
              </div>

              {/* 시간 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">시간</label>
                <input
                  type="time"
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-transparent"
                />
              </div>

              {/* 지역 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">지역</label>
                <div className="relative">
                  <select
                    value={form.region}
                    onChange={(e) => setForm({ ...form, region: e.target.value })}
                    className="w-full appearance-none border border-gray-200 rounded-xl px-4 py-3 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-transparent"
                  >
                    <option value="">지역 선택</option>
                    {REGIONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* 구장 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">구장</label>
                <input
                  type="text"
                  placeholder="구장 이름을 입력하세요"
                  value={form.stadium}
                  onChange={(e) => setForm({ ...form, stadium: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-transparent"
                />
              </div>

              {/* 팀 실력 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">팀 실력</label>
                <div className="flex gap-2">
                  {LEVELS.map((level) => (
                    <button
                      key={level}
                      onClick={() => setForm({ ...form, level })}
                      className={`flex-1 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                        form.level === level
                          ? 'border-red-500 bg-red-50 text-red-600'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={!isFormValid}
              className={`mt-8 w-full py-4 rounded-2xl font-bold text-base transition-all ${
                isFormValid
                  ? 'bg-red-600 hover:bg-red-700 text-white shadow-md'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              매치 생성하기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
