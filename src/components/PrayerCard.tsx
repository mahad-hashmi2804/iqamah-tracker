"use client";

import { useState } from "react";
import { Bell, BellCheck, Check, Clock } from "lucide-react";
import { subscribeToMosque } from "@/lib/fcm";

interface PrayerSchedule {
    fajr: string;
    zuhr: string;
    asr: string;
    maghrib: string;
    isha: string;
    jummah: string;
    updated_at?: string;
}

interface PrayerCardProps {
    mosqueId: string;
    mosqueName: string;
    address: string;
    schedule: PrayerSchedule;
}

// Utility to convert "13:30:00" or "13:30" to "1:30 PM"
function formatTo12Hour(timeStr: string): string {
    if (!timeStr) return "--:--";
    const [hoursStr, minutesStr] = timeStr.split(":");
    let hours = parseInt(hoursStr, 10);
    const minutes = minutesStr;
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${ampm}`;
}

export default function PrayerCard({ mosqueId, mosqueName, address, schedule }: PrayerCardProps) {
    const [subscribed, setSubscribed] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubscribe = async () => {
        setLoading(true);
        const success = await subscribeToMosque(mosqueId);
        if (success) {
            setSubscribed(true);
        }
        setLoading(false);
    };

    const prayers = [
        { name: "Fajr", time: schedule?.fajr },
        { name: "Zuhr", time: schedule?.zuhr },
        { name: "Asr", time: schedule?.asr },
        { name: "Maghrib", time: schedule?.maghrib },
        { name: "Isha", time: schedule?.isha },
        { name: "Jummah", time: schedule?.jummah },
    ];

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            {/* Mosque Header */}
            <div className="p-6 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/50">
                <div>
                    <h3 className="text-2xl font-bold text-emerald-400">{mosqueName}</h3>
                    <p className="text-xs text-slate-400 mt-1">{address}</p>
                </div>

                <button
                    onClick={handleSubscribe}
                    disabled={loading || subscribed}
                    className={`px-5 py-2.5 rounded-full font-semibold text-xs transition duration-200 flex items-center gap-2 ${
                        subscribed
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20"
                    }`}
                >
                    {subscribed ? (
                        <>
                            <Check className="w-4 h-4" /> Subscribed
                        </>
                    ) : (
                        <>
                            <Bell className="w-4 h-4" /> {loading ? "Connecting..." : "Notify Me"}
                        </>
                    )}
                </button>
            </div>

            {/* Prayer List */}
            <div className="divide-y divide-slate-800/60">
                {prayers.map((p) => (
                    <div key={p.name} className="px-6 py-4 flex justify-between items-center hover:bg-slate-800/30 transition">
                        <span className="font-semibold text-slate-200 text-sm">{p.name}</span>
                        <span className="font-mono font-bold text-emerald-400 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/50 text-sm">
              {formatTo12Hour(p.time)}
            </span>
                    </div>
                ))}
            </div>

            {/* Card Footer */}
            {schedule?.updated_at && (
                <div className="px-6 py-3 bg-slate-950/50 border-t border-slate-800/80 flex items-center justify-end text-[11px] text-slate-500 gap-1.5">
                    <Clock className="w-3 h-3" />
                    <span>Last modified: {new Date(schedule.updated_at).toLocaleDateString()}</span>
                </div>
            )}
        </div>
    );
}