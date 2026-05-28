// /app/teacher/exams/page.js
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Plus,
  Filter,
  Trash2,
  Copy,
  Eye,
  FileText,
  Calendar,
  Clock,
  Users,
  Loader2,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

export default function TeacherExams() {
  const router = useRouter();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, published, draft
  const [error, setError] = useState("");

  useEffect(() => {
    if (!auth.currentUser) return;

    // جلب امتحانات المدرس فقط
    const q = query(
      collection(db, "exams"),
      where("teacherId", "==", auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const examsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        // ترتيب تنازلي حسب تاريخ الإنشاء (تجنب مشكلة Index في Firestore)
        examsData.sort((a, b) => {
          const timeA = a.createdAt?.toDate?.() || new Date(a.createdAt);
          const timeB = b.createdAt?.toDate?.() || new Date(b.createdAt);
          return timeB - timeA;
        });
        setExams(examsData);
        setLoading(false);
      },
      (err) => {
        console.error("Failed to fetch exams:", err);
        setError("فشل في تحميل الامتحانات. تأكد من اتصالك بالإنترنت.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleDelete = async (examId) => {
    if (
      !confirm(
        "هل أنت متأكد من حذف هذا الامتحان؟ لا يمكن التراجع عن هذا الإجراء."
      )
    )
      return;
    try {
      await deleteDoc(doc(db, "exams", examId));
    } catch (err) {
      alert("حدث خطأ أثناء الحذف. تأكد من صلاحياتك أو حاول لاحقاً.");
    }
  };

  const handleCopyId = (examId) => {
    navigator.clipboard.writeText(examId);
    alert("تم نسخ معرف الامتحان بنجاح!");
  };

  // تنسيق التاريخ بأمان
  const formatDate = (timestamp) => {
    if (!timestamp) return "غير محدد";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("ar-EG", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const filteredExams = exams.filter((exam) => {
    if (filter === "published") return exam.status === "published";
    if (filter === "draft") return exam.status === "draft";
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-indigo-600" /> إدارة الامتحانات
            </h1>
            <p className="text-gray-500 mt-1">
              تابع وأدر جميع الامتحانات التي قمت بإنشائها
            </p>
          </div>
          <button
            onClick={() => router.push("/teacher/createExams")}
            className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:opacity-90 transition shadow-lg shadow-indigo-500/25 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" /> إنشاء امتحان جديد
          </button>
        </motion.div>

        {/* Filters */}
        <div className="flex gap-2 bg-white p-1.5 rounded-xl border border-gray-200 w-fit shadow-sm">
          {["all", "published", "draft"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition capitalize ${
                filter === f
                  ? "bg-indigo-100 text-indigo-700 shadow-sm"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {f === "all" ? "الكل" : f === "published" ? "منشور" : "مسودة"}
            </button>
          ))}
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" /> {error}
          </div>
        )}

        {/* Exams Grid */}
        {filteredExams.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-200"
          >
            <FileText className="w-14 h-14 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700">
              لا توجد امتحانات
            </h3>
            <p className="text-gray-500 mt-1">
              ابدأ بإنشاء أول امتحان لك وشاركه مع طلابك
            </p>
            <button
              onClick={() => router.push("/teacher/createExams")}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
            >
              إنشاء الآن
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <AnimatePresence>
              {filteredExams.map((exam) => (
                <motion.div
                  key={exam.id}
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-4 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-gray-800 text-lg line-clamp-1">
                      {exam.title || "بدون عنوان"}
                    </h3>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        exam.status === "published"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {exam.status === "published" ? "منشور" : "مسودة"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 line-clamp-2 min-h-[2.5rem]">
                    {exam.description || "بدون وصف"}
                  </p>

                  <div className="space-y-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-xl">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-indigo-500" /> المجموعة
                      </span>
                      <span className="font-medium">
                        {exam.groupName || "غير محدد"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-blue-500" /> البدء
                      </span>
                      <span className="font-medium">
                        {formatDate(exam.startTime)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-purple-500" /> المدة
                      </span>
                      <span className="font-medium">
                        {exam.durationMinutes} دقيقة
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-teal-500" /> الأسئلة
                      </span>
                      <span className="font-medium">
                        {exam.questions?.length || 0}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-gray-100">
                    <button
                      onClick={() =>
                        router.push(`/teacher/reports?examId=${exam.id}`)
                      }
                      className="flex-1 py-2.5 text-sm bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl flex items-center justify-center gap-1.5 transition font-medium"
                    >
                      <Eye className="w-4 h-4" /> النتائج
                    </button>
                    <button
                      onClick={() => handleDelete(exam.id)}
                      className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition"
                      title="حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
