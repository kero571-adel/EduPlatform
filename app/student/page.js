// /app/student/page.js
"use client";
import { onAuthStateChanged } from "firebase/auth";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { motion } from "framer-motion";
import {
  BookOpen,
  Clock,
  CheckCircle,
  TrendingUp,
  Bell,
  Play,
  Eye,
  FileText,
} from "lucide-react";

const getDate = (val) => {
  if (!val) return new Date();
  return val.toDate ? val.toDate() : new Date(val);
};

export default function StudentDashboard() {
  const router = useRouter();
  const [groupName, setGroupName] = useState("");
  const [exams, setExams] = useState([]);
  console.log("EXAMS:", exams);
  const [results, setResults] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        router.push("/login");
        return;
      }

      try {
        const userSnap = await getDoc(doc(db, "users", user.uid));
        const userData = userSnap.exists() ? userSnap.data() : {};

        setGroupName(userData.groupName || "غير محدد");

        // Exams
        try {
          const examsSnap = await getDocs(
            query(
              collection(db, "exams"),
              where("teacherId", "==", userData.teacherId),
              where("groupName", "==", userData.groupName)
            )
          );

          setExams(examsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
        } catch (e) {
          console.error("❌ exams FAILED:", e);
        }

        // Results
        try {
          const resultsSnap = await getDocs(
            query(collection(db, "results"), where("studentId", "==", user.uid))
          );

          setResults(resultsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
        } catch (e) {
          console.error("❌ results FAILED:", e);
        }

        // Notes
        try {
          const notesSnap = await getDocs(
            query(
              collection(db, "notes"),
              where("teacherId", "==", userData.teacherId),
              where("groupName", "==", userData.groupName)
            )
          );

          setNotes(
            notesSnap.docs
              .map((d) => ({ id: d.id, ...d.data() }))
              .sort((a, b) => getDate(b.createdAt) - getDate(a.createdAt))
              .slice(0, 3)
          );
        } catch (e) {
          console.error("❌ notes FAILED:", e);
        }
      } catch (err) {
        console.error("❌ user FAILED:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const getExamStatus = (exam) => {
    const now = new Date();
    const start = getDate(exam.startTime);
    const end = getDate(exam.endTime);
    const isSubmitted = results.some((r) => r.examId === exam.id);

    if (isSubmitted)
      return {
        type: "submitted",
        label: "تم التسليم",
        color: "bg-green-100 text-green-700",
      };
    if (now < start)
      return {
        type: "upcoming",
        label: "قادم",
        color: "bg-blue-100 text-blue-700",
      };
    if (now > end)
      return {
        type: "closed",
        label: "انتهى",
        color: "bg-gray-100 text-gray-500",
      };
    return {
      type: "active",
      label: "نشط الآن",
      color: "bg-amber-100 text-amber-700",
    };
  };

  const stats = {
    total: exams.length,
    submitted: results.length,
    pending: exams.filter((e) =>
      ["upcoming", "active"].includes(getExamStatus(e).type)
    ).length,
    avgScore:
      results.length > 0
        ? Math.round(
            results.reduce((acc, r) => acc + (r.score / r.maxScore) * 100, 0) /
              results.length
          )
        : 0,
  };

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );

  return (
    <div
      className="min-h-screen bg-gray-50 p-3 sm:p-5 md:p-8 space-y-6 md:space-y-8"
      dir="rtl"
    >
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-xl md:text-2xl font-bold text-gray-800">
          لوحة الطالب
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          مجموعتك:{" "}
          <span className="font-semibold text-indigo-600">{groupName}</span>
        </p>
      </motion.div>

      {/* ── Stats — 2 cols mobile, 4 cols desktop ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {[
          {
            label: "إجمالي الامتحانات",
            value: stats.total,
            icon: BookOpen,
            color: "text-indigo-600 bg-indigo-50",
          },
          {
            label: "تم تسليمها",
            value: stats.submitted,
            icon: CheckCircle,
            color: "text-green-600 bg-green-50",
          },
          {
            label: "قيد الانتظار",
            value: stats.pending,
            icon: Clock,
            color: "text-amber-600 bg-amber-50",
          },
          {
            label: "متوسط الدرجات",
            value: `${stats.avgScore}%`,
            icon: TrendingUp,
            color: "text-purple-600 bg-purple-50",
          },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="bg-white p-3 md:p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3"
          >
            <div className={`p-2.5 md:p-3 rounded-lg shrink-0 ${stat.color}`}>
              <stat.icon className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xl md:text-2xl font-bold text-gray-800 leading-tight">
                {stat.value}
              </p>
              <p className="text-xs text-gray-500 leading-tight mt-0.5 truncate">
                {stat.label}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Exams ── */}
      <div className="space-y-3 md:space-y-4">
        <h2 className="text-base md:text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Bell className="w-5 h-5 text-indigo-500" /> الامتحانات 
        </h2>

        {exams.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed text-gray-400 text-sm">
            لا توجد امتحانات مخصصة لمجموعتك حالياً
          </div>
        ) : (
          /* 1 col mobile → 2 col tablet → 3 col desktop */
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {exams.map((exam) => {
              const status = getExamStatus(exam);
              const start = getDate(exam.startTime);
              const end = getDate(exam.endTime);
              const now = new Date();

              const timeLeft =
                status.type === "active"
                  ? Math.floor((end - now) / 1000)
                  : status.type === "upcoming"
                  ? Math.floor((start - now) / 1000)
                  : 0;
              const mins = Math.floor(Math.max(timeLeft, 0) / 60);
              const secs = Math.max(timeLeft, 0) % 60;

              return (
                <motion.div
                  key={exam.id}
                  layout
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white p-4 md:p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex flex-col gap-3"
                >
                  {/* Title + badge */}
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="font-bold text-gray-800 text-sm md:text-base line-clamp-2 flex-1">
                      {exam.title}
                    </h3>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${status.color}`}
                    >
                      {status.label}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-xs md:text-sm text-gray-500 line-clamp-2 min-h-[2.5rem]">
                    {exam.description || "بدون وصف"}
                  </p>

                  {/* Duration */}
                  <div className="text-xs text-gray-400 flex items-center gap-1.5">
                    <Clock className="w-3 h-3 shrink-0" />
                    المدة: {exam.durationMinutes} دقيقة
                  </div>

                  {/* Countdown */}
                  {(status.type === "active" || status.type === "upcoming") && (
                    <div className="bg-gray-50 px-3 py-2 rounded-lg text-center font-mono text-sm text-gray-700 font-medium">
                      {status.type === "upcoming" ? "يبدأ خلال" : "متبقي"}{" "}
                      <span className="text-indigo-600">
                        {mins.toString().padStart(2, "0")}:
                        {secs.toString().padStart(2, "0")}
                      </span>
                    </div>
                  )}

                  {/* Action button */}
                  <div className="mt-auto pt-2 border-t border-gray-100">
                    {status.type === "active" && (
                      <button
                        onClick={() => router.push(`/student/exam/${exam.id}`)}
                        className="w-full py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 active:scale-95 transition flex items-center justify-center gap-2"
                      >
                        <Play className="w-4 h-4" /> دخول الامتحان
                      </button>
                    )}
                    {status.type === "submitted" && (
                      <button
                        onClick={() => router.push("/student/reports")}
                        className="w-full py-2.5 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100 active:scale-95 transition flex items-center justify-center gap-2"
                      >
                        <Eye className="w-4 h-4" /> عرض النتيجة
                      </button>
                    )}
                    {(status.type === "closed" ||
                      status.type === "upcoming") && (
                      <button
                        disabled
                        className="w-full py-2.5 bg-gray-100 text-gray-400 rounded-lg text-sm cursor-not-allowed"
                      >
                        {status.type === "upcoming"
                          ? "في الانتظار"
                          : "انتهى الوقت"}
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Notes ── */}
      <div className="space-y-3 md:space-y-4">
        <h2 className="text-base md:text-lg font-semibold text-gray-800 flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-500" /> آخر الملاحظات
        </h2>

        {notes.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-xl border-2 border-dashed text-gray-400 text-sm">
            لا توجد ملاحظات جديدة
          </div>
        ) : (
          /* 1 col mobile → 3 col desktop */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {notes.map((note, i) => (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-2"
              >
                <h3 className="font-bold text-gray-800 text-sm md:text-base line-clamp-1">
                  {note.title}
                </h3>
                <p className="text-sm text-gray-600 line-clamp-3 whitespace-pre-line flex-1">
                  {note.content}
                </p>
                <p className="text-xs text-gray-400 mt-auto">
                  {getDate(note.createdAt).toLocaleDateString("ar-EG")}
                </p>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
