"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { LogOut, ArrowLeft } from "lucide-react"
import PeriodCalendar from "../components/PeriodCalendar"

export default function PeriodTrackerPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Basic Auth Check
    const storedUser = localStorage.getItem("user")
    if (!storedUser) {
      router.push("/login")
      return
    }
    
    const parsedUser = JSON.parse(storedUser)
    setUser(parsedUser)
    setIsLoading(false)
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem("user")
    localStorage.removeItem("token")
    router.push("/")
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-fuchsia-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-fuchsia-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 transition-colors duration-500 p-4 sm:p-8">
      {/* Navigation Bar */}
      <nav className="max-w-7xl mx-auto mb-8 flex items-center justify-between">
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors font-semibold"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Dashboard
        </button>
        
        <div className="flex items-center gap-4">
          <div className="text-sm text-slate-600 dark:text-slate-300">
            <p className="font-semibold">{user?.name}</p>
            <p className="text-xs text-slate-400">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
            Period Tracker
          </h1>
          <p className="text-slate-600 dark:text-slate-300">
            Log your menstrual cycle and track ovulation dates to understand your fertility window
          </p>
        </div>

        {/* Period Calendar Component */}
        {user?.email && <PeriodCalendar email={user.email} />}
      </div>
    </div>
  )
}
