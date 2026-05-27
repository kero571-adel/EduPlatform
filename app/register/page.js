// /app/register/page.js
"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  Phone,
  GraduationCap,
  ArrowRight,
  Loader2,
  CheckCircle,
  Hash,
  Plus,
  X,
  BookOpen,
  Sparkles,
  Camera,
  Search,
  ChevronDown,
  Users,
} from "lucide-react";

/* ═══════════════════════════════════════════
   Floating-label field
   ─────────────────────────────────────────── */
function FloatField({
  label,
  type = "text",
  value,
  onChange,
  icon: Icon,
  placeholder,
  required,
  disabled,
  minLength,
  autoComplete,
  rightSlot,
}) {
  const [focused, setFocused] = useState(false);
  const filled = value?.length > 0;
  const active = focused || filled;

  return (
    <div className="relative">
      <span
        className={`absolute left-0 top-0 bottom-0 w-0.5 rounded-full transition-all duration-300 ${
          active ? "bg-indigo-500 opacity-100" : "bg-transparent opacity-0"
        }`}
      />
      <div
        className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200 ${
          active ? "text-indigo-500" : "text-gray-350"
        }`}
      >
        <Icon className="w-4 h-4" strokeWidth={1.8} />
      </div>
      <label
        className={`absolute left-10 transition-all duration-200 pointer-events-none font-medium select-none ${
          active
            ? "top-1.5 text-[10px] text-indigo-500 tracking-wide"
            : "top-1/2 -translate-y-1/2 text-sm text-gray-400"
        }`}
      >
        {label}
        {required && <span className="text-rose-400 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={active ? placeholder : ""}
        required={required}
        disabled={disabled}
        minLength={minLength}
        suppressHydrationWarning
        autoComplete={autoComplete}
        className={`w-full pl-10 pr-${
          rightSlot ? "10" : "4"
        } pt-5 pb-2 bg-gray-50/60 border rounded-2xl text-sm text-gray-800 outline-none transition-all duration-200
          ${
            active
              ? "border-indigo-400 bg-white shadow-[0_0_0_3px_rgba(99,102,241,0.10)]"
              : "border-gray-200 hover:border-gray-300"
          }
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      />
      {rightSlot && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {rightSlot}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   Avatar Upload picker
   ─────────────────────────────────────────── */
function AvatarPicker({ preview, onFile, disabled }) {
  const inputRef = useRef();

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className="relative group"
      >
        <div className="w-20 h-20 rounded-2xl overflow-hidden bg-indigo-50 border-2 border-dashed border-indigo-200 flex items-center justify-center transition-all group-hover:border-indigo-400 group-hover:bg-indigo-100">
          {preview ? (
            <img
              src={preview}
              alt="avatar"
              className="w-full h-full object-cover"
            />
          ) : (
            <User className="w-8 h-8 text-indigo-300" strokeWidth={1.5} />
          )}
        </div>
        {/* overlay */}
        <div className="absolute inset-0 rounded-2xl bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
          <Camera className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
        </div>
        {/* badge */}
        <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center shadow-md">
          <Camera className="w-3 h-3 text-white" />
        </div>
      </button>
      <p className="text-[11px] text-gray-400">صورة الملف الشخصي (اختياري)</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
        }}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════
   Teacher-ID field with group fetch
   ─────────────────────────────────────────── */
function TeacherIdField({
  teacherId,
  setTeacherId,
  selectedGroup,
  setSelectedGroup,
  disabled,
}) {
  const [fetchState, setFetchState] = useState("idle"); // idle | loading | found | not-found
  const [teacherGroups, setTeacherGroups] = useState([]);
  const [teacherName, setTeacherName] = useState("");
  const debounceRef = useRef(null);

  const lookup = useCallback(
    async (uid) => {
      if (!uid || uid.length < 10) {
        setFetchState("idle");
        setTeacherGroups([]);
        setTeacherName("");
        setSelectedGroup("");
        return;
      }
      setFetchState("loading");
      try {
        const snap = await getDoc(doc(db, "users", uid.trim()));
        if (snap.exists() && snap.data().role === "teacher") {
          const data = snap.data();
          const groups = data.groups || [];
          setTeacherGroups(groups);
          setTeacherName(data.name || "");
          setFetchState("found");
          // auto-select if only one group
          if (groups.length === 1) setSelectedGroup(groups[0]);
        } else {
          setFetchState("not-found");
          setTeacherGroups([]);
          setTeacherName("");
          setSelectedGroup("");
        }
      } catch {
        setFetchState("not-found");
      }
    },
    [setSelectedGroup]
  );

  const handleChange = (e) => {
    const val = e.target.value;
    setTeacherId(val);
    setSelectedGroup("");
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => lookup(val), 700);
  };

  return (
    <div className="space-y-2">
      {/* ID input */}
      <div className="relative">
        <input
          type="text"
          value={teacherId}
          onChange={handleChange}
          disabled={disabled}
          placeholder="الصق ID بتاع المدرس هنا *"
          className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm text-gray-800 outline-none focus:border-indigo-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(99,102,241,0.10)] transition-all placeholder-gray-400"
        />
        {/* status icon */}
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
          {fetchState === "loading" && (
            <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
          )}
          {fetchState === "found" && (
            <CheckCircle className="w-4 h-4 text-green-500" />
          )}
          {fetchState === "not-found" && teacherId.length > 5 && (
            <X className="w-4 h-4 text-rose-400" />
          )}
          {fetchState === "idle" && (
            <Search className="w-4 h-4 text-gray-300" />
          )}
        </div>
      </div>

      {/* teacher found banner */}
      <AnimatePresence>
        {fetchState === "found" && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-100 rounded-xl"
          >
            <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
            <span className="text-xs text-green-700 font-medium">
              تم العثور على المدرس: <strong>{teacherName}</strong>
            </span>
          </motion.div>
        )}
        {fetchState === "not-found" && teacherId.length > 5 && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 px-3 py-2 bg-rose-50 border border-rose-100 rounded-xl"
          >
            <X className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span className="text-xs text-rose-600">
              لم يتم العثور على مدرس بهذا الـ ID
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* groups picker */}
      <AnimatePresence>
        {fetchState === "found" && teacherGroups.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-3 space-y-2">
              <p className="text-[11px] font-bold text-indigo-500 uppercase tracking-widest flex items-center gap-1.5">
                <Users className="w-3 h-3" /> اختر المجموعة
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {teacherGroups.map((g) => (
                  <button
                    key={g}
                    type="button"
                    disabled={disabled}
                    onClick={() => setSelectedGroup(g)}
                    className={`px-3 py-2 rounded-xl text-sm font-semibold border-2 transition-all text-right ${
                      selectedGroup === g
                        ? "border-indigo-500 bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                        : "border-indigo-200 bg-white text-indigo-700 hover:border-indigo-400"
                    }`}
                  >
                    <GraduationCap
                      className="inline w-3.5 h-3.5 ml-1 opacity-70"
                      strokeWidth={2}
                    />
                    {g}
                  </button>
                ))}
              </div>
              {!selectedGroup && (
                <p className="text-[11px] text-rose-400 font-medium">
                  يجب اختيار مجموعة
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Section divider
   ─────────────────────────────────────────── */
function SectionDivider({ label }) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <div className="h-px flex-1 bg-gray-150" />
      <span className="text-[10px] font-bold text-gray-350 uppercase tracking-widest">
        {label}
      </span>
      <div className="h-px flex-1 bg-gray-150" />
    </div>
  );
}

/* ═══════════════════════════════════════════
   Main page
   ─────────────────────────────────────────── */
export default function Register() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("student");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [studentGroup, setStudentGroup] = useState("");

  // avatar
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");

  // teacher groups
  const [groups, setGroups] = useState([""]);
  const [groupInput, setGroupInput] = useState("");

  const [showPwd, setShowPwd] = useState(false);
  const [showCPwd, setShowCPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  /* ── avatar file handler ── */
  const handleAvatarFile = (file) => {
    setAvatarFile(file);
    const url = URL.createObjectURL(file);
    setAvatarPreview(url);
  };

  /* ── group helpers ── */
  const addGroup = () => {
    const t = groupInput.trim();
    if (!t) return;
    if (groups.includes(t)) {
      setError("المجموعة موجودة بالفعل");
      return;
    }
    setGroups((p) => [...p, t]);
    setGroupInput("");
    setError("");
  };
  const removeGroup = (i) => setGroups((p) => p.filter((_, x) => x !== i));
  const updateGroup = (i, v) =>
    setGroups((p) => p.map((g, x) => (x === i ? v : g)));

  /* ── submit ── */
  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (password !== confirmPassword) {
      setError("كلمتا المرور غير متطابقتين");
      setLoading(false);
      return;
    }
    if (password.length < 6) {
      setError("كلمة المرور 6 أحرف على الأقل");
      setLoading(false);
      return;
    }

    const cleanGroups = groups.map((g) => g.trim()).filter(Boolean);
    if (role === "teacher" && cleanGroups.length === 0) {
      setError("أضف مجموعة واحدة على الأقل");
      setLoading(false);
      return;
    }
    if (role === "student" && !teacherId.trim()) {
      setError("يجب إدخال ID المدرس");
      setLoading(false);
      return;
    }
    if (role === "student" && !studentGroup.trim()) {
      setError("يجب اختيار المجموعة");
      setLoading(false);
      return;
    }

    try {
      const { user } = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      // ── upload avatar if chosen ──
      let photoURL = "";
      // في register/page.js
      if (avatarFile) {
        const storage = getStorage();

        const avatarRef = storageRef(storage, `avatars/${user.uid}`);

        await uploadBytes(avatarRef, avatarFile, {
          contentType: avatarFile.type,
        });

        photoURL = await getDownloadURL(avatarRef);
      }
      const userData = {
        uid: user.uid,
        name,
        email,
        role,
        phoneNumber: phoneNumber.trim(),
        photoURL,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      };

      if (role === "student") {
        userData.teacherId = teacherId.trim();
        userData.groupName = studentGroup.trim();
      } else {
        userData.groups = cleanGroups;
        userData.teacherId = "self";
      }

      await setDoc(doc(db, "users", user.uid), userData);
      setSuccess(true);
      setTimeout(() => router.push("/login"), 2200);
    } catch (err) {
      const m = {
        "auth/email-already-in-use": "هذا الإيميل مسجّل بالفعل.",
        "auth/invalid-email": "الإيميل غير صالح.",
        "auth/weak-password": "كلمة المرور ضعيفة جداً.",
      };
      setError(m[err.code] || err.message || "فشل التسجيل، حاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  /* ── success screen ── */
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-10 text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2, stiffness: 200 }}
            className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5"
          >
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="avatar"
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <CheckCircle
                className="w-10 h-10 text-emerald-500"
                strokeWidth={1.5}
              />
            )}
          </motion.div>
          <h2 className="text-2xl font-bold text-gray-800 mb-1">
            أهلاً، {name}!
          </h2>
          <p className="text-gray-400 text-sm mb-8">
            جاري تحويلك لصفحة تسجيل الدخول…
          </p>
          <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 2.2, ease: "linear" }}
              className="bg-emerald-500 h-full rounded-full"
            />
          </div>
        </motion.div>
      </div>
    );
  }

  /* ── main form ── */
  return (
    <div className="min-h-screen bg-[#f4f6fb] flex items-center justify-center p-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          {/* ── Hero banner ── */}
          <div className="relative bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-600 px-8 pt-8 pb-14 overflow-hidden">
            <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full" />
            <div className="absolute top-10 -right-2 w-14 h-14 bg-white/5 rounded-full" />
            <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-violet-800/30 rounded-full" />
            <div className="relative flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" strokeWidth={1.8} />
              </div>
              <span className="text-white/80 font-semibold text-sm tracking-wide">
                EduPlatform
              </span>
            </div>
            <h1 className="text-center relative text-2xl font-extrabold text-white leading-tight">
              إنشاء حساب جديد
            </h1>
            <p className="text-center relative text-indigo-200 text-sm mt-1">
              انضم لآلاف الطلاب والمدرسين
            </p>
          </div>

          {/* ── Avatar — overlapping banner ── */}
          <div className="flex justify-center -mt-10 mb-2 relative z-10">
            <AvatarPicker
              preview={avatarPreview}
              onFile={handleAvatarFile}
              disabled={loading}
            />
          </div>

          {/* ── Form body ── */}
          <div className="px-6 pt-2 pb-7 space-y-4">
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-start gap-2.5 px-4 py-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-600 text-sm"
                >
                  <span className="mt-0.5 shrink-0">⚠️</span>
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleRegister} className="space-y-3">
              <FloatField
                label="الاسم الكامل"
                icon={User}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="محمد أحمد"
                required
                disabled={loading}
              />

              <FloatField
                label="البريد الإلكتروني"
                type="email"
                icon={Mail}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                required
                disabled={loading}
                autoComplete="email"
              />

              <div className="grid grid-cols-2 gap-3">
                <FloatField
                  label="كلمة المرور"
                  type={showPwd ? "text" : "password"}
                  icon={Lock}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="6 أحرف+"
                  required
                  minLength={6}
                  disabled={loading}
                  rightSlot={
                    <button
                      type="button"
                      onClick={() => setShowPwd((p) => !p)}
                      className="text-gray-400 hover:text-indigo-500 transition"
                    >
                      {showPwd ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  }
                />
                <FloatField
                  label="تأكيد"
                  type={showCPwd ? "text" : "password"}
                  icon={Lock}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="أعد الكتابة"
                  required
                  minLength={6}
                  disabled={loading}
                  rightSlot={
                    <button
                      type="button"
                      onClick={() => setShowCPwd((p) => !p)}
                      className="text-gray-400 hover:text-indigo-500 transition"
                    >
                      {showCPwd ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  }
                />
              </div>

              {/* ── Role selector ── */}
              <div className="space-y-2 pt-1">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                  أنا
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: "student", label: "طالب"},
                    { id: "teacher", label: "مدرس"},
                  ].map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setRole(id)}
                      className={`relative flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 transition-all duration-200 text-right overflow-hidden
                        ${
                          role === id
                            ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                            : "border-gray-150 bg-gray-50 text-gray-500 hover:border-gray-300"
                        }`}
                    >
                      {role === id && (
                        <motion.span
                          layoutId="roleHighlight"
                          className="absolute inset-0 bg-indigo-500/5 rounded-2xl"
                        />
                      )}
                      
                      <span className="font-semibold text-sm">{label}</span>
                      {role === id && (
                        <span className="ml-auto w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* ══════════════ STUDENT fields ══════════════ */}
              <AnimatePresence>
                {role === "student" && (
                  <motion.div
                    key="student"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3 overflow-hidden"
                  >
                    <SectionDivider label="بيانات الطالب" />

                    <FloatField
                      label="رقم الهاتف"
                      type="tel"
                      icon={Phone}
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="01xxxxxxxxx"
                      required
                      disabled={loading}
                    />

                    {/* ✅ Teacher ID with live group fetch */}
                    <TeacherIdField
                      teacherId={teacherId}
                      setTeacherId={setTeacherId}
                      selectedGroup={studentGroup}
                      setSelectedGroup={setStudentGroup}
                      disabled={loading}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ══════════════ TEACHER fields ══════════════ */}
              <AnimatePresence>
                {role === "teacher" && (
                  <motion.div
                    key="teacher"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden space-y-3"
                  >
                    <SectionDivider label="المجموعات" />
                    <div className="bg-gray-50 rounded-2xl p-4 space-y-2 border border-gray-100">
                      <AnimatePresence>
                        {groups.map((g, idx) => (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: 16 }}
                            className="flex items-center gap-2"
                          >
                            <div className="relative flex-1">
                              <GraduationCap
                                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-350"
                                strokeWidth={1.8}
                              />
                              <input
                                type="text"
                                value={g}
                                placeholder={`مجموعة ${idx + 1}`}
                                onChange={(e) =>
                                  updateGroup(idx, e.target.value)
                                }
                                disabled={loading}
                                className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-800 outline-none focus:border-indigo-400 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.10)] transition-all"
                              />
                            </div>
                            {groups.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeGroup(idx)}
                                className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-350 hover:bg-rose-50 hover:text-rose-500 transition"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      <div className="flex items-center gap-2 pt-1">
                        <div className="relative flex-1">
                          <Plus
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400"
                            strokeWidth={2}
                          />
                          <input
                            type="text"
                            value={groupInput}
                            placeholder="أضف مجموعة جديدة…"
                            onChange={(e) => setGroupInput(e.target.value)}
                            onKeyDown={(e) =>
                              e.key === "Enter" &&
                              (e.preventDefault(), addGroup())
                            }
                            disabled={loading}
                            className="w-full pl-9 pr-3 py-2.5 bg-white border border-dashed border-indigo-300 rounded-xl text-sm outline-none focus:border-indigo-400 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.10)] placeholder-indigo-300 transition-all"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={addGroup}
                          disabled={!groupInput.trim() || loading}
                          className="w-9 h-9 flex items-center justify-center rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-35 disabled:cursor-not-allowed transition flex-shrink-0"
                        >
                          <Plus className="w-4 h-4" strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>
                    {groups.filter(Boolean).length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {groups.filter(Boolean).map((g, i) => (
                          <motion.span
                            key={i}
                            initial={{ opacity: 0, scale: 0.85 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full"
                          >
                            <GraduationCap className="w-3 h-3" />
                            {g}
                          </motion.span>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Submit ── */}
              <motion.button
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.975 }}
                type="submit"
                disabled={loading}
                className="w-full mt-2 relative overflow-hidden bg-indigo-600 text-white py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2.5 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-lg shadow-indigo-500/30"
              >
                {!loading && (
                  <motion.span
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -skew-x-12"
                    initial={{ x: "-100%" }}
                    animate={{ x: "200%" }}
                    transition={{
                      duration: 1.6,
                      repeat: Infinity,
                      repeatDelay: 2.5,
                    }}
                  />
                )}
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> جاري إنشاء
                    الحساب…
                  </>
                ) : (
                  <>
                    <span>إنشاء الحساب</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </motion.button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-100" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-white text-gray-400">أو</span>
              </div>
            </div>

            <p className="text-center text-gray-500 text-sm">
              عندك حساب بالفعل؟{" "}
              <a
                href="/login"
                className="text-indigo-600 hover:text-indigo-700 font-bold transition-colors"
              >
                سجّل دخول
              </a>
            </p>
          </div>
        </div>
        <p className="text-center text-gray-400 text-xs mt-5">
          © 2026 Education Platform
        </p>
      </motion.div>
    </div>
  );
}
