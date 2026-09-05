"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface Mosque {
    id: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
}

interface MosqueMapProps {
    mosques: Mosque[];
    selectedMosqueId?: string | null;
    onSelectMosque?: (mosque: Mosque) => void;
}

// Custom SVG Icon to avoid Next.js asset/path resolution issues
const customIcon = L.divIcon({
    className: "custom-leaflet-marker",
    html: `
    <div class="relative flex items-center justify-center w-8 h-8 rounded-full bg-emerald-600 text-white shadow-lg border-2 border-white transform -translate-x-1/2 -translate-y-1/2 hover:scale-110 transition-transform">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    </div>
  `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
});

// Helper component to smoothly re-center map on selection
function MapViewController({ center }: { center: [number, number] }) {
    const map = useMap();
    useEffect(() => {
        map.flyTo(center, 15, { duration: 1.2 });
    }, [center, map]);
    return null;
}

export default function MosqueMap({ mosques, selectedMosqueId, onSelectMosque }: MosqueMapProps) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) {
        return (
            <div className="w-full h-96 bg-slate-100 animate-pulse rounded-2xl flex items-center justify-center text-slate-400 font-medium">
                Loading Map View...
            </div>
        );
    }

    const selectedMosque = mosques.find((m) => m.id === selectedMosqueId);
    const defaultCenter: [number, number] = selectedMosque
        ? [selectedMosque.lat, selectedMosque.lng]
        : mosques.length > 0
            ? [mosques[0].lat, mosques[0].lng]
            : [33.6844, 73.0479]; // Default fallback location

    return (
        <div className="relative w-full h-96 rounded-2xl overflow-hidden shadow-md border border-slate-200">
            <MapContainer
                center={defaultCenter}
                zoom={13}
                scrollWheelZoom={false}
                className="w-full h-full z-0"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {selectedMosque && (
                    <MapViewController center={[selectedMosque.lat, selectedMosque.lng]} />
                )}

                {mosques.map((mosque) => (
                    <Marker
                        key={mosque.id}
                        position={[mosque.lat, mosque.lng]}
                        icon={customIcon}
                        eventHandlers={{
                            click: () => onSelectMosque && onSelectMosque(mosque),
                        }}
                    >
                        <Popup className="custom-popup">
                            <div className="p-1 space-y-1">
                                <h3 className="font-bold text-slate-900 text-sm">{mosque.name}</h3>
                                <p className="text-xs text-slate-500 leading-tight">{mosque.address}</p>
                                {onSelectMosque && (
                                    <button
                                        onClick={() => onSelectMosque(mosque)}
                                        className="mt-2 w-full py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded hover:bg-emerald-100 transition-colors"
                                    >
                                        View Iqamah Times
                                    </button>
                                )}
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
}