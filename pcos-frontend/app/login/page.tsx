"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ActivitySquare, Lock, Mail, ArrowRight, AlertTriangle, CheckCircle2 } from "lucide-react"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const message = searchParams.get("message")
  
  const [form, setForm] = useState({ email: "", password: "" })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || "Login failed")
      
      // Save session securely
      localStorage.setItem("user", JSON.stringify(data.user))
      localStorage.setItem("token", data.token)

      router.push("/dashboard")
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="text-center mb-8">
        <div className="inline-flex p-3 bg-indigo-100 dark:bg-indigo-900/50 rounded-2xl mb-4">
          <ActivitySquare className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Welcome Back</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">Log in to your PCOS tracking dashboard.</p>
      </div>

      {message && (
        <div className="mb-6 p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-sm rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> {message}
        </div>
      )}

      {error && (
        <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm rounded-xl flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input required type="email" name="email" placeholder="Email Address" onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-800 pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow" />
        </div>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input required type="password" name="password" placeholder="Password" onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-800 pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow" />
        </div>

        <button disabled={loading} type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl transition-all duration-300 mt-4 flex items-center justify-center gap-2">
          {loading ? "Logging in..." : <>Continue to Dashboard <ArrowRight className="w-5 h-5" /></>}
        </button>
      </form>

      <p className="text-center mt-6 text-sm text-slate-500 dark:text-slate-400">
        Don&apos;t have an account? <button onClick={() => router.push('/signup')} className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline">Sign up</button>
      </p>
    </>
  )
}

export default function Login() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 dark:from-slate-900 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 shadow-xl rounded-3xl p-8 border border-white/50 dark:border-slate-800">
        <Suspense fallback={<div className="text-center p-8">Loading...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
