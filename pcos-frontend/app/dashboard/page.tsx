"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { HeartPulse, Calendar, AlertTriangle, CheckCircle2 } from "lucide-react"
import ChatBot from "../components/ChatBot"
import PeriodCalendar from "../components/PeriodCalendar"
import { useCycleInfo } from "../context/CycleContext"

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const { cycleInfo, fetchCycleInfo } = useCycleInfo()

  useEffect(() => {
    // Basic Auth Check
    const storedUser = localStorage.getItem("user")
    if (!storedUser) {
      router.push("/login")
      return
    }
    
    const parsedUser = JSON.parse(storedUser)
    setUser(parsedUser)
    
    // Fetch cycle info on load
    fetchCycleInfo(parsedUser.email)
  }, [router, fetchCycleInfo])

  if (!user) return <div className="min-h-screen bg-slate-50 dark:bg-slate-950"></div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-fuchsia-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 transition-colors duration-500 pt-24 p-4 sm:p-8 font-sans">
      
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
            Period Tracker
          </h1>
          <p className="text-slate-600 dark:text-slate-300">
            Log your menstrual cycle dates and track ovulation for natural fertility planning
          </p>
        </div>

        {/* Cycle Info Card */}
        {cycleInfo && !cycleInfo.message && (
          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Next Predicted Date */}
            <div className={`bg-white dark:bg-slate-900 border-2 rounded-2xl p-5 shadow-sm ${
              cycleInfo.next_predicted 
                ? "border-pink-200 dark:border-pink-900/50"
                : "border-slate-200 dark:border-slate-800"
            }`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Next Period</p>
                  {cycleInfo.next_predicted ? (
                    <p className="text-2xl font-bold text-pink-600 dark:text-pink-400 mt-2">
                      {cycleInfo.next_predicted}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-500 mt-2">Log 2+ periods to predict</p>
                  )}
                </div>
                <Calendar className="w-5 h-5 text-pink-500" />
              </div>
            </div>

            {/* Ovulation Date */}
            <div className={`bg-white dark:bg-slate-900 border-2 rounded-2xl p-5 shadow-sm ${
              cycleInfo.ovulation_date_display
                ? "border-fuchsia-200 dark:border-fuchsia-900/50"
                : "border-slate-200 dark:border-slate-800"
            }`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Ovulation</p>
                  {cycleInfo.ovulation_date_display ? (
                    <p className="text-2xl font-bold text-fuchsia-600 dark:text-fuchsia-400 mt-2">
                      {cycleInfo.ovulation_date_display}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-500 mt-2">Fertile window</p>
                  )}
                </div>
                <HeartPulse className="w-5 h-5 text-fuchsia-500" />
              </div>
            </div>

            {/* Cycle Status */}
            <div className={`bg-white dark:bg-slate-900 border-2 rounded-2xl p-5 shadow-sm ${
              cycleInfo.irregular
                ? "border-rose-200 dark:border-rose-900/50"
                : "border-emerald-200 dark:border-emerald-900/50"
            }`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Cycle Status</p>
                  <div className="flex items-center gap-2 mt-2">
                    {cycleInfo.irregular ? (
                      <>
                        <AlertTriangle className="w-5 h-5 text-rose-600" />
                        <span className="text-sm font-bold text-rose-600 dark:text-rose-400">Irregular</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Regular</span>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{cycleInfo.average_cycle?.toFixed(1)} days avg</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Period Calendar - Main Component */}
        {user?.email && <PeriodCalendar email={user.email} />}
      </div>

      {/* Floating Chatbot */}
      <ChatBot cycleAware={true} />
    </div>
  )
}