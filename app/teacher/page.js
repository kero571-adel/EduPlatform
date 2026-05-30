// /app/teacher/page.js
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Users,
  TrendingUp,
  Plus,
  Eye,
  Pencil,
  Calendar,
  Clock,
  Hash,
  Copy,
  CheckCircle,
  X,
  Loader2,
  GraduationCap,
} from "lucide-react";

// دالة آمنة لتحويل تواريخ Firestore
const getDate = (val) =>
  val?.toDate ? val.toDate() : new Date(val || Date.now());

// دالة نسخ النص للحافظة
const copyToClipboard = async (text, setCopied) => {
  try {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  } catch (err) {
    console.error("Failed to copy:", err);
  }
};

export default function TeacherDashboard() {
  const router = useRouter();

  // ✅ State جديدة للميزات المطلوبة
  const [teacherData, setTeacherData] = useState(null);
  const [newGroup, setNewGroup] = useState("");
  const [isManagingGroups, setIsManagingGroups] = useState(false);
  const [uidCopied, setUidCopied] = useState(false);
  const [groupLoading, setGroupLoading] = useState(false);

  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    students: 0,
    avgScore: 0,
  });
  const [recentExams, setRecentExams] = useState([]);
  const [recentResults, setRecentResults] = useState([]);
  console.log("Teacher Data:", recentResults);
  const [loading, setLoading] = useState(true);

  // ✅ دالة إضافة مجموعة جديدة
  const handleAddGroup = async () => {
    if (!newGroup.trim() || !teacherData) return;

    const groupName = newGroup.trim();
    if (teacherData.groups?.includes(groupName)) {
      alert("هذه المجموعة موجودة بالفعل!");
      return;
    }

    setGroupLoading(true);
    try {
      await updateDoc(doc(db, "users", teacherData.id), {
        groups: arrayUnion(groupName),
      });
      // تحديث الـ state محلياً
      setTeacherData((prev) => ({
        ...prev,
        groups: [...(prev.groups || []), groupName],
      }));
      setNewGroup("");
    } catch (err) {
      console.error("Error adding group:", err);
      alert("فشل إضافة المجموعة");
    } finally {
      setGroupLoading(false);
    }
  };

  // ✅ دالة حذف مجموعة
  const handleRemoveGroup = async (groupName) => {
    if (!confirm(`هل تريد حذف مجموعة "${groupName}"؟`)) return;

    setGroupLoading(true);
    try {
      await updateDoc(doc(db, "users", teacherData.id), {
        groups: arrayRemove(groupName),
      });
      setTeacherData((prev) => ({
        ...prev,
        groups: prev.groups?.filter((g) => g !== groupName) || [],
      }));
    } catch (err) {
      console.error("Error removing group:", err);
      alert("فشل حذف المجموعة");
    } finally {
      setGroupLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        router.push("/login"); // أو أي صفحة تسجيل دخول
        return;
      }

      const teacherId = user.uid;

      try {
        // جلب بيانات المدرس
        const userDoc = await getDoc(doc(db, "users", teacherId));

        if (userDoc.exists()) {
          setTeacherData({
            id: userDoc.id,
            ...userDoc.data(),
          });
        }

        // الامتحانات
        const examsSnap = await getDocs(
          query(collection(db, "exams"), where("teacherId", "==", teacherId))
        );

        const exams = examsSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        const published = exams.filter((e) => e.status === "published").length;

        const sortedExams = exams
          .sort((a, b) => getDate(b.createdAt) - getDate(a.createdAt))
          .slice(0, 5);

        setRecentExams(sortedExams);

        // النتائج
        let results = [];
        const uniqueStudents = new Set();

        let totalScore = 0;
        let maxTotal = 0;

        const examsMap = {};

        exams.forEach((e) => {
          examsMap[e.id] = e.title;
        });

        const allResSnap = await getDocs(
          query(collection(db, "results"), where("teacherId", "==", teacherId))
        );

        allResSnap.docs.forEach((d) => {
          const data = d.data();

          results.push({
            id: d.id,
            ...data,
            examTitle: examsMap[data.examId] || "امتحان محذوف",
          });

          uniqueStudents.add(data.studentId);

          totalScore += data.score || 0;
          maxTotal += data.maxScore || 0;
        });

        results.sort((a, b) => getDate(b.submittedAt) - getDate(a.submittedAt));

        setRecentResults(results.slice(0, 5));

        setStats({
          total: exams.length,
          published,
          students: uniqueStudents.size,
          avgScore:
            maxTotal > 0 ? Math.round((totalScore / maxTotal) * 100) : 0,
        });
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );

  return (
    <div className="min-h-screen p-4 md:p-8 space-y-6" dir="rtl">
      {/* Header & Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-800">لوحة تحكم المدرس</h1>
          <p className="text-gray-500 mt-1">
            مرحباً بك، إليك نظرة سريعة على نشاطك
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => router.push("/teacher/createExams")}
            className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition"
          >
            <Plus className="w-4 h-4" /> إنشاء امتحان
          </button>
          <button
            onClick={() => router.push("/teacher/notes")}
            className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 flex items-center gap-2 transition"
          >
            <Pencil className="w-4 h-4" /> إضافة ملاحظة
          </button>
          {/* ✅ زر تبديل إدارة المجموعات */}
          <button
            onClick={() => setIsManagingGroups(!isManagingGroups)}
            className={`px-4 py-2.5 rounded-xl flex items-center gap-2 transition border ${
              isManagingGroups
                ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
            }`}
          >
            <Users className="w-4 h-4" />
            {isManagingGroups ? "إغلاق" : "المجموعات"}
          </button>
        </div>
      </motion.div>

      {/* ✅ UID Card */}
      {teacherData && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-l from-indigo-50 to-violet-50 p-4 rounded-xl border border-indigo-100 flex items-center justify-between flex-wrap gap-3"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Hash className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">
                المعرف الفريد (UID)
              </p>
              <code className="text-sm font-mono text-gray-800 bg-white px-2 py-1 rounded border">
                {teacherData.uid?.slice(0, 8)}...{teacherData.uid?.slice(-8)}
              </code>
            </div>
          </div>

          <button
            onClick={() => copyToClipboard(teacherData.uid, setUidCopied)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
              uidCopied
                ? "bg-green-100 text-green-700"
                : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
            }`}
          >
            {uidCopied ? (
              <>
                <CheckCircle className="w-4 h-4" /> تم النسخ!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" /> نسخ UID
              </>
            )}
          </button>
        </motion.div>
      )}

      {/* ✅ Groups Management Section */}
      <AnimatePresence>
        {teacherData && isManagingGroups && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800 text-sm sm:text-base flex items-center gap-2">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
                إدارة المجموعات
              </h3>
              <button
                onClick={() => setIsManagingGroups(false)}
                className="text-gray-400 hover:text-gray-600 transition p-1 rounded-lg hover:bg-gray-100"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            {/* Current Groups */}
            <div className="flex flex-wrap gap-2 mb-4 max-h-32 overflow-y-auto">
              {teacherData.groups?.length > 0 ? (
                teacherData.groups.map((group, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-xs sm:text-sm font-medium"
                  >
                    <GraduationCap className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                    <span className="max-w-[100px] sm:max-w-[160px] truncate">
                      {group}
                    </span>
                    <button
                      onClick={() => handleRemoveGroup(group)}
                      disabled={groupLoading}
                      className="ml-0.5 sm:ml-1 hover:text-rose-500 disabled:opacity-50 transition shrink-0"
                      title="حذف المجموعة"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))
              ) : (
                <p className="text-gray-400 text-xs sm:text-sm">
                  لا توجد مجموعات مضافة
                </p>
              )}
            </div>

            {/* Add New Group */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newGroup}
                onChange={(e) => setNewGroup(e.target.value)}
                placeholder="اسم المجموعة..."
                onKeyDown={(e) => e.key === "Enter" && handleAddGroup()}
                className="flex-1 min-w-0 px-3 sm:px-4 py-2 sm:py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition"
                disabled={groupLoading}
              />
              <button
                onClick={handleAddGroup}
                disabled={!newGroup.trim() || groupLoading}
                className="shrink-0 px-3 sm:px-4 py-2 sm:py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 sm:gap-2 transition text-xs sm:text-sm"
              >
                {groupLoading ? (
                  <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                )}
                <span className="hidden xs:inline sm:inline">إضافة</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "إجمالي الامتحانات",
            value: stats.total,
            icon: BookOpen,
            color: "text-indigo-600 bg-indigo-50",
          },
          {
            label: "امتحانات منشورة",
            value: stats.published,
            icon: Eye,
            color: "text-green-600 bg-green-50",
          },
          {
            label: "طلاب متفاعلون",
            value: stats.students,
            icon: Users,
            color: "text-amber-600 bg-amber-50",
          },
          {
            label: "متوسط الدرجات",
            value: `${stats.avgScore}%`,
            icon: TrendingUp,
            color: "text-purple-600 bg-purple-50",
          },
        ].map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4"
          >
            <div className={`p-3 rounded-lg ${s.color}`}>
              <s.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Two Columns: Recent Exams & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Exams */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
        >
          <div className="p-4 border-b border-gray-100 font-semibold text-gray-800 flex justify-between items-center">
            <span>أحدث الامتحانات</span>
            <button
              onClick={() => router.push("/teacher/exams")}
              className="text-sm text-indigo-600 hover:underline"
            >
              عرض الكل
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {recentExams.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-sm">
                لا توجد امتحانات بعد
              </div>
            ) : (
              recentExams.map((exam) => (
                <div
                  key={exam.id}
                  className="p-4 hover:bg-gray-50 transition flex justify-between items-center"
                >
                  <div>
                    <h3 className="font-medium text-gray-800">{exam.title}</h3>
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />{" "}
                      {getDate(exam.startTime).toLocaleDateString("ar-EG")}
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      exam.status === "published"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {exam.status === "published" ? "منشور" : "مسودة"}
                  </span>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Recent Results / Activity */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
        >
          <div className="p-4 border-b border-gray-100 font-semibold text-gray-800 flex justify-between items-center">
            <span>آخر النشاطات والنتائج</span>
            <button
              onClick={() => router.push("/teacher/reports")}
              className="text-sm text-indigo-600 hover:underline"
            >
              عرض التقارير
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {recentResults.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-sm">
                لم يقم أي طالب بتسليم امتحان بعد
              </div>
            ) : (
              recentResults.map((res) => (
                <div
                  key={res.id}
                  className="p-4 hover:bg-gray-50 transition flex justify-between items-center"
                >
                  <div>
                    <h3 className="font-medium text-gray-800">
                      {res.studentName || "طالب"}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">
                      {res.examTitle}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="block font-bold text-indigo-600">
                      {Math.round((res.score / res.maxScore) * 100)}%
                    </span>
                    <span className="text-xs text-gray-400 flex items-center justify-end gap-1">
                      <Clock className="w-3 h-3" />{" "}
                      {getDate(res.submittedAt).toLocaleDateString("ar-EG")}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
