"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Lock, Mail, Phone, ArrowRight, ArrowLeft, AlertTriangle, CheckCircle2, KeyRound, Eye, EyeOff } from "lucide-react"
import Image from "next/image"

export default function ForgotPassword() {
  const router = useRouter()

  // Step 1: verify email, Step 2: verify phone (if needed) & set new password
  const [step, setStep] = useState<1 | 2>(1)
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [accountInfo, setAccountInfo] = useState<{
    name: string
    has_phone: boolean
    masked_phone: string
  } | null>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Step 1: Verify Email
  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail) {
      setError("Please enter your registered email address.")
      setLoading(false)
      return
    }

    try {
      const res = await fetch("/api/verify-reset-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.detail || "Account not found.")
      }

      setAccountInfo({
        name: data.name || "User",
        has_phone: Boolean(data.has_phone),
        masked_phone: data.masked_phone || "",
      })
      setStep(2)
    } catch (err: any) {
      setError(err.message || "Failed to verify email.")
    } finally {
      setLoading(false)
    }
  }

  // Step 2: Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long.")
      setLoading(false)
      return
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please re-enter them carefully.")
      setLoading(false)
      return
    }

    if (accountInfo?.has_phone && !phone.trim()) {
      setError("Please enter your registered phone number for identity verification.")
      setLoading(false)
      return
    }

    try {
      const res = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          phone: phone.trim() || undefined,
          new_password: newPassword,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.detail || "Failed to reset password.")
      }

      setSuccess("Your password has been successfully updated! Redirecting to login...")
      setTimeout(() => {
        router.push("/login?message=Password reset successfully. Please log in with your new password.")
      }, 1800)
    } catch (err: any) {
      setError(err.message || "An error occurred while resetting password.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-rose-50 dark:from-stone-900 dark:to-stone-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-stone-900 shadow-xl rounded-3xl p-8 border border-white/50 dark:border-stone-800 transition-all">
        
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex p-3 bg-rose-100 dark:bg-rose-900/50 rounded-2xl mb-3 shadow-sm shadow-rose-500/20 text-rose-600 dark:text-rose-400">
            <KeyRound className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 dark:text-white">
            {step === 1 ? "Forgot Password?" : "Set New Password"}
          </h1>
          <p className="text-stone-500 dark:text-stone-400 mt-1.5 text-sm">
            {step === 1
              ? "Enter your registered email to find your account."
              : `Hello ${accountInfo?.name || "there"}, complete verification to update your password.`}
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-5 p-3.5 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm rounded-xl flex items-center gap-2 border border-red-200 dark:border-red-800/50">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-5 p-3.5 bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 text-sm rounded-xl flex items-center gap-2 border border-teal-200 dark:border-teal-800/50">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* STEP 1: Enter Email */}
        {step === 1 && (
          <form onSubmit={handleVerifyEmail} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
              <input
                required
                type="email"
                value={email}
                placeholder="Registered Email Address"
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-stone-50 dark:bg-stone-800 pl-10 pr-4 py-3 rounded-xl border border-stone-200 dark:border-stone-700 outline-none focus:ring-2 focus:ring-rose-500 transition-shadow text-stone-900 dark:text-white placeholder-stone-400"
              />
            </div>

            <button
              disabled={loading}
              type="submit"
              className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-3.5 rounded-xl transition-all duration-300 mt-2 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? "Checking..." : <>Find Account <ArrowRight className="w-5 h-5" /></>}
            </button>
          </form>
        )}

        {/* STEP 2: Phone Verification + New Password */}
        {step === 2 && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="bg-rose-50/60 dark:bg-rose-950/20 p-3 rounded-xl border border-rose-100 dark:border-rose-900/30 text-xs text-stone-600 dark:text-stone-300 flex items-center justify-between">
              <div>
                <span className="font-semibold text-rose-600 dark:text-rose-400">Account: </span>
                {email}
              </div>
              <button
                type="button"
                onClick={() => {
                  setStep(1)
                  setError("")
                }}
                className="text-xs text-rose-600 dark:text-rose-400 hover:underline font-medium cursor-pointer"
              >
                Change
              </button>
            </div>

            {accountInfo?.has_phone && (
              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1.5">
                  Verify Phone Number {accountInfo.masked_phone ? `(${accountInfo.masked_phone})` : ""}
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    required
                    type="tel"
                    value={phone}
                    placeholder="Enter your registered phone number"
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-stone-50 dark:bg-stone-800 pl-9 pr-4 py-3 rounded-xl border border-stone-200 dark:border-stone-700 outline-none focus:ring-2 focus:ring-rose-500 transition-shadow text-stone-900 dark:text-white placeholder-stone-400"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1.5">
                New Password (minimum 6 characters)
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                <input
                  required
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  placeholder="Enter new password"
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-stone-50 dark:bg-stone-800 pl-10 pr-10 py-3 rounded-xl border border-stone-200 dark:border-stone-700 outline-none focus:ring-2 focus:ring-rose-500 transition-shadow text-stone-900 dark:text-white placeholder-stone-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                <input
                  required
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  placeholder="Confirm new password"
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-stone-50 dark:bg-stone-800 pl-10 pr-10 py-3 rounded-xl border border-stone-200 dark:border-stone-700 outline-none focus:ring-2 focus:ring-rose-500 transition-shadow text-stone-900 dark:text-white placeholder-stone-400"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              disabled={loading || Boolean(success)}
              type="submit"
              className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-3.5 rounded-xl transition-all duration-300 mt-2 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? "Updating Password..." : <>Update Password <ArrowRight className="w-5 h-5" /></>}
            </button>
          </form>
        )}

        {/* Back to Login */}
        <div className="text-center mt-6">
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="inline-flex items-center gap-1.5 text-sm text-stone-500 dark:text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 font-medium transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Login
          </button>
        </div>

      </div>
    </div>
  )
}

