"use client";
import { jsPDF } from "jspdf";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Heart,
  Activity,
  TrendingUp,
  Zap,
  Plus,
  X,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { useAuth } from "@/app/lib/AuthContext";

interface Metric {
  id: string;
  label: string;
  value: string;
  unit: string;
  icon: React.ElementType;
  color: string;
  status: string;
}

const healthMetrics: Metric[] = [
  {
    id: "heartRate",
    label: "Heart Rate",
    value: "72",
    unit: "bpm",
    icon: Heart,
    color: "#ef4444",
    status: "Normal",
  },
  {
    id: "bloodPressure",
    label: "Blood Pressure (Systolic)",
    value: "120",
    unit: "mmHg",
    icon: Activity,
    color: "#3b82f6",
    status: "Good",
  },
  {
    id: "weight",
    label: "Weight",
    value: "68",
    unit: "kg",
    icon: TrendingUp,
    color: "#22c55e",
    status: "Stable",
  },
  {
    id: "sugar",
    label: "Blood Sugar",
    value: "98",
    unit: "mg/dL",
    icon: Zap,
    color: "#a855f7",
    status: "Controlled",
  },
];

type HealthPoint = {
  day: string; // ISO YYYY-MM-DD
  heartRate: number | null;
  bloodPressure: number | null; // systolic
  weight: number | null;
  sugar: number | null;
};

type ChartPoint = HealthPoint & {
  isFiller: boolean;
};

const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);
const toIsoDate = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const lastNDatesIso = (n: number) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dates: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    dates.push(toIsoDate(d));
  }
  return dates;
};

const lastNDatesIsoEndingAt = (endIso: string, n: number) => {
  const end = new Date(`${endIso}T00:00:00`);
  if (Number.isNaN(end.getTime())) return lastNDatesIso(n);
  end.setHours(0, 0, 0, 0);
  const dates: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(end.getDate() - i);
    dates.push(toIsoDate(d));
  }
  return dates;
};

const formatShortDate = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
};

const dummyForIndex = (i: number): Omit<HealthPoint, "day"> => {
  const base = [
    { heartRate: 70, bloodPressure: 118, weight: 68.2, sugar: 95 },
    { heartRate: 72, bloodPressure: 120, weight: 68.1, sugar: 98 },
    { heartRate: 75, bloodPressure: 122, weight: 68.0, sugar: 100 },
    { heartRate: 71, bloodPressure: 119, weight: 68.1, sugar: 96 },
    { heartRate: 73, bloodPressure: 121, weight: 68.2, sugar: 97 },
    { heartRate: 76, bloodPressure: 124, weight: 68.3, sugar: 102 },
    { heartRate: 72, bloodPressure: 120, weight: 68.2, sugar: 98 },
  ];
  return base[i % base.length];
};

const alignSeries = (dates: string[], dbPoints: HealthPoint[]): ChartPoint[] => {
  const byDay = new Map<string, HealthPoint>();
  for (const p of dbPoints) byDay.set(p.day, p);

  return dates.map((day, idx) => {
    const existing = byDay.get(day);
    if (existing) {
      return {
        day,
        heartRate: existing.heartRate ?? null,
        bloodPressure: existing.bloodPressure ?? null,
        weight: existing.weight ?? null,
        sugar: existing.sugar ?? null,
        isFiller: false,
      } satisfies ChartPoint;
    }

    const dummy = dummyForIndex(idx);
    return {
      day,
      heartRate: dummy.heartRate,
      bloodPressure: dummy.bloodPressure,
      weight: dummy.weight,
      sugar: dummy.sugar,
      isFiller: true,
    } satisfies ChartPoint;
  });
};

export default function HealthTrendPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  // Table should show only real DB points (no dummy filler)
  const [details, setDetails] = useState<HealthPoint[]>([]);
  const [selectedMetric, setSelectedMetric] = useState("heartRate");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);

  // ✅ CHART DATA STATE (STATIC + DB)
  const [chartData, setChartData] = useState<ChartPoint[]>(() =>
    alignSeries(lastNDatesIso(7), [])
  );

  const [form, setForm] = useState({
    date: toIsoDate(new Date()),
    heartRate: "",
    bloodPressure: "",
    weight: "",
    sugar: "",
  });

  /* =======================
     AUTH GUARD
  ======================= */
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [user, loading, router]);

  /* =======================
     FETCH + MERGE DATA
  ======================= */
  useEffect(() => {
    if (!user?.email) return;

    const fetchHealthData = async () => {
      try {
         if (!user?.email) return;
        setFetching(true);
        const res = await fetch(
          `/api/health/add?userId=${encodeURIComponent(user.email)}`
        );
        const data = await res.json();

        if (!data.success || !Array.isArray(data.data)) return;

        const dbPointsRaw: HealthPoint[] = data.data
          .map((d: any) => ({
            day: String(d.day || ""),
            heartRate: typeof d.heartRate === "number" ? d.heartRate : null,
            bloodPressure:
              typeof d.bloodPressure === "number" ? d.bloodPressure : null,
            weight: typeof d.weight === "number" ? d.weight : null,
            sugar: typeof d.sugar === "number" ? d.sugar : null,
          }))
          .filter((p: HealthPoint) => /^\d{4}-\d{2}-\d{2}$/.test(p.day));

        // If multiple records exist for the same day, keep the latest one
        const byDay = new Map<string, HealthPoint>();
        for (const p of dbPointsRaw) byDay.set(p.day, p);
        const dbPoints = Array.from(byDay.values()).sort((a, b) =>
          a.day.localeCompare(b.day)
        );

        setDetails(dbPoints);
        if (!dbPoints.length) {
          // No real data -> remove fake filler entirely
          setChartData([]);
        } else {
          const end = dbPoints[dbPoints.length - 1].day;
          const dates = lastNDatesIsoEndingAt(end, 7);
          setChartData(alignSeries(dates, dbPoints));
        }
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setFetching(false);
      }
    }; 
    fetchHealthData();
  }, [user]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        Checking authentication...
      </div>
    );
  }

  /* =======================
     SUBMIT HANDLER
  ======================= */
  const handleSubmit = async () => {
    if (!user?.email) return;

    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const safeDate = form.date;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(safeDate)) {
        throw new Error("Invalid date");
      }

      const toNumOrNull = (v: string) => {
        const t = v.trim();
        if (!t) return null;
        const n = Number(t);
        if (!Number.isFinite(n)) return null;
        return n;
      };

      const heartRate = toNumOrNull(form.heartRate);
      const bloodPressure = toNumOrNull(form.bloodPressure);
      const weight = toNumOrNull(form.weight);
      const sugar = toNumOrNull(form.sugar);

      if (
        heartRate == null &&
        bloodPressure == null &&
        weight == null &&
        sugar == null
      ) {
        throw new Error("Enter at least one metric");
      }

      const payload = {
        userId: user.email,
        date: safeDate,
        heartRate,
        bloodPressure,
        weight,
        sugar,
      };

      const res = await fetch("/api/health/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error();

      setMessage("Health data saved successfully ✅");
      setShowModal(false);
      setForm({
        date: toIsoDate(new Date()),
        heartRate: "",
        bloodPressure: "",
        weight: "",
        sugar: "",
      });

      setFetching(true);
      const refreshed = await fetch(
        `/api/health/add?userId=${encodeURIComponent(user.email)}`
      );
      const refreshedJson = await refreshed.json().catch(() => ({}));
      if (
        refreshed.ok &&
        refreshedJson?.success &&
        Array.isArray(refreshedJson?.data)
      ) {
        const dbPointsRaw: HealthPoint[] = refreshedJson.data
          .map((d: any) => ({
            day: String(d.day || ""),
            heartRate: typeof d.heartRate === "number" ? d.heartRate : null,
            bloodPressure:
              typeof d.bloodPressure === "number" ? d.bloodPressure : null,
            weight: typeof d.weight === "number" ? d.weight : null,
            sugar: typeof d.sugar === "number" ? d.sugar : null,
          }))
          .filter((p: HealthPoint) => /^\d{4}-\d{2}-\d{2}$/.test(p.day));

        const byDay = new Map<string, HealthPoint>();
        for (const p of dbPointsRaw) byDay.set(p.day, p);
        const dbPoints = Array.from(byDay.values()).sort((a, b) =>
          a.day.localeCompare(b.day)
        );

        setDetails(dbPoints);
        if (!dbPoints.length) {
          setChartData([]);
        } else {
          const end = dbPoints[dbPoints.length - 1].day;
          const dates = lastNDatesIsoEndingAt(end, 7);
          setChartData(alignSeries(dates, dbPoints));
        }
      }
    } catch (e: any) {
      setError(e?.message || "Failed to save health data");
    } finally {
      setSaving(false);
      setFetching(false);
      setTimeout(() => {
        setMessage(null);
        setError(null);
      }, 3000);
    }
  };

  //metric table printing
  const handlePrintPDF = async () => {
  const doc = new jsPDF();

  // Dynamically import the autotable plugin
  const { default: autoTable } = await import("jspdf-autotable");
  
  autoTable(doc, {
    html: "#metrics-table",
    theme: "grid",
    styles: { fontSize: 8 },
    startY: 10,
  });
  doc.save("metrics.pdf");
};

  return (
    <div className="min-h-screen bg-gray-100 p-10 space-y-8">
      
  
      <h1 className="text-4xl font-bold text-black">
        Health Trends Dashboard
      </h1>
    <div className="flex flex-row gap-5 flex-wrap">
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 px-6 py-3 rounded-xl
        bg-gradient-to-r from-blue-600 to-cyan-500 text-white
        hover:scale-105 transition shadow "
      >
        <Plus size={18} />
        Add Health Data
      </button>
      <button
        onClick={() => {
          if (!user?.email) return;
          setFetching(true);
          fetch(`/api/health/add?userId=${encodeURIComponent(user.email)}`)
            .then((r) => r.json())
            .then((data) => {
              if (!data?.success || !Array.isArray(data?.data)) return;
              const dbPointsRaw: HealthPoint[] = data.data
                .map((d: any) => ({
                  day: String(d.day || ""),
                  heartRate: typeof d.heartRate === "number" ? d.heartRate : null,
                  bloodPressure:
                    typeof d.bloodPressure === "number" ? d.bloodPressure : null,
                  weight: typeof d.weight === "number" ? d.weight : null,
                  sugar: typeof d.sugar === "number" ? d.sugar : null,
                }))
                .filter((p: HealthPoint) => /^\d{4}-\d{2}-\d{2}$/.test(p.day));
              const byDay = new Map<string, HealthPoint>();
              for (const p of dbPointsRaw) byDay.set(p.day, p);
              const dbPoints = Array.from(byDay.values()).sort((a, b) =>
                a.day.localeCompare(b.day)
              );

              const aligned = alignSeries(lastNDatesIso(7), dbPoints);
              setDetails(dbPoints);
              setChartData(aligned);
            })
            .finally(() => setFetching(false));
        }}
        className="flex items-center gap-2 px-6 py-3 rounded-xl
        bg-gradient-to-r from-blue-600 to-cyan-500 text-white
        hover:scale-105 transition shadow"
      >Refresh</button></div>

      {fetching && (
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <div className="w-4 h-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
          Loading latest data...
        </div>
      )}

      {message && (
        <div className="bg-green-100 text-green-700 px-4 py-3 rounded-xl">
          {message}
        </div>
      )}
      {error && (
        <div className="bg-red-100 text-red-700 px-4 py-3 rounded-xl">
          {error}
        </div>
      )}
     

      {/* METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {healthMetrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div
              key={metric.id}
              onClick={() => setSelectedMetric(metric.id)}
              className={`bg-white p-6 rounded-2xl shadow-md cursor-pointer
              transition-transform hover:scale-105
              ${
                selectedMetric === metric.id
                  ? "ring-4 ring-blue-500 ring-opacity-50"
                  : ""
              }`}
            >
              <div
                className="p-3 rounded-xl w-fit mb-3"
                style={{ backgroundColor: metric.color }}
              >
                <Icon className="text-white" />
              </div>

              <p className="text-sm text-gray-600">{metric.label}</p>
              <p className="text-xl font-bold text-gray-800">
                {metric.value}{" "}
                <span className="text-sm font-normal">{metric.unit}</span>
              </p>
              <p className="text-xs text-green-600">{metric.status}</p>
            </div>
          );
        })}
      </div>

      {/* CHART */}
      <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-200">
        <h2 className="text-2xl font-bold mb-6 text-black">
          Weekly Trend:{" "}
          {healthMetrics.find((m) => m.id === selectedMetric)?.label}
        </h2>

        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.4} />
            <XAxis
              dataKey="day"
              tickFormatter={(v: string) => formatShortDate(v)}
              minTickGap={12}
            />
            <YAxis />
            <Tooltip
              formatter={(value: any) => (value == null ? "—" : value)}
              labelFormatter={(label: string) => formatShortDate(label)}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey={selectedMetric}
              stroke="#2563eb"
              strokeWidth={3}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>

{/* Table to show all metrics */}
<div className="overflow-x-auto mt-8">
   <button
        onClick={() =>  handlePrintPDF()}
        className="flex items-center px-6 py-3 rounded-xl
        bg-gradient-to-r from-blue-600 to-cyan-500 text-white
        hover:scale-105 transition shadow mb-2 w-[150px]"
      >Print Table</button>
  {details.length === 0 ? (
    <p className="text-sm text-gray-600">No saved health entries yet.</p>
  ) : (
  <table className="w-full min-w-max  text-gray-600 border border-gray-500"    id="metrics-table">
    <thead>
      <tr>
        {/* Dynamic headers based on keys in your data */}
        {Object.keys(details[0] || {}).map((key) => (
          <th key={key} className="border px-4 py-2 text-left capitalize">
            {key}
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {details.map((item, index) => (
        <tr key={index} className="hover:bg-gray-100">
          {Object.values(item).map((value, i) => (
            <td key={i} className="border px-4 py-2">
              {value == null ? "—" : String(value)}
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
  )}
</div>

      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl w-full max-w-md space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl text-gray-700 font-bold">Add Health Data</h2>
              <button onClick={() => setShowModal(false)}>
                <X />
              </button>
            </div>

            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              max={toIsoDate(new Date())}
              className="w-full border p-3 rounded-lg text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {[
              { key: "heartRate", label: "Heart Rate (bpm)" },
              { key: "bloodPressure", label: "Blood Pressure (Systolic mmHg)" },
              { key: "weight", label: "Weight (kg)" },
              { key: "sugar", label: "Blood Sugar (mg/dL)" },
            ].map((f) => (
              <input
                key={f.key}
                type="number"
                placeholder={f.label}
                value={(form as any)[f.key]}
                onChange={(e) =>
                  setForm({ ...form, [f.key]: e.target.value })
                }
                className="w-full border p-3 rounded-lg text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                min={0}
              />
            ))}

            <button
              onClick={handleSubmit}
              disabled={saving}
              className="w-full py-3 rounded-xl text-white
              bg-gradient-to-r from-blue-600 to-cyan-500
              hover:scale-105 transition"
            >
              {saving ? "Saving..." : "Submit"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
