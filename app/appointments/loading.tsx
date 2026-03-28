export default function LoadingAppointments() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 flex items-center justify-center">
            <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">Loading Appointments</p>
            <p className="text-sm text-gray-600">Preparing your appointment history…</p>
          </div>
        </div>

        <div className="mt-8 space-y-3">
          <div className="h-4 w-4/5 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-3/5 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-5/6 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}

