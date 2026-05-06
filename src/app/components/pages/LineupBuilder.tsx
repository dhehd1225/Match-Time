import { useState } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Download, Share2, RotateCcw, Shirt } from 'lucide-react';
import JerseyIcon from '../JerseyIcon';

interface Player {
  id: number;
  name: string;
  number: number;
  position: string;
}

const availablePlayers: Player[] = [
  { id: 1, name: '김민수', number: 1, position: 'GK' },
  { id: 2, name: '이준호', number: 2, position: 'DF' },
  { id: 3, name: '박성훈', number: 3, position: 'DF' },
  { id: 4, name: '최지훈', number: 4, position: 'DF' },
  { id: 5, name: '정대현', number: 5, position: 'DF' },
  { id: 6, name: '강태양', number: 6, position: 'MF' },
  { id: 7, name: '윤재민', number: 7, position: 'MF' },
  { id: 8, name: '한동수', number: 8, position: 'MF' },
  { id: 9, name: '서준영', number: 9, position: 'FW' },
  { id: 10, name: '오현우', number: 10, position: 'FW' },
  { id: 11, name: '임태규', number: 11, position: 'FW' },
];

const formations = {
  '4-3-3': [
    { x: 50, y: 90 }, // GK
    { x: 20, y: 70 }, { x: 40, y: 70 }, { x: 60, y: 70 }, { x: 80, y: 70 }, // DF
    { x: 30, y: 45 }, { x: 50, y: 45 }, { x: 70, y: 45 }, // MF
    { x: 30, y: 20 }, { x: 50, y: 20 }, { x: 70, y: 20 }, // FW
  ],
  '4-4-2': [
    { x: 50, y: 90 },
    { x: 20, y: 70 }, { x: 40, y: 70 }, { x: 60, y: 70 }, { x: 80, y: 70 },
    { x: 20, y: 45 }, { x: 40, y: 45 }, { x: 60, y: 45 }, { x: 80, y: 45 },
    { x: 40, y: 20 }, { x: 60, y: 20 },
  ],
  '3-4-3': [
    { x: 50, y: 90 },
    { x: 30, y: 70 }, { x: 50, y: 70 }, { x: 70, y: 70 },
    { x: 20, y: 45 }, { x: 40, y: 45 }, { x: 60, y: 45 }, { x: 80, y: 45 },
    { x: 30, y: 20 }, { x: 50, y: 20 }, { x: 70, y: 20 },
  ],
};

interface PlayerIconProps {
  player: Player | null;
  position: { x: number; y: number };
  index: number;
  onDrop: (playerId: number, position: number) => void;
  jerseyPrimary: string;
  jerseySecondary: string;
}

const PlayerIcon = ({ player, position, index, onDrop, jerseyPrimary, jerseySecondary }: PlayerIconProps) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'player',
    item: { playerId: player?.id, currentPosition: index },
    canDrag: !!player,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'player',
    drop: (item: { playerId: number; currentPosition: number }) => {
      if (item.playerId) {
        onDrop(item.playerId, index);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  return (
    <div
      ref={(node) => drag(drop(node))}
      className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-move ${
        isDragging ? 'opacity-50' : ''
      } ${isOver ? 'scale-110' : ''}`}
      style={{ left: `${position.x}%`, top: `${position.y}%` }}
    >
      {player ? (
        <div className="flex flex-col items-center">
          <JerseyIcon
            number={player.number}
            primaryColor={jerseyPrimary}
            secondaryColor={jerseySecondary}
            size="md"
          />
          <div className="mt-1 bg-white px-2 py-0.5 rounded shadow-sm">
            <span className="text-xs font-semibold text-gray-900">{player.name}</span>
          </div>
        </div>
      ) : (
        <div className="w-12 h-14 bg-gray-300/50 border-2 border-white border-dashed rounded shadow-lg flex items-center justify-center">
          <span className="text-gray-500 text-xl">+</span>
        </div>
      )}
    </div>
  );
};

const jerseyOptions = [
  { name: '빨강-검정', primary: '#DC143C', secondary: '#000000' },
  { name: '파랑-흰색', primary: '#0066CC', secondary: '#FFFFFF' },
  { name: '초록-흰색', primary: '#00AA00', secondary: '#FFFFFF' },
  { name: '노랑-파랑', primary: '#FFD700', secondary: '#0000CD' },
];

function LineupBuilderContent() {
  const [formation, setFormation] = useState<keyof typeof formations>('4-3-3');
  const [lineup, setLineup] = useState<(Player | null)[]>(
    availablePlayers.slice(0, 11)
  );
  const [selectedJersey, setSelectedJersey] = useState(0);

  const handleDrop = (playerId: number, targetPosition: number) => {
    const newLineup = [...lineup];
    const sourceIndex = newLineup.findIndex(p => p?.id === playerId);

    if (sourceIndex !== -1) {
      const temp = newLineup[sourceIndex];
      newLineup[sourceIndex] = newLineup[targetPosition];
      newLineup[targetPosition] = temp;
      setLineup(newLineup);
    }
  };

  const resetLineup = () => {
    setLineup(availablePlayers.slice(0, 11));
  };

  const positions = formations[formation];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-700 to-red-600 text-white p-4 shadow-lg">
        <h1 className="text-2xl font-bold mb-2">스타팅 라인업</h1>
        <p className="text-sm text-red-100">드래그하여 선수를 배치하세요</p>
      </div>

      {/* Jersey & Formation Selector */}
      <div className="bg-white p-4 border-b border-gray-200 space-y-4">
        {/* Jersey Selector */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Shirt size={16} />
            유니폼 선택
          </h3>
          <div className="flex gap-2">
            {jerseyOptions.map((jersey, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedJersey(idx)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-all ${
                  selectedJersey === idx
                    ? 'border-red-600 bg-red-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <JerseyIcon
                  number={7}
                  primaryColor={jersey.primary}
                  secondaryColor={jersey.secondary}
                  size="sm"
                />
                <span className="text-xs font-medium text-gray-700">{jersey.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Formation Selector */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">포메이션 선택</h3>
          <div className="flex gap-2">
            {Object.keys(formations).map((f) => (
              <button
                key={f}
                onClick={() => setFormation(f as keyof typeof formations)}
                className={`px-4 py-2 rounded-xl font-semibold transition-colors ${
                  formation === f
                    ? 'bg-red-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Soccer Field */}
      <div className="p-4">
        <div
          className="relative bg-gradient-to-b from-green-600 to-green-500 rounded-2xl shadow-xl overflow-hidden"
          style={{ aspectRatio: '3/4' }}
        >
          {/* Field Lines */}
          <div className="absolute inset-0">
            {/* Center Circle */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-white/40 rounded-full" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white/60 rounded-full" />

            {/* Halfway Line */}
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/40" />

            {/* Penalty Areas */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2/3 h-24 border-2 border-white/40 border-b-0" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-24 border-2 border-white/40 border-t-0" />

            {/* Goal Areas */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/3 h-12 border-2 border-white/40 border-b-0" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-12 border-2 border-white/40 border-t-0" />
          </div>

          {/* Players */}
          {positions.map((pos, idx) => (
            <PlayerIcon
              key={idx}
              player={lineup[idx]}
              position={pos}
              index={idx}
              onDrop={handleDrop}
              jerseyPrimary={jerseyOptions[selectedJersey].primary}
              jerseySecondary={jerseyOptions[selectedJersey].secondary}
            />
          ))}
        </div>
      </div>

      {/* Player Bench */}
      <div className="bg-white mx-4 p-4 rounded-lg shadow-sm">
        <h3 className="font-semibold mb-3">벤치 선수</h3>
        <div className="grid grid-cols-4 gap-2">
          {availablePlayers.slice(11).map((player) => (
            <div key={player.id} className="flex flex-col items-center p-2 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-gray-400 rounded-full flex items-center justify-center mb-1">
                <span className="text-white font-bold text-xs">{player.number}</span>
              </div>
              <span className="text-xs text-gray-700">{player.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-4 mt-4 flex gap-3">
        <button
          onClick={resetLineup}
          className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-gray-300 transition-colors"
        >
          <RotateCcw size={20} />
          초기화
        </button>
        <button className="flex-1 bg-red-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-red-700 transition-colors shadow-md">
          <Download size={20} />
          저장
        </button>
        <button className="flex-1 bg-gray-700 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors shadow-md">
          <Share2 size={20} />
          공유
        </button>
      </div>
    </div>
  );
}

export default function LineupBuilder() {
  return (
    <DndProvider backend={HTML5Backend}>
      <LineupBuilderContent />
    </DndProvider>
  );
}
