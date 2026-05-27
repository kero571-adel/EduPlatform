// /app/student/profile/page.js
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
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
  User,
  Mail,
  Calendar,
  Trophy,
  TrendingUp,
  Target,
  BookOpen,
  Clock,
  Award,
  Edit,
  Download,
  LogOut,
  CheckCircle,
  Star,
  Zap,
  Loader2,
  AlertCircle,
  X,
  ChevronRight,
  BarChart3,
} from "lucide-react";

export default function StudentProfile() {
  const router = useRouter();

  // States
  const [user, setUser] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview"); // overview, activity, achievements

  // Auth & Fetch
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        router.replace("/login");
        return;
      }

      try {
        setLoading(true);
        setError("");

        // Fetch user data
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        if (!userDoc.exists()) {
          setError("User data not found");
          return;
        }
        const userData = { id: userDoc.id, ...userDoc.data() };
        setUser(userData);

        // Fetch user results for stats
        const resultsQuery = query(
          collection(db, "results"),
          where("studentId", "==", firebaseUser.uid)
        );
        const resultsSnap = await getDocs(resultsQuery);
        const resultsData = resultsSnap.docs.map((resultDoc) => {
          const result = resultDoc.data();
          return {
            id: resultDoc.id,
            ...result,
            examTitle: result.examTitle || "Unknown Exam",
          };
        });
        setResults(resultsData);
      } catch (err) {
        console.error("Error fetching profile data:", err);
        setError("Failed to load profile");
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, [router]);

  // Calculate Profile Stats
  const profileStats = useMemo(() => {
    const graded = results.filter((r) => r.score !== null);
    const scores = graded.map((r) => r.score);

    return {
      examsTaken: results.length,
      examsCompleted: graded.length,
      averageScore:
        scores.length > 0
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
          : 0,
      highestScore: scores.length > 0 ? Math.max(...scores) : 0,
      passRate:
        scores.length > 0
          ? Math.round(
              (scores.filter((s) => s >= 50).length / scores.length) * 100
            )
          : 0,
      totalStudyTime: "N/A", // Can add if you track time spent
      streak: calculateStreak(results),
    };
  }, [results]);

  // Calculate learning streak
  const calculateStreak = (results) => {
    if (results.length === 0) return 0;

    const dates = results
      .filter((r) => r.createdAt)
      .map((r) => {
        const d = r.createdAt.toDate
          ? r.createdAt.toDate()
          : new Date(r.createdAt);
        return d.toDateString();
      })
      .filter((v, i, a) => a.indexOf(v) === i); // Remove duplicates

    if (dates.length === 0) return 0;

    // Simple streak: count consecutive days with activity
    // (Simplified for demo - can be enhanced)
    return Math.min(dates.length, 7); // Cap at 7 for display
  };

  // Get avatar gradient based on name
  const getAvatarGradient = (name) => {
    const gradients = [
      "from-blue-500 to-indigo-600",
      "from-emerald-500 to-teal-600",
      "from-purple-500 to-pink-600",
      "from-amber-500 to-orange-600",
      "from-rose-500 to-red-600",
      "from-cyan-500 to-blue-600",
    ];
    const index = name?.charCodeAt(0) % gradients.length || 0;
    return gradients[index];
  };

  // Get achievement badges
  const achievements = useMemo(() => {
    const badges = [];

    if (profileStats.examsCompleted >= 1) {
      badges.push({
        icon: Star,
        label: "First Step",
        color: "bg-amber-100 text-amber-700",
        desc: "Completed your first exam",
      });
    }
    if (profileStats.averageScore >= 90) {
      badges.push({
        icon: Trophy,
        label: "Top Performer",
        color: "bg-yellow-100 text-yellow-700",
        desc: "Average score 90%+",
      });
    }
    if (profileStats.examsCompleted >= 5) {
      badges.push({
        icon: Zap,
        label: "Dedicated",
        color: "bg-purple-100 text-purple-700",
        desc: "Completed 5+ exams",
      });
    }
    if (profileStats.streak >= 3) {
      badges.push({
        icon: Clock,
        label: "Consistent",
        color: "bg-green-100 text-green-700",
        desc: "Active for 3+ days",
      });
    }
    if (profileStats.passRate === 100 && profileStats.examsCompleted >= 3) {
      badges.push({
        icon: Award,
        label: "Perfect Record",
        color: "bg-indigo-100 text-indigo-700",
        desc: "100% pass rate",
      });
    }

    return badges;
  }, [profileStats]);

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "Unknown";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  // Export profile data
  const exportProfile = () => {
    const data = {
      name: user?.name,
      email: user?.email,
      memberSince: user?.createdAt,
      stats: profileStats,
      recentResults: results.slice(0, 10),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${user?.name?.replace(/\s+/g, "_")}_profile.json`;
    a.click();
  };

  // Handle logout
  const handleLogout = () => {
    Cookies.remove("isLoggedIn");
    Cookies.remove("userRole");
    Cookies.remove("userId");
    Cookies.remove("userName");
    router.push("/login");
  };

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  // Error State
  if (error || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl border border-gray-200 p-8 max-w-md w-full text-center"
        >
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            {error || "Profile not found"}
          </h3>
          <p className="text-gray-500 mb-6">Please try logging in again</p>
          <button
            onClick={() => router.push("/login")}
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
          >
            Go to Login
          </button>
        </motion.div>
      </div>
    );
  }

  // Stat Card Component
  const StatCard = ({ icon: Icon, label, value, subtext, color, trend }) => (
    <motion.div
      whileHover={{ y: -4 }}
      className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-lg transition-all"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
          {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
        </div>
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            color === "text-green-600"
              ? "bg-green-100"
              : color === "text-blue-600"
              ? "bg-blue-100"
              : color === "text-amber-600"
              ? "bg-amber-100"
              : "bg-indigo-100"
          }`}
        >
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
      </div>
    </motion.div>
  );

  // Activity Item Component
  const ActivityItem = ({ activity, index }) => {
    const status =
      activity.score >= 90
        ? { label: "Excellent", color: "text-green-600", bg: "bg-green-100" }
        : activity.score >= 75
        ? { label: "Good", color: "text-blue-600", bg: "bg-blue-100" }
        : activity.score >= 50
        ? { label: "Pass", color: "text-amber-600", bg: "bg-amber-100" }
        : { label: "Needs Work", color: "text-red-600", bg: "bg-red-100" };

    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05 }}
        className="flex items-start gap-4 pb-4 border-b border-gray-100 last:border-0 last:pb-0"
      >
        <div
          className={`w-10 h-10 rounded-xl ${status.bg} flex items-center justify-center flex-shrink-0`}
        >
          <CheckCircle className={`w-5 h-5 ${status.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-800 truncate">
            {activity.examTitle || "Unknown Exam"}
          </p>
          <p className="text-sm text-gray-500">
            {activity.createdAt?.toDate?.().toLocaleDateString() ||
              "Unknown date"}
          </p>
        </div>
        <div className="text-right">
          <p className={`font-bold ${status.color}`}>
            {activity.score !== null ? `${activity.score}%` : "Pending"}
          </p>
          <p className="text-xs text-gray-400">{status.label}</p>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">My Profile</h1>
          <p className="text-gray-500 mt-1">
            Manage your account and track your progress
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportProfile}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-xl hover:bg-red-100 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>

      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
      >
        {/* Cover + Avatar */}
        <div
          className={`h-24 bg-gradient-to-r ${getAvatarGradient(user.name)}`}
        />
        <div className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12">
            {/* Avatar */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              className={`relative w-24 h-24 rounded-2xl bg-gradient-to-br ${getAvatarGradient(
                user.name
              )} flex items-center justify-center text-white text-3xl font-bold shadow-lg border-4 border-white`}
            >
              {user.name?.charAt(0).toUpperCase() || "U"}
              <button className="absolute -bottom-2 -right-2 w-8 h-8 bg-white rounded-full shadow flex items-center justify-center text-gray-600 hover:text-indigo-600 transition-colors border border-gray-200">
                <Edit className="w-4 h-4" />
              </button>
            </motion.div>

            {/* User Info */}
            <div className="flex-1 pb-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">
                    {user.name}
                  </h2>
                  <p className="text-gray-500 capitalize">
                    {user.role} Account
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium w-fit">
                  <CheckCircle className="w-4 h-4" />
                  Active
                </span>
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-6 border-t border-gray-100">
            <div className="flex items-center gap-3 text-gray-600">
              <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                <Mail className="w-5 h-5 text-gray-400" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Email Address</p>
                <p className="font-medium truncate">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-gray-600">
              <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                <Calendar className="w-5 h-5 text-gray-400" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Member Since</p>
                <p className="font-medium">{formatDate(user.createdAt)}</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={BookOpen}
          label="Exams Taken"
          value={profileStats.examsTaken}
          subtext={`${profileStats.examsCompleted} completed`}
          color="text-blue-600"
        />
        <StatCard
          icon={TrendingUp}
          label="Average Score"
          value={`${profileStats.averageScore}%`}
          subtext={
            profileStats.averageScore >= 75
              ? "Great progress!"
              : "Keep practicing"
          }
          color="text-indigo-600"
        />
        <StatCard
          icon={Trophy}
          label="Highest Score"
          value={`${profileStats.highestScore}%`}
          subtext="Personal best"
          color="text-amber-600"
        />
        <StatCard
          icon={Target}
          label="Pass Rate"
          value={`${profileStats.passRate}%`}
          subtext="Score ≥ 50%"
          color="text-green-600"
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { key: "overview", label: "Overview", icon: BarChart3 },
          { key: "activity", label: "Activity", icon: Clock },
          { key: "achievements", label: "Achievements", icon: Award },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === tab.key
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === "overview" && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {/* Recent Activity */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">
                  Recent Activity
                </h3>
                <button
                  onClick={() => router.push("/results")}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                >
                  View all <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {results.slice(0, 5).length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No activity yet</p>
                  <button
                    onClick={() => router.push("/student/exams")}
                    className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                  >
                    Take an Exam
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {results.slice(0, 5).map((activity, index) => (
                    <ActivityItem
                      key={activity.id}
                      activity={activity}
                      index={index}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Learning Progress */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Learning Progress
              </h3>

              <div className="space-y-4">
                {/* Progress Bars */}
                {[
                  {
                    label: "Course Completion",
                    value: profileStats.examsCompleted * 10,
                    color: "bg-indigo-500",
                  },
                  {
                    label: "Quiz Accuracy",
                    value: profileStats.averageScore,
                    color: "bg-green-500",
                  },
                  {
                    label: "Consistency",
                    value: profileStats.streak * 14,
                    color: "bg-amber-500",
                  },
                ].map((item, index) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{item.label}</span>
                      <span className="font-medium text-gray-800">
                        {Math.min(item.value, 100)}%
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(item.value, 100)}%` }}
                        transition={{ duration: 0.8, delay: index * 0.1 }}
                        className={`h-full ${item.color} rounded-full`}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Streak Badge */}
              <div className="mt-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                    <Zap className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">
                      {profileStats.streak} Day Streak 🔥
                    </p>
                    <p className="text-sm text-gray-500">
                      Keep learning daily to maintain your streak!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "activity" && (
          <motion.div
            key="activity"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-2xl border border-gray-200 p-6"
          >
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Full Activity History
            </h3>

            {results.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No exam activity yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {results.map((activity, index) => (
                  <ActivityItem
                    key={activity.id}
                    activity={activity}
                    index={index}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === "achievements" && (
          <motion.div
            key="achievements"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-2xl border border-gray-200 p-6"
          >
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Your Achievements
            </h3>

            {achievements.length === 0 ? (
              <div className="text-center py-12">
                <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-2">No achievements yet</p>
                <p className="text-sm text-gray-400">
                  Complete exams and score high to unlock badges!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {achievements.map((badge, index) => (
                  <motion.div
                    key={badge.label}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ y: -4 }}
                    className={`${badge.color} bg-opacity-20 rounded-xl p-4 border border-opacity-30`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl ${badge.color} bg-opacity-30 flex items-center justify-center`}
                      >
                        <badge.icon
                          className={`w-5 h-5 ${badge.color.replace(
                            "bg-",
                            "text-"
                          )}`}
                        />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">
                          {badge.label}
                        </p>
                        <p className="text-sm text-gray-500">{badge.desc}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Locked Achievements Preview */}
            <div className="mt-8 pt-6 border-t border-gray-100">
              <p className="text-sm text-gray-500 mb-4">Locked Achievements</p>
              <div className="flex flex-wrap gap-3">
                {[
                  {
                    label: "Perfect Score",
                    desc: "Score 100% on an exam",
                    locked: true,
                  },
                  {
                    label: "Speed Learner",
                    desc: "Complete 3 exams in one day",
                    locked: true,
                  },
                  {
                    label: "Week Warrior",
                    desc: "7-day learning streak",
                    locked: true,
                  },
                ].map((badge) => (
                  <div
                    key={badge.label}
                    className="px-4 py-2 bg-gray-100 rounded-xl text-gray-400 text-sm flex items-center gap-2 opacity-60"
                  >
                    <Award className="w-4 h-4" />
                    {badge.label}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Toast */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-4 right-4 max-w-sm z-50"
          >
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 shadow-lg">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <span className="text-red-700 text-sm flex-1">{error}</span>
              <button
                onClick={() => setError("")}
                className="p-1 hover:bg-red-100 rounded"
              >
                <X className="w-4 h-4 text-red-600" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Helper for cookies
const Cookies = {
  get: (name) => {
    if (typeof document === "undefined") return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(";").shift();
    return null;
  },
  remove: (name) => {
    if (typeof document !== "undefined") {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    }
  },
};
