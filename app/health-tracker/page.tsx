"use client";

import React, { useState } from "react";
import {
  Heart,
  Activity,
  TrendingUp,
  Zap,
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

// Example weekly data
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
  const [selectedMetric, setSelectedMetric] = useState<string>("heartRate");

  return (
    <div className="min-h-screen text-black p-10 bg-gray-100 flex flex-col space-y-10">
      {/* Header */}
      <h1 className="text-4xl font-bold text-black">Health Trends Dashboard</h1>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {healthMetrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div
              key={metric.id}
              onClick={() => setSelectedMetric(metric.id)}
              className={`rounded-2xl p-6 shadow-md border border-gray-200 flex items-center space-x-4 cursor-pointer transition-transform transform hover:scale-105 ${
                selectedMetric === metric.id ? "ring-4 ring-blue-500 ring-opacity-50" : ""
              } bg-white`}
            >
              <div
                className="p-3 rounded-xl text-black"
                style={{ background: metric.color }}
              >
                <Icon size={28} />
              </div>

              <div>
                <p className="text-sm text-gray-800">{metric.label}</p>
                <h3 className="text-xl font-bold text-gray-800">
                  {metric.value}{" "}
                  <span className="text-gray-800 text-sm ">{metric.unit}</span>
                </h3>
                <p className="text-xs text-green-600">{metric.status}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Trend Line Chart */}
      <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-200">
        <h2 className="text-2xl font-bold mb-6 text-black">Weekly Trend: {healthMetrics.find(m => m.id === selectedMetric)?.label}</h2>

        <ResponsiveContainer width="100%" height={400}>
          <LineChart
            data={trendData}
            margin={{ top: 20, right: 30, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.4} />
            <XAxis dataKey="day" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />

            <Line
              type="monotone"
              dataKey={selectedMetric as keyof typeof trendData[0]}
              stroke={
                selectedMetric === "heartRate"
                  ? "#ef4444"
                  : selectedMetric === "bloodPressure"
                  ? "#3b82f6"
                  : selectedMetric === "weight"
                  ? "#22c55e"
                  : "#a855f7"
              }
              strokeWidth={3}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
