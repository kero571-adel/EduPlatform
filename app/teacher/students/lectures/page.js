// /app/student/lectures/page.js
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, query, orderBy, where } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Search,
  Grid,
  List,
  Clock,
  User,
  BookOpen,
  Filter,
  ChevronDown,
  Loader2,
  AlertCircle,
  X,
  Maximize2,
  Volume2,
  VolumeX,
} from "lucide-react";

export default function StudentLectures() {
  const router = useRouter();
  const [lectures, setLectures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // grid or list
  const [filterTeacher, setFilterTeacher] = useState("all");
  const [playingVideo, setPlayingVideo] = useState(null);
  const [muted, setMuted] = useState(false);
  const videoRefs = useRef({});

  // Auth & Fetch
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) return router.replace("/login");
      fetchLectures();
    });
    return () => unsub();
  }, [router]);

  const fetchLectures = async () => {
    try {
      setLoading(true);
      setError("");

      const userSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
      const teacherId = userSnap.data().teacherId;
      const q = query(
        collection(db, "lectures"),
        where("teacherId", "==", teacherId),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);

      // Fetch teacher names for each lecture
      const lecturesData = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const data = doc.data();
          let teacherName = "Unknown";
          if (data.teacherId) {
            try {
              const teacherDoc = await getDocs(
                query(
                  collection(db, "users"),
                  where("uid", "==", data.teacherId)
                )
              );
              if (!teacherDoc.empty) {
                teacherName = teacherDoc.docs[0].data().name;
              }
            } catch (e) {
              console.warn("Could not fetch teacher name");
            }
          }
          return { id: doc.id, ...data, teacherName };
        })
      );

      setLectures(lecturesData);
    } catch (err) {
      console.error("Error fetching lectures:", err);
      setError("Failed to load lectures. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Filter & Search Logic
  const filteredLectures = useMemo(() => {
    return lectures.filter((lecture) => {
      // Search filter
      if (searchQuery) {
        const queryLower = searchQuery.toLowerCase();
        const matchesTitle = lecture.title?.toLowerCase().includes(queryLower);
        const matchesDesc = lecture.description
          ?.toLowerCase()
          .includes(queryLower);
        const matchesTeacher = lecture.teacherName
          ?.toLowerCase()
          .includes(queryLower);
        if (!matchesTitle && !matchesDesc && !matchesTeacher) return false;
      }

      // Teacher filter
      if (filterTeacher !== "all" && lecture.teacherId !== filterTeacher) {
        return false;
      }

      return true;
    });
  }, [lectures, searchQuery, filterTeacher]);

  // Get unique teachers for filter
  const uniqueTeachers = useMemo(() => {
    const teachers = {};
    lectures.forEach((l) => {
      if (l.teacherId && l.teacherName) {
        teachers[l.teacherId] = l.teacherName;
      }
    });
    return Object.entries(teachers);
  }, [lectures]);

  // Video Handlers
  const handlePlay = (lectureId) => {
    // Pause other videos
    Object.values(videoRefs.current).forEach((video) => {
      if (video && video !== videoRefs.current[lectureId]) {
        video.pause();
      }
    });
    setPlayingVideo(lectureId);
  };

  const handlePause = (lectureId) => {
    if (playingVideo === lectureId) {
      setPlayingVideo(null);
    }
  };

  const toggleMute = (e, lectureId) => {
    e.stopPropagation();
    const video = videoRefs.current[lectureId];
    if (video) {
      video.muted = !video.muted;
      setMuted(!muted);
    }
  };

  const openFullscreen = (e, videoUrl) => {
    e.stopPropagation();
    window.open(videoUrl, "_blank");
  };

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return "Unknown";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Skeleton Card Component
  const SkeletonCard = () => (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden animate-pulse">
      <div className="aspect-video bg-gray-200" />
      <div className="p-5 space-y-3">
        <div className="h-5 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
        <div className="flex items-center gap-2 pt-2">
          <div className="h-4 bg-gray-200 rounded w-20" />
          <div className="h-4 bg-gray-200 rounded w-16" />
        </div>
      </div>
    </div>
  );

  // Lecture Card Component (Grid View)
  const LectureCard = ({ lecture, index }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -4 }}
      className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-xl hover:border-indigo-200 transition-all group"
    >
      {/* Video Thumbnail */}
      <div className="relative aspect-video bg-gray-900">
        <video
          ref={(el) => (videoRefs.current[lecture.id] = el)}
          src={lecture.videoUrl}
          className="w-full h-full object-cover"
          preload="metadata"
          onPlay={() => handlePlay(lecture.id)}
          onPause={() => handlePause(lecture.id)}
        />

        {/* Play Overlay */}
        <div
          className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${
            playingVideo === lecture.id
              ? "opacity-0"
              : "opacity-100 group-hover:opacity-100"
          }`}
        >
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              const video = videoRefs.current[lecture.id];
              if (video) {
                if (video.paused) video.play();
                else video.pause();
              }
            }}
            className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-lg"
          >
            {playingVideo === lecture.id ? (
              <div className="w-6 h-6 bg-gray-800 rounded-sm" />
            ) : (
              <Play className="w-7 h-7 text-gray-800 ml-1" />
            )}
          </motion.button>
        </div>

        {/* Video Controls Overlay */}
        {playingVideo === lecture.id && (
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent flex items-center justify-between">
            <button
              onClick={(e) => toggleMute(e, lecture.id)}
              className="p-2 text-white/80 hover:text-white transition-colors"
            >
              {muted ? (
                <VolumeX className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={(e) => openFullscreen(e, lecture.videoUrl)}
              className="p-2 text-white/80 hover:text-white transition-colors"
              title="Open in fullscreen"
            >
              <Maximize2 className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Duration Badge (if available) */}
        {lecture.duration && (
          <div className="absolute top-3 right-3 px-2 py-1 bg-black/60 text-white text-xs rounded-md font-medium">
            {lecture.duration}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="font-semibold text-gray-800 mb-2 line-clamp-2 group-hover:text-indigo-600 transition-colors">
          {lecture.title}
        </h3>
        <p className="text-sm text-gray-500 mb-4 line-clamp-2">
          {lecture.description}
        </p>

        {/* Meta Info */}
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5" />
              {lecture.teacherName}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {formatDate(lecture.createdAt)}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );

  // Lecture Row Component (List View)
  const LectureRow = ({ lecture, index }) => (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md hover:border-indigo-200 transition-all group"
    >
      <div className="flex flex-col sm:flex-row">
        {/* Video Thumbnail */}
        <div className="relative sm:w-48 aspect-video sm:aspect-square bg-gray-900 flex-shrink-0">
          <video
            ref={(el) => (videoRefs.current[lecture.id] = el)}
            src={lecture.videoUrl}
            className="w-full h-full object-cover"
            preload="metadata"
            onPlay={() => handlePlay(lecture.id)}
            onPause={() => handlePause(lecture.id)}
          />
          <div
            className={`absolute inset-0 bg-black/40 flex items-center justify-center ${
              playingVideo === lecture.id
                ? "opacity-0"
                : "opacity-100 group-hover:opacity-100"
            }`}
          >
            <button
              onClick={() => {
                const video = videoRefs.current[lecture.id];
                if (video) {
                  if (video.paused) video.play();
                  else video.pause();
                }
              }}
              className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center"
            >
              {playingVideo === lecture.id ? (
                <div className="w-4 h-4 bg-gray-800 rounded-sm" />
              ) : (
                <Play className="w-5 h-5 text-gray-800 ml-0.5" />
              )}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 sm:p-5">
          <h3 className="font-semibold text-gray-800 mb-1 line-clamp-1 group-hover:text-indigo-600 transition-colors">
            {lecture.title}
          </h3>
          <p className="text-sm text-gray-500 mb-3 line-clamp-2">
            {lecture.description}
          </p>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5" />
              {lecture.teacherName}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {formatDate(lecture.createdAt)}
            </span>
            {lecture.duration && (
              <span className="flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5" />
                {lecture.duration}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 p-4 sm:p-5 sm:border-l border-gray-200">
          <a
            href={lecture.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            title="Open in new tab"
          >
            <Maximize2 className="w-5 h-5" />
          </a>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Video Lectures</h1>
          <p className="text-gray-500 mt-1">
            Watch and learn from your instructors
          </p>
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
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search lectures, topics, or teachers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
          />
        </div>

        {/* Teacher Filter */}
        {uniqueTeachers.length > 0 && (
          <div className="relative">
            <select
              value={filterTeacher}
              onChange={(e) => setFilterTeacher(e.target.value)}
              className="appearance-none px-4 py-2.5 pr-10 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
            >
              <option value="all">All Teachers</option>
              {uniqueTeachers.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        )}

        {/* View Toggle */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2 rounded-md transition-colors ${
              viewMode === "grid"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
            title="Grid view"
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-2 rounded-md transition-colors ${
              viewMode === "list"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
            title="List view"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>
          {filteredLectures.length} lecture
          {filteredLectures.length !== 1 ? "s" : ""} found
          {searchQuery && ` for "${searchQuery}"`}
        </span>
        {(searchQuery || filterTeacher !== "all") && (
          <button
            onClick={() => {
              setSearchQuery("");
              setFilterTeacher("all");
            }}
            className="text-indigo-600 hover:text-indigo-700 font-medium"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Lectures Grid/List */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                : "space-y-3"
            }
          >
            {[...Array(6)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </motion.div>
        ) : filteredLectures.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center py-16 bg-white rounded-2xl border border-gray-200"
          >
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              {searchQuery || filterTeacher !== "all"
                ? "No matching lectures"
                : "No lectures available"}
            </h3>
            <p className="text-gray-500 mb-6">
              {searchQuery || filterTeacher !== "all"
                ? "Try adjusting your search or filters"
                : "Your teachers haven't uploaded any lectures yet"}
            </p>
            {(searchQuery || filterTeacher !== "all") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setFilterTeacher("all");
                }}
                className="px-4 py-2 text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Clear filters
              </button>
            )}
          </motion.div>
        ) : viewMode === "grid" ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {filteredLectures.map((lecture, index) => (
              <LectureCard key={lecture.id} lecture={lecture} index={index} />
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            {filteredLectures.map((lecture, index) => (
              <LectureRow key={lecture.id} lecture={lecture} index={index} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tips Section */}
      {!loading && filteredLectures.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-5 border border-indigo-100"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h4 className="font-medium text-gray-800 mb-1">💡 Study Tips</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Take notes while watching to improve retention</li>
                <li>• Pause and rewatch complex sections as needed</li>
                <li>• Complete related exams to test your understanding</li>
              </ul>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
