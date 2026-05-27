// /app/teacher/reports/page.js
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  deleteDoc,
} from "firebase/firestore";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trash2,
  FileText,
  TrendingUp,
  Calendar,
  Users,
  Loader2,
  Phone,
} from "lucide-react";

// ✅ دالة مساعدة آمنة لتحويل التواريخ
const safeToDate = (val) => {
  if (!val) return new Date();
  if (val.toDate && typeof val.toDate === "function") return val.toDate();
  if (val instanceof Date) return val;
  return new Date(val);
};

export default function TeacherReports() {
  const [exams, setExams] = useState([]);
  const [results, setResults] = useState([]);
  const [students, setStudents] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [chartData, setChartData] = useState([]);
  const [chartReady, setChartReady] = useState(false); // ✅ للتحكم في ظهور الشارت

  // مرجع لحاوية الشارت للتأكد من جاهزيتها
  const chartContainerRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!auth.currentUser) return;
      const teacherId = auth.currentUser.uid;

      try {
        // ── 1. جلب امتحانات المدرس ──────────────────
        const examsSnap = await getDocs(
          query(collection(db, "exams"), where("teacherId", "==", teacherId))
        );
        const examsList = examsSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setExams(examsList);

        // ── 2. جلب نتائج هذه الامتحانات ───────────────────
        const allResults = [];
        const examsMap = {};
        examsList.forEach((e) => {
          examsMap[e.id] = e.title;
        });

        const resSnap = await getDocs(
          query(collection(db, "results"), where("teacherId", "==", teacherId))
        );
        resSnap.docs.forEach((d) => {
          allResults.push({
            id: d.id,
            ...d.data(),
            examTitle: examsMap[d.data().examId] || "محذوف",
          });
        });
        setResults(allResults);

        // ── 3. جلب طلاب المدرس ──────────────────
        const studentsSnap = await getDocs(
          query(
            collection(db, "users"),
            where("role", "==", "student"),
            where("teacherId", "==", teacherId)
          )
        );
        const studentsMap = {};
        studentsSnap.docs.forEach((d) => {
          studentsMap[d.id] = d.data();
        });
        setStudents(studentsMap);
      } catch (err) {
        console.error("Failed to fetch reports data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // ✅ تحديث بيانات الرسم البياني عند تغيير الشهر
  useEffect(() => {
    const filtered = results.filter((r) => {
      if (!r.submittedAt) return false;
      const date = safeToDate(r.submittedAt);
      return date.toISOString().slice(0, 7) === selectedMonth;
    });

    const aggregated = filtered.reduce((acc, r) => {
      const existing = acc.find((e) => e.exam === r.examTitle);
      const percent = r.maxScore > 0 ? Math.round((r.score / r.maxScore) * 100) : 0;
      if (existing) {
        existing.avgScore = Math.round(
          (existing.avgScore * existing.count + percent) / (existing.count + 1)
        );
        existing.count++;
      } else {
        acc.push({ exam: r.examTitle, avgScore: percent, count: 1 });
      }
      return acc;
    }, []);

    setChartData(aggregated);
    setChartReady(true); // ✅ تفعيل الشارت بعد حساب البيانات
  }, [results, selectedMonth]);

  // ✅ إعادة ضبط جاهزية الشارت عند تغيير حجم النافذة
  useEffect(() => {
    const handleResize = () => {
      setChartReady(false);
      setTimeout(() => setChartReady(true), 50);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ✅ الحذف
  const handleRemoveStudent = async (studentId) => {
    if (!confirm("⚠️ تحذير: سيتم حذف حساب هذا الطالب نهائياً. هل أنت متأكد؟"))
      return;
    try {
      await deleteDoc(doc(db, "users", studentId));
      setStudents((prev) => {
        const updated = { ...prev };
        delete updated[studentId];
        return updated;
      });
      setResults((prev) => prev.filter((r) => r.studentId !== studentId));
      alert("تم حذف الطالب بنجاح.");
    } catch (err) {
      console.error(err);
      alert("فشل في الحذف. تحقق من الصلاحيات.");
    }
  };

  // توليد خيارات الأشهر
  const months = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      arr.push(d.toISOString().slice(0, 7));
    }
    return arr;
  }, []);

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
        >
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-indigo-600" /> تقارير الأداء والنتائج
            </h1>
            <p className="text-gray-500 mt-1">
              تحليل نتائج طلابك ومراقبة تقدمهم الشهري
            </p>
          </div>
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-sm">
            <Calendar className="w-4 h-4 text-gray-400" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent outline-none text-sm text-gray-700 cursor-pointer"
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

        {/* Chart Section - ✅ الإصلاح هنا */}
        <motion.div
          ref={chartContainerRef}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"
        >
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" /> متوسط درجات الطلاب هذا الشهر
          </h2>
          
          {/* ✅ الحاوية بارتفاع محدد + عرض كامل */}
          <div className="w-full" style={{ height: 256 }}>
            {chartData.length > 0 && chartReady ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="exam"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={60}
                    tickMargin={10}
                  />
                  <YAxis 
                    domain={[0, 100]} 
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    width={35}
                  />
                  <Tooltip
                    formatter={(value) => [`${value}%`, "المتوسط"]}
                    labelFormatter={(label) => `امتحان: ${label}`}
                    contentStyle={{
                      borderRadius: "10px",
                      border: "none",
                      boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                      fontSize: "12px",
                    }}
                  />
                  <Bar
                    dataKey="avgScore"
                    fill="#4f46e5"
                    radius={[6, 6, 0, 0]}
                    animationDuration={500}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-gray-400 text-sm bg-gray-50 rounded-lg">
                {chartData.length === 0 
                  ? "📭 لا توجد بيانات لهذا الشهر" 
                  : "📊 جاري تحضير الرسم البياني..."}
              </div>
            )}
          </div>
        </motion.div>

        {/* Exam Tables */}
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <FileText className="w-5 h-5" /> تفاصيل النتائج لكل امتحان
          </h2>
          <AnimatePresence>
            {exams.map((exam) => {
              const examResults = results
                .filter((r) => r.examId === exam.id)
                .sort(
                  (a, b) =>
                    safeToDate(b.submittedAt).getTime() -
                    safeToDate(a.submittedAt).getTime()
                );
              if (examResults.length === 0) return null;

              return (
                <motion.div
                  key={exam.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
                >
                  <div className="p-4 bg-gray-50 border-b border-gray-100 font-semibold text-gray-800 flex justify-between items-center">
                    <span>{exam.title}</span>
                    <span className="text-sm text-gray-500 font-normal">
                      {examResults.length} نتيجة
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-right">
                      <thead className="bg-gray-50 text-gray-600 border-b">
                        <tr>
                          <th className="px-4 py-3 font-medium">اسم الطالب</th>
                          <th className="px-4 py-3 font-medium">رقم الهاتف</th>
                          <th className="px-4 py-3 font-medium">الدرجة</th>
                          <th className="px-4 py-3 font-medium">النسبة</th>
                          <th className="px-4 py-3 font-medium">تاريخ التسليم</th>
                          <th className="px-4 py-3 font-medium">إجراء</th>
                        </tr>
                      </thead>
                      <tbody>
                        {examResults.map((res) => {
                          const student = students[res.studentId] || {};
                          const percent = res.maxScore > 0 
                            ? Math.round((res.score / res.maxScore) * 100) 
                            : 0;
                          const color =
                            percent >= 85
                              ? "text-green-600 bg-green-50"
                              : percent >= 50
                              ? "text-amber-600 bg-amber-50"
                              : "text-red-600 bg-red-50";
                          return (
                            <tr
                              key={res.id}
                              className="border-b last:border-0 hover:bg-gray-50 transition"
                            >
                              <td className="px-4 py-3 font-medium text-gray-800">
                                {student.name || "غير معروف"}
                              </td>
                              <td className="px-4 py-3 flex items-center gap-1 text-gray-600">
                                <Phone className="w-3 h-3 shrink-0" />{" "}
                                <span className="truncate max-w-[120px]">
                                  {student.phoneNumber || "-"}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-mono text-gray-700">
                                {res.score}/{res.maxScore}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`px-2.5 py-1 rounded-full text-xs font-bold ${color}`}
                                >
                                  {percent}%
                                </span>
                              </td>
                              <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                                {safeToDate(res.submittedAt).toLocaleDateString("ar-EG")}
                              </td>
                              <td className="px-4 py-3">
                                <button
                                  onClick={() => handleRemoveStudent(res.studentId)}
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition"
                                  title="حذف الطالب"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {exams.length === 0 && (
            <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-200 text-gray-400">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>لا توجد امتحانات لعرض نتائجها</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}