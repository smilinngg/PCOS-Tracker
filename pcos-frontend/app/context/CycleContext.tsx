"use client"

import { createContext, useContext, useState, useCallback, useEffect } from "react"

type CycleContextType = {
  cycleInfo: any
  setCycleInfo: (info: any) => void
  fetchCycleInfo: (email: string) => Promise<void>
}

const CycleContext = createContext<CycleContextType | undefined>(undefined)

export function CycleProvider({ children }: { children: React.ReactNode }) {
  const [cycleInfo, setCycleInfo] = useState<any>(null)

  const fetchCycleInfo = useCallback(async (email: string) => {
    try {
      const res = await fetch(`/api/cycle-info/${email}`)
      const data = await res.json()
      if (!data.message) {
        setCycleInfo(data)
      } else {
        setCycleInfo(null)
      }
    } catch (error) {
      console.error("Failed to fetch cycle info:", error)
    }
  }, [])

  return (
    <CycleContext.Provider value={{ cycleInfo, setCycleInfo, fetchCycleInfo }}>
      {children}
    </CycleContext.Provider>
  )
}

export function useCycleInfo() {
  const context = useContext(CycleContext)
  if (context === undefined) {
    throw new Error("useCycleInfo must be used within CycleProvider")
  }
  return context
}
