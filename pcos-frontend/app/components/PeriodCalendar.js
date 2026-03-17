"use client";

import { useState, useEffect, useCallback } from "react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, eachDayOfInterval, parse, isWithinInterval } from "date-fns";
import { CheckCircle2, TrendingUp, AlertTriangle, RefreshCw, Calendar as CalendarIcon, Droplets, ChevronLeft, ChevronRight, Heart } from "lucide-react";

export default function PeriodCalendar({ email }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDates, setSelectedDates] = useState([]);
  const [pastDates, setPastDates] = useState([]);
  const [ovulationDates, setOvulationDates] = useState([]);
  const [nextPeriodDates, setNextPeriodDates] = useState([]);
  
  const [cycleInfo, setCycleInfo] = useState(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  
  const [isLogging, setIsLogging] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const fetchData = useCallback(async () => {
    if (!email) return;
    setIsLoadingData(true);
    try {
      const cycleRes = await fetch(`/api/cycle-info/${email}`);
      const cycleData = await cycleRes.json();
      
      if (cycleData.historical_dates) {
        setPastDates(cycleData.historical_dates);
      } else {
        setPastDates([]);
      }

      // Set ovulation window dates (5 days centered around ovulation)
      if (cycleData.ovulation_window_start && cycleData.ovulation_window_end) {
        const start = new Date(cycleData.ovulation_window_start);
        const end = new Date(cycleData.ovulation_window_end);
        const ovulationRange = [];
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          ovulationRange.push(format(new Date(d), "yyyy-MM-dd"));
        }
        setOvulationDates(ovulationRange);
      } else {
        setOvulationDates([]);
      }

      // Set next period dates (5 days)
      if (cycleData.next_period_start && cycleData.next_period_end) {
        const start = new Date(cycleData.next_period_start);
        const end = new Date(cycleData.next_period_end);
        const periodRange = [];
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          periodRange.push(format(new Date(d), "yyyy-MM-dd"));
        }
        setNextPeriodDates(periodRange);
      } else {
        setNextPeriodDates([]);
      }

      if (!cycleData.message) setCycleInfo(cycleData);
      else setCycleInfo(null);
    } catch {
      // silent
    } finally {
      setIsLoadingData(false);
    }
  }, [email]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleDate = (date) => {
    const formatted = format(date, "yyyy-MM-dd");
    
    // Prevent toggling already saved dates
    if (pastDates.includes(formatted)) {
      setErrorMsg("This date is already saved. Saved dates cannot be modified.");
      setTimeout(() => setErrorMsg(""), 3000);
      return;
    }
    
    if (selectedDates.includes(formatted)) {
      setSelectedDates(selectedDates.filter(d => d !== formatted));
    } else {
      setSelectedDates([...selectedDates, formatted]);
    }
  };

  const savePeriods = async () => {
    if (selectedDates.length === 0) {
      setErrorMsg("Please select at least one date.");
      return;
    }
    
    setErrorMsg("");
    setSuccessMsg("");
    setIsLogging(true);

    try {
      const res = await fetch("/api/log-period", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, dates: selectedDates }),
      });
      
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg("Period logged successfully!");
        setSelectedDates([]); // Clear selection safely
        await fetchData(); // Refresh analytics
      } else {
        setErrorMsg(data.error || "Failed to log period.");
      }
    } catch {
      setErrorMsg("Could not connect to the server.");
    } finally {
      setIsLogging(false);
      setTimeout(() => setSuccessMsg(""), 4000);
    }
  };

  // Render Calendar Helper
  const renderCalendar = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const dateFormat = "d";
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    return (
      <div className="w-full">
        {/* Header Controls */}
        <div className="flex items-center justify-between mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
          <button 
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-800 dark:text-slate-200">
            {format(currentMonth, "MMMM yyyy")}
          </h3>
          
          <button 
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Days of week */}
        <div className="grid grid-cols-7 mb-3">
          {weekDays.map((day, i) => (
            <div key={i} className="text-center text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase">
              {day}
            </div>
          ))}
        </div>

        {/* Date Grid */}
        <div className="grid grid-cols-7 gap-y-1 sm:gap-y-2 justify-items-center">
          {days.map((day, i) => {
            const formattedDate = format(day, "yyyy-MM-dd");
            const isSelected = selectedDates.includes(formattedDate);
            const isPastLogged = pastDates.includes(formattedDate);
            const isOvulationDay = ovulationDates.includes(formattedDate);
            const isNextPeriodDay = nextPeriodDates.includes(formattedDate);
            const isPredicted = cycleInfo?.next_predicted_raw === formattedDate;

            const isCurrentMonth = isSameMonth(day, monthStart);
            const isToday = isSameDay(day, new Date());

            return (
              <button
                key={formattedDate}
                onClick={() => toggleDate(day)}
                className={`
                  flex items-center justify-center p-0 h-9 w-9 sm:h-10 sm:w-10 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer
                  ${!isCurrentMonth ? "opacity-40 hover:opacity-60" : "hover:bg-rose-50 dark:hover:bg-slate-800"}
                  ${isSelected ? "bg-rose-500 hover:bg-rose-600 text-white shadow-md shadow-rose-500/30 font-bold scale-105 z-10" : ""}
                  ${isPastLogged && !isSelected ? "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 font-semibold" : ""}
                  ${isNextPeriodDay && !isSelected && !isPastLogged ? "ring-2 ring-orange-400 bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 shadow-[0_0_10px_rgba(249,115,22,0.5)]" : ""}
                  ${isOvulationDay && !isSelected && !isPastLogged && !isNextPeriodDay ? "ring-2 ring-pink-400 bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 shadow-[0_0_10px_rgba(236,72,153,0.5)]" : ""}
                  ${isPredicted && !isSelected && !isPastLogged && !isNextPeriodDay && !isOvulationDay ? "ring-2 ring-fuchsia-400 bg-fuchsia-50 dark:bg-fuchsia-900/30 text-fuchsia-600 dark:text-fuchsia-400 shadow-[0_0_10px_rgba(232,121,249,0.5)] font-bold animate-pulse" : ""}
                  ${isToday && !isSelected && !isPastLogged && !isPredicted && !isNextPeriodDay && !isOvulationDay ? "ring-2 ring-slate-200 dark:ring-slate-700 text-slate-900 bg-slate-50 dark:bg-slate-900/50" : ""}
                  ${!isSelected && !isPastLogged && !isPredicted && !isToday && !isNextPeriodDay && !isOvulationDay ? "text-slate-700 dark:text-slate-300" : ""}
                `}
              >
                {format(day, dateFormat)}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden flex flex-col">
      
      {/* Top side: The Custom Tailwind Calendar */}
      <div className="flex-1 p-6 sm:p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-2">
          <CalendarIcon className="w-6 h-6 text-rose-500" />
          Log Period Dates
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Select the days you had your period below.</p>
        
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200/50 dark:border-slate-800/80 mb-6">
          {renderCalendar()}
        </div>

        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <div className="w-3.5 h-3.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500/30"></div>
            <span className="font-medium whitespace-nowrap">Selected: <b className="text-rose-600 dark:text-rose-400 ml-1">{selectedDates.length} days</b></span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <div className="w-3.5 h-3.5 rounded-full bg-rose-100 dark:bg-rose-900/40 border border-rose-200 dark:border-rose-800"></div>
            <span className="font-medium whitespace-nowrap">Saved History</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <div className="w-3.5 h-3.5 rounded-full ring-2 ring-pink-400 bg-pink-50 dark:bg-pink-900/30 shadow-[0_0_8px_rgba(236,72,153,0.5)]"></div>
            <span className="font-medium whitespace-nowrap">Ovulation Window</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <div className="w-3.5 h-3.5 rounded-full ring-2 ring-orange-400 bg-orange-50 dark:bg-orange-900/30 shadow-[0_0_8px_rgba(249,115,22,0.5)]"></div>
            <span className="font-medium whitespace-nowrap">Next Period</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <div className="w-3.5 h-3.5 rounded-full ring-2 ring-fuchsia-400 bg-fuchsia-50 dark:bg-fuchsia-900/30 shadow-[0_0_8px_rgba(232,121,249,0.5)]"></div>
            <span className="font-medium whitespace-nowrap">Predicted Start</span>
          </div>
        </div>

        <button
          onClick={savePeriods}
          disabled={isLogging || selectedDates.length === 0}
          className="w-full flex items-center justify-center gap-2 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed text-white dark:text-slate-900 font-bold py-4 rounded-xl transition-all duration-300 shadow-xl shadow-slate-900/10"
        >
          {isLogging ? <RefreshCw className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
          {isLogging ? "Saving Dates..." : "Save Recorded Dates"}
        </button>

        {successMsg && (
          <div className="mt-4 flex items-center justify-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl text-emerald-700 dark:text-emerald-400 text-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="font-medium">{successMsg}</span>
          </div>
        )}
        
        {errorMsg && (
          <div className="mt-4 flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl text-red-600 dark:text-red-400 text-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="font-medium">{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Bottom side: Cycle Analytics Panel */}
      <div className="flex-[0.8] bg-white dark:bg-slate-900 p-6 sm:p-8 flex flex-col">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <Droplets className="w-4 h-4 text-fuchsia-500" /> Cycle Intelligence
          </h3>
          <div className="flex items-center gap-2">
            <button onClick={fetchData} className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full transition-colors" title="Refresh Data">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {isLoadingData ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 gap-2 text-sm">
            <RefreshCw className="w-5 h-5 animate-spin text-fuchsia-400" /> Loading cycle logic...
          </div>
        ) : cycleInfo ? (
          <div className="flex-1 flex flex-col space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            
            {cycleInfo.ovulation_date_display && (
              <div className="bg-gradient-to-br from-pink-600 to-rose-700 dark:from-pink-700 dark:to-rose-800 rounded-3xl p-6 text-white shadow-xl shadow-pink-600/20 relative overflow-hidden group">
                <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-colors duration-700"></div>
                <div className="absolute bottom-0 left-0 -ml-4 -mb-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-colors duration-700"></div>
                
                <div className="relative z-10">
                  <p className="text-pink-100 text-xs font-semibold uppercase tracking-widest mb-2 flex items-center gap-2">
                    <Heart className="w-4 h-4" /> Ovulation Window (High Fertility)
                  </p>
                  <p className="text-4xl font-black mb-4 tracking-tight drop-shadow-sm">
                    {cycleInfo.ovulation_date_display}
                  </p>
                  <div className="bg-white/10 dark:bg-white/5 border border-white/20 rounded-xl p-3 backdrop-blur-md">
                    <p className="text-xs text-pink-100 flex items-start gap-2 leading-relaxed">
                      <span className="w-1.5 h-1.5 rounded-full bg-pink-200 mt-1 shrink-0"></span>
                      <span>This is your most fertile window. Plan accordingly if trying to conceive or avoid pregnancy.</span>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {cycleInfo.next_predicted && (
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-950 rounded-3xl p-6 text-white shadow-xl shadow-slate-900/10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-rose-500/20 rounded-full blur-2xl group-hover:bg-rose-500/30 transition-colors duration-700"></div>
                <div className="absolute bottom-0 left-0 -ml-4 -mb-4 w-24 h-24 bg-fuchsia-500/20 rounded-full blur-2xl group-hover:bg-fuchsia-500/30 transition-colors duration-700"></div>
                
                <div className="relative z-10">
                  <p className="text-slate-300 text-xs font-semibold uppercase tracking-widest mb-2 flex items-center gap-2">
                    Predicted Next Period Start
                  </p>
                  <p className="text-4xl font-black mb-4 tracking-tight drop-shadow-sm">
                    {cycleInfo.next_predicted}
                  </p>
                  <div className="bg-white/10 dark:bg-white/5 border border-white/10 rounded-xl p-3 backdrop-blur-md">
                    <p className="text-xs text-slate-200 flex items-start gap-2 leading-relaxed">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1 shrink-0 shadow-[0_0_8px_rgba(251,113,133,0.8)]"></span>
                      <span>Based on your average cycle of <strong>{cycleInfo.average_cycle} days</strong>.</span>
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 flex-1">
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center transition-colors hover:bg-slate-100 dark:hover:bg-slate-800">
                <p className="text-4xl font-black text-slate-800 dark:text-white mb-1">
                  {cycleInfo.average_cycle}
                </p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Days Avg Cycle</p>
              </div>
              
              <div className={`rounded-3xl p-5 flex flex-col items-center justify-center gap-2 text-center transition-all ${
                cycleInfo.irregular
                  ? "bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30 hover:bg-rose-100 dark:hover:bg-rose-900/20"
                  : "bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/20"
              }`}>
                <div className={`p-2 rounded-full ${cycleInfo.irregular ? "bg-rose-100 dark:bg-rose-900/50" : "bg-emerald-100 dark:bg-emerald-900/50"}`}>
                  {cycleInfo.irregular ? (
                    <AlertTriangle className="w-5 h-5 text-rose-500" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  )}
                </div>
                <p className={`text-base font-bold ${
                  cycleInfo.irregular ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                }`}>
                  {cycleInfo.irregular ? "Irregular" : "Regular"} Status
                </p>
              </div>
            </div>

          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center px-4 text-center text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50/50 dark:bg-slate-900/30">
            <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-md mb-4">
              <TrendingUp className="w-8 h-8 opacity-40 text-rose-500" />
            </div>
            <h4 className="text-slate-800 dark:text-slate-200 font-bold mb-2">Build Your Algorithm</h4>
            <p className="text-sm max-w-[250px] leading-relaxed">Log at least two periods on the calendar to establish your baseline cycle rhythm and enable AI predictions.</p>
          </div>
        )}
      </div>

    </div>
  );
}