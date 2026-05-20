export default function BackgroundBlobs() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <div className="absolute -left-[10%] -top-[10%] h-[42vw] w-[42vw] rounded-full bg-cyan/20 blur-[110px] animate-blob-1" />
      <div className="absolute right-[-12%] top-[18%] h-[36vw] w-[36vw] rounded-full bg-fuchsia-500/20 blur-[110px] animate-blob-2" />
      <div className="absolute bottom-[-18%] left-[22%] h-[48vw] w-[48vw] rounded-full bg-violet-500/15 blur-[130px] animate-blob-3" />
    </div>
  );
}
