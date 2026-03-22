"use client"

import { useRouter } from "next/navigation"
import { ActivitySquare, ArrowRight, ShieldCheck, Activity, Stethoscope } from "lucide-react"
import ThemeToggle from "./components/ThemeToggle"

export default function LandingPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-50 dark:from-stone-950 dark:via-stone-900 dark:to-rose-950 flex flex-col items-center justify-center p-4 sm:p-8 font-sans transition-colors duration-500 relative overflow-hidden">
      
      {/* Background decoration */}
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-pink-400/20 dark:bg-pink-600/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-rose-400/20 dark:bg-rose-600/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="max-w-4xl text-center space-y-8 relative z-10">
        
        {/* Logo Icon */}
        <div className="mx-auto w-20 h-20 bg-white dark:bg-stone-800 shadow-xl shadow-pink-500/10 rounded-3xl flex items-center justify-center rotate-3 transform hover:rotate-6 transition-transform">
          <ActivitySquare className="w-10 h-10 text-pink-600 dark:text-pink-400" />
        </div>

        {/* Hero Text */}
        <div className="space-y-4">
          <h1 className="text-5xl md:text-7xl font-extrabold text-stone-900 dark:text-white tracking-tight leading-tight">
            Predict & Track <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-rose-600 dark:from-pink-400 dark:to-rose-400">Your PCOS Health</span>
          </h1>
          <p className="text-lg md:text-xl text-stone-600 dark:text-stone-300 leading-relaxed max-w-2xl mx-auto">
            An intelligent healthcare application driven by AI to help you assess risks, track your cycle, and maintain a historical record of your well-being.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
          <button 
            onClick={() => router.push('/signup')}
            className="w-full sm:w-auto px-8 py-4 bg-stone-900 hover:bg-stone-800 dark:bg-pink-600 dark:hover:bg-pink-500 text-white font-bold rounded-xl transition-all shadow-xl shadow-stone-900/10 dark:shadow-pink-600/20 flex items-center justify-center gap-2 transform hover:-translate-y-1"
          >
            Create Free Account <ArrowRight className="w-5 h-5" />
          </button>
          
          <button 
            onClick={() => router.push('/login')}
            className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-stone-50 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-900 dark:text-white font-bold rounded-xl transition-all shadow-sm border border-stone-200 dark:border-stone-700 flex items-center justify-center gap-2"
          >
            Login to Dashboard
          </button>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 pt-16">
          <div className="p-6 bg-white/60 dark:bg-stone-900/50 backdrop-blur-md rounded-2xl border border-stone-200 dark:border-stone-800 text-left hover:shadow-lg transition-shadow">
             <ShieldCheck className="w-8 h-8 text-teal-500 mb-4" />
             <h3 className="font-bold text-stone-900 dark:text-white mb-2">Private & Secure</h3>
             <p className="text-sm text-stone-500 dark:text-stone-400">All your health records are securely encrypted and kept entirely private to you.</p>
          </div>
          <div className="p-6 bg-white/60 dark:bg-stone-900/50 backdrop-blur-md rounded-2xl border border-stone-200 dark:border-stone-800 text-left hover:shadow-lg transition-shadow">
             <Stethoscope className="w-8 h-8 text-rose-500 mb-4" />
             <h3 className="font-bold text-stone-900 dark:text-white mb-2">AI Diagnosis</h3>
             <p className="text-sm text-stone-500 dark:text-stone-400">State-of-the-art Random Forest machine learning models provide instant risk assessments.</p>
          </div>
          <div className="p-6 bg-white/60 dark:bg-stone-900/50 backdrop-blur-md rounded-2xl border border-stone-200 dark:border-stone-800 text-left hover:shadow-lg transition-shadow">
             <Activity className="w-8 h-8 text-pink-500 mb-4" />
             <h3 className="font-bold text-stone-900 dark:text-white mb-2">Historical Tracking</h3>
             <p className="text-sm text-stone-500 dark:text-stone-400">A personalized dashboard tracks your symptoms and metrics across different dates over time.</p>
          </div>
        </div>

      </div>
    </div>
  )
}
