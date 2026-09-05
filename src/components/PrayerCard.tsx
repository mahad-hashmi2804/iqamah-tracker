"use client";

import { useState } from "react";
import { subscribeToMosque, unsubscribeFromMosque } from "@/lib/fcm";

export interface IqamahSchedule {
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
    schedule: IqamahSchedule;
    isSubscribedInitial?: boolean;
}

const PRAYER_KEYS: Array<{ key: keyof IqamahSchedule; label: string }> = [
    { key: "fajr", label: "Fajr" },
    { key: "zuhr", label: "Zuhr" },
    { key: "asr", label: "Asr" },
    { key: "maghrib", label: "Maghrib" },
    { key: "isha", label: "Isha" },
    { key: "jummah", label: "Jummah" },
];

export default function PrayerCard({
                                       mosqueId,
                                       mosqueName,
                                       address,
                                       schedule,
                                       isSubscribedInitial = false,
                                   }: PrayerCardProps) {
    const [isSubscribed, setIsSubscribed] = useState(isSubscribedInitial);
    const [loading, setLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);

    const handleToggleSubscription = async () => {
        setLoading(true);
        setStatusMessage(null);

        if (isSubscribed) {
            const success = await unsubscribeFromMosque(mosqueId);
            if (success) {
                setIsSubscribed(false);
                setStatusMessage("Unsubscribed from push alerts.");
            } else {
                setStatusMessage("Failed to unsubscribe.");
            }
        } else {
            const success = await subscribeToMosque(mosqueId);
            if (success) {
                setIsSubscribed(true);
                setStatusMessage("Subscribed to updates!");
            } else {
                setStatusMessage("Failed or notifications blocked.");
            }
        }
        setLoading(false);
    };

    return (
        <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden">
            {/* Card Header */}
            <div className="p-6 bg-slate-900 text-white flex justify-between items-start">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-emerald-400">{mosqueName}</h2>
                    <p className="text-xs text-slate-400 mt-1">{address}</p>
                </div>
                <button
                    onClick={handleToggleSubscription}
                    disabled={loading}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        isSubscribed
                            ? "bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700"
                            : "bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-sm"
                    }`}
                >
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                    </svg>
                    {loading ? "Updating..." : isSubscribed ? "Subscribed" : "Notify Me"}
                </button>
            </div>

            {statusMessage && (
                <div className="bg-emerald-50 px-6 py-2 text-xs font-medium text-emerald-800 border-b border-emerald-100">
                    {statusMessage}
                </div>
            )}

            {/* Iqamah List */}
            <div className="divide-y divide-slate-100">
                {PRAYER_KEYS.map(({ key, label }) => {
                    const timeValue = schedule[key];
                    if (!timeValue) return null;

                    return (
                        <div
                            key={key}
                            className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-50 transition-colors"
                        >
              <span className="font-semibold text-slate-700 text-sm tracking-wide">
                {label}
              </span>
                            <span className="font-mono font-bold text-slate-900 text-base bg-slate-100 px-3 py-1 rounded-md">
                {timeValue}
              </span>
                        </div>
                    );
                })}
            </div>

            {/* Footer Meta */}
            {schedule.updated_at && (
                <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 text-right">
          <span className="text-[10px] text-slate-400">
            Last modified: {new Date(schedule.updated_at).toLocaleDateString()}
          </span>
                </div>
            )}
        </div>
    );
}