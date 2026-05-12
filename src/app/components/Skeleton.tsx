export function Bone({ className = '' }: { className?: string }) {
  return <div className={`bg-white/5 rounded-lg animate-pulse ${className}`} />;
}

export function MatchCardSkeleton() {
  return (
    <div className="bg-[#111] rounded-2xl border border-white/5 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Bone className="w-24 h-4" />
          <Bone className="w-10 h-4" />
        </div>
        <Bone className="w-10 h-4 rounded-full" />
      </div>
      <div className="flex items-center py-2 mb-3">
        <div className="flex-1 flex items-center gap-2">
          <Bone className="w-8 h-8 rounded-full" />
          <Bone className="w-16 h-4" />
        </div>
        <Bone className="w-6 h-3 mx-3" />
        <div className="flex-1 flex items-center gap-2 justify-end">
          <Bone className="w-16 h-4" />
          <Bone className="w-8 h-8 rounded-full" />
        </div>
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-white/5">
        <Bone className="w-20 h-3" />
        <Bone className="w-10 h-3" />
      </div>
    </div>
  );
}

export function MatchDetailSkeleton() {
  return (
    <div className="px-4 py-6">
      <div className="bg-[#111] rounded-2xl border border-white/5 p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1 flex flex-col items-center gap-2">
            <Bone className="w-16 h-16 rounded-2xl" />
            <Bone className="w-14 h-4" />
          </div>
          <Bone className="w-8 h-6 mx-4" />
          <div className="flex-1 flex flex-col items-center gap-2">
            <Bone className="w-16 h-16 rounded-2xl" />
            <Bone className="w-14 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function MemberSkeleton() {
  return (
    <div className="flex items-center justify-between bg-[#111] p-3 rounded-xl border border-white/5">
      <div className="flex items-center gap-2.5">
        <Bone className="w-5 h-4" />
        <Bone className="w-16 h-4" />
        <Bone className="w-6 h-3" />
      </div>
      <Bone className="w-10 h-4" />
    </div>
  );
}

export function ListSkeleton({ count = 3, children }: { count?: number; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>{children}</div>
      ))}
    </div>
  );
}
