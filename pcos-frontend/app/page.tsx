"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import {
  ArrowRight, ShieldCheck, Activity, Stethoscope,
  CalendarHeart, Brain, ChevronDown, ChevronUp, MessageCircle,
  BarChart3, Heart, Star, Mail, Github, Twitter, CheckCircle2,
  Moon, Sun, Menu, X, Sparkles, Users, TrendingUp, Clock
} from "lucide-react"
import ThemeToggle from "./components/ThemeToggle"
import Image from "next/image"

const faqs = [
  {
    q: "How accurate is the PCOS prediction?",
    a: "Our AI model, trained on thousands of clinical data points using a Random Forest classifier, achieves over 85% accuracy in risk assessment. It evaluates hormonal, metabolic, and lifestyle markers to give you a comprehensive risk score."
  },
  {
    q: "Is my health data private and secure?",
    a: "Absolutely. All your data is encrypted at rest and in transit. We never share your personal health information with third parties. You have full control over your data and can delete it at any time."
  },
  {
    q: "Do I need a doctor to use this app?",
    a: "No. Our app is designed as a self-assessment and awareness tool. However, we always recommend consulting a qualified healthcare professional for a formal diagnosis and treatment plan."
  },
  {
    q: "How does the period tracker work?",
    a: "You log your period dates manually on the interactive calendar. The app then uses your cycle history to predict future periods, ovulation windows, and generate a 12-month forecast — all based on your unique cycle patterns."
  },
  {
    q: "Is this app free to use?",
    a: "Yes! Creating an account and accessing all core features — AI risk assessment, period tracking, history dashboard, and AI chat — is completely free."
  },
]

const features = [
  {
    icon: <Brain className="w-7 h-7 text-purple-500" />,
    title: "AI-Powered Risk Assessment",
    desc: "Answer a short questionnaire about your symptoms and metrics. Our Random Forest model instantly evaluates your PCOS risk with a detailed, color-coded score.",
    color: "from-purple-500/10 to-violet-500/5 border-purple-200 dark:border-purple-900",
  },
  {
    icon: <CalendarHeart className="w-7 h-7 text-pink-500" />,
    title: "Smart Period Tracker",
    desc: "Log your cycle manually on a full-year interactive calendar. Automatic predictions for ovulation, upcoming periods, and fertile windows are generated from your history.",
    color: "from-pink-500/10 to-rose-500/5 border-pink-200 dark:border-pink-900",
  },
  {
    icon: <BarChart3 className="w-7 h-7 text-teal-500" />,
    title: "Health History Dashboard",
    desc: "Every assessment you take is saved to your personal timeline. Visualize how your risk scores and symptoms evolve across multiple sessions.",
    color: "from-teal-500/10 to-emerald-500/5 border-teal-200 dark:border-teal-900",
  },
  {
    icon: <MessageCircle className="w-7 h-7 text-sky-500" />,
    title: "AI Health Chatbot",
    desc: "Have a real-time conversation with an AI assistant trained on PCOS knowledge. Get instant answers about symptoms, treatment, diet, and lifestyle.",
    color: "from-sky-500/10 to-blue-500/5 border-sky-200 dark:border-sky-900",
  },
  {
    icon: <ShieldCheck className="w-7 h-7 text-green-500" />,
    title: "Private & Encrypted",
    desc: "Your health is personal. All records are fully encrypted and stored securely. We never sell or share your data — ever.",
    color: "from-green-500/10 to-emerald-500/5 border-green-200 dark:border-green-900",
  },
  {
    icon: <TrendingUp className="w-7 h-7 text-orange-500" />,
    title: "Cycle Insights & Trends",
    desc: "Understand your cycle length, irregularity patterns, and predicted ovulation windows over the next 12 months at a glance.",
    color: "from-orange-500/10 to-amber-500/5 border-orange-200 dark:border-orange-900",
  },
]

const steps = [
  { num: "01", title: "Create Your Account", desc: "Sign up for free in seconds. No credit card required.", icon: <Users className="w-6 h-6" /> },
  { num: "02", title: "Complete the Assessment", desc: "Answer questions about your symptoms, cycle, and lifestyle.", icon: <Stethoscope className="w-6 h-6" /> },
  { num: "03", title: "Get Instant AI Results", desc: "Receive a personalized PCOS risk score with detailed explanations.", icon: <Sparkles className="w-6 h-6" /> },
  { num: "04", title: "Track & Monitor", desc: "Log your cycle and revisit your dashboard to track progress over time.", icon: <Clock className="w-6 h-6" /> },
]

const stats = [
  { value: "12+", label: "Health Metrics Analyzed" },
  { value: "100%", label: "Free to Use" },
  { value: "24/7", label: "AI Chat Support" },
]

export default function LandingPage() {
  const router = useRouter()
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-50 dark:from-stone-950 dark:via-stone-900 dark:to-rose-950 font-sans transition-colors duration-500 overflow-x-hidden">

      {/* ─── Navbar ─── */}
      <nav className="fixed top-0 z-50 w-full border-b border-stone-200/60 dark:border-stone-800/60 backdrop-blur-xl bg-white/70 dark:bg-stone-950/70">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <button onClick={() => router.push('/')} className="flex items-center gap-2.5 group">
            <Image src="/logo.png" alt="PCOSPredict Logo" width={44} height={44} className="rounded-xl group-hover:scale-105 transition-transform shadow-sm shadow-pink-500/20" />
            <span className="font-extrabold text-lg text-stone-900 dark:text-white tracking-tight">PCOS<span className="text-pink-500">Predict</span></span>
          </button>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-7 text-sm font-medium text-stone-600 dark:text-stone-400">
            <a href="#features" className="hover:text-pink-600 dark:hover:text-pink-400 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-pink-600 dark:hover:text-pink-400 transition-colors">How It Works</a>
            <a href="#faq" className="hover:text-pink-600 dark:hover:text-pink-400 transition-colors">FAQ</a>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button onClick={() => router.push('/login')} className="hidden sm:block text-sm font-semibold text-stone-700 dark:text-stone-300 hover:text-pink-600 dark:hover:text-pink-400 transition-colors px-3 py-1.5">
              Sign In
            </button>
            <button onClick={() => router.push('/signup')} className="text-sm font-bold px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-xl shadow-md shadow-pink-500/30 transition-all hover:-translate-y-0.5">
              Get Started
            </button>
            <button className="md:hidden p-1.5 rounded-lg text-stone-600 dark:text-stone-400" onClick={() => setMobileMenuOpen(v => !v)}>
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 px-4 py-4 space-y-3 text-sm font-medium text-stone-700 dark:text-stone-300">
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block py-1.5 hover:text-pink-600">Features</a>
            <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="block py-1.5 hover:text-pink-600">How It Works</a>
            <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="block py-1.5 hover:text-pink-600">FAQ</a>
            <button onClick={() => router.push('/login')} className="block py-1.5 hover:text-pink-600">Sign In</button>
          </div>
        )}
      </nav>

      {/* ─── Hero ─── */}
      <section className="relative max-w-6xl mx-auto px-4 sm:px-8 pt-24 pb-20 text-center overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute top-[-15%] left-[-10%] w-[45%] h-[45%] bg-pink-400/20 dark:bg-pink-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] bg-rose-400/20 dark:bg-rose-600/10 rounded-full blur-[120px] pointer-events-none" />

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-pink-100 dark:bg-pink-900/40 border border-pink-200 dark:border-pink-800 text-pink-700 dark:text-pink-300 text-sm font-semibold mb-8 animate-pulse">
          <Sparkles className="w-4 h-4" />
          AI-Powered Women's Health Platform
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-7xl font-extrabold text-stone-900 dark:text-white tracking-tight leading-[1.08] mb-6">
          Understand &amp; Manage<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-600 via-rose-500 to-pink-600 dark:from-pink-400 dark:via-rose-400 dark:to-pink-400">
            Your PCOS Health
          </span>
        </h1>

        <p className="text-lg md:text-xl text-stone-600 dark:text-stone-300 leading-relaxed max-w-2xl mx-auto mb-10">
          An intelligent healthcare platform driven by AI to help you assess PCOS risk, track your menstrual cycle, chat with an AI health assistant, and maintain a complete record of your well-being — all in one place.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => router.push('/signup')}
            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold rounded-2xl transition-all shadow-xl shadow-pink-500/30 flex items-center justify-center gap-2 transform hover:-translate-y-1 text-base"
          >
            Start for Free <ArrowRight className="w-5 h-5" />
          </button>
          <button
            onClick={() => router.push('/login')}
            className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-stone-50 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-900 dark:text-white font-bold rounded-2xl transition-all shadow-sm border border-stone-200 dark:border-stone-700 flex items-center justify-center gap-2 text-base"
          >
            Sign In to Dashboard
          </button>
        </div>

        {/* Trust note */}
        <p className="mt-6 text-sm text-stone-400 dark:text-stone-500 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-green-500" /> No credit card required &nbsp;·&nbsp; 100% free &nbsp;·&nbsp; Private &amp; encrypted
        </p>
      </section>

      {/* ─── Stats ─── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-8 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
          {stats.map((s, i) => (
            <div key={i} className="bg-white/70 dark:bg-stone-900/60 backdrop-blur-md border border-stone-200 dark:border-stone-800 rounded-2xl p-6 text-center hover:shadow-lg transition-shadow">
              <p className="text-3xl md:text-4xl font-extrabold text-pink-600 dark:text-pink-400 mb-1">{s.value}</p>
              <p className="text-sm text-stone-500 dark:text-stone-400 font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Features ─── */}
      <section id="features" className="max-w-6xl mx-auto px-4 sm:px-8 pb-24">
        <div className="text-center mb-14">
          <span className="text-xs font-bold uppercase tracking-widest text-pink-600 dark:text-pink-400 mb-3 block">Everything You Need</span>
          <h2 className="text-4xl md:text-5xl font-extrabold text-stone-900 dark:text-white mb-4">Powerful Features,<br />Built for You</h2>
          <p className="text-stone-500 dark:text-stone-400 max-w-xl mx-auto">From AI diagnostics to cycle tracking, every tool is designed around your health journey.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div key={i} className={`p-6 bg-gradient-to-br ${f.color} backdrop-blur-md rounded-2xl border hover:shadow-xl hover:-translate-y-1 transition-all duration-300`}>
              <div className="mb-4">{f.icon}</div>
              <h3 className="font-bold text-stone-900 dark:text-white text-lg mb-2">{f.title}</h3>
              <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── About PCOS ─── */}
      <section className="bg-gradient-to-r from-pink-600 to-rose-600 dark:from-pink-800 dark:to-rose-800 py-20 px-4 sm:px-8">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="text-white">
            <span className="text-xs font-bold uppercase tracking-widest text-pink-200 mb-3 block">Did You Know?</span>
            <h2 className="text-3xl md:text-4xl font-extrabold mb-5 leading-tight">PCOS Affects 1 in 10 Women of Reproductive Age</h2>
            <p className="text-pink-100 leading-relaxed mb-6">
              Polycystic Ovary Syndrome (PCOS) is one of the most common hormonal disorders, yet up to 70% of cases go undiagnosed. Early detection and lifestyle intervention can significantly improve quality of life and reduce long-term health risks.
            </p>
            <button onClick={() => router.push('/signup')} className="inline-flex items-center gap-2 px-6 py-3 bg-white text-pink-700 font-bold rounded-xl hover:bg-pink-50 transition shadow-lg">
              Take the Free Assessment <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Irregular periods", pct: "70%" },
              { label: "Elevated androgens", pct: "60%" },
              { label: "Ovarian cysts", pct: "75%" },
              { label: "Undiagnosed cases", pct: "70%" },
            ].map((item, i) => (
              <div key={i} className="bg-white/20 backdrop-blur-md rounded-2xl p-5 text-white">
                <p className="text-3xl font-extrabold mb-1">{item.pct}</p>
                <p className="text-sm text-pink-100">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-4 sm:px-8 py-24">
        <div className="text-center mb-14">
          <span className="text-xs font-bold uppercase tracking-widest text-pink-600 dark:text-pink-400 mb-3 block">Simple Process</span>
          <h2 className="text-4xl md:text-5xl font-extrabold text-stone-900 dark:text-white mb-4">How It Works</h2>
          <p className="text-stone-500 dark:text-stone-400 max-w-xl mx-auto">Get your first AI health assessment done in under 5 minutes.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {/* Connector line (desktop only) */}
          <div className="hidden lg:block absolute top-10 left-[12%] right-[12%] h-0.5 bg-gradient-to-r from-pink-300 via-rose-300 to-pink-300 dark:from-pink-800 dark:via-rose-800 dark:to-pink-800" />
          {steps.map((s, i) => (
            <div key={i} className="relative bg-white/70 dark:bg-stone-900/60 backdrop-blur-md border border-stone-200 dark:border-stone-800 rounded-2xl p-6 text-center hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white shadow-lg shadow-pink-500/30 relative z-10">
                {s.icon}
              </div>
              <span className="text-xs font-bold text-pink-400 dark:text-pink-500 mb-1 block">{s.num}</span>
              <h3 className="font-bold text-stone-900 dark:text-white mb-2">{s.title}</h3>
              <p className="text-sm text-stone-500 dark:text-stone-400">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Testimonials ─── */}
      <section className="bg-stone-100/80 dark:bg-stone-900/50 py-20 px-4 sm:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-pink-600 dark:text-pink-400 mb-3 block">What Users Say</span>
            <h2 className="text-4xl font-extrabold text-stone-900 dark:text-white">Trusted by Women Like You</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: "Priya S.", role: "College Student", text: "The AI assessment gave me a wake-up call. I had no idea my symptoms could be PCOS. I booked a doctor appointment right after.", stars: 5 },
              { name: "Meera R.", role: "Working Professional", text: "The period tracker predictions are surprisingly accurate! It's helped me plan my month so much better. Absolutely love this app.", stars: 5 },
              { name: "Anjali K.", role: "Healthcare Worker", text: "As a nurse, I appreciate the clinical accuracy. The feature analysis is detailed and the chatbot gives solid, evidence-based answers.", stars: 5 },
            ].map((t, i) => (
              <div key={i} className="bg-white dark:bg-stone-800 rounded-2xl p-6 shadow-sm border border-stone-200 dark:border-stone-700 hover:shadow-md transition-shadow">
                <div className="flex gap-1 mb-4">
                  {Array(t.stars).fill(0).map((_, j) => <Star key={j} className="w-4 h-4 text-amber-400 fill-amber-400" />)}
                </div>
                <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed mb-5 italic">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white text-sm font-bold">{t.name[0]}</div>
                  <div>
                    <p className="text-sm font-bold text-stone-900 dark:text-white">{t.name}</p>
                    <p className="text-xs text-stone-400">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section id="faq" className="max-w-3xl mx-auto px-4 sm:px-8 py-24">
        <div className="text-center mb-12">
          <span className="text-xs font-bold uppercase tracking-widest text-pink-600 dark:text-pink-400 mb-3 block">Got Questions?</span>
          <h2 className="text-4xl font-extrabold text-stone-900 dark:text-white">Frequently Asked Questions</h2>
        </div>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="bg-white/70 dark:bg-stone-900/60 backdrop-blur-md border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden">
              <button
                className="w-full flex items-center justify-between p-5 text-left hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <span className="font-semibold text-stone-900 dark:text-white pr-4">{faq.q}</span>
                {openFaq === i
                  ? <ChevronUp className="w-5 h-5 text-pink-500 flex-shrink-0" />
                  : <ChevronDown className="w-5 h-5 text-stone-400 flex-shrink-0" />}
              </button>
              {openFaq === i && (
                <div className="px-5 pb-5 text-sm text-stone-500 dark:text-stone-400 leading-relaxed border-t border-stone-100 dark:border-stone-800 pt-4">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ─── CTA Banner ─── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-8 pb-24">
        <div className="relative rounded-3xl bg-gradient-to-r from-pink-600 to-rose-600 p-10 md:p-16 text-center overflow-hidden shadow-2xl shadow-pink-500/20">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_left,_rgba(255,255,255,0.15)_0%,_transparent_60%)] pointer-events-none" />
          <Sparkles className="w-10 h-10 text-white/80 mx-auto mb-4" />
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">Start Your Health Journey Today</h2>
          <p className="text-pink-100 max-w-xl mx-auto mb-8">Join thousands of women using PCOSPredict to take control of their health. It's free, private, and takes just a few minutes.</p>
          <button
            onClick={() => router.push('/signup')}
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-pink-700 font-extrabold rounded-2xl hover:bg-pink-50 transition-all shadow-lg hover:-translate-y-1 text-base"
          >
            Create Free Account <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-stone-200 dark:border-stone-800 bg-white/60 dark:bg-stone-950/60 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <Image src="/logo.png" alt="PCOSPredict Logo" width={44} height={44} className="rounded-xl shadow-md shadow-pink-500/20" />
                <span className="font-extrabold text-lg text-stone-900 dark:text-white tracking-tight">PCOS<span className="text-pink-500">Predict</span></span>
              </div>
              <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed max-w-xs">
                An AI-powered women's health platform for PCOS risk assessment, cycle tracking, and personalized health insights.
              </p>
              <div className="flex gap-3 mt-5">
                <a href="#" className="w-9 h-9 rounded-xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-500 dark:text-stone-400 hover:bg-pink-100 dark:hover:bg-pink-900/40 hover:text-pink-600 dark:hover:text-pink-400 transition-colors">
                  <Github className="w-4 h-4" />
                </a>
                <a href="#" className="w-9 h-9 rounded-xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-500 dark:text-stone-400 hover:bg-pink-100 dark:hover:bg-pink-900/40 hover:text-pink-600 dark:hover:text-pink-400 transition-colors">
                  <Twitter className="w-4 h-4" />
                </a>
                <a href="#" className="w-9 h-9 rounded-xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-500 dark:text-stone-400 hover:bg-pink-100 dark:hover:bg-pink-900/40 hover:text-pink-600 dark:hover:text-pink-400 transition-colors">
                  <Mail className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Product links */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-4">Product</p>
              <ul className="space-y-2.5 text-sm text-stone-600 dark:text-stone-400">
                {[["Features", "#features"], ["How It Works", "#how-it-works"], ["FAQ", "#faq"], ["Sign Up", "/signup"], ["Login", "/login"]].map(([label, href]) => (
                  <li key={label}>
                    <a href={href} className="hover:text-pink-600 dark:hover:text-pink-400 transition-colors">{label}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Health info */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-4">Health Info</p>
              <ul className="space-y-2.5 text-sm text-stone-600 dark:text-stone-400">
                {["What is PCOS?", "PCOS Symptoms", "Cycle Tracking Tips", "Nutrition & PCOS", "Mental Health & PCOS"].map(label => (
                  <li key={label}>
                    <a href="#" className="hover:text-pink-600 dark:hover:text-pink-400 transition-colors">{label}</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-stone-200 dark:border-stone-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-400 dark:text-stone-500">
            <p>© {new Date().getFullYear()} PCOSPredict. Built with ❤️ for women's health.</p>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              <span>Not a substitute for professional medical advice. Always consult a doctor.</span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}
