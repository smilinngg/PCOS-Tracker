"use client";

import { useState, useEffect, useCallback } from "react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, eachDayOfInterval, parse, differenceInDays } from "date-fns";
import { CheckCircle2, TrendingUp, AlertTriangle, RefreshCw, Calendar as CalendarIcon, Droplets, ChevronLeft, ChevronRight, Heart, Zap, Activity } from "lucide-react";

export default function PeriodCalendar({ email }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDates, setSelectedDates] = useState([]);
  const [pastDates, setPastDates] = useState([]);
  const [ovulationDates, setOvulationDates] = useState([]);
  const [nextPeriodDates, setNextPeriodDates] = useState([]);
  const [periodHistory, setPeriodHistory] = useState([]);
  const [viewMode, setViewMode] = useState("month");
  const [cycleInfo, setCycleInfo] = useState(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isLogging, setIsLogging] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const fetchData = useCallback(async () => {
    if (!email) return;
    setIsLoadingData(true);
    try {
      // Fetch cycle info (predictions and calculations)
      const cycleRes = await fetch(`/api/cycle-info/${email}`, { cache: "no-store", headers: { "Cache-Control": "no-cache" } });
      const cycleData = await cycleRes.json();

      // Fetch history explicitly for delete functionality
      const historyRes = await fetch(`/api/period-history/${email}`, { cache: "no-store" });
      const historyData = await historyRes.json();
      if (historyData.history) setPeriodHistory(historyData.history);

      // Get historical logged dates (past periods)
      if (cycleData.historical_dates && Array.isArray(cycleData.historical_dates)) {
        setPastDates(cycleData.historical_dates);
      } else {
        setPastDates([]);
      }

      // Process ovulation window dates
      if (cycleData.ovulation_window_starts && cycleData.ovulation_window_ends) {
        const ovulationRange = [];
        for (let i = 0; i < cycleData.ovulation_window_starts.length; i++) {
          const start = parse(cycleData.ovulation_window_starts[i], "yyyy-MM-dd", new Date());
          const end = parse(cycleData.ovulation_window_ends[i], "yyyy-MM-dd", new Date());
          const days = eachDayOfInterval({ start, end });
          days.forEach(d => ovulationRange.push(format(d, "yyyy-MM-dd")));
        }
        setOvulationDates(ovulationRange);
      } else {
        setOvulationDates([]);
      }

      // Process predicted period dates
      if (cycleData.next_period_starts && cycleData.next_period_ends) {
        const periodRange = [];
        for (let i = 0; i < cycleData.next_period_starts.length; i++) {
          const start = parse(cycleData.next_period_starts[i], "yyyy-MM-dd", new Date());
          const end = parse(cycleData.next_period_ends[i], "yyyy-MM-dd", new Date());
          const days = eachDayOfInterval({ start, end });
          days.forEach(d => periodRange.push(format(d, "yyyy-MM-dd")));
        }
        setNextPeriodDates(periodRange);
      } else {
        setNextPeriodDates([]);
      }

      if (!cycleData.message) {
        setCycleInfo(cycleData);
      } else {
        setCycleInfo(null);
      }
    } catch (err) {
      console.error("Error fetching cycle data:", err);
      setCycleInfo(null);
    } finally {
      setIsLoadingData(false);
    }
  }, [email]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const calculateDaysUntilNextPeriod = () => {
    if (cycleInfo?.next_predicted_raw) {
      const nextPeriod = parse(cycleInfo.next_predicted_raw, "yyyy-MM-dd", new Date());
      const daysUntil = differenceInDays(nextPeriod, new Date());
      return daysUntil >= 0 ? daysUntil : 0;
    }
    return null;
  };

  const toggleDate = (date) => {
    const formatted = format(date, "yyyy-MM-dd");

    if (pastDates.includes(formatted)) {
      setErrorMsg("This date is already logged.");
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
      setTimeout(() => setErrorMsg(""), 3000);
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
        setSuccessMsg("✓ Period logged successfully!");
        setSelectedDates([]);
        await fetchData();
      } else {
        setErrorMsg(data.error || "Failed to log period.");
      }
    } catch (err) {
      setErrorMsg("Could not connect to the server.");
      console.error(err);
    } finally {
      setIsLogging(false);
      setTimeout(() => setSuccessMsg(""), 3000);
    }
  };

  const deletePeriod = async (startDate) => {
    if (!confirm(`Are you sure you want to delete the period starting ${startDate}?`)) return;
    try {
      const res = await fetch(`/api/period-history/${email}/${startDate}`, { method: "DELETE" });
      if (res.ok) {
        setSuccessMsg("Period removed manually.");
        setTimeout(() => setSuccessMsg(""), 3000);
        await fetchData();
      } else {
        setErrorMsg("Failed to delete period.");
        setTimeout(() => setErrorMsg(""), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const renderCalendar = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    return (
      <div className="w-full">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h3 className="text-sm font-bold uppercase tracking-widest">{format(currentMonth, "MMMM yyyy")}</h3>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-7 mb-3 gap-1">
          {weekDays.map((day) => (
            <div key={day} className="text-center text-xs font-semibold text-stone-400">{day}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-1">
          {days.map((day) => {
            const formattedDate = format(day, "yyyy-MM-dd");
            const isSelected = selectedDates.includes(formattedDate);
            const isPastLogged = pastDates.includes(formattedDate);
            const isOvulationDay = ovulationDates.includes(formattedDate);
            const isNextPeriodDay = nextPeriodDates.includes(formattedDate);
            const isCurrentMonth = isSameMonth(day, monthStart);
            const isToday = isSameDay(day, new Date());

            let bgClass = "text-stone-700 dark:text-stone-300";
            let title = "";

            if (isSelected) {
              bgClass = "bg-rose-500 text-white ring-2 ring-rose-600 font-bold";
              title = "Selected to log";
            } else if (isPastLogged) {
              bgClass = "bg-red-800 dark:bg-red-900 text-white ring-2 ring-red-900 font-bold";
              title = "Logged period";
            } else if (isOvulationDay) {
              bgClass = "bg-blue-500 text-white font-semibold";
              title = "Ovulation window";
            } else if (isNextPeriodDay) {
              bgClass = "bg-pink-400 text-white font-semibold";
              title = "Predicted period";
            }

            return (
              <div key={formattedDate} className="relative flex flex-col items-center justify-center mx-auto w-full h-14">
                {isToday && (
                  <div className="absolute -top-3 whitespace-nowrap bg-stone-800 text-white text-[9px] font-bold px-2 py-0.5 rounded-full z-10 shadow-sm animate-bounce">
                    Day {cycleDay}
                  </div>
                )}
                <button
                  title={title}
                  onClick={() => toggleDate(day)}
                  className={`w-10 h-10 rounded-full text-sm font-medium transition-all flex items-center justify-center ${!isCurrentMonth ? "opacity-30" : "opacity-100"} ${isToday && bgClass === "text-stone-700 dark:text-stone-300" ? "border-2 border-rose-400 font-bold" : ""} ${bgClass}`}
                  disabled={isPastLogged && !isSelected}
                >
                  {format(day, "d")}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderYearView = () => {
    const months = Array.from({ length: 12 }, (_, i) => addMonths(currentMonth, i));

    return (
      <div className="w-full">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 12))} className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h3 className="text-sm font-bold uppercase">{format(currentMonth, "yyyy")} - Next 12 Months</h3>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 12))} className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {months.map((monthDate, idx) => {
            const monthStart = startOfMonth(monthDate);
            const monthEnd = endOfMonth(monthStart);
            const startD = startOfWeek(monthStart);
            const endD = endOfWeek(monthEnd);
            const days = eachDayOfInterval({ start: startD, end: endD });
            const weekDays = ["S", "M", "T", "W", "T", "F", "S"];

            return (
              <div key={idx} className="border border-stone-200 dark:border-stone-800 rounded-xl p-3 bg-stone-50/50 dark:bg-stone-900/20">
                <h4 className="text-xs font-bold uppercase mb-2 text-center">{format(monthDate, "MMM yyyy")}</h4>
                <div className="grid grid-cols-7 gap-0.5">
                  {weekDays.map((day, i) => (
                    <div key={`h-${i}`} className="text-center text-[10px] font-semibold text-stone-300">{day}</div>
                  ))}
                  {days.map((day) => {
                    const formattedDate = format(day, "yyyy-MM-dd");
                    const isPastLogged = pastDates.includes(formattedDate);
                    const isOvulationDay = ovulationDates.includes(formattedDate);
                    const isNextPeriodDay = nextPeriodDates.includes(formattedDate);
                    const isCurrentMonth = isSameMonth(day, monthStart);

                    let bgClass = "bg-transparent";
                    if (isPastLogged) {
                      bgClass = "bg-red-800 dark:bg-red-900 text-white font-bold ring-2 ring-red-900";
                    } else if (isOvulationDay) {
                      bgClass = "bg-blue-500 text-white";
                    } else if (isNextPeriodDay) {
                      bgClass = "bg-pink-400 text-white";
                    } else if (!isCurrentMonth) {
                      bgClass = "opacity-20";
                    }

                    return (
                      <div key={formattedDate} className={`w-5 h-5 mx-auto flex items-center justify-center aspect-square rounded-full text-[11px] font-medium ${bgClass}`}>
                        {format(day, "d")}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const daysUntilPeriod = calculateDaysUntilNextPeriod();
  const cycleDay = cycleInfo?.cycle_day || "—";
  const isOvulationTime = ovulationDates.includes(format(new Date(), "yyyy-MM-dd"));

  return (
    <div className="bg-gradient-to-br from-stone-50 to-pink-50 dark:from-stone-900 dark:to-stone-950 min-h-screen p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* New Cycle Day Window - Main Circular Dial */}
        {cycleInfo && (
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-8 sm:p-12 shadow-md text-center relative overflow-hidden flex flex-col items-center justify-center">
            <h2 className="text-stone-400 font-bold uppercase tracking-widest text-xs mb-8">Current Cycle Status</h2>
            
            {/* The Flo-style Circular Ring */}
            <div className="w-56 h-56 mx-auto rounded-full border-[16px] border-rose-100 dark:border-rose-900/30 flex flex-col items-center justify-center relative shadow-sm">
               {/* Visual Progress Arc Simulation */}
               <div 
                 className="absolute inset-0 rounded-full border-[16px] border-transparent border-t-rose-500 border-r-rose-400 rotate-[-45deg]"
                 style={{ opacity: 0.9 }}
               ></div>
               
               <p className="text-stone-500 font-semibold mb-1 uppercase tracking-wide text-xs">Cycle Day</p>
               <p className="text-7xl font-black text-rose-600 dark:text-rose-400">{cycleDay}</p>
            </div>
            
            <div className="mt-8 bg-stone-50 dark:bg-stone-800/50 py-3 px-6 rounded-full inline-block border border-stone-100 dark:border-stone-800">
              <p className="font-semibold text-stone-600 dark:text-stone-300 text-sm">
                Next Period: <span className="text-rose-500">{daysUntilPeriod !== null ? `${daysUntilPeriod} days` : 'Calculating...'}</span>
              </p>
            </div>
          </div>
        )}

        {/* Ovulation Alert */}
        {isOvulationTime && (
          <div className="bg-gradient-to-r from-blue-400 to-blue-600 rounded-3xl p-6 text-white shadow-lg flex items-center gap-4">
            <Heart className="w-8 h-8 animate-pulse" />
            <div>
              <p className="font-bold text-lg">💙 Ovulation Window Active</p>
              <p className="text-blue-100 text-sm">High fertility - Highest pregnancy chances</p>
            </div>
          </div>
        )}

        {/* Calendar Card */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <CalendarIcon className="w-6 h-6 text-rose-500" />
                Log Your Period
              </h2>
              <p className="text-sm text-stone-500 dark:text-stone-400">Select dates below to log your menstrual period</p>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setViewMode("month")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === "month" ? "bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900" : "bg-stone-100 dark:bg-stone-800"}`}>
                Month
              </button>
              <button onClick={() => setViewMode("year")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === "year" ? "bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900" : "bg-stone-100 dark:bg-stone-800"}`}>
                Year
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-stone-900 rounded-2xl p-6 mb-6 border border-stone-200/50 dark:border-stone-800/80">
            {viewMode === "month" ? renderCalendar() : renderYearView()}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mb-6 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-red-800 ring-2 ring-red-900"></div>
              <span>Logged Period</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-pink-400"></div>
              <span>Predicted Period</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-blue-500"></div>
              <span>Ovulation</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-rose-500"></div>
              <span>Selected ({selectedDates.length})</span>
            </div>
          </div>

          <button onClick={savePeriods} disabled={isLogging || selectedDates.length === 0} className="w-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 disabled:opacity-50 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg">
            {isLogging ? <RefreshCw className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
            {isLogging ? "Saving..." : "Log Period Dates"}
          </button>

          {successMsg && <div className="mt-4 p-3 bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-xl text-teal-700 dark:text-teal-400 text-sm font-medium flex items-center gap-2"><CheckCircle2 className="w-4 h-4" />{successMsg}</div>}
          {errorMsg && <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm font-medium flex items-center gap-2"><AlertTriangle className="w-4 h-4" />{errorMsg}</div>}
        </div>

        {/* Period History Section */}
        {periodHistory.length > 0 && (
          <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 shadow-md border-t-4 border-rose-500">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">Logged Periods</h3>
            <p className="text-sm text-stone-500 mb-4">Dates strictly won't be removed unless manually deleted here.</p>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {periodHistory.map((h, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-stone-50 dark:bg-stone-800 rounded-xl">
                  <div>
                    <span className="font-bold text-stone-800 dark:text-stone-200 text-sm">{h.start_date}</span>
                    <span className="text-xs text-stone-500 ml-2">({h.period_dates.length} days)</span>
                  </div>
                  <button onClick={() => deletePeriod(h.start_date)} className="text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-1.5 rounded-lg transition-colors">
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Daily Insights */}
        {cycleInfo && (
          <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 shadow-md">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Droplets className="w-5 h-5 text-pink-500" />Daily Insights</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-900/20 rounded-2xl p-6 text-center">
                <Activity className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                <p className="text-xs font-semibold text-stone-500 uppercase mb-2">Cycle Day</p>
                <p className="text-4xl font-black text-purple-600">{cycleDay}</p>
              </div>
              <div className="bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-900/30 dark:to-rose-900/20 rounded-2xl p-6 text-center">
                <Zap className="w-8 h-8 text-rose-500 mx-auto mb-2" />
                <p className="text-xs font-semibold text-stone-500 uppercase mb-2">Status</p>
                <p className={`text-lg font-bold ${cycleInfo.irregular ? "text-rose-600" : "text-emerald-600"}`}>
                  {cycleInfo.irregular ? "Irregular" : "Regular"}
                </p>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-900/20 rounded-2xl p-6 text-center">
                <Heart className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                <p className="text-xs font-semibold text-stone-500 uppercase mb-2">Avg Cycle</p>
                <p className="text-2xl font-black text-blue-600">{cycleInfo.average_cycle}</p>
              </div>
            </div>
          </div>
        )}

        {/* No Data State */}
        {!cycleInfo && !isLoadingData && (
          <div className="bg-white dark:bg-stone-900 rounded-3xl p-12 text-center">
            <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-8 h-8 text-rose-500 opacity-60" />
            </div>
            <h4 className="text-xl font-bold mb-2">Start Tracking Your Cycle</h4>
            <p className="text-stone-500 dark:text-stone-400 max-w-sm mx-auto mb-4">Log at least 2 periods to establish your pattern and enable AI-powered predictions.</p>
            <button onClick={fetchData} className="px-6 py-2 bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-xl">
              Refresh Data
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
