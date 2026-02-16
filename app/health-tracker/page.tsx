"use client";

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
    label: "Blood Pressure",
    value: "120/80",
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

const trendData = [
  { day: "Mon", heartRate: 70, bloodPressure: 118, weight: 68.2, sugar: 95 },
  { day: "Tue", heartRate: 72, bloodPressure: 120, weight: 68.1, sugar: 98 },
  { day: "Wed", heartRate: 75, bloodPressure: 122, weight: 68.0, sugar: 100 },
  { day: "Thu", heartRate: 71, bloodPressure: 119, weight: 68.1, sugar: 96 },
  { day: "Fri", heartRate: 73, bloodPressure: 121, weight: 68.2, sugar: 97 },
  { day: "Sat", heartRate: 76, bloodPressure: 124, weight: 68.3, sugar: 102 },
  { day: "Sun", heartRate: 72, bloodPressure: 120, weight: 68.2, sugar: 98 },
];

export default function HealthTrendPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [selectedMetric, setSelectedMetric] = useState("heartRate");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ✅ CHART DATA STATE (STATIC + DB)
  const [chartData, setChartData] = useState(trendData);

  const [form, setForm] = useState({
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
      router.replace("/health-tracer");
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
        const res = await fetch(
          `/api/health/add?userId=${encodeURIComponent(user.email)}`
        );
        const data = await res.json();

        if (!data.success || !Array.isArray(data.data)) return;

        const dbPoints = data.data.map((d: any) => ({
          day: d.day, // normalized in API
          heartRate: d.heartRate,
          bloodPressure: d.bloodPressure,
          weight: d.weight,
          sugar: d.sugar,
        }));

        const merged = [ ...dbPoints,...trendData].slice(0,7);
        console.log(merged);
        setChartData(merged);
      } catch (err) {
        console.error("Fetch error:", err);
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
      const payload = {
        userId: user.email,
        date: new Date().toISOString().split("T")[0],
        heartRate: Number(form.heartRate),
        bloodPressure: Number(form.bloodPressure),
        weight: Number(form.weight),
        sugar: Number(form.sugar),
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
      setForm({ heartRate: "", bloodPressure: "", weight: "", sugar: "" });
    } catch {
      setError("Failed to save health data");
    } finally {
      setSaving(false);
      setTimeout(() => {
        setMessage(null);
        setError(null);
      }, 3000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-10 space-y-8">
      <h1 className="text-4xl font-bold text-black">
        Health Trends Dashboard
      </h1>
    <div className="flex flex-row gap-5">
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
        onClick={() => window.location.reload()}
        className="flex items-center gap-2 px-6 py-3 rounded-xl
        bg-gradient-to-r from-blue-600 to-cyan-500 text-white
        hover:scale-105 transition shadow"
      >Refresh</button></div>

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
    <XAxis dataKey="day" />
    <YAxis />
    <Tooltip
      formatter={(value: number) => value}
      labelFormatter={(label: string) => label}
    />
    <Legend />
    <Line
      type="monotone"
      dataKey={selectedMetric}
      stroke="#2563eb"
      strokeWidth={3}
      dot={{ r: 4 }}
      activeDot={{ r: 6 }}
    />
  </LineChart>
</ResponsiveContainer>

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

            {[
              { key: "heartRate", label: "Heart Rate (bpm)" },
              { key: "bloodPressure", label: "Blood Pressure" },
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
