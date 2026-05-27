// /app/teacher/students/[id]/page.js
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Mail,
  Calendar,
  Trophy,
  TrendingUp,
  Target,
  Download,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  FileText,
  BarChart3,
  X,
  Phone,
} from "lucide-react";

// مكون Cookies بسيط
const Cookies = {
  get: (name) => {
    if (typeof document === "undefined") return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(";").shift();
    return null;
  },
};

export default function StudentDetails() {
  const router = useRouter();
  const params = useParams();

  const [student, setStudent] = useState(null);
  const [results, setResults] = useState([]);
  const [exams, setExams] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("results");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) return router.replace("/login");
      if (Cookies.get("userRole") !== "teacher")
        return router.replace("/student");
      fetchData();
    });
    return () => unsub();
  }, [router, params.id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");

      const studentDoc = await getDoc(doc(db, "users", params.id));
      if (!studentDoc.exists()) {
        setError("الطالب غير موجود");
        return;
      }
      setStudent({ id: studentDoc.id, ...studentDoc.data() });

      const resultsQuery = query(
        collection(db, "results"),
        where("studentId", "==", params.id),
        where("teacherId", "==", auth.currentUser.uid)
      );
      const resultsSnap = await getDocs(resultsQuery);
      const resultsData = [];

      for (const resultDoc of resultsSnap.docs) {
        const result = resultDoc.data();
        if (result.examId && !exams[result.examId]) {
          const examDoc = await getDoc(doc(db, "exams", result.examId));
          if (examDoc.exists()) {
            exams[result.examId] = examDoc.data().title;
          }
        }
        let finalScore = result.score;
        if (
          typeof result.score === "number" &&
          typeof result.totalQuestions === "number" &&
          result.totalQuestions > 0
        ) {
          finalScore = Math.round((result.score / result.totalQuestions) * 100);
        }

        resultsData.push({
          id: resultDoc.id,
          ...result,
          score: finalScore,
          examTitle: exams[result.examId] || "امتحان غير معروف",
        });
      }

      setExams({ ...exams });
      setResults(resultsData);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("فشل تحميل بيانات الطالب");
    } finally {
      setLoading(false);
    }
  };

  const studentStats = useMemo(() => {
    const graded = results.filter((r) => r.score !== null);
    const scores = graded.map((r) => r.score);

    if (scores.length === 0) {
      return {
        totalExams: 0,
        averageScore: 0,
        highestScore: 0,
        passRate: 0,
        lastActivity: null,
      };
    }

    return {
      totalExams: results.length,
      averageScore: Math.round(
        scores.reduce((a, b) => a + b, 0) / scores.length
      ),
      highestScore: Math.max(...scores),
      passRate: Math.round(
        (scores.filter((s) => s >= 50).length / scores.length) * 100
      ),
      lastActivity: graded[graded.length - 1]?.createdAt?.toDate?.() || null,
    };
  }, [results]);

  const getStatusConfig = (score, status) => {
    if (status === "pending_review" || score === null) {
      return {
        label: "قيد المراجعة",
        color: "bg-gray-100 text-gray-600",
        icon: Clock,
      };
    }
    if (score >= 90)
      return {
        label: "ممتاز",
        color: "bg-green-100 text-green-700",
        icon: Trophy,
      };
    if (score >= 75)
      return {
        label: "جيد جداً",
        color: "bg-blue-100 text-blue-700",
        icon: CheckCircle,
      };
    if (score >= 50)
      return {
        label: "ناجح",
        color: "bg-amber-100 text-amber-700",
        icon: Target,
      };
    return {
      label: "بحاجة لتحسين",
      color: "bg-red-100 text-red-700",
      icon: AlertCircle,
    };
  };

  const exportReport = () => {
    const headers = ["الامتحان", "الدرجة", "الحالة", "التاريخ"];
    const rows = results.map((r) => {
      const status = getStatusConfig(r.score, r.status);
      const date = r.createdAt?.toDate?.().toLocaleDateString("ar-EG") || "غير متاح";
      return [
        r.examTitle || r.examId,
        r.score !== null ? `${r.score}%` : "قيد المراجعة",
        status.label,
        date,
      ];
    });

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${student?.name?.replace(/\s+/g, "_")}_report.csv`;
    a.click();
  };

  const getAvatarColor = (name) => {
    const colors = [
      "from-blue-500 to-indigo-600",
      "from-emerald-500 to-teal-600",
      "from-purple-500 to-pink-600",
      "from-amber-500 to-orange-600",
      "from-rose-500 to-red-600",
    ];
    const index = name?.charCodeAt(0) % colors.length || 0;
    return colors[index];
  };

  // ✅ مكون الصورة مع fallback
  const StudentAvatar = ({ student, size = "large" }) => {
    const sizeClasses = size === "large" 
      ? "w-16 h-16 sm:w-20 sm:h-20 text-xl sm:text-2xl" 
      : "w-10 h-10 text-sm";
    
    if (student.photoURL) {
      return (
        <img
          src={student.photoURL}
          alt={student.name}
          className={`${sizeClasses} rounded-2xl object-cover border-2 border-white shadow-lg flex-shrink-0`}
          onError={(e) => {
            e.target.style.display = "none";
            e.target.nextSibling.style.display = "flex";
          }}
        />
      );
    }
    return (
      <>
        <div
          className={`${sizeClasses} rounded-2xl bg-gradient-to-br ${getAvatarColor(
            student.name
          )} flex items-center justify-center text-white font-bold shadow-lg flex-shrink-0`}
        >
          {student.name?.charAt(0).toUpperCase() || "ط"}
        </div>
        {/* Fallback مخفي يظهر عند فشل الصورة */}
        <div
          className={`${sizeClasses} rounded-2xl bg-gradient-to-br ${getAvatarColor(
            student.name
          )} flex items-center justify-center text-white font-bold shadow-lg flex-shrink-0 hidden`}
        >
          {student.name?.charAt(0).toUpperCase() || "ط"}
        </div>
      </>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir="rtl" lang="ar">
        <div className="text-center">
          <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600 text-sm sm:text-base">
            جاري تحميل بيانات الطالب...
          </p>
        </div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir="rtl" lang="ar">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 max-w-md w-full text-center"
        >
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7 sm:w-8 sm:h-8 text-red-600" />
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-2">
            {error || "الطالب غير موجود"}
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            {error
              ? "يرجى المحاولة لاحقاً"
              : "قد يكون هذا الطالب قد حذف من النظام"}
          </p>
          <button
            onClick={() => router.push("/teacher/students")}
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors text-sm sm:text-base"
          >
            العودة للطلاب
          </button>
        </motion.div>
      </div>
    );
  }

  const StatusIcon = ({ status, score }) => {
    const config = getStatusConfig(score, status);
    const Icon = config.icon;
    return <Icon className="w-4 h-4" />;
  };

  return (
    <div className="space-y-4 sm:space-y-6 px-0" dir="rtl" lang="ar">
      {/* ── Header ── */}
      <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-3">
        <button
          onClick={() => router.push("/teacher/students")}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors w-fit text-sm sm:text-base"
        >
          <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 rotate-180" />
          <span>العودة للطلاب</span>
        </button>

        <div className="flex items-center gap-2 self-end xs:self-auto">
          <button
            onClick={exportReport}
            disabled={results.length === 0}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 text-sm font-medium text-gray-700"
          >
            <Download className="w-4 h-4 flex-shrink-0" />
            <span className="hidden sm:inline">تصدير التقرير</span>
          </button>

          <button
            onClick={() => {
              const phone = student.phoneNumber || "";
              const cleanPhone = phone.replace(/\D/g, "");
              if (!cleanPhone) {
                alert("رقم الهاتف غير متوفر");
                return;
              }
              const message = encodeURIComponent(
                `مرحباً ${student.name}، أود التواصل معك بخصوص نتائج امتحاناتك.`
              );
              window.open(`https://wa.me/2${cleanPhone}?text=${message}`, "_blank");
            }}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
          >
            <MessageSquare className="w-4 h-4 flex-shrink-0" />
            <span className="hidden sm:inline">تواصل</span>
          </button>
        </div>
      </div>

      {/* ── Student Profile Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
          {/* Avatar with photo support */}
          <StudentAvatar student={student} size="large" />

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col xs:flex-row xs:items-start xs:justify-between gap-2 xs:gap-4">
              <div className="min-w-0 text-right xs:text-right">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-800 truncate">
                  {student.name}
                </h1>
                <p className="text-sm text-gray-500 mt-0.5 capitalize">
                  حساب {student.role === "student" ? "طالب" : "معلم"}
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-xs sm:text-sm font-medium self-start flex-shrink-0">
                <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                نشط
              </span>
            </div>

            {/* Contact Info */}
            <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 sm:gap-4 mt-3 sm:mt-4">
              <div className="flex items-center gap-2 sm:gap-3 text-gray-600 min-w-0">
                <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" />
                <span className="text-sm sm:text-base truncate text-right">
                  {student.email}
                </span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 text-gray-600">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" />
                <span className="text-sm sm:text-base text-right">
                  انضم في{" "}
                  {new Date(student.createdAt).toLocaleDateString("ar-EG", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
              {student.phoneNumber && (
                <div className="flex items-center gap-2 sm:gap-3 text-gray-600">
                  <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" />
                  <span className="text-sm sm:text-base text-right">
                    {student.phoneNumber}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Stats Overview ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          {
            delay: 0.1,
            bg: "bg-blue-100",
            icon: <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />,
            label: "إجمالي الامتحانات",
            value: studentStats.totalExams,
          },
          {
            delay: 0.2,
            bg: "bg-indigo-100",
            icon: (
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
            ),
            label: "متوسط الدرجات",
            value: `${studentStats.averageScore}%`,
          },
          {
            delay: 0.3,
            bg: "bg-amber-100",
            icon: <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />,
            label: "أعلى درجة",
            value: `${studentStats.highestScore}%`,
          },
          {
            delay: 0.4,
            bg: "bg-green-100",
            icon: <Target className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />,
            label: "معدل النجاح",
            value: `${studentStats.passRate}%`,
          },
        ].map(({ delay, bg, icon, label, value }) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
            whileHover={{ y: -4 }}
            className="bg-white rounded-2xl border border-gray-200 p-3 sm:p-5"
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <div
                className={`w-8 h-8 sm:w-10 sm:h-10 ${bg} rounded-xl flex items-center justify-center flex-shrink-0`}
              >
                {icon}
              </div>
              <div className="min-w-0 text-right">
                <p className="text-xs sm:text-sm text-gray-500 truncate">
                  {label}
                </p>
                <p className="text-lg sm:text-2xl font-bold text-gray-800">
                  {value}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-1 sm:gap-2 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab("results")}
          className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium transition-all text-sm sm:text-base ${
            activeTab === "results"
              ? "bg-white text-indigo-600 shadow-sm"
              : "text-gray-600 hover:text-gray-800"
          }`}
        >
          نتائج الامتحانات
        </button>
        <button
          onClick={() => setActiveTab("progress")}
          className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium transition-all text-sm sm:text-base ${
            activeTab === "progress"
              ? "bg-white text-indigo-600 shadow-sm"
              : "text-gray-600 hover:text-gray-800"
          }`}
        >
          مخطط التقدم
        </button>
      </div>

      {/* ── Tab Panels ── */}
      <AnimatePresence mode="wait">
        {/* Results Table */}
        {activeTab === "results" && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
          >
            <div className="px-4 sm:px-5 py-3 sm:py-5 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-semibold text-gray-800">
                سجل الامتحانات
              </h3>
              <span className="text-xs sm:text-sm text-gray-500">
                {results.length} امتحان{results.length !== 1 ? "" : ""}
              </span>
            </div>

            {results.length === 0 ? (
              <div className="p-8 sm:p-12 text-center">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-7 h-7 sm:w-8 sm:h-8 text-gray-400" />
                </div>
                <h4 className="font-medium text-gray-800 mb-2 text-sm sm:text-base">
                  لم يقم بأي امتحانات بعد
                </h4>
                <p className="text-xs sm:text-sm text-gray-500">
                  هذا الطالب لم يقدم أي امتحانات حتى الآن
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] border-collapse">
                  <thead>
                    <tr className="bg-indigo-600">
                      <th className="text-center w-1/4 px-5 py-3.5 text-xs font-semibold text-white uppercase tracking-wider">
                        التاريخ
                      </th>
                      <th className="text-center w-1/4 px-5 py-3.5 text-xs font-semibold text-white uppercase tracking-wider">
                        الدرجة
                      </th>
                      <th className="text-center w-1/4 px-5 py-3.5 text-xs font-semibold text-white uppercase tracking-wider">
                        الامتحان
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((result, index) => {
                      const status = getStatusConfig(
                        result.score,
                        result.status
                      );
                      const isEven = index % 2 === 0;
                      return (
                        <motion.tr
                          key={result.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.04 }}
                          className={`border-b border-gray-100 hover:bg-indigo-50 transition-colors ${
                            isEven ? "bg-white" : "bg-gray-50/60"
                          }`}
                        >
                          {/* DATE */}
                          <td className="px-5 py-4 text-center text-sm">
                            {result.submittedAt?.toDate?.()
                              ? result.submittedAt.toDate().toLocaleDateString("ar-EG")
                              : "غير متاح"}
                          </td>

                          {/* SCORE */}
                          <td className="px-5 py-4 text-center">
                            {result.score !== null ? (
                              <span className="font-bold text-indigo-600">
                                {result.score}%
                              </span>
                            ) : (
                              <span className="text-gray-400 italic text-sm">
                                قيد المراجعة
                              </span>
                            )}
                          </td>

                          {/* EXAM */}
                          <td className="px-5 py-4 text-center">
                            <span className="font-medium text-gray-800 truncate block text-sm">
                              {result.examTitle ||
                                result.examId?.slice(0, 12) + "..."}
                            </span>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}

        {/* Progress Chart */}
        {activeTab === "progress" && (
          <motion.div
            key="progress"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6"
          >
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">
              تطور الدرجات
            </h3>

            {results.filter((r) => r.score !== null).length === 0 ? (
              <div className="text-center py-10 sm:py-12">
                <BarChart3 className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-sm text-gray-500">
                  لا توجد امتحانات مُصححة لعرضها
                </p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {results
                  .filter((r) => r.score !== null)
                  .sort((a, b) => {
                    const dateA = a.createdAt?.toDate?.() || new Date(0);
                    const dateB = b.createdAt?.toDate?.() || new Date(0);
                    return dateA - dateB;
                  })
                  .map((result, index) => {
                    const status = getStatusConfig(result.score, result.status);
                    return (
                      <motion.div
                        key={result.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center gap-2 sm:gap-4"
                      >
                        {/* Exam label */}
                        <div className="hidden sm:block w-28 lg:w-32 text-sm text-gray-500 truncate flex-shrink-0 text-right">
                          {result.examTitle?.slice(0, 20) || "امتحان"}
                        </div>

                        {/* Bar */}
                        <div className="flex-1 h-7 sm:h-8 bg-gray-100 rounded-full overflow-hidden min-w-0">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${result.score}%` }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            className={`h-full rounded-full flex items-center justify-start pr-2 ${
                              result.score >= 75
                                ? "bg-green-500"
                                : result.score >= 50
                                ? "bg-amber-500"
                                : "bg-red-500"
                            }`}
                          >
                            {result.score >= 20 && (
                              <span className="text-white text-xs font-semibold sm:hidden">
                                {result.score}%
                              </span>
                            )}
                          </motion.div>
                        </div>

                        {/* Score */}
                        <div className="hidden sm:block w-14 text-left font-semibold text-gray-800 text-sm flex-shrink-0">
                          {result.score}%
                        </div>

                        {/* Status badge */}
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium flex-shrink-0 ${status.color}`}
                        >
                          <span className="sm:hidden">
                            {status.label.charAt(0)}
                          </span>
                          <span className="hidden sm:inline">
                            {status.label}
                          </span>
                        </span>
                      </motion.div>
                    );
                  })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Error Toast ── */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 max-w-sm z-50"
          >
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 sm:p-4 flex items-center gap-3 shadow-lg">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0" />
              <span className="text-red-700 text-xs sm:text-sm flex-1 text-right">
                {error}
              </span>
              <button
                onClick={() => setError("")}
                className="p-1 hover:bg-red-100 rounded flex-shrink-0"
              >
                <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-600" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}