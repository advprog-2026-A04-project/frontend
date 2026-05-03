import BackgroundBlobs from './BackgroundBlobs';
import PrimaryHeader from './PrimaryHeader';

export default function PageShell({
  active = 'home',
  children,
  walletBalance = null,
  showSearch = false,
  contentClassName = '',
}) {
  return (
    <div className="min-h-screen bg-[#0B0914] font-display text-white selection:bg-fuchsia-500/30">
      <BackgroundBlobs />
      <div className="relative z-10">
        <PrimaryHeader active={active} showSearch={showSearch} walletBalance={walletBalance} />
        <main className={`mx-auto w-full max-w-7xl px-4 pb-16 pt-8 sm:px-6 lg:px-8 ${contentClassName}`.trim()}>
          {children}
        </main>
      </div>
    </div>
  );
}
