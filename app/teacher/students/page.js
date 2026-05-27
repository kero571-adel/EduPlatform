// /app/teacher/students/page.js
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, query, where } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Filter,
  Download,
  User,
  Mail,
  Calendar,
  TrendingUp,
  Trophy,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
  X,
  Grid,
  List,
  Eye,
  MessageSquare,
  BarChart3,
  SortAsc,
  SortDesc,
  Image as ImageIcon,
  RefreshCw,
} from "lucide-react";
import Cookies from "js-cookie";

export default function TeacherStudents() {
  const router = useRouter();

  // States
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("table");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [filterStatus, setFilterStatus] = useState("all");

  // Auth & Fetch
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) return router.replace("/login");
      if (Cookies.get("userRole") !== "teacher")
        return router.replace("/student");
      fetchStudents();
    });
    return () => unsub();
  }, [router]);

  // دالة جلب الطلاب
  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError("");

      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const q = query(
        collection(db, "users"),
        where("role", "==", "student"),
        where("teacherId", "==", currentUser.uid)
      );
      const snapshot = await getDocs(q);
      const studentsData = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const student = { id: doc.id, ...doc.data() };

          try {
            const resultsQuery = query(
              collection(db, "results"),
              where("studentId", "==", doc.id),
              where("teacherId", "==", currentUser.uid)
            );
            const resultsSnap = await getDocs(resultsQuery);
            const results = resultsSnap.docs.map((d) => d.data());
            const graded = results.filter(
              (r) => r.score !== null && r.maxScore
            );

            const percentages = graded.map((r) =>
              Math.round((r.score / r.maxScore) * 100)
            );

            student.stats = {
              examsTaken: results.length,
              averageScore:
                percentages.length > 0
                  ? Math.round(
                      percentages.reduce((a, b) => a + b, 0) /
                        percentages.length
                    )
                  : 0,
              lastActivity:
                graded[graded.length - 1]?.submittedAt?.toDate?.() || null,
            };
          } catch (e) {
            student.stats = {
              examsTaken: 0,
              averageScore: 0,
              lastActivity: null,
            };
          }

          return student;
        })
      );

      setStudents(studentsData);
    } catch (err) {
      console.error("Error fetching students:", err);
      setError("فشل تحميل قائمة الطلاب");
    } finally {
      setLoading(false);
    }
  };

  // Filter & Sort Logic
  const filteredStudents = useMemo(() => {
    let result = [...students];

    if (searchQuery) {
      const queryLower = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.name?.toLowerCase().includes(queryLower) ||
          s.email?.toLowerCase().includes(queryLower)
      );
    }

    if (filterStatus !== "all") {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      result = result.filter((s) => {
        const lastActive = s.stats?.lastActivity;
        if (filterStatus === "active") {
          return lastActive && new Date(lastActive) >= thirtyDaysAgo;
        }
        return !lastActive || new Date(lastActive) < thirtyDaysAgo;
      });
    }

    result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === "name") {
        comparison = (a.name || "").localeCompare(b.name || "");
      } else if (sortBy === "date") {
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        comparison = dateA - dateB;
      } else if (sortBy === "score") {
        comparison =
          (b.stats?.averageScore || 0) - (a.stats?.averageScore || 0);
      } else if (sortBy === "exams") {
        comparison = (b.stats?.examsTaken || 0) - (a.stats?.examsTaken || 0);
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [students, searchQuery, filterStatus, sortBy, sortOrder]);

  // Helpers
  const getAvatarColor = (name) => {
    const colors = [
      "bg-blue-500",
      "bg-emerald-500",
      "bg-purple-500",
      "bg-amber-500",
      "bg-rose-500",
      "bg-cyan-500",
    ];
    const index = name?.charCodeAt(0) % colors.length || 0;
    return colors[index];
  };

  const formatDate = (dateString) => {
    if (!dateString) return "لم يسبق";
    const date = new Date(dateString);
    return date.toLocaleDateString("ar-EG", { 
      month: "short", 
      day: "numeric",
      year: "numeric"
    });
  };

  const getActivityStatus = (lastActivity) => {
    if (!lastActivity)
      return { label: "غير نشط", color: "bg-gray-100 text-gray-600" };
    const days = Math.floor(
      (new Date() - new Date(lastActivity)) / (1000 * 60 * 60 * 24)
    );
    if (days <= 7)
      return { label: "نشط", color: "bg-green-100 text-green-700" };
    if (days <= 30)
      return { label: "حديثاً", color: "bg-amber-100 text-amber-700" };
    return { label: "غير نشط", color: "bg-gray-100 text-gray-600" };
  };

  const exportToCSV = () => {
    const headers = [
      "الاسم",
      "البريد الإلكتروني",
      "تاريخ الانضمام",
      "عدد الامتحانات",
      "متوسط الدرجة",
      "آخر نشاط",
    ];
    const rows = filteredStudents.map((s) => [
      s.name || "غير معروف",
      s.email || "غير متاح",
      formatDate(s.createdAt),
      s.stats?.examsTaken || 0,
      `${s.stats?.averageScore || 0}%`,
      formatDate(s.stats?.lastActivity),
    ]);
    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `students-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return <SortAsc className="w-4 h-4 text-gray-300" />;
    return sortOrder === "asc" ? (
      <ChevronUp className="w-4 h-4 text-indigo-600" />
    ) : (
      <ChevronDown className="w-4 h-4 text-indigo-600" />
    );
  };

  // Skeleton Row
  const SkeletonRow = () => (
    <tr className="animate-pulse">
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-200 rounded-full" />
          <div className="h-4 bg-gray-200 rounded w-32" />
        </div>
      </td>
      <td className="px-5 py-4">
        <div className="h-4 bg-gray-200 rounded w-40" />
      </td>
      <td className="px-5 py-4">
        <div className="h-4 bg-gray-200 rounded w-20" />
      </td>
      <td className="px-5 py-4">
        <div className="h-4 bg-gray-200 rounded w-16" />
      </td>
      <td className="px-5 py-4">
        <div className="h-8 bg-gray-200 rounded w-24" />
      </td>
    </tr>
  );

  // Student Card - مع دعم الصورة الشخصية
  const StudentCard = ({ student, index }) => {
    const status = getActivityStatus(student.stats?.lastActivity);

    const AvatarContent = () => {
      if (student.photoURL) {
        return (
          <img
            src={student.photoURL}
            alt={student.name}
            className="w-12 h-12 rounded-xl object-cover border-2 border-white shadow-sm"
            onError={(e) => {
              e.target.style.display = "none";
              e.target.nextSibling.style.display = "flex";
            }}
          />
        );
      }
      return (
        <div
          className={`w-12 h-12 ${getAvatarColor(
            student.name
          )} rounded-xl flex items-center justify-center text-white font-bold`}
        >
          {student.name?.charAt(0).toUpperCase() || "ط"}
        </div>
      );
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        whileHover={{ y: -4 }}
        className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-lg hover:border-indigo-200 transition-all"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <AvatarContent />
            {/*fallback avatar*/}
            <div
              className={`w-12 h-12 ${getAvatarColor(
                student.name
              )} rounded-xl flex items-center justify-center text-white font-bold hidden`}
            >
              {student.name?.charAt(0).toUpperCase() || "ط"}
            </div>

            <div>
              <h3 className="font-semibold text-gray-800">{student.name}</h3>
              <p className="text-sm text-gray-500 truncate max-w-48">
                {student.email}
              </p>
            </div>
          </div>
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}
          >
            {status.label}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <p className="text-lg font-bold text-gray-800">
              {student.stats?.examsTaken || 0}
            </p>
            <p className="text-xs text-gray-500">امتحان</p>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <p className="text-lg font-bold text-indigo-600">
              {student.stats?.averageScore || 0}%
            </p>
            <p className="text-xs text-gray-500">متوسط</p>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500">
              {formatDate(student.stats?.lastActivity)}
            </p>
            <p className="text-xs text-gray-500">آخر نشاط</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push(`/teacher/students/${student.id}`)}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <Eye className="w-4 h-4" /> عرض
          </button>
          <button
            onClick={() => (window.location.href = `mailto:${student.email}`)}
            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            title="إرسال رسالة"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    );
  };

  const handleLogout = () => {
    Cookies.remove("isLoggedIn");
    Cookies.remove("userRole");
    Cookies.remove("userId");
    Cookies.remove("userName");
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6" dir="rtl" lang="ar">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">إدارة الطلاب</h1>
            <p className="text-gray-500 mt-1">
              عرض وإدارة جميع الطلاب المسجلين
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportToCSV}
              disabled={filteredStudents.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">تصدير</span>
            </button>
            <button
              onClick={fetchStudents}
              className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              title="تحديث"
            >
              <RefreshCw
                className={`w-4 h-4 text-gray-600 ${
                  loading ? "animate-spin" : ""
                }`}
              />
            </button>
          </div>
        </div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-3"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="flex-1">{error}</span>
              <button
                onClick={() => setError("")}
                className="p-1 hover:bg-red-100 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search & Filters */}
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="البحث بالاسم أو البريد الإلكتروني..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-10 pl-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
            />
          </div>
          <div className="relative">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="appearance-none px-4 py-2.5 pr-10 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
            >
              <option value="all">جميع الطلاب</option>
              <option value="active">نشطون (آخر 7 أيام)</option>
              <option value="inactive">غير نشطين</option>
            </select>
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode("table")}
              className={`p-2 rounded-md transition-colors ${
                viewMode === "table"
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-gray-500"
              }`}
              title="عرض جدول"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("cards")}
              className={`p-2 rounded-md transition-colors ${
                viewMode === "cards"
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-gray-500"
              }`}
              title="عرض بطاقات"
            >
              <Grid className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Results Count & Sort */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm">
          <span className="text-gray-500">
            تم العثور على {filteredStudents.length} طالب
            {searchQuery && ` عن "${searchQuery}"`}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">ترتيب حسب:</span>
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              {[
                { key: "name", label: "الاسم" },
                { key: "date", label: "تاريخ الانضمام" },
                { key: "score", label: "الدرجة" },
                { key: "exams", label: "الامتحانات" },
              ].map((option) => (
                <button
                  key={option.key}
                  onClick={() => toggleSort(option.key)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    sortBy === option.key
                      ? "bg-white text-indigo-600 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {option.label}
                  <SortIcon field={option.key} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Students List */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
            >
              {viewMode === "table" ? (
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        الطالب
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        البريد الإلكتروني
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        انضم في
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        متوسط الدرجة
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        الإجراءات
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {[...Array(5)].map((_, i) => (
                      <SkeletonRow key={i} />
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="bg-white rounded-2xl border border-gray-200 p-5 animate-pulse"
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-gray-200 rounded-xl" />
                        <div className="space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-32" />
                          <div className="h-3 bg-gray-200 rounded w-24" />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        {[...Array(3)].map((_, j) => (
                          <div key={j} className="h-12 bg-gray-200 rounded-lg" />
                        ))}
                      </div>
                      <div className="h-9 bg-gray-200 rounded-lg" />
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : filteredStudents.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center py-16 bg-white rounded-2xl border border-gray-200"
            >
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                {searchQuery || filterStatus !== "all"
                  ? "لا يوجد طلاب مطابقين"
                  : "لا يوجد طلاب مسجلين بعد"}
              </h3>
              <p className="text-gray-500 mb-6">
                {searchQuery || filterStatus !== "all"
                  ? "جرب تعديل البحث أو الفلاتر"
                  : "سيظهر الطلاب هنا بمجرد تسجيلهم"}
              </p>
              {(searchQuery || filterStatus !== "all") && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setFilterStatus("all");
                  }}
                  className="px-4 py-2 text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  مسح الفلاتر
                </button>
              )}
            </motion.div>
          ) : viewMode === "table" ? (
            <motion.div
              key="table"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        الطالب
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        البريد الإلكتروني
                      </th>
                      <th
                        className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-indigo-600"
                        onClick={() => toggleSort("date")}
                      >
                        <div className="flex items-center gap-1">
                          انضم في
                          <SortIcon field="date" />
                        </div>
                      </th>
                      <th
                        className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-indigo-600"
                        onClick={() => toggleSort("score")}
                      >
                        <div className="flex items-center gap-1">
                          متوسط الدرجة
                          <SortIcon field="score" />
                        </div>
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        الإجراءات
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredStudents.map((student, index) => {
                      const status = getActivityStatus(
                        student.stats?.lastActivity
                      );

                      const AvatarContent = () => {
                        if (student.photoURL) {
                          return (
                            <>
                              <img
                                src={student.photoURL}
                                alt={student.name}
                                className="w-10 h-10 rounded-lg object-cover border-2 border-white shadow-sm"
                                onError={(e) => {
                                  e.target.style.display = "none";
                                  e.target.nextSibling.style.display = "flex";
                                }}
                              />
                              <div
                                className={`w-10 h-10 ${getAvatarColor(
                                  student.name
                                )} rounded-lg flex items-center justify-center text-white font-medium text-sm hidden`}
                              >
                                {student.name?.charAt(0).toUpperCase() || "ط"}
                              </div>
                            </>
                          );
                        }
                        return (
                          <div
                            className={`w-10 h-10 ${getAvatarColor(
                              student.name
                            )} rounded-lg flex items-center justify-center text-white font-medium text-sm`}
                          >
                            {student.name?.charAt(0).toUpperCase() || "ط"}
                          </div>
                        );
                      };

                      return (
                        <motion.tr
                          key={student.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <AvatarContent />
                              <div>
                                <p className="font-medium text-gray-800">
                                  {student.name}
                                </p>
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${status.color}`}
                                >
                                  {status.label}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-gray-600 truncate max-w-48">
                            {student.email}
                          </td>
                          <td className="px-5 py-4 text-sm text-gray-500">
                            {formatDate(student.createdAt)}
                          </td>
                          <td className="px-5 py-4">
                            {student.stats?.averageScore !== undefined ? (
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-gray-800">
                                  {student.stats.averageScore}%
                                </span>
                                <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      student.stats.averageScore >= 75
                                        ? "bg-green-500"
                                        : student.stats.averageScore >= 50
                                        ? "bg-amber-500"
                                        : "bg-red-500"
                                    }`}
                                    style={{
                                      width: `${student.stats.averageScore}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400">
                                لا توجد بيانات
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-left">
                            <div className="flex items-center justify-start gap-2">
                              <button
                                onClick={() => {
                                  const phone = student.phoneNumber || "";
                                  const cleanPhone = phone.replace(/\D/g, "");

                                  if (!cleanPhone) {
                                    alert("رقم الهاتف غير متوفر");
                                    return;
                                  }

                                  window.open(
                                    `https://wa.me/${cleanPhone}`,
                                    "_blank"
                                  );
                                }}
                                className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="واتساب"
                              >
                                <MessageSquare className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() =>
                                  router.push(`/teacher/students/${student.id}`)
                                }
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-1"
                              >
                                <Eye className="w-4 h-4" />
                                عرض
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="cards"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {filteredStudents.map((student, index) => (
                <StudentCard key={student.id} student={student} index={index} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}