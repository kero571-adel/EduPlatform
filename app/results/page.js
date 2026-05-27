// /app/results/page.js
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
} from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Trophy,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  FileText,
  TrendingUp,
  Award,
} from "lucide-react";

export default function ResultsPage() {
  const router = useRouter();
  const [results, setResults] = useState([]);
  const [exams, setExams] = useState({});
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, average: 0, highest: 0 });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return router.replace("/login");
      await fetchResults(user.uid);
    });
    return () => unsub();
  }, [router]);

  const fetchResults = async (uid) => {
    try {
      // Fetch results for current user
      const q = query(collection(db, "results"), where("studentId", "==", uid));
      const snapshot = await getDocs(q);
      const resultsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setResults(resultsData);

      // Fetch exam titles for better display
      const examTitles = {};
      for (const result of resultsData) {
        if (result.examId && !examTitles[result.examId]) {
          const examDoc = await getDoc(doc(db, "exams", result.examId));
          if (examDoc.exists()) {
            examTitles[result.examId] = examDoc.data().title;
          }
        }
      }
      setExams(examTitles);

      // Calculate stats
      const gradedResults = resultsData.filter((r) => r.score !== null);
      if (gradedResults.length > 0) {
        const scores = gradedResults.map((r) => r.score);
        setStats({
          total: gradedResults.length,
          average: Math.round(
            scores.reduce((a, b) => a + b, 0) / scores.length
          ),
          highest: Math.max(...scores),
        });
      }
    } catch (err) {
      console.error("Error fetching results:", err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status, score, graded) => {
    if (graded || status === "graded") {
      if (score >= 90)
        return {
          bg: "bg-green-100",
          text: "text-green-700",
          icon: Trophy,
          label: "Excellent",
        };
      if (score >= 75)
        return {
          bg: "bg-blue-100",
          text: "text-blue-700",
          icon: CheckCircle,
          label: "Good",
        };
      if (score >= 50)
        return {
          bg: "bg-yellow-100",
          text: "text-yellow-700",
          icon: AlertCircle,
          label: "Pass",
        };
      return {
        bg: "bg-red-100",
        text: "text-red-700",
        icon: AlertCircle,
        label: "Needs Improvement",
      };
    }
    return {
      bg: "bg-gray-100",
      text: "text-gray-600",
      icon: Clock,
      label: "Pending",
    };
  };

  // Stats Cards Component
  const StatsCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white shadow-lg"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-100 text-sm">Total Exams</p>
            <p className="text-3xl font-bold mt-1">{stats.total}</p>
          </div>
          <FileText className="w-10 h-10 opacity-80" />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-5 text-white shadow-lg"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-emerald-100 text-sm">Average Score</p>
            <p className="text-3xl font-bold mt-1">{stats.average}%</p>
          </div>
          <TrendingUp className="w-10 h-10 opacity-80" />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-5 text-white shadow-lg"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-amber-100 text-sm">Highest Score</p>
            <p className="text-3xl font-bold mt-1">{stats.highest}%</p>
          </div>
          <Award className="w-10 h-10 opacity-80" />
        </div>
      </motion.div>
    </div>
  );

  // Result Card Component
  const ResultCard = ({ result, index }) => {
    const statusConfig = getStatusConfig(
      result.status,
      result.score,
      result.graded
    );
    const StatusIcon = statusConfig.icon;

    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.1 }}
        className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg transition-shadow"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <h3 className="font-semibold text-gray-800 truncate">
                {exams[result.examId] ||
                  `Exam ${result.examId?.slice(0, 8)}...`}
              </h3>
            </div>
            <p className="text-sm text-gray-500">
              Submitted:{" "}
              {result.submittedAt
                ? new Date(result.submittedAt).toLocaleDateString()
                : "N/A"}
            </p>
          </div>

          <div className="text-right">
            {result.score !== null ? (
              <div className="text-2xl font-bold text-gray-800">
                {result.score}%
              </div>
            ) : (
              <div className="flex items-center gap-1 text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Grading...</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${statusConfig.bg} ${statusConfig.text}`}
          >
            <StatusIcon className="w-4 h-4" />
            {statusConfig.label}
          </span>

          {result.status === "graded" && result.score !== null && (
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${result.score}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className={`h-full rounded-full ${
                    result.score >= 75
                      ? "bg-green-500"
                      : result.score >= 50
                      ? "bg-yellow-500"
                      : "bg-red-500"
                  }`}
                />
              </div>
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your results...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Back</span>
          </button>
          <h1 className="text-xl font-bold text-gray-800">My Results</h1>
          <div className="w-20" /> {/* Spacer for centering */}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {results.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center py-16"
            >
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                No Results Yet
              </h3>
              <p className="text-gray-500 mb-6">
                You haven&apos;t taken any exams yet.
              </p>
              <button
                onClick={() => router.push("/student/exams")}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
              >
                Browse Exams
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Stats Overview */}
              <StatsCards />

              {/* Results List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-800">
                    Exam History
                  </h2>
                  <span className="text-sm text-gray-500">
                    {results.length} exam{results.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {results.map((result, index) => (
                  <ResultCard key={result.id} result={result} index={index} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
