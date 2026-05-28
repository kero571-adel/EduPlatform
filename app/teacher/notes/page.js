// /app/teacher/notes/page.js
"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  deleteDoc,
  doc,
  serverTimestamp,
  getDoc,
} from "firebase/firestore"; // ✅ أضف getDoc
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Trash2,
  FileText,
  Loader2,
  AlertCircle,
  Users,
} from "lucide-react";

export default function TeacherNotes() {
  const [notes, setNotes] = useState([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groups, setGroups] = useState([]); // ✅ مصفوفة المجموعات
  const [groupsLoading, setGroupsLoading] = useState(true); // ✅ حالة التحميل
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // ✅ جلب المجموعات من وثيقة المستخدم — نفس طريقة صفحة createExams
  useEffect(() => {
    const fetchGroups = async () => {
      if (!auth.currentUser) return;
      try {
        const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (userDoc.exists()) {
          setGroups(userDoc.data().groups || []);
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

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(
      collection(db, "notes"),
      where("teacherId", "==", auth.currentUser.uid)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        data.sort(
          (a, b) =>
            (b.createdAt?.toDate() || new Date(b.createdAt)) -
            (a.createdAt?.toDate() || new Date(a.createdAt))
        );
        setNotes(data);
      },
      (err) => {
        setError("فشل في تحميل الملاحظات");
        console.error(err);
      }
    );
    setLoading(false);
    return () => unsub();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || !groupName.trim())
      return setError("جميع الحقول مطلوبة");
    setSubmitting(true);
    setError("");
    try {
      await addDoc(collection(db, "notes"), {
        teacherId: auth.currentUser.uid,
        teacherName: auth.currentUser.email?.split("@")[0] || "المدرس",
        title,
        content,
        groupName,
        createdAt: serverTimestamp(),
      });
      setTitle("");
      setContent("");
      setGroupName("");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("هل أنت متأكد من حذف هذه الملاحظة؟")) return;
    await deleteDoc(doc(db, "notes", id));
  };

  if (loading)
    return (
      <div className="flex justify-center p-10">
        <Loader2 className="animate-spin w-8 h-8 text-indigo-600" />
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <FileText className="w-8 h-8 text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              إدارة الملاحظات
            </h1>
            <p className="text-gray-500 text-sm">
              أرسل تحديثات، مذكرات، أو إشعارات لطلابك
            </p>
          </div>
        </motion.div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" /> {error}
          </div>
        )}

        <motion.form
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          onSubmit={handleSubmit}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4"
        >
          <input
            type="text"
            placeholder="عنوان الملاحظة"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            required
          />

          {/* ✅ select بدل input */}
          <select
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            disabled={groupsLoading}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white disabled:opacity-50 cursor-pointer"
            required
          >
            <option value="">
              {groupsLoading ? "جاري التحميل..." : "اختر المجموعة"}
            </option>
            {groups.map((g, idx) => (
              <option key={idx} value={g}>
                {g}
              </option>
            ))}
          </select>

          <textarea
            placeholder="اكتب المحتوى هنا..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows="4"
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
            required
          />
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <Loader2 className="animate-spin w-5 h-5" />
            ) : (
              <>
                <Send className="w-5 h-5" /> نشر الملاحظة
              </>
            )}
          </button>
        </motion.form>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
            <Users className="w-5 h-5" /> الملاحظات المنشورة
          </h2>
          <AnimatePresence>
            {notes.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-10 bg-white rounded-xl border-2 border-dashed border-gray-200 text-gray-500"
              >
                لا توجد ملاحظات بعد
              </motion.div>
            ) : (
              notes.map((note) => (
                <motion.div
                  key={note.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex justify-between gap-4"
                >
                  <div>
                    <h3 className="font-bold text-gray-800">{note.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      المجموعة:{" "}
                      <span className="font-medium text-indigo-600">
                        {note.group}
                      </span>
                    </p>
                    <p className="mt-3 text-gray-700 whitespace-pre-line">
                      {note.content}
                    </p>
                    <p className="text-xs text-gray-400 mt-3">
                      {note.createdAt?.toDate().toLocaleString("ar-EG")}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(note.id)}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition self-start"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
