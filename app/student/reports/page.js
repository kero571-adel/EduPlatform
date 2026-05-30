// /app/student/reports/page.js
"use client";
import { useState, useEffect, useMemo } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  Calendar,
  FileText,
  Loader2,
  CheckCircle,
  Clock,
  AlertTriangle,
  Award,
  BarChart2,
  Target,
} from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

// ── Custom Tooltip for chart ──
const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl px-3 py-2 shadow-lg text-sm">
      <p className="font-bold text-indigo-600">{payload[0].value}%</p>
      <p className="text-gray-500 text-xs mt-0.5">{payload[0].payload.name}</p>
    </div>
  );
};

export default function StudentReports() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
  });

  // ── Fetch ──
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const snap = await getDocs(
          query(collection(db, "results"), where("studentId", "==", user.uid))
        );
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const examIds = [...new Set(data.map((r) => r.examId))];
        let examMap = {};
        if (examIds.length > 0) {
          const { doc, getDoc } = await import("firebase/firestore");

          const examPromises = examIds.map((id) =>
            getDoc(doc(db, "exams", id))
              .then((d) =>
                d.exists() ? { id: d.id, title: d.data().title } : null
              )
              .catch(() => null)
          );

          const examDocs = await Promise.all(examPromises);
          examDocs.forEach((e) => {
            if (e) examMap[e.id] = e.title;
          });
        }
        const enriched = data.map((r) => ({
          ...r,
          examTitle: examMap[r.examId] || "امتحان محذوف",
        }));
        setResults(
          enriched.sort((a, b) => {
            const aDate = a.submittedAt?.toDate
              ? a.submittedAt.toDate()
              : new Date(a.submittedAt || 0);
            const bDate = b.submittedAt?.toDate
              ? b.submittedAt.toDate()
              : new Date(b.submittedAt || 0);
            return bDate - aDate;
          })
        );
      } catch (err) {
        console.error("REPORTS ERROR:", err);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // ── Derived data ──
  const months = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const now = new Date();
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1); // ← دايماً يوم 1
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        return `${year}-${month}`;
      }),
    []
  );

  const monthResults = useMemo(
    () =>
      results.filter((r) => {
        const d = r.submittedAt?.toDate
          ? r.submittedAt.toDate()
          : new Date(r.submittedAt);
        if (!d) return false;
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        return `${year}-${month}` === selectedMonth;
      }),
    [results, selectedMonth]
  );

  const chartData = useMemo(
    () =>
      monthResults
        .map((r) => ({
          name: r.examTitle?.slice(0, 18) || "امتحان",
          percent: Math.round((r.score / r.maxScore) * 100),
          date: r.submittedAt?.toDate
            ? r.submittedAt
                .toDate()
                .toLocaleDateString("ar-EG", { month: "short", day: "numeric" })
            : "—",
        }))
        .reverse(), // اعرض بالترتيب الزمني في الرسم
    [monthResults]
  );

  // ── Summary stats ──
  const stats = useMemo(() => {
    if (!monthResults.length) return null;
    const percents = monthResults.map((r) =>
      Math.round((r.score / r.maxScore) * 100)
    );
    return {
      avg: Math.round(percents.reduce((a, b) => a + b, 0) / percents.length),
      best: Math.max(...percents),
      total: monthResults.length,
    };
  }, [monthResults]);

  // ── Loading ──
  if (loading)
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4 md:p-6" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
        {/* ══════════════ Header ══════════════ */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
        >
          <div>
            <h1 className="text-lg md:text-2xl font-bold text-gray-800 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-indigo-600" />
              تقارير أدائي
            </h1>
            <p className="text-gray-500 mt-0.5 text-xs md:text-sm">
              تابع درجاتك وتطورك في الامتحانات
            </p>
          </div>

          {/* Month selector */}
          <div className="w-full sm:w-auto flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-sm">
            <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent outline-none text-sm text-gray-700 cursor-pointer w-full"
            >
              {months.map((m) => (
                <option key={m} value={m}>
                  {new Date(m + "-01").toLocaleString("ar-EG", {
                    month: "long",
                    year: "numeric",
                  })}
                </option>
              ))}
            </select>
          </div>
        </motion.div>

        {/* ══════════════ Stats cards ══════════════ */}
        {stats && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="grid grid-cols-3 gap-2 md:gap-4"
          >
            {[
              {
                icon: BarChart2,
                label: "عدد الامتحانات",
                value: stats.total,
                color: "text-indigo-600",
                bg: "bg-indigo-50",
              },
              {
                icon: Target,
                label: "متوسط الدرجات",
                value: `${stats.avg}%`,
                color: "text-amber-600",
                bg: "bg-amber-50",
              },
              {
                icon: Award,
                label: "أعلى درجة",
                value: `${stats.best}%`,
                color: "text-green-600",
                bg: "bg-green-50",
              },
            ].map(({ icon: Icon, label, value, color, bg }) => (
              <div
                key={label}
                className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 md:p-4 text-center"
              >
                <div
                  className={`w-8 h-8 md:w-10 md:h-10 ${bg} rounded-lg flex items-center justify-center mx-auto mb-2`}
                >
                  <Icon className={`w-4 h-4 md:w-5 md:h-5 ${color}`} />
                </div>
                <p className="text-lg md:text-2xl font-bold text-gray-800">
                  {value}
                </p>
                <p className="text-gray-400 text-[10px] md:text-xs mt-0.5 leading-tight">
                  {label}
                </p>
              </div>
            ))}
          </motion.div>
        )}

        {/* ══════════════ Chart ══════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100"
        >
          <h2 className="text-sm md:text-base font-semibold text-gray-800 mb-4">
            مسار الدرجات الشهري
          </h2>

          {chartData.length > 0 ? (
            // على الموبايل height=180، على الـ md+ يبقى 256
            <div className="h-44 md:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 5, right: 8, left: -20, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#f1f5f9"
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    width={36}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="percent"
                    stroke="#4f46e5"
                    strokeWidth={2.5}
                    dot={{ r: 3.5, fill: "#4f46e5", strokeWidth: 0 }}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center text-gray-400 text-sm h-44 md:h-64">
              لا توجد امتحانات هذا الشهر
            </div>
          )}
        </motion.div>

        {/* ══════════════ Exam list ══════════════ */}
        <div className="space-y-2 md:space-y-3">
          <h2 className="text-sm md:text-base font-semibold text-gray-800 flex items-center gap-2">
            <FileText className="w-4 h-4 md:w-5 md:h-5" /> سجل الامتحانات
          </h2>

          <AnimatePresence>
            {monthResults.length === 0 ? (
              <div className="text-center py-10 bg-white rounded-xl border-2 border-dashed text-gray-400 text-sm">
                لم تدخل أي امتحان في هذا الشهر
              </div>
            ) : (
              monthResults.map((res, idx) => {
                const percent = Math.round((res.score / res.maxScore) * 100);
                const colorClass =
                  percent >= 85
                    ? "bg-green-100 text-green-700"
                    : percent >= 50
                    ? "bg-amber-100 text-amber-700"
                    : "bg-red-100 text-red-700";

                const barColor =
                  percent >= 85
                    ? "bg-green-400"
                    : percent >= 50
                    ? "bg-amber-400"
                    : "bg-red-400";

                return (
                  <motion.div
                    key={res.id}
                    layout
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
                  >
                    {/* Progress bar strip on top */}
                    <div className="w-full h-1 bg-gray-100">
                      <div
                        className={`h-1 ${barColor} transition-all duration-700`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    <div className="p-3 md:p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 md:gap-3">
                      {/* Left: title + meta */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-800 text-sm md:text-base truncate">
                          {res.examTitle}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
                          <span className="text-[11px] text-gray-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {res.submittedAt
                              ? res.submittedAt
                                  .toDate()
                                  .toLocaleDateString("ar-EG")
                              : "—"}
                          </span>
                          <span className="text-[11px] text-gray-400">
                            · {Math.floor((res.timeSpent || 0) / 60)} د{" "}
                            {res.timeSpent % 60} ث
                          </span>
                        </div>
                      </div>

                      {/* Right: score badge + mode */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Score fraction — hidden on very small screens */}
                        <span className="hidden sm:inline text-xs text-gray-500 font-medium">
                          {res.score}/{res.maxScore}
                        </span>

                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold ${colorClass}`}
                        >
                          {percent}%
                        </span>

                        {res.isAutoSubmitted ? (
                          <span className="text-[11px] text-orange-500 flex items-center gap-1 whitespace-nowrap">
                            <AlertTriangle className="w-3 h-3" />
                            <span className="hidden sm:inline">تلقائي</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-green-500 flex items-center gap-1 whitespace-nowrap">
                            <CheckCircle className="w-3 h-3" />
                            <span className="hidden sm:inline">يدوي</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Score fraction — shown only on mobile below the row */}
                    <div className="sm:hidden px-3 pb-3 flex justify-between items-center">
                      <span className="text-xs text-gray-400">
                        الدرجة:{" "}
                        <span className="font-semibold text-gray-700">
                          {res.score}/{res.maxScore}
                        </span>
                      </span>
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
