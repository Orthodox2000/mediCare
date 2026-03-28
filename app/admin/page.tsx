"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ThemeContext } from "../components/ThemeProvider";

type Tab = "doctors" | "patients" | "appointments" | "messages" | "settings";

type DoctorDoc = {
  _id: string;
  name: string;
  specialty: string;
  experience?: string | null;
  rating?: number | null;
  patients?: number | null;
  imageUrl?: string | null;
};

type PatientDoc = {
  _id?: string;
  uid: string;
  name: string;
  email: string | null;
  phone: string | null;
  provider?: string;
  photo?: string | null;
  createdAt?: string;
};

type AppointmentDoc = {
  _id: string;
  uid: string;
  patientEmail?: string | null;
  patientName?: string | null;
  doctor: string;
  specialty: string;
  date: string;
  time: string;
  status: string;
  reason?: string | null;
};

const DEFAULT_ADMIN_USERNAME = "admin";
const DEFAULT_ADMIN_PASSWORD = "Admin@123";

const tokenKey = "medicare_admin_token";

export default function AdminPage() {
  const theme = React.useContext(ThemeContext)!;

  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState(DEFAULT_ADMIN_USERNAME);
  const [password, setPassword] = useState(DEFAULT_ADMIN_PASSWORD);
  const [authError, setAuthError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [tab, setTab] = useState<Tab>("appointments");

  const authHeader = useMemo<Record<string, string>>(() => {
    return token ? { Authorization: `Bearer ${token}` } : ({} as Record<string, string>);
  }, [token]);

  useEffect(() => {
    const cached = typeof window !== "undefined" ? localStorage.getItem(tokenKey) : null;
    if (cached) setToken(cached);
  }, []);

  const login = async () => {
    setBusy(true);
    setAuthError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Login failed");
      localStorage.setItem(tokenKey, json.token);
      setToken(json.token);
    } catch (e: any) {
      setAuthError(e?.message || "Login failed");
    } finally {
      setBusy(false);
    }
  };

  const logout = () => {
    localStorage.removeItem(tokenKey);
    setToken(null);
  };

  if (!token) {
    return (
      <div className={`min-h-screen py-24 px-4 ${theme.bg} ${theme.text}`}>
        <div className="max-w-md mx-auto">
          <div className={`${theme.cardBg} rounded-2xl p-8 shadow-xl ${theme.border} border`}>
            <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
              Admin Login
            </h1>
            <p className={`${theme.textSecondary} text-sm mb-6`}>
              Hidden route for internal use. Credentials are auto-filled for testing.
            </p>

            {authError && (
              <div className="mb-4 p-3 rounded-xl border border-red-200 bg-red-50 text-red-700">
                {authError}
              </div>
            )}

            <div className="space-y-4">
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                className="w-full px-4 py-3 rounded-xl border"
                autoComplete="username"
              />
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                type="password"
                className="w-full px-4 py-3 rounded-xl border"
                autoComplete="current-password"
              />
              <button
                disabled={busy}
                onClick={login}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl hover:scale-[1.02] transition shadow-lg font-semibold"
              >
                {busy ? "Logging in..." : "Login"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen py-24 px-4 ${theme.bg} ${theme.text}`}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
              Admin Dashboard
            </h1>
            <p className={`${theme.textSecondary} text-sm mt-1`}>
              Manage doctors, patients, appointments, and messages.
            </p>
          </div>
          <button
            onClick={logout}
            className="px-5 py-2 rounded-xl border hover:bg-gray-100 transition"
          >
            Logout
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {([
            ["appointments", "Appointments"],
            ["doctors", "Doctors"],
            ["patients", "Patients"],
            ["messages", "Messages"],
            ["settings", "Settings"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-5 py-2 rounded-xl transition-all duration-300 transform hover:scale-105 ${
                tab === key
                  ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg"
                  : `${theme.cardBg} ${theme.border} border hover:border-blue-500`
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "doctors" && <DoctorsAdmin authHeader={authHeader} theme={theme} />}
        {tab === "patients" && <PatientsAdmin authHeader={authHeader} theme={theme} />}
        {tab === "appointments" && <AppointmentsAdmin authHeader={authHeader} theme={theme} />}
        {tab === "messages" && <MessagesAdmin authHeader={authHeader} theme={theme} />}
        {tab === "settings" && <SettingsAdmin authHeader={authHeader} theme={theme} />}
      </div>
    </div>
  );
}

function DoctorsAdmin({ authHeader, theme }: { authHeader: Record<string, string>; theme: any }) {
  const [list, setList] = useState<DoctorDoc[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [experience, setExperience] = useState("");

  const load = async () => {
    setError(null);
    const res = await fetch("/api/doctors");
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error || "Failed to load doctors");
    setList(json.data || []);
  };

  useEffect(() => {
    load().catch((e: any) => setError(e?.message || "Failed to load doctors"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addDoctor = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/doctors", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ name, specialty, experience }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Failed to add doctor");
      setName("");
      setSpecialty("");
      setExperience("");
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to add doctor");
    } finally {
      setBusy(false);
    }
  };

  const removeDoctor = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/doctors?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: authHeader,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Failed to remove doctor");
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to remove doctor");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`${theme.cardBg} rounded-2xl p-8 shadow-xl ${theme.border} border`}>
      <h2 className="text-2xl font-bold mb-4">Doctors</h2>
      {error && <p className="text-red-600 mb-4 text-sm">{error}</p>}

      <div className="grid md:grid-cols-3 gap-3 mb-6">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Doctor name"
          className="px-4 py-3 rounded-xl border"
        />
        <input
          value={specialty}
          onChange={(e) => setSpecialty(e.target.value)}
          placeholder="Specialty"
          className="px-4 py-3 rounded-xl border"
        />
        <input
          value={experience}
          onChange={(e) => setExperience(e.target.value)}
          placeholder="Experience (e.g., 10 years)"
          className="px-4 py-3 rounded-xl border"
        />
      </div>
      <button
        disabled={busy}
        onClick={addDoctor}
        className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold hover:scale-[1.02] transition shadow"
      >
        {busy ? "Saving..." : "Add Doctor"}
      </button>

      <div className="mt-8 space-y-3">
        {list.map((d) => (
          <DoctorRow
            key={d._id}
            doctor={d}
            authHeader={authHeader}
            theme={theme}
            busy={busy}
            onRemove={removeDoctor}
            onUpdated={load}
          />
        ))}
        {list.length === 0 && <p className={`${theme.textSecondary}`}>No doctors yet.</p>}
      </div>
    </div>
  );
}

function DoctorRow({
  doctor,
  authHeader,
  theme,
  busy,
  onRemove,
  onUpdated,
}: {
  doctor: DoctorDoc;
  authHeader: Record<string, string>;
  theme: any;
  busy: boolean;
  onRemove: (id: string) => Promise<void>;
  onUpdated: () => Promise<void>;
}) {
  const [edit, setEdit] = useState(false);
  const [name, setName] = useState(doctor.name || "");
  const [specialty, setSpecialty] = useState(doctor.specialty || "");
  const [experience, setExperience] = useState(doctor.experience || "");
  const [imageUrl, setImageUrl] = useState(doctor.imageUrl || "");
  const [localBusy, setLocalBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setLocalBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/doctors", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({
          id: doctor._id,
          name,
          specialty,
          experience,
          imageUrl,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Failed to update doctor");
      setEdit(false);
      await onUpdated();
    } catch (e: any) {
      setError(e?.message || "Failed to update doctor");
    } finally {
      setLocalBusy(false);
    }
  };

  return (
    <div className={`p-4 rounded-xl border ${theme.border}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold">{doctor.name}</p>
          <p className={`${theme.textSecondary} text-sm`}>{doctor.specialty}</p>
          {doctor.experience ? (
            <p className={`${theme.textSecondary} text-sm`}>{doctor.experience}</p>
          ) : null}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setEdit((v) => !v)}
            className="px-4 py-2 rounded-xl border hover:bg-gray-100 transition"
          >
            {edit ? "Close" : "Edit"}
          </button>
          <button
            disabled={busy || localBusy}
            onClick={() => onRemove(doctor._id)}
            className="px-4 py-2 rounded-xl border text-red-600 hover:bg-red-50 transition"
          >
            Remove
          </button>
        </div>
      </div>

      {edit && (
        <div className="mt-4 grid md:grid-cols-2 gap-3">
          {error && <p className="text-red-600 text-sm md:col-span-2">{error}</p>}
          <input value={name} onChange={(e) => setName(e.target.value)} className="px-4 py-3 rounded-xl border" placeholder="Name" />
          <input value={specialty} onChange={(e) => setSpecialty(e.target.value)} className="px-4 py-3 rounded-xl border" placeholder="Specialty" />
          <input value={experience} onChange={(e) => setExperience(e.target.value)} className="px-4 py-3 rounded-xl border" placeholder="Experience" />
          <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="px-4 py-3 rounded-xl border" placeholder="Image URL (optional)" />
          <button
            disabled={busy || localBusy}
            onClick={save}
            className="md:col-span-2 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold hover:scale-[1.01] transition shadow"
          >
            {localBusy ? "Saving..." : "Save"}
          </button>
        </div>
      )}
    </div>
  );
}

function PatientsAdmin({ authHeader, theme }: { authHeader: Record<string, string>; theme: any }) {
  const [list, setList] = useState<PatientDoc[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    const res = await fetch(`/api/admin/patients?q=${encodeURIComponent(q)}`, {
      headers: authHeader,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error || "Failed to load patients");
    setList(json.data || []);
  };

  useEffect(() => {
    load().catch((e: any) => setError(e?.message || "Failed to load patients"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`${theme.cardBg} rounded-2xl p-8 shadow-xl ${theme.border} border`}>
      <h2 className="text-2xl font-bold mb-4">Patients</h2>
      {error && <p className="text-red-600 mb-4 text-sm">{error}</p>}

      <div className="flex gap-3 mb-6">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by uid/email/name/phone"
          className="flex-1 px-4 py-3 rounded-xl border"
        />
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await load();
            } finally {
              setBusy(false);
            }
          }}
          className="px-6 py-3 rounded-xl border hover:bg-gray-100 transition"
        >
          Search
        </button>
      </div>

      <div className="space-y-3">
        {list.map((u) => (
          <PatientRow
            key={u.email || u.uid}
            patient={u}
            authHeader={authHeader}
            theme={theme}
            onUpdated={load}
          />
        ))}
        {list.length === 0 && <p className={`${theme.textSecondary}`}>No patients found.</p>}
      </div>
    </div>
  );
}

function PatientRow({
  patient,
  authHeader,
  theme,
  onUpdated,
}: {
  patient: PatientDoc;
  authHeader: Record<string, string>;
  theme: any;
  onUpdated: () => Promise<void>;
}) {
  const [edit, setEdit] = useState(false);
  const [name, setName] = useState(patient.name || "");
  const [email, setEmail] = useState(patient.email || "");
  const [phone, setPhone] = useState(patient.phone || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/patients", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({
          uid: patient.email ? "" : patient.uid,
          targetEmail: patient.email || "",
          name,
          email,
          phone,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Failed to update patient");
      setEdit(false);
      await onUpdated();
    } catch (e: any) {
      setError(e?.message || "Failed to update patient");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`p-4 rounded-xl border ${theme.border}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold">{patient.email || patient.name || "Patient"}</p>
          <p className={`${theme.textSecondary} text-sm`}>{patient.name || "—"}</p>
          <p className={`${theme.textSecondary} text-sm`}>{patient.phone || "—"}</p>
          {!patient.email && (
            <p className={`${theme.textSecondary} text-xs mt-1`}>uid: {patient.uid}</p>
          )}
        </div>
        <button
          onClick={() => setEdit((v) => !v)}
          className="px-4 py-2 rounded-xl border hover:bg-gray-100 transition"
        >
          {edit ? "Close" : "Edit"}
        </button>
      </div>

      {edit && (
        <div className="mt-4 grid md:grid-cols-3 gap-3">
          {error && <p className="text-red-600 text-sm md:col-span-3">{error}</p>}
          <input value={name} onChange={(e) => setName(e.target.value)} className="px-4 py-3 rounded-xl border" placeholder="Name" />
          <input value={email} onChange={(e) => setEmail(e.target.value)} className="px-4 py-3 rounded-xl border" placeholder="Email" />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className="px-4 py-3 rounded-xl border" placeholder="Phone (+E164 or blank)" />
          <button
            disabled={busy}
            onClick={save}
            className="md:col-span-3 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold hover:scale-[1.01] transition shadow"
          >
            {busy ? "Saving..." : "Save Changes"}
          </button>
        </div>
      )}
    </div>
  );
}

function AppointmentsAdmin({ authHeader, theme }: { authHeader: Record<string, string>; theme: any }) {
  const [list, setList] = useState<AppointmentDoc[]>([]);
  const [doctor, setDoctor] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [status, setStatus] = useState("");
  const [doctors, setDoctors] = useState<{ name: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    const params = new URLSearchParams();
    if (doctor) params.set("doctor", doctor);
    if (status) params.set("status", status);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);

    const res = await fetch(`/api/admin/appointments?${params.toString()}`, {
      headers: authHeader,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error || "Failed to load appointments");
    setList(json.data || []);
  };

  useEffect(() => {
    load().catch((e: any) => setError(e?.message || "Failed to load appointments"));
    (async () => {
      try {
        const res = await fetch("/api/doctors");
        const json = await res.json().catch(() => ({}));
        if (res.ok) setDoctors((json.data || []).map((d: any) => ({ name: String(d.name || "") })));
      } catch {
        // ignore
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateStatus = async (id: string, next: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ id, status: next }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Failed to update appointment");
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to update appointment");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`${theme.cardBg} rounded-2xl p-8 shadow-xl ${theme.border} border`}>
      <h2 className="text-2xl font-bold mb-4">Appointments</h2>
      {error && <p className="text-red-600 mb-4 text-sm">{error}</p>}

      <div className="grid md:grid-cols-4 gap-3 mb-6">
        <select value={doctor} onChange={(e) => setDoctor(e.target.value)} className="px-4 py-3 rounded-xl border">
          <option value="">All doctors</option>
          {doctors.map((d) => (
            <option key={d.name} value={d.name}>
              {d.name}
            </option>
          ))}
        </select>
        <input value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="px-4 py-3 rounded-xl border" type="date" />
        <input value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="px-4 py-3 rounded-xl border" type="date" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-4 py-3 rounded-xl border">
          <option value="">All statuses</option>
          <option value="pending_approval">pending_approval</option>
          <option value="approved">approved</option>
          <option value="rejected">rejected</option>
          <option value="sent">sent</option>
          <option value="cancelled">cancelled</option>
        </select>
      </div>
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await load();
          } finally {
            setBusy(false);
          }
        }}
        className="px-6 py-3 rounded-xl border hover:bg-gray-100 transition"
      >
        Refresh / Sort
      </button>

      <div className="mt-8 space-y-3">
        {list.map((a) => (
          <div key={a._id} className={`p-4 rounded-xl border ${theme.border}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold">{a.doctor} • {a.date} • {a.time}</p>
                <p className={`${theme.textSecondary} text-sm`}>{a.specialty}</p>
                <p className={`${theme.textSecondary} text-sm mt-1`}>
                  Patient: {a.patientEmail || a.patientName || "—"}
                </p>
                {!a.patientEmail && (
                  <p className={`${theme.textSecondary} text-xs mt-1`}>uid: {a.uid}</p>
                )}
                {a.reason ? <p className={`${theme.textSecondary} text-sm mt-2`}>{a.reason}</p> : null}
              </div>
              <div className="flex flex-col gap-2 items-end">
                <span className="text-xs px-3 py-1 rounded-full bg-gray-100 border">{a.status}</span>
                <div className="flex gap-2">
                  <button disabled={busy} onClick={() => updateStatus(a._id, "approved")} className="px-4 py-2 rounded-xl border hover:bg-green-50 transition">
                    Approve
                  </button>
                  <button disabled={busy} onClick={() => updateStatus(a._id, "rejected")} className="px-4 py-2 rounded-xl border hover:bg-red-50 transition">
                    Reject
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
        {list.length === 0 && <p className={`${theme.textSecondary}`}>No appointments found.</p>}
      </div>
    </div>
  );
}

function MessagesAdmin({ authHeader, theme }: { authHeader: Record<string, string>; theme: any }) {
  const [patients, setPatients] = useState<PatientDoc[]>([]);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [sendToAll, setSendToAll] = useState(false);
  const [title, setTitle] = useState("Important update");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/patients?q=", { headers: authHeader });
        const json = await res.json().catch(() => ({}));
        if (res.ok) setPatients(json.data || []);
      } catch {
        // ignore
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const send = async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/admin/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ title, message, emails: selectedEmails, sendToAll }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Failed to send message");
      setResult(`Sent to ${json.count} patient(s).`);
      setMessage("");
      setSelectedEmails([]);
    } catch (e: any) {
      setError(e?.message || "Failed to send message");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`${theme.cardBg} rounded-2xl p-8 shadow-xl ${theme.border} border`}>
      <h2 className="text-2xl font-bold mb-4">Message Board</h2>
      <p className={`${theme.textSecondary} text-sm mb-4`}>
        Send targeted messages to patients. These appear as notifications on their dashboard.
      </p>

      {error && <p className="text-red-600 mb-3 text-sm">{error}</p>}
      {result && <p className="text-green-700 mb-3 text-sm">{result}</p>}

      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={sendToAll} onChange={(e) => setSendToAll(e.target.checked)} />
          Send to all patients
        </label>
        {!sendToAll && (
          <select
            multiple
            value={selectedEmails}
            onChange={(e) => {
              const values = Array.from(e.target.selectedOptions).map((o) => o.value);
              setSelectedEmails(values);
            }}
            className="w-full px-4 py-3 rounded-xl border min-h-[140px]"
          >
            {patients
              .filter((p) => p.email)
              .map((p) => (
                <option key={p.email!} value={p.email!}>
                  {p.email} ({p.name || "—"})
                </option>
              ))}
          </select>
        )}
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-4 py-3 rounded-xl border" placeholder="Title" />
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} className="w-full px-4 py-3 rounded-xl border" rows={5} placeholder="Message..." />

        <button
          disabled={busy}
          onClick={send}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold hover:scale-[1.01] transition shadow"
        >
          {busy ? "Sending..." : "Send Message"}
        </button>
      </div>
    </div>
  );
}

function SettingsAdmin({ authHeader, theme }: { authHeader: Record<string, string>; theme: any }) {
  const [currentPassword, setCurrentPassword] = useState(DEFAULT_ADMIN_PASSWORD);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ currentPassword, newUsername, newPassword }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Failed to update settings");
      setOk("Updated.");
      setNewPassword("");
      setNewUsername("");
    } catch (e: any) {
      setError(e?.message || "Failed to update settings");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`${theme.cardBg} rounded-2xl p-8 shadow-xl ${theme.border} border`}>
      <h2 className="text-2xl font-bold mb-4">Admin Settings</h2>
      <p className={`${theme.textSecondary} text-sm mb-4`}>
        Change admin username/password. Current password is required.
      </p>
      {error && <p className="text-red-600 mb-3 text-sm">{error}</p>}
      {ok && <p className="text-green-700 mb-3 text-sm">{ok}</p>}

      <div className="grid md:grid-cols-3 gap-3">
        <input
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="px-4 py-3 rounded-xl border"
          placeholder="Current password"
          type="password"
        />
        <input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} className="px-4 py-3 rounded-xl border" placeholder="New username (optional)" />
        <input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="px-4 py-3 rounded-xl border" placeholder="New password (optional)" type="password" />
      </div>
      <button
        disabled={busy}
        onClick={save}
        className="mt-4 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold hover:scale-[1.01] transition shadow"
      >
        {busy ? "Saving..." : "Save Settings"}
      </button>
    </div>
  );
}
