export default function LoadingState({ label = 'Loading…' }) {
  return (
    <div className="loading-state" role="status">
      <span className="loading-state__dot" />
      <span>{label}</span>
    </div>
  );
}
