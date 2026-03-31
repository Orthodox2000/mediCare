export default function GlobalLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-slate-50 via-cyan-50 to-blue-50">
      <div className="w-full max-w-lg rounded-2xl border border-cyan-100 bg-white/90 backdrop-blur shadow-xl p-8">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 flex items-center justify-center shadow">
            <div className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
          </div>
          <div>
            <p className="text-lg font-bold text-slate-900">Loading page</p>
            <p className="text-sm text-slate-600">Preparing content, please wait...</p>
          </div>
        </div>

        <div className="mt-7 space-y-3">
          <div className="h-4 w-4/5 rounded bg-slate-200 animate-pulse" />
          <div className="h-4 w-3/5 rounded bg-slate-200 animate-pulse" />
          <div className="h-4 w-5/6 rounded bg-slate-200 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
