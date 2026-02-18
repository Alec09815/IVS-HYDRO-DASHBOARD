"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Droplets } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-ivs-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-ivs-accent/20 rounded-2xl mb-4">
            <Droplets className="w-8 h-8 text-ivs-accent" />
          </div>
          <h1 className="text-2xl font-bold text-ivs-text">
            IVS Hydrodemolition
          </h1>
          <p className="text-ivs-text-muted mt-1">Operations Dashboard</p>
        </div>

        {/* Login Form */}
        <form
          onSubmit={handleLogin}
          className="bg-ivs-bg-card border border-ivs-border rounded-xl p-6 space-y-4"
        >
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-ivs-text-muted mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 bg-ivs-bg border border-ivs-border rounded-lg text-ivs-text placeholder-ivs-text-muted focus:outline-none focus:ring-2 focus:ring-ivs-accent focus:border-transparent"
              placeholder="you@ivsgroup.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-ivs-text-muted mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 bg-ivs-bg border border-ivs-border rounded-lg text-ivs-text placeholder-ivs-text-muted focus:outline-none focus:ring-2 focus:ring-ivs-accent focus:border-transparent"
              placeholder="Enter your password"
            />
          </div>

          {error && (
            <div className="text-ivs-danger text-sm bg-ivs-danger/10 border border-ivs-danger/20 rounded-lg p-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-ivs-accent hover:bg-ivs-accent-hover text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="text-center text-ivs-text-muted text-xs mt-6">
          IVS Group Inc. &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
