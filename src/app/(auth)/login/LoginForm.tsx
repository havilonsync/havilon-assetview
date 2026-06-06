"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, Loader2, Eye, EyeOff } from "lucide-react";

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackParam = params.get("callbackUrl");
  const callbackUrl = callbackParam?.startsWith("/") ? callbackParam : "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      redirectTo: callbackUrl,
    });
    setLoading(false);
    if (!result) {
      setError("Unable to sign in. Please try again.");
      return;
    }

    if (result.error) {
      setError("Invalid email or password.");
      return;
    }

    if (result.ok) {
      router.replace(callbackUrl);
      router.refresh();
      return;
    }

    setError("Unable to sign in. Please try again.");
  }

  return (
    <div className="w-full max-w-md">
      <div className="flex items-center gap-3 mb-8 justify-center">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
          <Building2 size={20} className="text-white" />
        </div>
        <div>
          <div className="text-xl font-semibold text-slate-900">Havilon</div>
          <div className="text-xs text-slate-400 -mt-0.5">AssetView™ Platform</div>
        </div>
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900 mb-1">Sign in to your account</h1>
        <p className="text-sm text-slate-500 mb-6">Enter your credentials to continue.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Email address</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="you@company.com" autoComplete="email" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Password</label>
            <div className="relative">
              <input type={showPw ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                placeholder="••••••••" autoComplete="current-password" />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-sm text-red-700">{error}</div>}
          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg py-2.5 text-sm flex items-center justify-center gap-2">
            {loading && <Loader2 size={14} className="animate-spin" />}
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-400 text-center">
          Demo: admin@havilon-demo.com or mgr@havilon-demo.com · password <strong>Demo1234!</strong>
        </div>
      </div>
    </div>
  );
}
