import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "Iqamah Tracker",
    description: "Track and get notified about local mosque prayer times.",
    manifest: "/manifest.json",
};

export default function RootLayout({
                                       children,
                                   }: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className="dark">
        <head>
            <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
            <title>Iqamah Tracker</title>
        </head>
        <body className="bg-slate-950 text-slate-100 antialiased min-h-screen">
        {children}
        </body>
        </html>
    );
}