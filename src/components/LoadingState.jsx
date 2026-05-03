export default function LoadingState({ label = 'Loading...' }) {
  return (
    <div
      className="flex min-h-[240px] flex-col items-center justify-center gap-4 rounded-[24px] border border-white/10 bg-white/5 p-10 text-slate-300 backdrop-blur-md"
      role="status"
    >
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-cyan border-t-transparent" />
      <span className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">{label}</span>
    </div>
  );
}
