"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { HeartPulse, Calendar, AlertTriangle, CheckCircle2 } from "lucide-react"
import Link from "next/link"
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

  if (!user) return <div className="min-h-screen bg-stone-50 dark:bg-stone-950"></div>

  // Calculate if period is overdue
  let daysOverdue = 0
  if (cycleInfo && cycleInfo.next_predicted_raw) {
    try {
      const nextDate = new Date(cycleInfo.next_predicted_raw)
      const today = new Date()
      nextDate.setHours(0, 0, 0, 0)
      today.setHours(0, 0, 0, 0)
      const diff = Math.round((today.getTime() - nextDate.getTime()) / (1000 * 3600 * 24))
      if (diff > 0) daysOverdue = diff
    } catch (e) {
      // ignore
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-50 dark:from-stone-950 dark:via-stone-900 dark:to-rose-950 transition-colors duration-500 pt-32 sm:pt-36 pb-20 p-4 sm:p-8 font-sans">
      
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-stone-900 dark:text-white mb-2">
            Period Tracker
          </h1>
          <p className="text-stone-600 dark:text-stone-300">
            Log your menstrual cycle dates and track ovulation for natural fertility planning
          </p>
        </div>

        {/* Overdue Period Smart Alert */}
        {daysOverdue > 0 && (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-pink-500/10 via-rose-500/10 to-amber-500/10 border border-pink-200 dark:border-pink-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-pink-100 dark:bg-pink-900/40 rounded-xl text-pink-600 dark:text-pink-300">
                <HeartPulse className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-stone-900 dark:text-white">
                  Expected period is {daysOverdue} {daysOverdue === 1 ? "day" : "days"} overdue
                </h4>
                <p className="text-xs text-stone-600 dark:text-stone-300 mt-0.5">
                  Could it be delayed ovulation from PCOS, or early conception?
                </p>
              </div>
            </div>
            <Link
              href="/pregnancy-check"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition-all shadow-sm shrink-0"
            >
              Check Pregnancy Probability &rarr;
            </Link>
          </div>
        )}

        {/* Cycle Info Card */}
        {cycleInfo && !cycleInfo.message && (
          <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
            {/* Next Predicted Date */}
            <div className={`bg-white dark:bg-stone-900 border-2 rounded-2xl p-5 shadow-sm ${
              cycleInfo.next_predicted 
                ? "border-pink-200 dark:border-pink-900/50"
                : "border-stone-200 dark:border-stone-800"
            }`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Next Period</p>
                  {cycleInfo.next_predicted ? (
                    <p className="text-2xl font-bold text-pink-600 dark:text-pink-400 mt-2">
                      {cycleInfo.next_predicted}
                    </p>
                  ) : (
                    <p className="text-sm text-stone-500 mt-2">Log 2+ periods to predict</p>
                  )}
                </div>
                <Calendar className="w-5 h-5 text-pink-500" />
              </div>
            </div>

            {/* Ovulation Date */}
            <div className={`bg-white dark:bg-stone-900 border-2 rounded-2xl p-5 shadow-sm ${
              cycleInfo.ovulation_date_display
                ? "border-pink-200 dark:border-pink-900/50"
                : "border-stone-200 dark:border-stone-800"
            }`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Ovulation</p>
                  {cycleInfo.ovulation_date_display ? (
                    <p className="text-2xl font-bold text-pink-600 dark:text-pink-400 mt-2">
                      {cycleInfo.ovulation_date_display}
                    </p>
                  ) : (
                    <p className="text-sm text-stone-500 mt-2">Fertile window</p>
                  )}
                </div>
                <HeartPulse className="w-5 h-5 text-pink-500" />
              </div>
            </div>

            {/* Cycle Status */}
            <div className={`bg-white dark:bg-stone-900 border-2 rounded-2xl p-5 shadow-sm ${
              cycleInfo.irregular
                ? "border-rose-200 dark:border-rose-900/50"
                : "border-teal-200 dark:border-teal-900/50"
            }`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Cycle Status</p>
                  <div className="flex items-center gap-2 mt-2">
                    {cycleInfo.irregular ? (
                      <>
                        <AlertTriangle className="w-5 h-5 text-rose-600" />
                        <span className="text-sm font-bold text-rose-600 dark:text-rose-400">Irregular</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-teal-600" />
                        <span className="text-sm font-bold text-teal-600 dark:text-teal-400">Regular</span>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-stone-500 mt-1">{cycleInfo.average_cycle?.toFixed(1)} days avg</p>
                  {cycleInfo.irregular && (
                    <div className="mt-3 space-y-1.5">
                      <Link href="/assessment" className="block text-xs font-semibold text-rose-600 dark:text-rose-300 hover:text-rose-700 dark:hover:text-rose-200 bg-rose-50 dark:bg-rose-950/40 p-2 rounded-lg border border-rose-100 dark:border-rose-900/50 transition-colors">
                        ⚠️ Medical Risk: PCOS Assessment
                      </Link>
                      <Link href="/pregnancy-check" className="block text-xs font-semibold text-pink-600 dark:text-pink-300 hover:text-pink-700 dark:hover:text-pink-200 bg-pink-50 dark:bg-pink-950/40 p-2 rounded-lg border border-pink-100 dark:border-pink-900/50 transition-colors">
                        🌸 Period Overdue: Check Pregnancy
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Cycle Regularity Chart */}
            {cycleInfo?.cycles && cycleInfo.cycles.length > 0 && (
              <div className="bg-white dark:bg-stone-900 border-2 border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm col-span-1 sm:col-span-2 md:col-span-3 mt-4">
                <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-6">Cycle Regularity Graph</h3>
                <div className="flex items-end gap-3 h-32 w-full border-b border-stone-100 dark:border-stone-800 pb-2">
                   {cycleInfo.cycles.slice(-10).map((length: number, i: number) => {
                     const heightPercentage = Math.min(100, Math.max(10, (length / 45) * 100));
                     return (
                      <div key={i} className="flex-1 flex flex-col items-center justify-end gap-2 relative group h-full">
                        <span className="text-xs font-bold text-stone-600 dark:text-stone-300 absolute -top-6 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all">{length}d</span>
                        <div 
                           className="w-full bg-gradient-to-t from-rose-300 to-rose-400 dark:from-rose-600 dark:to-rose-500 rounded-t-md hover:opacity-80 transition-all cursor-pointer" 
                           style={{ height: `${heightPercentage}%` }}
                        ></div>
                        <span className="text-[10px] text-stone-400 absolute -bottom-5">C{i+1}</span>
                      </div>
                   )})}
                </div>
              </div>
            )}
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
