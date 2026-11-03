"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  HeartPulse,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Info,
  Clock,
  Sparkles,
  RefreshCw,
  Stethoscope,
  ChevronRight,
  ShieldCheck,
  Activity,
} from "lucide-react"
import ChatBot from "../components/ChatBot"
import { useCycleInfo } from "../context/CycleContext"

type PregnancyResult = {
  probability: number
  likelihood_category: string
  status_color: string
  pcos_vs_pregnancy: string
  recommendations: string[]
  basis_factors?: {
    factor: string
    weight: string
    detail: string
  }[]
  cycle_tracker_data?: {
    has_enough_data: boolean
    latest_period_start: string
    days_since_latest: number
    average_cycle: number
    is_irregular: boolean
    days_overdue: number
  } | null
  pcos_assessment_data?: {
    has_record: boolean
    risk_percentage: number
    risk_level: string
    bmi?: number
    symptoms: string[]
    assessed_date?: string
  } | null
  assessed_at: string
}

const SYMPTOM_OPTIONS = [
  {
    id: "spotting_implantation",
    label: "Light Spotting / Implantation Bleeding",
    description: "Brief, light pink or brownish discharge 6–12 days after ovulation.",
    icon: "🩸",
  },
  {
    id: "breast_tenderness",
    label: "Swollen or Sensitive Breasts",
    description: "Aching, heavy, or sensitive breasts caused by rising progesterone & hCG.",
    icon: "🌸",
  },
  {
    id: "nausea",
    label: "Morning Sickness / Nausea",
    description: "Queasiness or vomiting, which can occur at any time of day.",
    icon: "🤢",
  },
  {
    id: "fatigue",
    label: "Extreme Fatigue & Sleepiness",
    description: "Unexplained exhaustion even after resting, driven by hormonal surges.",
    icon: "⚡",
  },
  {
    id: "frequent_urination",
    label: "Frequent Urination",
    description: "Needing to pee much more often due to increased pelvic blood flow.",
    icon: "🚽",
  },
  {
    id: "food_aversions",
    label: "Food Aversions or Sensitivity to Smells",
    description: "Sudden strong distaste for certain foods or heightened scent sensitivity.",
    icon: "👃",
  },
  {
    id: "elevated_bbt",
    label: "Basal Body Temperature Stays High",
    description: "Morning body temperature remaining elevated for 18+ consecutive days.",
    icon: "🌡️",
  },
]

// Detailed clinical guidance for each recommendation
const getRecommendationDetails = (rec: string) => {
  const lower = rec.toLowerCase()
  if (lower.includes("ob-gyn") || lower.includes("doctor") || lower.includes("blood test") || lower.includes("ultrasound")) {
    return {
      title: "Doctor & Clinical Visit Guide",
      tips: [
        "Request a quantitative serum beta-hCG blood test to accurately measure exact hormone levels.",
        "A transvaginal ultrasound is typically scheduled between weeks 6–8 to check for the gestational sac and fetal heartbeat.",
        "Inform your OB-GYN about your PCOS history, typical cycle lengths, and any supplements or medications (e.g. Metformin, Inositol)."
      ],
      tag: "Clinical Confirmation"
    }
  } else if (lower.includes("urine") || lower.includes("hcg test") || lower.includes("home")) {
    return {
      title: "Testing Best Practices",
      tips: [
        "Test with first-morning urine for the highest hCG hormone concentration.",
        "Avoid drinking excessive fluids 2 hours prior to testing to prevent diluting the sample.",
        "Read results strictly within the 3–5 minute window. Faint colored lines count as positive, but evaporation lines appearing after 10+ minutes do not.",
        "If negative and your period does not arrive, re-test in 48–72 hours as hCG doubles approximately every 2 days."
      ],
      tag: "Home Testing"
    }
  } else if (lower.includes("prenatal") || lower.includes("folic acid")) {
    return {
      title: "Prenatal Nutrition Support",
      tips: [
        "Take 400–800 mcg of Folic Acid or Methylfolate daily to support early neural tube development.",
        "Include DHA (200–300 mg) for fetal brain and eye development.",
        "Gentle chelated iron and vitamin D3 help support healthy maternal blood volume and hormonal balance."
      ],
      tag: "Nutrition & Care"
    }
  } else {
    return {
      title: "Cycle Timing & Window Advice",
      tips: [
        "Implantation occurs 6–12 days post-ovulation, and urine hCG takes another 2–4 days to reach detectable concentrations.",
        "Testing before your expected period frequently yields false negatives.",
        "Keep logging your daily symptoms and re-test if your period is overdue by 3+ days."
      ],
      tag: "Timing Guide"
    }
  }
}

export default function PregnancyCheckPage() {
  const router = useRouter()
  const { cycleInfo, fetchCycleInfo } = useCycleInfo()
  const [user, setUser] = useState<any>(null)

  // Form State
  const [daysLate, setDaysLate] = useState<number>(0)
  const [unprotectedIntercourse, setUnprotectedIntercourse] = useState<boolean>(false)
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([])
  const [testResult, setTestResult] = useState<string>("not_taken")
  const [hasPCOS, setHasPCOS] = useState<boolean>(true)

  // API & Result State
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>("")
  const [result, setResult] = useState<PregnancyResult | null>(null)
  const [history, setHistory] = useState<any[]>([])

  // Action plan accordion state (first recommendation expanded by default)
  const [expandedRecs, setExpandedRecs] = useState<number[]>([0])

  const toggleRec = (idx: number) => {
    setExpandedRecs((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    )
  }

  useEffect(() => {
    const storedUser = localStorage.getItem("user")
    if (!storedUser) {
      router.push("/login")
      return
    }

    const parsed = JSON.parse(storedUser)
    setUser(parsed)

    if (parsed.email) {
      fetchCycleInfo(parsed.email)
      fetchHistory(parsed.email)
    }
  }, [router, fetchCycleInfo])

  // Automatically compute and pre-fill days late if period is overdue
  useEffect(() => {
    if (cycleInfo && cycleInfo.next_predicted_raw) {
      try {
        const nextDate = new Date(cycleInfo.next_predicted_raw)
        const today = new Date()
        nextDate.setHours(0, 0, 0, 0)
        today.setHours(0, 0, 0, 0)
        const diffDays = Math.round((today.getTime() - nextDate.getTime()) / (1000 * 3600 * 24))
        if (diffDays > 0) {
          setDaysLate(diffDays)
        }
      } catch (err) {
        console.error("Error computing days late:", err)
      }
    }
  }, [cycleInfo])

  const fetchHistory = async (email: string) => {
    try {
      const res = await fetch(`/api/pregnancy-history/${email}`)
      const data = await res.json()
      if (data.history) {
        setHistory(data.history)
      }
    } catch (e) {
      console.error("Failed to load pregnancy history:", e)
    }
  }

  const toggleSymptom = (id: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const payload = {
        email: user?.email || undefined,
        days_late: Number(daysLate),
        unprotected_intercourse: unprotectedIntercourse,
        symptoms: selectedSymptoms,
        test_result: testResult,
        has_pcos: hasPCOS,
        last_period_date: cycleInfo?.next_period_start || null,
      }

      const res = await fetch("/api/pregnancy-assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || "Assessment failed")

      setResult(data)
      setExpandedRecs([0]) // Open first action item by default
      if (user?.email) fetchHistory(user.email)
      window.scrollTo({ top: 0, behavior: "smooth" })
    } catch (err: any) {
      setError(err.message || "An error occurred during evaluation.")
    } finally {
      setLoading(false)
    }
  }

  if (!user) return <div className="min-h-screen bg-stone-50 dark:bg-stone-950"></div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-50 dark:from-stone-950 dark:via-stone-900 dark:to-rose-950 pt-32 sm:pt-36 pb-20 px-4 sm:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8 pt-2 sm:pt-4">
        
        {/* Page Header */}
        <div className="text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 rounded-full text-xs font-semibold mb-3">
            <HeartPulse className="w-3.5 h-3.5" /> Early Pregnancy & PCOS Screener
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-stone-900 dark:text-white tracking-tight">
            Pregnancy Probability Check
          </h1>
          <p className="text-stone-600 dark:text-stone-400 mt-2 text-sm sm:text-base">
            Understand whether a missed period and hormonal symptoms are due to early conception or typical PCOS cycle irregularities.
          </p>
        </div>

        {/* Cycle Context Alert (if cycle tracking has data) */}
        {cycleInfo && !cycleInfo.message && (
          <div className="bg-white/80 dark:bg-stone-900/80 backdrop-blur-md border border-rose-200 dark:border-rose-900/40 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/60 rounded-xl text-rose-600 dark:text-rose-400">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
                  Cycle Data Sync
                </p>
                <p className="text-sm font-medium text-stone-800 dark:text-stone-200">
                  {cycleInfo.next_predicted ? (
                    <>
                      Expected period was <strong className="text-rose-600 dark:text-rose-400">{cycleInfo.next_predicted}</strong>
                      {daysLate > 0 ? ` (${daysLate} days late)` : " (on schedule)"}
                    </>
                  ) : (
                    "Cycle dates logged on Period Tracker"
                  )}
                </p>
                {cycleInfo.ovulation_date_display && (
                  <p className="text-xs text-stone-500 mt-0.5">
                    Estimated Ovulation Window: around {cycleInfo.ovulation_date_display}
                  </p>
                )}
              </div>
            </div>
            {daysLate > 0 && (
              <span className="px-3 py-1 bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 text-xs font-bold rounded-full">
                Period Overdue
              </span>
            )}
          </div>
        )}

        {/* ASSESSMENT RESULT CARD (When calculated) */}
        {result && (
          <div className="bg-white dark:bg-stone-900 border-2 border-rose-200 dark:border-rose-900/50 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 dark:border-stone-800 pb-6">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                  Assessment Result
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 dark:text-white mt-1">
                  {result.likelihood_category}
                </h2>
                <p className="text-xs text-stone-500 mt-1">Calculated {result.assessed_at}</p>
              </div>

              {/* Probability Meter Badge */}
              <div className="flex items-center gap-3 bg-stone-50 dark:bg-stone-800/60 px-5 py-3 rounded-2xl border border-stone-200 dark:border-stone-700">
                <div className="text-right">
                  <div className="text-3xl font-black text-rose-600 dark:text-rose-400">
                    {result.probability}%
                  </div>
                  <div className="text-[11px] font-semibold text-stone-500 uppercase">
                    Probability
                  </div>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="w-full bg-stone-100 dark:bg-stone-800 h-3 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-1000 ${
                    result.probability >= 70
                      ? "bg-gradient-to-r from-rose-500 to-pink-600"
                      : result.probability >= 30
                      ? "bg-gradient-to-r from-amber-400 to-amber-500"
                      : "bg-gradient-to-r from-teal-400 to-emerald-500"
                  }`}
                  style={{ width: `${result.probability}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-[11px] text-stone-400 font-medium">
                <span>Low (0%)</span>
                <span>Moderate (50%)</span>
                <span>High (100%)</span>
              </div>
            </div>

            {/* Live Data Signals from Period Tracker & PCOS Assessment */}
            {(result.cycle_tracker_data || result.pcos_assessment_data) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Period Tracker Card */}
                <div className="p-4 rounded-2xl bg-pink-50/60 dark:bg-pink-950/20 border border-pink-100 dark:border-pink-900/30">
                  <div className="flex items-center gap-2 text-xs font-bold text-pink-700 dark:text-pink-300 mb-1.5">
                    <Calendar className="w-4 h-4 text-pink-600" /> Period Tracker Signals
                  </div>
                  {result.cycle_tracker_data ? (
                    <div className="text-xs text-stone-600 dark:text-stone-300 space-y-1">
                      <p>• Average Cycle: <strong>{result.cycle_tracker_data.average_cycle} days</strong></p>
                      <p>• Current Cycle Day: <strong>Day {result.cycle_tracker_data.days_since_latest}</strong></p>
                      <p>• Tracked Overdue: <strong>{result.cycle_tracker_data.days_overdue} days</strong></p>
                    </div>
                  ) : (
                    <p className="text-xs text-stone-500">No period dates logged yet. Using questionnaire estimates.</p>
                  )}
                </div>

                {/* PCOS Assessment Card */}
                <div className="p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30">
                  <div className="flex items-center gap-2 text-xs font-bold text-rose-700 dark:text-rose-300 mb-1.5">
                    <Stethoscope className="w-4 h-4 text-rose-600" /> PCOS Assessment Signals
                  </div>
                  {result.pcos_assessment_data && result.pcos_assessment_data.has_record ? (
                    <div className="text-xs text-stone-600 dark:text-stone-300 space-y-1">
                      <p>• Risk Score: <strong>{result.pcos_assessment_data.risk_percentage}% ({result.pcos_assessment_data.risk_level})</strong></p>
                      <p>• Active Symptoms: <strong>{result.pcos_assessment_data.symptoms.join(", ") || "None"}</strong></p>
                      <p className="text-[11px] text-stone-400">Assessed on {result.pcos_assessment_data.assessed_date}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-stone-500">No PCOS assessment taken yet. You can take it on the Assessment page.</p>
                  )}
                </div>
              </div>
            )}

            {/* PCOS vs Pregnancy Insight */}
            <div className="bg-rose-50/60 dark:bg-rose-950/20 p-5 rounded-2xl border border-rose-100 dark:border-rose-900/40 space-y-2">
              <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-bold text-sm">
                <Info className="w-4 h-4 shrink-0 text-rose-600" />
                PCOS vs. Pregnancy Comparison
              </div>
              <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed">
                {result.pcos_vs_pregnancy}
              </p>
            </div>

            {/* Clinical Calculation Basis Breakdown */}
            {result.basis_factors && result.basis_factors.length > 0 && (
              <div className="bg-stone-50 dark:bg-stone-800/40 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-stone-900 dark:text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-rose-600" /> Clinical Calculation Basis
                  </h3>
                  <span className="text-[11px] text-stone-400 font-medium">ACOG & Wilcox Fecundability Model</span>
                </div>
                <div className="space-y-2">
                  {result.basis_factors.map((item, bIdx) => (
                    <div
                      key={bIdx}
                      className="flex items-start justify-between gap-3 p-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-200/70 dark:border-stone-800/80 text-xs shadow-xs"
                    >
                      <div className="space-y-0.5">
                        <span className="font-semibold text-stone-800 dark:text-stone-200">{item.factor}</span>
                        <p className="text-stone-500 dark:text-stone-400 text-[11px] leading-relaxed">{item.detail}</p>
                      </div>
                      <span className="font-mono font-bold text-pink-600 dark:text-pink-400 shrink-0 bg-pink-50 dark:bg-pink-950/50 px-2.5 py-1 rounded-lg text-xs">
                        {item.weight}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Interactive Clinical Action Plan with Expandable Arrows */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-stone-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-pink-600" /> Recommended Action Plan
                </h3>
                <span className="text-[11px] text-stone-400 font-medium">
                  Click any step to view clinical instructions
                </span>
              </div>

              <div className="space-y-2.5">
                {result.recommendations.map((rec, idx) => {
                  const isExpanded = expandedRecs.includes(idx)
                  const details = getRecommendationDetails(rec)

                  return (
                    <div
                      key={idx}
                      className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                        isExpanded
                          ? "bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50 shadow-sm"
                          : "bg-stone-50 dark:bg-stone-800/40 border-stone-200 dark:border-stone-800 hover:border-pink-300 dark:hover:border-pink-800"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleRec(idx)}
                        className="w-full text-left p-3.5 sm:p-4 flex items-start justify-between gap-3 cursor-pointer select-none group"
                        aria-expanded={isExpanded}
                      >
                        <div className="flex items-start gap-2.5">
                          <div
                            className={`p-1 rounded-lg transition-transform duration-200 mt-0.5 ${
                              isExpanded
                                ? "bg-rose-100 dark:bg-rose-900/50 text-rose-600 rotate-90"
                                : "text-pink-500 group-hover:text-rose-600 group-hover:translate-x-0.5"
                            }`}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs sm:text-sm font-semibold text-stone-800 dark:text-stone-200 leading-snug block">
                              {rec}
                            </span>
                            <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider text-pink-600 dark:text-pink-400 bg-pink-100 dark:bg-pink-950/60 px-2 py-0.5 rounded-md">
                              {details.tag}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs text-stone-400 group-hover:text-rose-500 font-medium shrink-0 pt-1">
                          {isExpanded ? "Hide" : "Details"}
                        </span>
                      </button>

                      {isExpanded && (
                        <div className="px-4 pb-4 pt-1 sm:px-6 sm:pb-5 border-t border-rose-100 dark:border-rose-900/30 text-xs sm:text-sm animate-in fade-in slide-in-from-top-1 duration-200 space-y-2.5">
                          <p className="font-bold text-stone-900 dark:text-white text-xs mt-2">
                            💡 {details.title}
                          </p>
                          <ul className="space-y-1.5 pl-1">
                            {details.tips.map((tip, tIdx) => (
                              <li
                                key={tIdx}
                                className="flex items-start gap-2 text-stone-600 dark:text-stone-300 text-xs leading-relaxed"
                              >
                                <span className="text-pink-500 font-bold">•</span>
                                <span>{tip}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setResult(null)}
                className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" /> Re-take or Adjust Assessment
              </button>
            </div>
          </div>
        )}

        {/* EVALUATION FORM */}
        {!result && (
          <form
            onSubmit={handleSubmit}
            className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-8"
          >
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm rounded-xl flex items-center gap-2 border border-red-200 dark:border-red-800/40">
                <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}

            {/* Section 1: Period Delay */}
            <div className="space-y-3">
              <label className="block text-sm font-bold text-stone-900 dark:text-white">
                1. How many days late is your expected period?
              </label>
              <div className="flex flex-wrap gap-2">
                {[0, 1, 3, 5, 7, 10, 14, 21].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setDaysLate(val)}
                    className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                      daysLate === val
                        ? "bg-rose-600 text-white shadow-md shadow-rose-500/20"
                        : "bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700"
                    }`}
                  >
                    {val === 0 ? "Not late (0d)" : `${val} days late`}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-stone-500">Or enter exact number:</span>
                <input
                  type="number"
                  min="0"
                  max="120"
                  value={daysLate}
                  onChange={(e) => setDaysLate(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-24 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-1.5 text-xs sm:text-sm text-stone-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            {/* Section 2: Timing of Intercourse */}
            <div className="space-y-3">
              <label className="block text-sm font-bold text-stone-900 dark:text-white">
                2. Did you have unprotected intercourse during or near your ovulation / fertile window?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setUnprotectedIntercourse(true)}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                    unprotectedIntercourse
                      ? "border-rose-600 bg-rose-50/60 dark:bg-rose-950/30 text-rose-900 dark:text-rose-100 ring-2 ring-rose-500/30"
                      : "border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/40 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300"
                  }`}
                >
                  <p className="font-bold text-sm">Yes, had intercourse</p>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                    Unprotected or potential contraceptive failure during the fertile window.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setUnprotectedIntercourse(false)}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                    !unprotectedIntercourse
                      ? "border-rose-600 bg-rose-50/60 dark:bg-rose-950/30 text-rose-900 dark:text-rose-100 ring-2 ring-rose-500/30"
                      : "border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/40 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300"
                  }`}
                >
                  <p className="font-bold text-sm">No / Protected</p>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                    Either no intercourse or strictly protected with effective contraception.
                  </p>
                </button>
              </div>
            </div>

            {/* Section 3: Early Symptoms */}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-bold text-stone-900 dark:text-white">
                  3. Are you experiencing any of these early symptoms?
                </label>
                <p className="text-xs text-stone-500 mt-0.5">Select all that apply to you:</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SYMPTOM_OPTIONS.map((sym) => {
                  const isSelected = selectedSymptoms.includes(sym.id)
                  return (
                    <div
                      key={sym.id}
                      onClick={() => toggleSymptom(sym.id)}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                        isSelected
                          ? "border-rose-500 bg-rose-50/50 dark:bg-rose-950/20 text-rose-900 dark:text-rose-100 shadow-sm"
                          : "border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/40 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300"
                      }`}
                    >
                      <span className="text-xl shrink-0 mt-0.5">{sym.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-xs sm:text-sm font-bold">{sym.label}</p>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            readOnly
                            className="rounded text-rose-600 focus:ring-rose-500 pointer-events-none"
                          />
                        </div>
                        <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 leading-snug">
                          {sym.description}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Section 4: Home Pregnancy Test Status */}
            <div className="space-y-3">
              <label className="block text-sm font-bold text-stone-900 dark:text-white">
                4. Have you taken a home urine pregnancy test?
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { id: "not_taken", label: "Not taken yet" },
                  { id: "negative", label: "Negative (-)" },
                  { id: "faint_positive", label: "Faint Line (+)" },
                  { id: "positive", label: "Clear Positive (+)" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTestResult(item.id)}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      testResult === item.id
                        ? "border-rose-600 bg-rose-600 text-white shadow-md shadow-rose-500/20"
                        : "border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Section 5: PCOS Diagnosis Flag */}
            <div className="p-4 bg-stone-50 dark:bg-stone-800/40 rounded-2xl border border-stone-200 dark:border-stone-800 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs sm:text-sm font-bold text-stone-900 dark:text-white">
                  Diagnosed or suspected PCOS?
                </p>
                <p className="text-[11px] text-stone-500 dark:text-stone-400">
                  Accounts for natural anovulatory delays and hormonal baseline shifts.
                </p>
              </div>
              <input
                type="checkbox"
                checked={hasPCOS}
                onChange={(e) => setHasPCOS(e.target.checked)}
                className="w-5 h-5 text-rose-600 rounded focus:ring-rose-500 cursor-pointer"
              />
            </div>

            {/* Submit Button */}
            <button
              disabled={loading}
              type="submit"
              className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-rose-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-base"
            >
              {loading ? (
                <>Evaluating Clinical Indicators...</>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" /> Calculate Pregnancy Likelihood
                </>
              )}
            </button>
          </form>
        )}

        {/* Assessment History */}
        {history.length > 0 && (
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-stone-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-stone-400" /> Previous Pregnancy Assessments
            </h3>

            <div className="divide-y divide-stone-100 dark:divide-stone-800">
              {history.map((rec, idx) => (
                <div key={idx} className="py-3.5 flex items-center justify-between gap-3 text-xs sm:text-sm">
                  <div>
                    <span className="font-semibold text-stone-800 dark:text-stone-200">
                      {rec.likelihood_category}
                    </span>
                    <span className="text-stone-400 ml-2">({rec.days_late}d late)</span>
                    <p className="text-stone-400 text-[11px] mt-0.5">{rec.assessed_at}</p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                        rec.probability >= 70
                          ? "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
                          : rec.probability >= 30
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                          : "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300"
                      }`}
                    >
                      {rec.probability}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      <ChatBot cycleAware={true} />
    </div>
  )
}
