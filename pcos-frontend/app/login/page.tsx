"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Lock, Mail, ArrowRight, AlertTriangle, CheckCircle2 } from "lucide-react"
import Image from "next/image"

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
        <div className="inline-flex p-1.5 bg-rose-100 dark:bg-rose-900/50 rounded-2xl mb-4 shadow-sm shadow-rose-500/20">
          <Image src="/logo.png" alt="PCOSPredict Logo" width={64} height={64} className="rounded-xl" />
        </div>
        <h1 className="text-3xl font-extrabold text-stone-900 dark:text-white">Welcome Back</h1>
        <p className="text-stone-500 dark:text-stone-400 mt-2">Log in to your PCOS tracking dashboard.</p>
      </div>

      {message && (
        <div className="mb-6 p-3 bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 text-sm rounded-xl flex items-center gap-2">
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
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
          <input required type="email" name="email" placeholder="Email Address" onChange={handleChange} className="w-full bg-stone-50 dark:bg-stone-800 pl-10 pr-4 py-3 rounded-xl border border-stone-200 dark:border-stone-700 outline-none focus:ring-2 focus:ring-rose-500 transition-shadow" />
        </div>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
          <input required type="password" name="password" placeholder="Password" onChange={handleChange} className="w-full bg-stone-50 dark:bg-stone-800 pl-10 pr-4 py-3 rounded-xl border border-stone-200 dark:border-stone-700 outline-none focus:ring-2 focus:ring-rose-500 transition-shadow" />
        </div>

        <button disabled={loading} type="submit" className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-3.5 rounded-xl transition-all duration-300 mt-4 flex items-center justify-center gap-2">
          {loading ? "Logging in..." : <>Continue to Dashboard <ArrowRight className="w-5 h-5" /></>}
        </button>
      </form>

      <p className="text-center mt-6 text-sm text-stone-500 dark:text-stone-400">
        Don&apos;t have an account? <button onClick={() => router.push('/signup')} className="text-rose-600 dark:text-rose-400 font-bold hover:underline">Sign up</button>
      </p>
    </>
  )
}

export default function Login() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-rose-50 dark:from-stone-900 dark:to-stone-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-stone-900 shadow-xl rounded-3xl p-8 border border-white/50 dark:border-stone-800">
        <Suspense fallback={<div className="text-center p-8">Loading...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
