// /app/teacher/createExams/page.js
"use client";
import { useRouter } from "next/navigation";
import { auth, db, storage } from "@/lib/firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  getDoc, // ✅ تغيير: جلب من users collection
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import {
  Plus, Trash2, Eye, Save, UploadCloud, Clock, BookOpen,
  Loader2, CheckCircle, AlertCircle, X, Copy, Users,
} from "lucide-react";

// مكون منع النسخ
const AntiCopyWrapper = ({ children }) => (
  <div
    onCopy={(e) => e.preventDefault()}
    onCut={(e) => e.preventDefault()}
    onPaste={(e) => e.preventDefault()}
    onContextMenu={(e) => e.preventDefault()}
    className="select-none"
    dir="rtl"
  >
    {children}
  </div>
);

export default function CreateExam() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [examTitle, setExamTitle] = useState("");
  const [description, setDescription] = useState("");
  const [groupName, setGroupName] = useState("");
  const [startTime, setStartTime] = useState("");
  const [duration, setDuration] = useState(30);
  const [groups, setGroups] = useState([]); // ✅ الآن مصفوفة أسماء
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [questions, setQuestions] = useState([
    {
      text: "", imageUrl: "", options: ["", "", "", ""],
      correctIndex: 0, points: 1, explanation: "",
    },
  ]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [error, setError] = useState("");
  const [uploadingIndex, setUploadingIndex] = useState(null);

  // ✅ تحديث: جلب المجموعات من وثيقة المستخدم
  useEffect(() => {
    const fetchGroups = async () => {
      if (!auth.currentUser) return;
      try {
        const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          // ✅ المجموعات مخزنة كمصفوفة أسماء
          setGroups(userData.groups || []);
        }
      } catch (err) {
        console.error("فشل جلب المجموعات:", err);
        setError("فشل تحميل المجموعات. يرجى إعادة المحاولة.");
      } finally {
        setGroupsLoading(false);
      }
    };
    fetchGroups();
  }, []);

  // إدارة الأسئلة
  const updateQuestion = (index, field, value) => {
    const updated = [...questions];
    updated[index][field] = value;
    setQuestions(updated);
  };

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        text: "", imageUrl: "", options: ["", "", "", ""],
        correctIndex: 0, points: 1, explanation: "",
      },
    ]);
  };

  const removeQuestion = (index) => {
    if (questions.length <= 1) return;
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const duplicateQuestion = (index) => {
    setQuestions([...questions, { ...questions[index] }]);
  };

  const updateOption = (qIndex, optIndex, value) => {
    const updated = [...questions];
    updated[qIndex].options[optIndex] = value;
    setQuestions(updated);
  };

  // رفع صورة
  const handleImageUpload = async (index, file) => {
    if (!file) return;
    setUploadingIndex(index);
    const storageRef = ref(storage, `exam-images/${Date.now()}-${file.name}`);
    try {
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      updateQuestion(index, "imageUrl", url);
    } catch (err) {
      console.error("Image upload failed:", err);
      setError("فشل رفع الصورة. يرجى المحاولة مرة أخرى.");
    } finally {
      setUploadingIndex(null);
    }
  };

  // التحقق والحفظ
  const handleSubmit = async (status) => {
    setError("");
    if (!examTitle.trim() || !startTime || !groupName.trim()) {
      setError("يرجى ملء عنوان الامتحان، اسم المجموعة، ووقت البدء.");
      return;
    }
    if (questions.some((q) => !q.text.trim())) {
      setError("يجب أن تحتوي جميع الأسئلة على نص.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (!(new Date(startTime) > new Date())) {
      setError("يجب أن يكون وقت البدء في المستقبل.");
      return;
    }

    setLoading(true);
    try {
      const startTimeDate = new Date(startTime);
      const endTimeDate = new Date(startTimeDate.getTime() + duration * 60000);

      const examData = {
        teacherId: auth.currentUser?.uid,
        title: examTitle,
        description,
        groupName: groupName, // ✅ نستخدم الاسم مباشرة
        startTime: startTimeDate.toISOString(),
        endTime: endTimeDate.toISOString(),
        durationMinutes: Number(duration),
        status,
        questions,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, "exams"), examData);
      alert(`تم ${status === "published" ? "نشر" : "حفظ كمسودة"} الامتحان بنجاح!`);
      router.push("/teacher/exams");
    } catch (err) {
      setError(err.message || "فشل حفظ الامتحان.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4 md:p-8" dir="rtl" lang="ar">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        
        {/* Header - Responsive */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4"
        >
          <div className="text-right">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
              <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" /> 
              إنشاء امتحان جديد
            </h1>
            <p className="text-gray-500 mt-1 text-sm sm:text-base">
              أضف الأسئلة، حدد التوقيت، وعيّن الامتحان لمجموعتك
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setPreviewOpen(true)}
              className="px-3 sm:px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-2 text-sm sm:text-base w-full sm:w-auto justify-center"
            >
              <Eye className="w-4 h-4" /> معاينة
            </button>
          </div>
        </motion.div>

        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 flex items-center gap-2 text-sm"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0" /> 
            <span>{error}</span>
            <button onClick={() => setError("")} className="mr-auto p-1 hover:bg-red-100 rounded">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* Exam Details - Responsive Grid */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100 space-y-4"
        >
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <BookOpen className="w-5 h-5" /> تفاصيل الامتحان
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <input
              type="text"
              placeholder="عنوان الامتحان"
              value={examTitle}
              onChange={(e) => setExamTitle(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-right text-sm sm:text-base"
            />
            
            <select
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              disabled={groupsLoading}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white disabled:opacity-50 cursor-pointer text-sm sm:text-base"
            >
              <option value="">
                {groupsLoading ? "جاري التحميل..." : "اختر المجموعة"}
              </option>
              {groups.map((g, idx) => (
                <option key={idx} value={g}>{g}</option>
              ))}
            </select>
            
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm sm:text-base"
            />
            
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="5"
                max="180"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-right text-sm sm:text-base"
                placeholder="الدقائق"
              />
              <Clock className="w-5 h-5 text-gray-400 flex-shrink-0" />
            </div>
          </div>
          
          <textarea
            placeholder="وصف الامتحان (اختياري)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows="2"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-right text-sm sm:text-base"
          />
        </motion.div>

        {/* Questions Manager - Responsive */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          {questions.map((q, idx) => (
            <AntiCopyWrapper key={idx}>
              <div className="bg-white p-4 sm:p-5 rounded-xl shadow-sm border border-gray-100 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-500" /> 
                    السؤال {idx + 1}
                  </h3>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => duplicateQuestion(idx)}
                      className="flex-1 sm:flex-none p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition flex items-center justify-center gap-1 text-sm"
                      title="نسخ"
                    >
                      <Copy className="w-4 h-4" /> نسخ
                    </button>
                    <button
                      onClick={() => removeQuestion(idx)}
                      className="flex-1 sm:flex-none p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition flex items-center justify-center gap-1 text-sm"
                      title="حذف"
                    >
                      <Trash2 className="w-4 h-4" /> حذف
                    </button>
                  </div>
                </div>

                <input
                  type="text"
                  placeholder="نص السؤال"
                  value={q.text}
                  onChange={(e) => updateQuestion(idx, "text", e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-right text-sm sm:text-base"
                />

                {/* Image Upload - Responsive */}
                <div className="flex flex-wrap items-center gap-3">
                  {q.imageUrl && (
                    <img
                      src={q.imageUrl}
                      alt="السؤال"
                      className="h-16 w-16 object-cover rounded-lg border flex-shrink-0"
                    />
                  )}
                  {uploadingIndex === idx && (
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                  )}
                  <label className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-100 transition text-sm">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        e.target.files?.[0] &&
                        handleImageUpload(idx, e.target.files[0])
                      }
                    />
                    <UploadCloud className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-600">
                      {q.imageUrl ? "تغيير الصورة" : "رفع صورة"}
                    </span>
                  </label>
                </div>

                {/* Options - Better Mobile Layout */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                  {q.options.map((opt, oIdx) => (
                    <label
                      key={oIdx}
                      className={`flex items-center gap-2 p-2 sm:p-3 rounded-lg border cursor-pointer transition ${
                        q.correctIndex === oIdx 
                          ? "border-indigo-500 bg-indigo-50" 
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`correct-${idx}`}
                        checked={q.correctIndex === oIdx}
                        onChange={() => updateQuestion(idx, "correctIndex", oIdx)}
                        className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 flex-shrink-0"
                      />
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => updateOption(idx, oIdx, e.target.value)}
                        placeholder={`الخيار ${String.fromCharCode(65 + oIdx)}`}
                        className="flex-1 bg-transparent outline-none text-sm sm:text-base"
                      />
                    </label>
                  ))}
                </div>

                {/* Explanation & Points - Stacked on Mobile */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <input
                    type="text"
                    placeholder="الشرح (يظهر بعد الإرسال)"
                    value={q.explanation}
                    onChange={(e) => updateQuestion(idx, "explanation", e.target.value)}
                    className="flex-1 px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 whitespace-nowrap">النقاط:</span>
                    <input
                      type="number"
                      min="1"
                      value={q.points}
                      onChange={(e) => updateQuestion(idx, "points", Number(e.target.value))}
                      className="w-20 px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-center"
                    />
                  </div>
                </div>
              </div>
            </AntiCopyWrapper>
          ))}

          <button
            onClick={addQuestion}
            className="w-full py-3 sm:py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/50 flex items-center justify-center gap-2 transition text-sm sm:text-base"
          >
            <Plus className="w-5 h-5" /> إضافة سؤال جديد
          </button>
        </motion.div>

        {/* Actions - Full width buttons on mobile */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => handleSubmit("draft")}
            disabled={loading}
            className="w-full sm:flex-1 py-3 bg-white border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 flex items-center justify-center gap-2 transition"
          >
            <Save className="w-5 h-5" /> حفظ كمسودة
          </button>
          <button
            onClick={() => handleSubmit("published")}
            disabled={loading}
            className="w-full sm:flex-1 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 transition"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <CheckCircle className="w-5 h-5" />
            )}{" "}
            نشر الامتحان
          </button>
        </div>
      </div>

      {/* Preview Modal - Responsive */}
      <AnimatePresence>
        {previewOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-3 sm:p-4 z-50"
            onClick={() => setPreviewOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-4 sm:p-6"
              onClick={(e) => e.stopPropagation()}
              dir="rtl"
              lang="ar"
            >
              <div className="flex justify-between items-center mb-4 sticky top-0 bg-white py-2">
                <button
                  onClick={() => setPreviewOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition"
                >
                  <X className="w-5 h-5" />
                </button>
                <h2 className="text-lg sm:text-xl font-bold text-gray-800 text-center flex-1">
                  {examTitle || "امتحان بدون عنوان"}
                </h2>
                <div className="w-9" /> {/* Spacer for centering */}
              </div>
              
              <p className="text-gray-500 text-sm mb-4 sm:mb-6">
                {description}
              </p>
              
              <div className="space-y-4">
                {questions.map((q, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <p className="font-medium mb-2 text-sm sm:text-base">
                      {idx + 1}. {q.text || "نص السؤال..."}
                    </p>
                    {q.imageUrl && (
                      <img
                        src={q.imageUrl}
                        alt="س"
                        className="max-h-32 w-full object-contain rounded mb-3"
                      />
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {q.options.map((opt, oIdx) => (
                        <div
                          key={oIdx}
                          className={`px-3 py-2 rounded text-sm text-right ${
                            q.correctIndex === oIdx
                              ? "bg-green-100 text-green-800 font-medium border border-green-200"
                              : "bg-white border border-gray-200"
                          }`}
                        >
                          {String.fromCharCode(65 + oIdx)}. {opt || "خيار..."}
                        </div>
                      ))}
                    </div>
                    {q.explanation && (
                      <p className="mt-3 text-sm text-gray-500 border-t pt-2">
                        <strong>الشرح:</strong> {q.explanation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}