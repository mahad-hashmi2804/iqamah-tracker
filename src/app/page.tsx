"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabaseClient";
import PrayerCard from "@/components/PrayerCard";

// Dynamic import for Leaflet map to prevent SSR window errors
const MosqueMap = dynamic(() => import("@/components/MosqueMap"), {
    ssr: false,
    loading: () => (
        <div className="h-96 w-full rounded-2xl bg-slate-900 border border-slate-800 animate-pulse flex items-center justify-center text-slate-500">
            Loading Interactive Map...
        </div>
    ),
});

export default function HomePage() {
    const [mosques, setMosques] = useState<any[]>([]);
    const [selectedMosque, setSelectedMosque] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchMosquesAndSchedules() {
            // 1. Query mosques and schedules
            const { data, error } = await (supabase.from("mosques") as any)
                .select("id, name, address, location, iqamah_schedules(*)");

            if (error) {
                console.error("Supabase Fetch Error:", error);
            } else if (data) {
                console.log("Fetched Mosques Data:", data); // Check browser console
                setMosques(data);
                if (data.length > 0) {
                    setSelectedMosque(data[0]);
                }
            }
            setLoading(false);
        }

        fetchMosquesAndSchedules();
    }, []);

    return (
        <main className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
            <div className="max-w-5xl mx-auto space-y-8">
                {/* Header */}
                <header className="text-center space-y-2 border-b border-slate-800 pb-6">
                    <h1 className="text-4xl font-extrabold text-white tracking-tight">
                        Iqamah Tracker
                    </h1>
                    <p className="text-slate-400 text-sm md:text-base">
                        Track and get notified about local mosque prayer times.
                    </p>
                </header>

                {/* Map Section */}
                <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-2xl">
                    <h2 className="text-lg font-semibold text-white mb-4">Nearby Mosques</h2>
                    <MosqueMap
                        mosques={mosques.map((m) => {
                            // PostGIS GeoJSON parsing fallback
                            let lat = 33.7297;
                            let lng = 73.0369;

                            if (m.location && m.location.coordinates) {
                                lng = m.location.coordinates[0];
                                lat = m.location.coordinates[1];
                            }

                            return {
                                id: m.id,
                                name: m.name,
                                address: m.address || "Islamabad",
                                lat,
                                lng,
                            };
                        })}
                    />
                </section>

                {/* Prayer Times Section */}
                <section className="space-y-4">
                    <h2 className="text-lg font-semibold text-white">Prayer Schedules</h2>
                    {loading ? (
                        <div className="p-8 text-center text-slate-500">Fetching prayer schedules...</div>
                    ) : selectedMosque ? (
                        <PrayerCard
                            mosqueId={selectedMosque.id}
                            mosqueName={selectedMosque.name}
                            address={selectedMosque.address || "Address unavailable"}
                            schedule={
                                Array.isArray(selectedMosque.iqamah_schedules)
                                    ? selectedMosque.iqamah_schedules[0]
                                    : selectedMosque.iqamah_schedules || {
                                    fajr: "05:00",
                                    zuhr: "13:30",
                                    asr: "17:00",
                                    maghrib: "18:45",
                                    isha: "20:15",
                                    jummah: "13:30",
                                }
                            }
                        />
                    ) : (
                        <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-400">
                            No mosques found in database yet. Add mosques via the Supabase SQL Editor to populate the map.
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}