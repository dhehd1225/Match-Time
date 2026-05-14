import type { RefObject, Dispatch, SetStateAction } from 'react';
import { X, Plus, UserPlus, ArrowLeftRight, Copy, Save, Zap, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { toPng } from 'html-to-image';
import JerseyIcon from '../JerseyIcon';

interface PlayerInfo {
  id: string;
  name: string;
  number: number;
  position: string;
}

type Quarter = '1Q' | '2Q' | '3Q' | '4Q';
const quarters: Quarter[] = ['1Q', '2Q', '3Q', '4Q'];

const formations: Record<string, { x: number; y: number }[]> = {
  '4-3-3': [{ x: 50, y: 90 },{ x: 20, y: 70 },{ x: 40, y: 70 },{ x: 60, y: 70 },{ x: 80, y: 70 },{ x: 30, y: 45 },{ x: 50, y: 45 },{ x: 70, y: 45 },{ x: 30, y: 20 },{ x: 50, y: 20 },{ x: 70, y: 20 }],
  '4-4-2': [{ x: 50, y: 90 },{ x: 20, y: 70 },{ x: 40, y: 70 },{ x: 60, y: 70 },{ x: 80, y: 70 },{ x: 20, y: 45 },{ x: 40, y: 45 },{ x: 60, y: 45 },{ x: 80, y: 45 },{ x: 40, y: 20 },{ x: 60, y: 20 }],
  '3-4-3': [{ x: 50, y: 90 },{ x: 30, y: 70 },{ x: 50, y: 70 },{ x: 70, y: 70 },{ x: 20, y: 45 },{ x: 40, y: 45 },{ x: 60, y: 45 },{ x: 80, y: 45 },{ x: 30, y: 20 },{ x: 50, y: 20 },{ x: 70, y: 20 }],
  '3-3-1': [{ x: 50, y: 90 },{ x: 25, y: 70 },{ x: 50, y: 70 },{ x: 75, y: 70 },{ x: 30, y: 45 },{ x: 50, y: 45 },{ x: 70, y: 45 },{ x: 50, y: 20 }],
};

const posColors: Record<string, string> = { GK: 'text-yellow-500', DF: 'text-blue-400', MF: 'text-emerald-400', FW: 'text-red-400' };

interface Props {
  activeQuarter: Quarter;
  setActiveQuarter: (q: Quarter) => void;
  quarterLineups: Record<Quarter, (string | null)[]>;
  setQuarterLineups: Dispatch<SetStateAction<Record<Quarter, (string | null)[]>>>;
  formation: string;
  selectedSlot: { type: 'field' | 'bench'; index: number } | null;
  setSelectedSlot: (s: { type: 'field' | 'bench'; index: number } | null) => void;
  jerseyPrimary: string;
  setJerseyPrimary: (c: string) => void;
  jerseySecondary: string;
  allPlayers: PlayerInfo[];
  isTeamCreator: boolean;
  autoLoading: boolean;
  fieldRef: RefObject<HTMLDivElement | null>;
  handleFieldTap: (i: number) => void;
  handleBenchTap: (i: number) => void;
  handleFormationChange: (f: string) => void;
  handleSaveLineup: () => void;
  handleAutoLineup: () => void;
  onShowAddModal: () => void;
}

export default function LineupFormation({
  activeQuarter, setActiveQuarter, quarterLineups, setQuarterLineups,
  formation, selectedSlot, setSelectedSlot,
  jerseyPrimary, setJerseyPrimary, jerseySecondary,
  allPlayers, isTeamCreator, autoLoading,
  fieldRef, handleFieldTap, handleBenchTap, handleFormationChange,
  handleSaveLineup, handleAutoLineup, onShowAddModal,
}: Props) {
  const positions_arr = formations[formation] || formations['4-3-3'];
  const currentLineup = quarterLineups[activeQuarter];
  const fieldIds = new Set(currentLineup.filter((pid): pid is string => pid !== null));
  const benchPlayers = allPlayers.filter(p => !fieldIds.has(p.id));
  const getPlayer = (pid: string) => allPlayers.find(p => p.id === pid);

  const getSlotPos = (idx: number): string => {
    if (idx === 0) return 'GK';
    const parts = formation.split('-').map(Number);
    let count = 1;
    if (idx < count + parts[0]) return 'DF';
    count += parts[0];
    if (idx < count + parts[1]) return 'MF';
    return 'FW';
  };

  return (
    <div className="px-4 py-4">
      <div className="flex gap-2 mb-3">
        {quarters.map(q => (
          <button key={q} onClick={() => { setActiveQuarter(q); setSelectedSlot(null); }}
            className={`flex-1 py-2 rounded-xl text-sm font-bold ${activeQuarter === q ? 'bg-[#7B2D3B] text-white' : 'bg-white text-gray-500 border border-gray-200'}`}>{q}</button>
        ))}
      </div>

      {isTeamCreator && activeQuarter !== '1Q' && (
        <div className="flex gap-2 mb-3">
          {quarters.filter(q => q !== activeQuarter).map(q => (
            <button key={q} onClick={() => setQuarterLineups(prev => ({ ...prev, [activeQuarter]: [...prev[q]] }))}
              className="flex items-center gap-1 px-2.5 py-1 bg-gray-100 rounded-lg text-[11px] text-gray-500">
              <Copy size={10} />{q} 복사
            </button>
          ))}
        </div>
      )}

      {/* 유니폼 색상 - 팀장만 변경 가능 */}
      {isTeamCreator && (
        <div className="flex items-center gap-3 mb-3">
          <span className="text-[10px] text-gray-500 font-bold">유니폼</span>
          <div className="flex gap-1.5">
            {['#DC143C', '#1E40AF', '#000000', '#FFFFFF', '#F59E0B', '#7B2D3B', '#059669', '#7C3AED', '#F97316'].map(c => (
              <button key={c} onClick={() => setJerseyPrimary(c)}
                className={`w-6 h-6 rounded-full border-2 ${jerseyPrimary === c ? 'border-gray-900 scale-110' : 'border-gray-300'}`}
                style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>
      )}

      {isTeamCreator ? (
        <div className="flex gap-2 mb-3">
          {Object.keys(formations).map(f => (
            <button key={f} onClick={() => handleFormationChange(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${formation === f ? 'bg-[#7B2D3B] text-white' : 'bg-gray-100 text-gray-500'}`}>{f}</button>
          ))}
        </div>
      ) : (
        <div className="mb-3 bg-white shadow-sm rounded-xl border border-gray-200 px-3 py-2">
          <span className="text-xs text-gray-500">포메이션: </span>
          <span className="text-xs font-bold text-gray-900">{formation}</span>
        </div>
      )}

      {selectedSlot && (
        <div className="mb-3 bg-yellow-500/10 rounded-xl px-3 py-2 flex items-center gap-2">
          <ArrowLeftRight size={14} className="text-yellow-500" />
          <span className="text-xs text-yellow-400">교체할 선수를 선택하세요</span>
          <button onClick={() => setSelectedSlot(null)} className="ml-auto text-yellow-500"><X size={14} /></button>
        </div>
      )}

      {/* Field */}
      <div ref={fieldRef} className="relative rounded-2xl overflow-hidden" style={{ aspectRatio: '3/4', background: 'linear-gradient(180deg, #1e5631 0%, #2d7a3a 20%, #308040 40%, #2d7a3a 60%, #308040 80%, #1e5631 100%)' }}>
        <div className="absolute inset-0" style={{ backgroundImage: 'repeating-linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.04) 8.33%, transparent 8.33%, transparent 16.66%)', backgroundSize: '100% 100%' }} />
        <div className="absolute inset-0">
          <div className="absolute inset-3 border-2 border-white/40 rounded-sm" />
          <div className="absolute top-1/2 left-3 right-3 h-0 border-t-2 border-white/40" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 border-2 border-white/40 rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white/40 rounded-full" />
          <div className="absolute top-1 left-1/2 -translate-x-1/2 w-16 h-3 border-2 border-white/50 border-t-0 rounded-b-sm" />
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[55%] h-16 border-2 border-white/40 border-t-0" />
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[30%] h-8 border-2 border-white/40 border-t-0" />
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-[55%] h-16 border-2 border-white/40 border-b-0" />
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-[30%] h-8 border-2 border-white/40 border-b-0" />
          <div className="absolute top-1.5 left-1.5 w-4 h-4 border-r-2 border-b-2 border-white/40 rounded-br-full" />
          <div className="absolute top-1.5 right-1.5 w-4 h-4 border-l-2 border-b-2 border-white/40 rounded-bl-full" />
          <div className="absolute bottom-1.5 left-1.5 w-4 h-4 border-r-2 border-t-2 border-white/40 rounded-tr-full" />
          <div className="absolute bottom-1.5 right-1.5 w-4 h-4 border-l-2 border-t-2 border-white/40 rounded-tl-full" />
        </div>
        <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-sm text-white px-2.5 py-1 rounded-lg text-[11px] font-bold">{activeQuarter} · {formation}</div>

        {positions_arr.map((pos, idx) => {
          const pid = currentLineup[idx]; const player = pid != null ? getPlayer(pid) : null;
          const isSel = selectedSlot?.type === 'field' && selectedSlot.index === idx;
          return (
            <div key={`${activeQuarter}-${idx}`} onClick={() => handleFieldTap(idx)}
              className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform ${isSel ? 'scale-110 z-10' : ''}`}
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}>
              {player ? (
                <div className="flex flex-col items-center">
                  <div className={`${isSel ? 'ring-2 ring-yellow-400 rounded-xl' : ''}`}>
                    <JerseyIcon number={player.number} primaryColor={jerseyPrimary} secondaryColor={jerseySecondary} size="md" />
                  </div>
                  <div className={`mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 ${isSel ? 'bg-yellow-400 text-black' : 'bg-white text-gray-900'}`}>
                    <span className={`text-[9px] font-black ${
                      getSlotPos(idx) === 'GK' ? 'text-yellow-500' :
                      getSlotPos(idx) === 'DF' ? 'text-blue-500' :
                      getSlotPos(idx) === 'MF' ? 'text-emerald-500' : 'text-red-500'
                    }`}>{getSlotPos(idx)}</span>{player.name}
                  </div>
                </div>
              ) : (
                <div className={`w-10 h-12 border-2 border-dashed rounded flex items-center justify-center ${isSel ? 'border-yellow-400 bg-yellow-400/20' : 'border-white/40 bg-white/10'}`}>
                  <Plus className="text-white/50" size={16} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bench */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-gray-900">교체 <span className="text-gray-500 font-normal">{benchPlayers.length}명</span></span>
          {isTeamCreator && (
            <button onClick={onShowAddModal}
              className="flex items-center gap-1 bg-[#7B2D3B] text-white px-3 py-1.5 rounded-lg text-[11px] font-bold">
              <UserPlus size={12} /> 추가
            </button>
          )}
        </div>
        {benchPlayers.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {benchPlayers.map((p, i) => {
              const isSel = selectedSlot?.type === 'bench' && selectedSlot.index === i;
              return (
                <div key={p.id} onClick={() => handleBenchTap(i)}
                  className={`flex-shrink-0 w-[68px] flex flex-col items-center p-2 rounded-xl border cursor-pointer ${isSel ? 'border-yellow-400 bg-yellow-500/10' : 'border-gray-200 bg-white shadow-sm'}`}>
                  <JerseyIcon number={p.number} primaryColor={jerseyPrimary} secondaryColor={jerseySecondary} size="sm" />
                  <span className="text-[10px] font-medium mt-1 text-gray-600 truncate w-full text-center">{p.name}</span>
                  <span className={`text-[9px] font-bold ${posColors[p.position]}`}>{p.position}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-gray-400 text-center py-4">모든 선수 배치 완료</p>
        )}
      </div>

      <div className="mt-3 bg-white shadow-sm rounded-xl border border-gray-200 p-3 flex items-center justify-between">
        <span className="text-xs text-gray-500">{activeQuarter} 배치</span>
        <span className="text-xs font-bold text-gray-900">{currentLineup.filter(p => p !== null).length}/{positions_arr.length}명</span>
      </div>

      {isTeamCreator && (
        <div className="mt-3 space-y-2">
          <button onClick={handleAutoLineup} disabled={autoLoading}
            className="w-full bg-[#7B2D3B] text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50">
            <Zap size={16} />
            {autoLoading ? '배치 중...' : '자동 배치'}
          </button>
          <div className="flex gap-2">
            <button onClick={handleSaveLineup}
              className="flex-1 bg-[#7B2D3B] text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform">
              <Save size={16} /> 라인업 저장
            </button>
            <button onClick={async () => {
              if (!fieldRef.current) return;
              setSelectedSlot(null);
              try {
                const dataUrl = await toPng(fieldRef.current, { pixelRatio: 2 });
                const link = document.createElement('a');
                link.download = `lineup_${activeQuarter}_${formation}.png`;
                link.href = dataUrl;
                link.click();
                toast.success('이미지 저장 완료!');
              } catch { toast.error('이미지 저장에 실패했습니다.'); }
            }}
              className="bg-white text-gray-900 py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform border border-gray-200 shadow-sm">
              <Camera size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
