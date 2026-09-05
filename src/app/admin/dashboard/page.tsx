// app/admin/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export interface ScheduleState {
    fajr: string;
    zuhr: string;
    asr: string;
    maghrib: string;
    isha: string;
    jummah: string;
}

interface AssignedMosque {
    mosque_id: string;
    role: string;
    name: string;
}

// Database query response interface for strict typing
interface MosqueAdminQueryResult {
    mosque_id: string;
    role: string;
    mosques: { name: string } | { name: string }[] | null;
}

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/;
const PRAYERS: (keyof ScheduleState)[] = ["fajr", "zuhr", "asr", "maghrib", "isha", "jummah"];

export default function AdminDashboardPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [assignedMosques, setAssignedMosques] = useState<AssignedMosque[]>([]);
    const [selectedMosqueId, setSelectedMosqueId] = useState<string>("");

    // Explicitly typed state prevents 'never' type inference
    const [schedule, setSchedule] = useState<ScheduleState>({
        fajr: "05:00",
        zuhr: "13:30",
        asr: "17:00",
        maghrib: "18:45",
        isha: "20:15",
        jummah: "13:30",
    });

    const [validationErrors, setValidationErrors] = useState<Partial<Record<keyof ScheduleState, string>>>({});
    const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // 1. Authenticate user and check mosque_admins assignment
    useEffect(() => {
        async function initDashboard() {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                router.push("/admin/login");
                return;
            }

            setUser(session.user);

            // Fetch admin entries with explicit type casting
            const { data: adminEntries, error: adminErr } = await supabase
                .from("mosque_admins")
                .select("mosque_id, role, mosques(name)")
                .eq("user_id", session.user.id);

            if (adminErr || !adminEntries || adminEntries.length === 0) {
                setFeedback({
                    type: "error",
                    text: "Access Denied: You are not assigned to any mosque administrative team.",
                });
                setLoading(false);
                return;
            }

            const rawEntries = adminEntries as unknown as MosqueAdminQueryResult[];

            const formattedMosques: AssignedMosque[] = rawEntries.map((item) => {
                let mosqueName = "Unknown Mosque";
                if (item.mosques) {
                    if (Array.isArray(item.mosques)) {
                        mosqueName = item.mosques[0]?.name || "Unknown Mosque";
                    } else {
                        mosqueName = item.mosques.name;
                    }
                }
                return {
                    mosque_id: item.mosque_id,
                    role: item.role,
                    name: mosqueName,
                };
            });

            setAssignedMosques(formattedMosques);
            setSelectedMosqueId(formattedMosques[0].mosque_id);
        }

        initDashboard();
    }, [router]);

    // 2. Fetch current Iqamah schedule when mosque selection changes
    useEffect(() => {
        if (!selectedMosqueId) return;

        async function fetchSchedule() {
            setLoading(true);
            setFeedback(null);

            const { data, error } = await supabase
                .from("iqamah_schedules")
                .select("fajr, zuhr, asr, maghrib, isha, jummah")
                .eq("mosque_id", selectedMosqueId)
                .single();

            if (error) {
                setFeedback({ type: "error", text: "Failed to load schedule for this mosque." });
            } else if (data) {
                const formatTime = (timeStr: string) => (timeStr ? timeStr.slice(0, 5) : "00:00");
                const typedData = data as Record<keyof ScheduleState, string>;

                setSchedule({
                    fajr: formatTime(typedData.fajr),
                    zuhr: formatTime(typedData.zuhr),
                    asr: formatTime(typedData.asr),
                    maghrib: formatTime(typedData.maghrib),
                    isha: formatTime(typedData.isha),
                    jummah: formatTime(typedData.jummah),
                });
            }

            setLoading(false);
        }

        fetchSchedule();
    }, [selectedMosqueId]);

    // 3. Client-side HH:MM Time Validation
    const validateForm = (): boolean => {
        const errors: Partial<Record<keyof ScheduleState, string>> = {};
        let isValid = true;

        PRAYERS.forEach((prayer) => {
            const val = schedule[prayer];
            if (!val || !TIME_REGEX.test(val)) {
                errors[prayer] = "Enter a valid 24-hour time (HH:MM)";
                isValid = false;
            }
        });

        setValidationErrors(errors);
        return isValid;
    };

    // 4. Form Submission & Update
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFeedback(null);

        if (!validateForm()) {
            setFeedback({ type: "error", text: "Please correct the highlighted time fields." });
            return;
        }

        setSubmitting(true);

        const updatePayload = {
            fajr: schedule.fajr,
            zuhr: schedule.zuhr,
            asr: schedule.asr,
            maghrib: schedule.maghrib,
            isha: schedule.isha,
            jummah: schedule.jummah,
            updated_at: new Date().toISOString(),
            updated_by: user?.id,
        };

        // Cast the table builder to 'any' so .update() accepts dynamic payloads without generated types
        const { error } = await (supabase.from("iqamah_schedules") as any)
            .update(updatePayload)
            .eq("mosque_id", selectedMosqueId);
        setSubmitting(false);

        if (error) {
            setFeedback({ type: "error", text: `Update Failed: ${error.message}` });
        } else {
            setFeedback({
                type: "success",
                text: "Iqamah times updated successfully! Push alerts triggered.",
            });
        }
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push("/admin/login");
    };

    if (loading && !selectedMosqueId) {
        return (
            <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
                <p className="text-slate-400">Verifying authorization...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800 pb-6 mb-8 gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Mosque Admin Dashboard</h1>
                        <p className="text-xs text-slate-400 mt-1">{user?.email}</p>
                    </div>
                    <button
                        onClick={handleSignOut}
                        className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                    >
                        Sign Out
                    </button>
                </header>

                {/* Feedback Alert */}
                {feedback && (
                    <div
                        className={`p-4 rounded-xl mb-6 text-sm flex items-center justify-between ${
                            feedback.type === "success"
                                ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                                : "bg-rose-500/10 border border-rose-500/30 text-rose-400"
                        }`}
                    >
                        <span>{feedback.text}</span>
                    </div>
                )}

                {assignedMosques.length > 0 && (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
                        {/* Mosque Selector */}
                        {assignedMosques.length > 1 && (
                            <div>
                                <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">
                                    Select Mosque
                                </label>
                                <select
                                    value={selectedMosqueId}
                                    onChange={(e) => setSelectedMosqueId(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                >
                                    {assignedMosques.map((m) => (
                                        <option key={m.mosque_id} value={m.mosque_id}>
                                            {m.name} ({m.role})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                            <h2 className="text-lg font-semibold text-white">
                                {assignedMosques.find((m) => m.mosque_id === selectedMosqueId)?.name}
                            </h2>
                            <span className="text-xs px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full font-medium">
                                Authorized Admin
                            </span>
                        </div>

                        {/* Schedule Form */}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {PRAYERS.map((prayer) => (
                                    <div key={prayer} className="bg-slate-800/50 p-4 rounded-xl border border-slate-800">
                                        <label className="block text-sm font-semibold capitalize text-slate-300 mb-2">
                                            {prayer} Iqamah
                                        </label>
                                        <input
                                            type="time"
                                            required
                                            value={schedule[prayer]}
                                            onChange={(e) => {
                                                setSchedule({ ...schedule, [prayer]: e.target.value });
                                                if (validationErrors[prayer]) {
                                                    setValidationErrors({ ...validationErrors, [prayer]: undefined });
                                                }
                                            }}
                                            className={`w-full px-4 py-2.5 bg-slate-800 border rounded-lg text-white focus:outline-none focus:ring-2 ${
                                                validationErrors[prayer]
                                                    ? "border-rose-500 focus:ring-rose-500"
                                                    : "border-slate-700 focus:ring-emerald-500"
                                            }`}
                                        />
                                        {validationErrors[prayer] && (
                                            <p className="text-xs text-rose-400 mt-1">{validationErrors[prayer]}</p>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={submitting || loading}
                                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl transition duration-200 flex items-center justify-center gap-2"
                                >
                                    {submitting ? "Updating & Dispatching Alerts..." : "Publish Iqamah Schedule"}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}