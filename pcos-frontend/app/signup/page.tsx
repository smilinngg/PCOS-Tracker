"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Lock, Mail, User, Phone, ArrowRight, AlertTriangle } from "lucide-react"
import Image from "next/image"

export default function Signup() {
  const router = useRouter()
  const [form, setForm] = useState({ name: "", email: "", password: "", age: "", phone: "" })
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
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, age: Number(form.age) })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || "Signup failed")
      
      router.push("/login?message=Account created successfully. Please login.")
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-rose-50 dark:from-stone-900 dark:to-stone-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-stone-900 shadow-xl rounded-3xl p-8 border border-white/50 dark:border-stone-800">
        
        <div className="text-center mb-8">
          <div className="inline-flex p-1.5 bg-pink-100 dark:bg-pink-900/50 rounded-2xl mb-4 shadow-sm shadow-pink-500/20">
            <Image src="/logo.png" alt="PCOSPredict Logo" width={64} height={64} className="rounded-xl" />
          </div>
          <h1 className="text-3xl font-extrabold text-stone-900 dark:text-white">Create Account</h1>
          <p className="text-stone-500 dark:text-stone-400 mt-2">Join to track your PCOS risk & health metrics.</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm rounded-xl flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
            <input required type="text" name="name" placeholder="Full Name" onChange={handleChange} className="w-full bg-stone-50 dark:bg-stone-800 pl-10 pr-4 py-3 rounded-xl border border-stone-200 dark:border-stone-700 outline-none focus:ring-2 focus:ring-pink-500 transition-shadow" />
          </div>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
            <input required type="email" name="email" placeholder="Email Address" onChange={handleChange} className="w-full bg-stone-50 dark:bg-stone-800 pl-10 pr-4 py-3 rounded-xl border border-stone-200 dark:border-stone-700 outline-none focus:ring-2 focus:ring-pink-500 transition-shadow" />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
            <input required type="password" name="password" placeholder="Password" onChange={handleChange} className="w-full bg-stone-50 dark:bg-stone-800 pl-10 pr-4 py-3 rounded-xl border border-stone-200 dark:border-stone-700 outline-none focus:ring-2 focus:ring-pink-500 transition-shadow" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <input required type="number" name="age" placeholder="Age" onChange={handleChange} className="w-full bg-stone-50 dark:bg-stone-800 px-4 py-3 rounded-xl border border-stone-200 dark:border-stone-700 outline-none focus:ring-2 focus:ring-pink-500 transition-shadow" />
            <div className="relative">
               <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
               <input required type="tel" name="phone" placeholder="Phone" onChange={handleChange} className="w-full bg-stone-50 dark:bg-stone-800 pl-9 pr-4 py-3 rounded-xl border border-stone-200 dark:border-stone-700 outline-none focus:ring-2 focus:ring-pink-500 transition-shadow" />
            </div>
          </div>

          <button disabled={loading} type="submit" className="w-full bg-stone-900 hover:bg-stone-800 dark:bg-pink-600 dark:hover:bg-pink-500 text-white font-bold py-3.5 rounded-xl transition-all duration-300 mt-2 flex items-center justify-center gap-2">
            {loading ? "Creating Account..." : <>Sign Up <ArrowRight className="w-5 h-5" /></>}
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-stone-500 dark:text-stone-400">
          Already have an account? <button onClick={() => router.push('/login')} className="text-pink-600 dark:text-pink-400 font-bold hover:underline">Log in</button>
        </p>

      </div>
    </div>
  )
}
