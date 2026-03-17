"use client"

import { useRouter, usePathname } from "next/navigation"
import { Calendar, Stethoscope, LogOut, HeartPulse } from "lucide-react"
import { useState, useEffect } from "react"

export default function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const storedUser = localStorage.getItem("user")
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem("user")
    localStorage.removeItem("token")
    router.push("/")
  }

  const isActive = (path: string) => pathname === path

  if (!user || pathname === "/" || pathname === "/login" || pathname === "/signup") {
    return null
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-fuchsia-100 dark:bg-fuchsia-900/50 rounded-lg">
            <HeartPulse className="w-5 h-5 text-fuchsia-600 dark:text-fuchsia-400" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            PCOS <span className="text-fuchsia-600 dark:text-fuchsia-400">Tracker</span>
          </h1>
        </div>

        {/* Navigation Links */}
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => router.push("/dashboard")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm font-medium ${
              isActive("/dashboard")
                ? "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span className="hidden sm:inline">Period Tracker</span>
          </button>

          <button
            onClick={() => router.push("/assessment")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm font-medium ${
              isActive("/assessment")
                ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            <span className="hidden sm:inline">Assessment</span>
          </button>
        </div>

        {/* User Info & Logout */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:block text-right text-sm">
            <p className="font-semibold text-slate-800 dark:text-white">{user?.name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </nav>
  )
}
