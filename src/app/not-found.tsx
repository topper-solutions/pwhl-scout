import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
      <div className="glass-card p-8 max-w-md">
        <h2 className="text-4xl font-display font-black text-white mb-2">
          404
        </h2>
        <p className="text-sm text-gray-400 mb-4">
          This page doesn&apos;t exist. The game or team you&apos;re looking for
          may have been moved or removed.
        </p>
        <Link
          href="/"
          className="inline-block px-4 py-2 text-sm font-medium bg-rink-700 hover:bg-rink-600 text-white rounded-lg transition-colors"
        >
          Back to scores
        </Link>
      </div>
    </div>
  );
}
