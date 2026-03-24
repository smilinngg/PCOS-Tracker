"use client"

import { useRouter, usePathname } from "next/navigation"
import { Calendar, Stethoscope, LogOut, HeartPulse } from "lucide-react"
import { useState, useEffect } from "react"
import ThemeToggle from "./ThemeToggle"

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
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-pink-100 dark:bg-pink-900/50 rounded-lg">
            <HeartPulse className="w-5 h-5 text-pink-600 dark:text-pink-400" />
          </div>
          <h1 className="text-xl font-bold text-stone-900 dark:text-white">
            PCOS <span className="text-pink-600 dark:text-pink-400">Tracker</span>
          </h1>
        </div>

        {/* Navigation Links */}
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => router.push("/dashboard")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm font-medium ${
              isActive("/dashboard")
                ? "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400"
                : "text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span className="hidden sm:inline">Period Tracker</span>
          </button>

          <button
            onClick={() => router.push("/assessment")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm font-medium ${
              isActive("/assessment")
                ? "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400"
                : "text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            <span className="hidden sm:inline">Assessment</span>
          </button>
        </div>

        {/* User Info & Logout */}
        <div className="flex items-center gap-2 sm:gap-4">
          <ThemeToggle />
          <div className="hidden sm:block text-right text-sm">
            <p className="font-semibold text-stone-800 dark:text-white">{user?.name}</p>
            <p className="text-xs text-stone-500 dark:text-stone-400">{user?.email}</p>
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
