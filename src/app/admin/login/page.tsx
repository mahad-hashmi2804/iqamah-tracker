// app/admin/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AdminLoginPage() {
    const router = useRouter();
    const [mode, setMode] = useState<"login" | "reset">("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState<{
        type: "success" | "error";
        text: string;
    } | null>(null);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setStatusMessage(null);

        try {
            if (mode === "login") {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

                if (error) throw error;

                setStatusMessage({ type: "success", text: "Login successful! Redirecting..." });
                setTimeout(() => router.push("/admin/dashboard"), 1000);
            } else {
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: `${window.location.origin}/admin/reset-password`,
                });

                if (error) throw error;

                setStatusMessage({
                    type: "success",
                    text: "Password reset instructions sent to your email.",
                });
            }
        } catch (err: any) {
            setStatusMessage({
                type: "error",
                text: err.message || "An authentication error occurred.",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-2xl">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-white mb-2">Mosque Admin Portal</h1>
                    <p className="text-sm text-slate-400">
                        {mode === "login" ? "Sign in to manage Iqamah schedules" : "Reset your admin password"}
                    </p>
                </div>

                {statusMessage && (
                    <div
                        className={`p-3 rounded-lg text-sm mb-6 ${
                            statusMessage.type === "success"
                                ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                                : "bg-rose-500/10 border border-rose-500/30 text-rose-400"
                        }`}
                    >
                        {statusMessage.text}
                    </div>
                )}

                <form onSubmit={handleAuth} className="space-y-5">
                    <div>
                        <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">
                            Email Address
                        </label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="admin@mosque.org"
                            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>

                    {mode === "login" && (
                        <div>
                            <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">
                                Password
                            </label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded-lg transition duration-200"
                    >
                        {loading ? "Processing..." : mode === "login" ? "Sign In" : "Send Reset Link"}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => {
                            setMode(mode === "login" ? "reset" : "login");
                            setStatusMessage(null);
                        }}
                        className="text-xs text-slate-400 hover:text-emerald-400 underline transition"
                    >
                        {mode === "login" ? "Forgot password?" : "Back to Sign In"}
                    </button>
                </div>
            </div>
        </div>
    );
}