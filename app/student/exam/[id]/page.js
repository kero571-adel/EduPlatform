// /app/student/exam/[id]/page.js
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  Timer,
  Maximize,
  ShieldAlert,
} from "lucide-react";

// ════════════════════════════════════════════
//  مكوّن الحماية الكاملة من الغش
// ════════════════════════════════════════════
function AntiCheatWrapper({ children, onAutoSubmit, submitted }) {
  const warningCount = useRef(0);
  const [warning, setWarning] = useState("");

  const showWarning = useCallback(
    (msg) => {
      setWarning(msg);
      warningCount.current += 1;
      // بعد 3 تحذيرات → تسليم تلقائي
      if (warningCount.current >= 3 && !submitted) {
        onAutoSubmit();
      }
      setTimeout(() => setWarning(""), 4000);
    },
    [submitted, onAutoSubmit]
  );

  useEffect(() => {
    if (submitted) return;

    // ── 1. Tab switch / window blur ──
    const onVisibility = () => {
      if (document.hidden) showWarning("⚠️ تحذير: لا تغادر نافذة الامتحان!");
    };
    const onBlur = () => showWarning("⚠️ تحذير: نافذة الامتحان لم تعد نشطة!");
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);

    // ── 2. Right-click ──
    const onContextMenu = (e) => {
      e.preventDefault();
      showWarning("⚠️ لا يسمح بالنقر بزر الفأرة الأيمن!");
    };
    document.addEventListener("contextmenu", onContextMenu);

    // ── 3. Keyboard shortcuts ──
    const onKeyDown = (e) => {
      const blocked = [
        e.ctrlKey &&
          ["c", "v", "u", "p", "a", "s", "f"].includes(e.key.toLowerCase()),
        e.key === "F12",
        e.key === "PrintScreen",
        e.altKey && e.key === "Tab",
        e.metaKey,
      ];
      if (blocked.some(Boolean)) {
        e.preventDefault();
        showWarning("⚠️ هذا الاختصار محظور أثناء الامتحان!");
      }
    };
    document.addEventListener("keydown", onKeyDown);

    // ── 4. Text selection / drag ──
    const onSelectStart = (e) => e.preventDefault();
    const onDragStart = (e) => e.preventDefault();
    document.addEventListener("selectstart", onSelectStart);
    document.addEventListener("dragstart", onDragStart);

    // ── 5. منع dev tools (تغيير حجم النافذة المفاجئ) ──
    const onResize = () => {
      const threshold = 160;
      if (
        window.outerWidth - window.innerWidth > threshold ||
        window.outerHeight - window.innerHeight > threshold
      ) {
        showWarning("⚠️ تحذير: لا تفتح أدوات المطور!");
      }
    };
    window.addEventListener("resize", onResize);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("selectstart", onSelectStart);
      document.removeEventListener("dragstart", onDragStart);
      window.removeEventListener("resize", onResize);
    };
  }, [submitted, showWarning]);

  return (
    <div
      className="select-none"
      style={{ userSelect: "none", WebkitUserSelect: "none" }}
    >
      {/* شريط التحذير */}
      <AnimatePresence>
        {warning && (
          <motion.div
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-[999] bg-red-600 text-white text-center py-3 px-4 font-bold text-sm shadow-lg"
          >
            <ShieldAlert className="inline w-4 h-4 ml-2" />
            {warning}
            {warningCount.current > 1 && (
              <span className="mr-3 text-red-200">
                ({warningCount.current}/3 تحذيرات — سيتم التسليم تلقائياً)
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      {children}
    </div>
  );
}

// ════════════════════════════════════════════
//  مكوّن شاشة دخول الامتحان (قبل البدء)
// ════════════════════════════════════════════
function ExamLandingScreen({ exam, onStart }) {
  const requestFullscreen = async () => {
    try {
      await document.documentElement.requestFullscreen();
    } catch (_) {}
    onStart();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-xl p-6 md:p-10 max-w-lg w-full text-center space-y-6"
        dir="rtl"
      >
        <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto">
          <Timer className="w-8 h-8 text-indigo-600" />
        </div>

        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">
            {exam.title}
          </h1>
          {exam.description && (
            <p className="text-gray-500 mt-2 text-sm leading-relaxed">
              {exam.description}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-gray-400 text-xs mb-1">عدد الأسئلة</p>
            <p className="font-bold text-gray-800 text-lg">
              {exam.questions?.length}
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-gray-400 text-xs mb-1">المدة</p>
            <p className="font-bold text-gray-800 text-lg">
              {exam.durationMinutes} دقيقة
            </p>
          </div>
        </div>

        {/* تعليمات */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-right space-y-2">
          <p className="font-bold text-amber-800 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> تعليمات مهمة
          </p>
          <ul className="text-amber-700 text-xs space-y-1 list-disc list-inside">
            <li>لا يمكنك مغادرة الامتحان بعد البدء إلا بالتسليم</li>
            <li>مغادرة النافذة 3 مرات = تسليم تلقائي</li>
            <li>النسخ واللصق والنقر الأيمن محظورة</li>
            <li>سيعمل الامتحان بوضع الشاشة الكاملة</li>
          </ul>
        </div>

        <button
          onClick={requestFullscreen}
          className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-base hover:bg-indigo-700 active:scale-95 transition flex items-center justify-center gap-2"
        >
          <Maximize className="w-5 h-5" />
          ابدأ الامتحان الآن
        </button>
      </motion.div>
    </div>
  );
}

// ════════════════════════════════════════════
//  الصفحة الرئيسية
// ════════════════════════════════════════════
export default function TakeExam() {
  const router = useRouter();
  const { id } = useParams();
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [status, setStatus] = useState("checking");
  const [submitted, setSubmitted] = useState(false);

  const timerRef = useRef(null);

  // ✅ الإضافة الأولى: ref فوري لمنع التسليم المزدوج (يحل مشكلة Race Condition)
  const submittedRef = useRef(false);

  // ✅ الإضافة الثانية: ref يحمل دائمًا آخر نسخة من handleSubmit (يحل مشكلة Stale Closure)
  const handleSubmitRef = useRef(null);

  // منع الـ back button
  useEffect(() => {
    if (status === "started") {
      history.pushState(null, "", window.location.href);
      const onPop = () => {
        history.pushState(null, "", window.location.href);
      };
      window.addEventListener("popstate", onPop);
      return () => window.removeEventListener("popstate", onPop);
    }
  }, [status]);

  // جلب بيانات الامتحان
  useEffect(() => {
    if (!id) return;
    const fetchExam = async () => {
      try {
        const snap = await getDoc(doc(db, "exams", id));
        if (!snap.exists()) {
          setStatus("not-found");
          setLoading(false);
          return;
        }

        const data = { id: snap.id, ...snap.data() };
        setExam(data);

        const now = new Date();
        const start = data.startTime?.toDate
          ? data.startTime.toDate()
          : new Date(data.startTime);
        const end = data.endTime?.toDate
          ? data.endTime.toDate()
          : new Date(data.endTime);

        if (now < start) setStatus("not-started");
        else if (now > end) setStatus("ended");
        else {
          setStatus("ready");
          setTimeLeft(Math.floor((end - now) / 1000));
        }
      } catch (err) {
        console.error(err);
        setStatus("error");
      } finally {
        setLoading(false);
      }
    };
    fetchExam();
  }, [id]);

  const handleStart = () => setStatus("started");

  const handleSelect = (qIdx, optIdx) =>
    setAnswers((prev) => ({ ...prev, [qIdx]: optIdx }));

  const handleSubmit = useCallback(
    async (auto = false) => {
      if (submittedRef.current || !exam) return;

      if (
        !auto &&
        !confirm("هل أنت متأكد من تسليم الامتحان؟ لا يمكن التعديل بعد التسليم.")
      )
        return;

      submittedRef.current = true;

      setSubmitted(true);
      setStatus("finished");

      clearInterval(timerRef.current);

      try {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        }
      } catch (_) {}

      let score = 0;
      let maxScore = 0;

      exam.questions.forEach((q, idx) => {
        maxScore += q.points;

        if (answers[idx] === q.correctIndex) {
          score += q.points;
        }
      });

      try {
        // ✅ جلب بيانات الطالب من users collection
        const userSnap = await getDoc(doc(db, "users", auth.currentUser.uid));

        const userData = userSnap.data();
        console.log("USER DATA:", userData);
        console.log("STUDENT NAME:", userData.name);
        await addDoc(collection(db, "results"), {
          examId: exam.id,

          studentId: auth.currentUser?.uid,

          // ✅ الاسم الحقيقي بدل الإيميل
          studentName:
            userData?.name ||
            userData?.fullName ||
            auth.currentUser?.displayName ||
            "طالب",

          studentEmail: auth.currentUser?.email || "",

          teacherId: exam.teacherId,

          answers,

          score,

          maxScore,

          submittedAt: serverTimestamp(),

          timeSpent: Math.floor(exam.durationMinutes * 60 - timeLeft),

          isAutoSubmitted: auto,

          graded: true,

          status: "submitted",

          examTitle: exam.title,

          totalQuestions: exam.questions?.length || 0,
        });
      } catch (err) {
        console.error("Save failed:", err);
      }
    },
    [exam, answers, timeLeft]
  );
  useEffect(() => {
    handleSubmitRef.current = handleSubmit;
  }, [handleSubmit]);

  useEffect(() => {
    if (status === "started" && timeLeft > 0 && !submitted) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleSubmitRef.current(true); // ← آخر نسخة دايمًا ✅
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [status, submitted]); // ← dependency array نظيف ومش محتاج handleSubmit

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // ── Screens ──
  if (loading)
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  if (status === "not-found") return <NotFoundScreen />;
  if (status === "not-started") return <NotStartedScreen exam={exam} />;
  if (status === "ended" && !submitted) return <EndedScreen />;
  if (status === "ready" && exam)
    return <ExamLandingScreen exam={exam} onStart={handleStart} />;
  if (!exam) return null;

  return (
    <AntiCheatWrapper
      onAutoSubmit={() => handleSubmitRef.current(true)}
      submitted={submitted}
    >
      <div className="min-h-screen bg-gray-50" dir="rtl">
        {/* ── Sticky header ── */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 shadow-sm px-4 py-3 flex items-center justify-between gap-4">
          <h1 className="text-base md:text-lg font-bold text-gray-800 truncate flex-1">
            {exam.title}
          </h1>
          {status !== "finished" && (
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono font-bold text-sm shrink-0 ${
                timeLeft < 60
                  ? "bg-red-100 text-red-600 animate-pulse"
                  : "bg-indigo-50 text-indigo-600"
              }`}
            >
              <Timer className="w-4 h-4" /> {formatTime(timeLeft)}
            </div>
          )}
        </div>

        {/* ── Progress bar ── */}
        <div className="w-full bg-gray-200 h-1.5">
          <div
            className="bg-indigo-600 h-1.5 transition-all duration-300"
            style={{
              width: `${((currentQ + 1) / exam.questions.length) * 100}%`,
            }}
          />
        </div>

        <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-4">
          {/* ── Question card ── */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQ}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6"
            >
              <div className="flex justify-between items-center mb-3">
                <p className="font-semibold text-gray-700 text-sm">
                  سؤال {currentQ + 1} / {exam.questions.length}
                </p>
                <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full font-medium">
                  {exam.questions[currentQ].points} نقطة
                </span>
              </div>

              {exam.questions[currentQ].imageUrl && (
                <img
                  src={exam.questions[currentQ].imageUrl}
                  alt="سؤال"
                  className="max-h-48 w-full object-contain rounded-lg mb-4 border bg-gray-50"
                  draggable={false}
                />
              )}

              <p className="text-gray-800 mb-5 text-base md:text-lg leading-relaxed font-medium">
                {exam.questions[currentQ].text}
              </p>

              <div className="space-y-2.5">
                {exam.questions[currentQ].options.map((opt, i) => (
                  <label
                    key={i}
                    className={`flex items-center gap-3 p-3.5 border-2 rounded-xl cursor-pointer transition-all ${
                      answers[currentQ] === i
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-gray-100 hover:border-indigo-200 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`q${currentQ}`}
                      checked={answers[currentQ] === i}
                      onChange={() => handleSelect(currentQ, i)}
                      className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 shrink-0"
                    />
                    <span className="text-gray-700 text-sm md:text-base">
                      {opt}
                    </span>
                  </label>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* ── Answer progress dots (mobile-friendly) ── */}
          <div className="flex gap-1.5 flex-wrap justify-center">
            {exam.questions.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentQ(i)}
                className={`w-7 h-7 rounded-full text-xs font-bold transition-all ${
                  i === currentQ
                    ? "bg-indigo-600 text-white scale-110"
                    : answers[i] !== undefined
                    ? "bg-green-400 text-white"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          {/* ── Navigation ── */}
          <div className="flex justify-between pt-1">
            <button
              onClick={() => setCurrentQ(Math.max(0, currentQ - 1))}
              disabled={currentQ === 0 || submitted}
              className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl disabled:opacity-40 flex items-center gap-2 text-sm hover:bg-gray-50 font-medium"
            >
              <ArrowLeft className="w-4 h-4" /> السابق
            </button>

            {currentQ < exam.questions.length - 1 ? (
              <button
                onClick={() => setCurrentQ(currentQ + 1)}
                disabled={submitted}
                className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl flex items-center gap-2 text-sm hover:bg-indigo-700 disabled:opacity-40 font-medium"
              >
                التالي <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              !submitted && (
                <button
                  onClick={() => handleSubmit(false)}
                  className="px-5 py-2.5 bg-green-600 text-white rounded-xl font-bold flex items-center gap-2 text-sm hover:bg-green-700 shadow-lg shadow-green-500/20"
                >
                  <CheckCircle className="w-5 h-5" /> تسليم الامتحان
                </button>
              )
            )}
          </div>

          {/* ── Finished card ── */}
          {status === "finished" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-green-50 border border-green-200 rounded-xl p-6 text-center space-y-3"
            >
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto" />
              <h2 className="text-xl font-bold text-green-800">
                تم التسليم بنجاح!
              </h2>
              <p className="text-green-700 text-sm">
                يمكنك متابعة نتائجك من صفحة التقارير
              </p>
              <button
                onClick={() => router.push("/student")}
                className="mt-2 px-6 py-2.5 bg-white border border-green-300 rounded-xl text-green-700 hover:bg-green-100 font-medium text-sm"
              >
                العودة للرئيسية
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </AntiCheatWrapper>
  );
}

// ── Static screens ──
const NotFoundScreen = () => (
  <div
    className="flex flex-col items-center justify-center h-screen text-center p-4"
    dir="rtl"
  >
    <h1 className="text-2xl font-bold text-red-600">الامتحان غير موجود</h1>
    <button
      onClick={() => window.history.back()}
      className="mt-4 px-4 py-2 bg-gray-200 rounded-lg"
    >
      رجوع
    </button>
  </div>
);

const NotStartedScreen = ({ exam }) => (
  <div
    className="flex flex-col items-center justify-center h-screen text-center p-4 bg-gray-50"
    dir="rtl"
  >
    <Clock className="w-16 h-16 text-indigo-500 mb-4" />
    <h1 className="text-2xl font-bold text-gray-800">
      ⏳ الامتحان لم يبدأ بعد
    </h1>
    <p className="text-gray-600 mt-2 text-lg">
      سيبدأ في:{" "}
      <span className="font-mono font-bold text-indigo-600">
        {exam?.startTime?.toDate
          ? exam.startTime.toDate().toLocaleString("ar-EG")
          : new Date(exam?.startTime).toLocaleString("ar-EG")}
      </span>
    </p>
    <p className="text-gray-500 mt-4 text-sm">يرجى العودة في الموعد المحدد</p>
  </div>
);

const EndedScreen = () => (
  <div
    className="flex flex-col items-center justify-center h-screen text-center p-4 bg-gray-50"
    dir="rtl"
  >
    <AlertTriangle className="w-16 h-16 text-orange-500 mb-4" />
    <h1 className="text-2xl font-bold text-gray-800">🔒 انتهى وقت الامتحان</h1>
    <p className="text-gray-600 mt-2">
      لم يعد بإمكانك الدخول أو تسليم الإجابات
    </p>
    <button
      onClick={() => window.history.back()}
      className="mt-6 px-4 py-2 bg-white border rounded-lg"
    >
      رجوع
    </button>
  </div>
);
