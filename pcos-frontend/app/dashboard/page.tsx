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

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-50 dark:from-stone-950 dark:via-stone-900 dark:to-rose-950 transition-colors duration-500 pt-24 p-4 sm:p-8 font-sans">
      
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-stone-900 dark:text-white mb-2">
            Period Tracker
          </h1>
          <p className="text-stone-600 dark:text-stone-300">
            Log your menstrual cycle dates and track ovulation for natural fertility planning
          </p>
        </div>

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
                    <Link href="/assessment" className="block mt-3 text-xs font-semibold text-rose-600 dark:text-rose-300 hover:text-rose-700 dark:hover:text-rose-200 bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-lg border border-rose-100 dark:border-rose-900/50 transition-colors group">
                      ⚠️ Medical Risk Detected <br/>
                      <span className="font-normal opacity-90 block mt-0.5">Please take the PCOS Assessment</span>
                    </Link>
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