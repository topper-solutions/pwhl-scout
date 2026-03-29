"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
      <div className="glass-card p-8 max-w-md">
        <h2 className="text-xl font-display font-bold text-white mb-2">
          Something went wrong
        </h2>
        <p className="text-sm text-gray-400 mb-4">
          {error.message || "An unexpected error occurred."}
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 text-sm font-medium bg-rink-700 hover:bg-rink-600 text-white rounded-lg transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
