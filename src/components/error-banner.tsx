export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="glass-card border-red-900/40 bg-red-950/30 p-5 text-center">
      <p className="text-sm font-medium text-red-400">{message}</p>
      <p className="text-xs text-gray-500 mt-1">
        Try refreshing the page. If the problem persists, the data source may be
        temporarily unavailable.
      </p>
    </div>
  );
}
