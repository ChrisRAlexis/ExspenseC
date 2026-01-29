export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="h-8 bg-white/50 rounded-xl w-48 animate-pulse" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-white/40 backdrop-blur-xl rounded-2xl animate-pulse border border-white/50" style={{ animationDelay: `${i * 50}ms` }} />
        ))}
      </div>
      <div className="h-64 bg-white/40 backdrop-blur-xl rounded-2xl animate-pulse border border-white/50" />
    </div>
  );
}
