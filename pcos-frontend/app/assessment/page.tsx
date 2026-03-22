"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Activity, Weight, Ruler, AlertTriangle, CheckCircle2, TrendingUp, History, Stethoscope, RefreshCw } from "lucide-react"
import ChatBot from "../components/ChatBot"
import { useCycleInfo } from "../context/CycleContext"

type PredictionResult = {
  prediction: number
  risk_percentage: number
}

export default function AssessmentPage() {
  const router = useRouter()
  const { cycleInfo } = useCycleInfo()
  const [form, setForm] = useState({
    age: "",
    height: "",
    weight: "",
    bmi: "",
    cycle_length: "",
    weight_gain: false,
    hair_growth: false,
    skin_darkening: false,
    hair_loss: false,
    pimples: false,
    fast_food: false,
  })

  const [user, setUser] = useState<any>(null)
  const [history, setHistory] = useState<any[]>([])
  const [result, setResult] = useState<PredictionResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    const storedUser = localStorage.getItem("user")
    if (!storedUser) {
      router.push("/login")
      return
    }
    
    const parsedUser = JSON.parse(storedUser)
    setUser(parsedUser)
    setForm((prev) => ({ ...prev, age: parsedUser.age?.toString() || "" }))

    // Auto-populate cycle length from logged periods
    if (cycleInfo && cycleInfo.average_cycle) {
      setForm((prev) => ({ ...prev, cycle_length: cycleInfo.average_cycle.toString() }))
    }

    fetch(`/api/history/${parsedUser.email}`)
      .then(res => res.json())
      .then(data => {
         if(data.history) setHistory(data.history)
      })
      .catch(err => console.error("Failed to fetch history", err))
  }, [router, cycleInfo])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
   const newForm: any = { ...form, [name]: type === 'checkbox' ? checked : value }

    if (name === "height" || name === "weight") {
      const h = Number(newForm.height)
      const w = Number(newForm.weight)
      if (h > 0 && w > 0) {
        const heightInMeters = h / 100
        newForm.bmi = (w / (heightInMeters * heightInMeters)).toFixed(1)
      } else {
        newForm.bmi = ""
      }
    }

    setForm(newForm)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    if (!form.age || !form.height || !form.weight || !form.bmi || !form.cycle_length) {
      setError("Please log period dates on the Period Tracker first to establish your cycle length.")
      setIsLoading(false)
      return
    }

    if (isNaN(Number(form.bmi))) {
      setError("BMI calculation failed. Please check Height and Weight values")
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch("/api/predict", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: user?.email,
          age: Number(form.age),
          weight: Number(form.weight),
          bmi: Number(form.bmi),
          cycle_length: Number(form.cycle_length),
          weight_gain:    form.weight_gain    ? 1 : 0,
          hair_growth:    form.hair_growth    ? 1 : 0,
          skin_darkening: form.skin_darkening ? 1 : 0,
          hair_loss:      form.hair_loss      ? 1 : 0,
          pimples:        form.pimples        ? 1 : 0,
          fast_food:      form.fast_food      ? 1 : 0,
        })
      })

      if (!response.ok) {
        throw new Error("Failed to connect to the prediction server. Is it running?")
      }

      const data = await response.json()
      
      if (data.error) {
        setError(data.error + (data.details ? ` (${data.details})` : ""))
      } else {
        setResult(data)
        setHistory(prev => [{
            date: data.date, 
            risk_percentage: data.risk_percentage, 
            prediction: data.prediction
        }, ...prev])
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.")
    } finally {
      setIsLoading(false)
    }
  }

  const getRiskCategory = (percentage: number) => {
    if (percentage <= 30) return { label: "Low Risk", color: "bg-teal-500", text: "text-teal-500", shadow: "shadow-teal-500/20" }
    if (percentage <= 60) return { label: "Moderate Risk", color: "bg-amber-500", text: "text-amber-500", shadow: "shadow-amber-500/20" }
    return { label: "High Risk", color: "bg-rose-500", text: "text-rose-500", shadow: "shadow-rose-500/20" }
  }

  if (!user) return <div className="min-h-screen bg-stone-50 dark:bg-stone-950"></div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-50 dark:from-stone-950 dark:via-stone-900 dark:to-rose-950 transition-colors duration-500 pt-24 p-4 sm:p-8 font-sans">
      
      <div className="max-w-[1400px] mx-auto px-4 w-full">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-stone-900 dark:text-white mb-2">
            PCOS Risk Assessment
          </h1>
          <p className="text-stone-600 dark:text-stone-300 mb-4">
            Complete your health metrics to receive an instant AI-powered PCOS risk evaluation
          </p>
          
          {!cycleInfo?.average_cycle && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  Log your period dates first
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                  Go to the Period Tracker and log at least 2 period dates to establish your cycle length. This will be automatically used for your assessment.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="grid xl:grid-cols-5 lg:grid-cols-1 gap-12 items-start">
          
          {/* Left: Form */}
          <div className="xl:col-span-3 lg:col-span-5 relative group">
            <div className="absolute -inset-1 bg-gradient-to-br from-pink-500/20 to-rose-500/20 rounded-3xl blur-md group-hover:opacity-100 transition duration-500"></div>
            
            <div className="relative bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 sm:p-8 rounded-3xl shadow-sm">
              <h2 className="text-2xl font-bold text-stone-800 dark:text-white mb-6 flex items-center gap-2">
                <Activity className="w-6 h-6 text-rose-500" /> Patient Metrics
              </h2>

              <form onSubmit={handleSubmit} className="space-y-5">
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Age</label>
                    <input
                      required type="number" step="any"
                      className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl px-4 py-3 text-stone-800 dark:text-white focus:ring-2 focus:ring-pink-500 focus:outline-none transition-all"
                      name="age" placeholder="e.g. 28"
                      value={form.age} onChange={handleChange}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Height (cm)</label>
                    <input
                      required type="number" step="any"
                      className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl px-4 py-3 text-stone-800 dark:text-white focus:ring-2 focus:ring-pink-500 focus:outline-none transition-all"
                      name="height" placeholder="e.g. 165"
                      value={form.height} onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Weight (kg)</label>
                    <input
                      required type="number" step="any"
                      className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl px-4 py-3 text-stone-800 dark:text-white focus:ring-2 focus:ring-pink-500 focus:outline-none transition-all"
                      name="weight" placeholder="e.g. 65"
                      value={form.weight} onChange={handleChange}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide">BMI (Auto)</label>
                    <input
                      required readOnly type="number" step="any"
                      className="w-full bg-stone-100 dark:bg-stone-800/50 border border-transparent rounded-xl px-4 py-3 text-stone-500 cursor-not-allowed focus:outline-none"
                      name="bmi" placeholder="-"
                      value={form.bmi}
                    />
                  </div>
                </div>

                <div className="border-t border-stone-100 dark:border-stone-800 my-4 pt-4"></div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide flex justify-between">
                    <span>Cycle Length (From Tracker)</span>
                    <span className="text-stone-400">days</span>
                  </label>
                  <input
                    required readOnly type="text"
                    className="w-full bg-stone-100 dark:bg-stone-800/50 border border-transparent rounded-xl px-4 py-3 cursor-not-allowed text-center font-bold text-lg text-stone-500"
                    name="cycle_length" placeholder="Log periods on Period Tracker first..."
                    value={form.cycle_length}
                  />
                  <p className="text-xs text-stone-500 dark:text-stone-400 text-center">Auto-populated from your logged period dates</p>
                </div>

                <div className="border-t border-stone-100 dark:border-stone-800 pt-4">
                  <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">Symptoms</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { name: "weight_gain",    label: "Weight Gain" },
                      { name: "hair_growth",    label: "Excess Hair Growth" },
                      { name: "skin_darkening", label: "Skin Darkening" },
                      { name: "hair_loss",      label: "Hair Loss" },
                      { name: "pimples",        label: "Acne / Pimples" },
                      { name: "fast_food",      label: "Frequent Fast Food" },
                    ].map(sym => (
                      <label key={sym.name} className="flex items-center gap-2.5 cursor-pointer group">
                        <input
                          type="checkbox"
                          name={sym.name}
                          checked={(form as any)[sym.name]}
                          onChange={handleChange}
                          className="w-4 h-4 accent-pink-600 rounded"
                        />
                        <span className="text-sm text-stone-600 dark:text-stone-300 group-hover:text-stone-900 dark:group-hover:text-white transition-colors">{sym.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || form.cycle_length === "Invalid Dates"}
                  className={`w-full mt-4 text-white font-bold py-4 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${form.cycle_length === 'Invalid Dates' ? 'bg-stone-300 dark:bg-stone-800 cursor-not-allowed' : 'bg-stone-900 hover:bg-stone-800 dark:bg-pink-600 dark:hover:bg-pink-500'}`}
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" /> Analyzing...
                    </>
                  ) : (
                    <>
                      <Activity className="w-5 h-5" /> Run Assessment
                    </>
                  )}
                </button>

                {error && (
                  <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> {error}
                  </div>
                )}
              </form>
            </div>
          </div>

          {/* Right: Results & Cycle Info */}
          <div className="xl:col-span-2 lg:col-span-5 w-full h-full flex flex-col gap-6">
            
            {/* Cycle Status - from tracker */}
            {cycleInfo && !cycleInfo.message && (
              <div className={`bg-white dark:bg-stone-900 border-2 rounded-3xl shadow-sm p-5 sm:p-6 ${
                cycleInfo.irregular 
                  ? "border-rose-200 dark:border-rose-900/50 bg-gradient-to-br from-white to-rose-50 dark:from-stone-900 dark:to-rose-900/20"
                  : "border-teal-200 dark:border-teal-900/50 bg-gradient-to-br from-white to-teal-50 dark:from-stone-900 dark:to-teal-900/20"
              }`}>
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-full ${
                    cycleInfo.irregular 
                      ? "bg-rose-100 dark:bg-rose-900/40" 
                      : "bg-teal-100 dark:bg-teal-900/40"
                  }`}>
                    {cycleInfo.irregular ? (
                      <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className={`text-sm font-bold mb-1 ${
                      cycleInfo.irregular 
                        ? "text-rose-700 dark:text-rose-300" 
                        : "text-teal-700 dark:text-teal-300"
                    }`}>
                      {cycleInfo.irregular ? "Irregular Cycle" : "Normal Cycle"}
                    </h4>
                    <p className="text-xs text-stone-600 dark:text-stone-400">
                      {cycleInfo.average_cycle} days / Avg
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Risk Result */}
            {result ? (
              <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-5 sm:p-6 rounded-3xl shadow-sm">
                <h3 className="text-stone-500 dark:text-stone-400 font-medium tracking-wide uppercase text-xs mb-3">PCOS Risk</h3>
                
                <div className="mb-4">
                  <div className="text-4xl font-black mb-2">
                    <span className={getRiskCategory(result.risk_percentage).text}>
                      {getRiskCategory(result.risk_percentage).label}
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-stone-800 dark:text-white">
                    {result.risk_percentage.toFixed(1)}<span className="text-sm text-stone-400">%</span>
                  </p>
                </div>

                <div className="w-full h-4 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden mb-4">
                  <div
                    className={`h-full ${getRiskCategory(result.risk_percentage).color} transition-all duration-500`}
                    style={{ width: `${Math.max(10, result.risk_percentage)}%` }}
                  />
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <h4 className="font-bold text-stone-800 dark:text-white mb-2 flex items-center gap-2">
                      <Stethoscope className="w-4 h-4 text-rose-500" /> Recommendations
                    </h4>
                    <ul className="space-y-1.5 text-stone-600 dark:text-stone-400">
                      <li>• Exercise regularly & maintain healthy weight</li>
                      <li>• Reduce refined sugars & processed food</li>
                      <li>• Consult with a gynecologist</li>
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-stone-100/50 dark:bg-stone-900/30 rounded-3xl border-2 border-dashed border-stone-200 dark:border-stone-800 p-6 text-center flex flex-col items-center justify-center min-h-[300px]">
                <div className="w-12 h-12 bg-white dark:bg-stone-800 rounded-full flex items-center justify-center shadow-sm mb-3">
                  <TrendingUp className="w-6 h-6 text-stone-300 dark:text-stone-600" />
                </div>
                <h4 className="text-sm font-bold text-stone-700 dark:text-stone-300 mb-1">No Assessment Yet</h4>
                <p className="text-xs text-stone-500">Fill the form and submit to see your risk analysis</p>
              </div>
            )}

            {/* History */}
            {history.length > 0 && (
              <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-5 rounded-3xl shadow-sm">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-800 dark:text-white mb-3 flex items-center gap-2">
                  <History className="w-4 h-4" /> Recent Tests
                </h4>
                <div className="space-y-2 max-h-[150px] overflow-y-auto">
                  {history.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2 bg-stone-50 dark:bg-stone-800/30 rounded-lg text-xs">
                      <span className="text-stone-600 dark:text-stone-400">{item.date}</span>
                      <span className={`font-bold ${getRiskCategory(item.risk_percentage).text}`}>
                        {(item.risk_percentage || 0).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Chatbot aware of assessment context */}
      <ChatBot cycleAware={true} />
    </div>
  )
}
