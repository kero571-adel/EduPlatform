// /app/student/notes/page.js
"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  getDoc,
  doc,
} from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Loader2, AlertCircle, Users, Clock } from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
export default function StudentNotes() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [studentGroup, setStudentGroup] = useState("");
  const [teacherId, setTeacherId] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        setError("يجب تسجيل الدخول أولاً");
        return;
      }

      try {
        const userSnap = await getDoc(doc(db, "users", user.uid));

        if (userSnap.exists()) {
          const data = userSnap.data();

          setStudentGroup(data.groupName || "");
          setTeacherId(data.teacherId || "");
        } else {
          setError("بيانات الطالب غير موجودة");
          setLoading(false);
        }
      } catch (err) {
        console.error(err);
        setError("فشل في تحميل بيانات الملف الشخصي");
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);
  // ── 2. الاشتراك في الملاحظات بعد ما نعرف teacherId + groupName ─
  useEffect(() => {
    if (!studentGroup || !teacherId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "notes"),
      where("teacherId", "==", teacherId),
      where("groupName", "==", studentGroup)
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
        setLoading(false);
      },
      (err) => {
        setError("فشل في تحميل الملاحظات");
        console.error(err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [studentGroup, teacherId]); // ✅ بيشتغل لما الاتنين يتحددوا

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
              ملاحظات ومذكرات
            </h1>
            <p className="text-gray-500 text-sm flex items-center gap-1">
              <Users className="w-4 h-4" />
              مخصصة لمجموعتك:{" "}
              <span className="font-bold text-indigo-600">
                {studentGroup || "غير محدد"}
              </span>
            </p>
          </div>
        </motion.div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" /> {error}
          </div>
        )}

        <AnimatePresence>
          {notes.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-200"
            >
              <FileText className="w-14 h-14 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700">
                لا توجد ملاحظات حالياً
              </h3>
              <p className="text-gray-500 mt-1">
                انتظر حتى يضيف مدرس المجموعة تحديثات أو مذكرات جديدة
              </p>
            </motion.div>
          ) : (
            <div className="space-y-4">
              {notes.map((note) => (
                <motion.div
                  key={note.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition"
                >
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-xl text-gray-800">
                      {note.title}
                    </h3>
                    <span className="flex items-center gap-1 text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-full">
                      <Clock className="w-3 h-3" />
                      {note.createdAt
                        ? note.createdAt.toDate().toLocaleDateString("ar-EG")
                        : "_"}
                    </span>
                  </div>
                  <div className="text-gray-700 whitespace-pre-line leading-relaxed">
                    {note.content}
                  </div>
                  {/* <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-400">
                    نشر بواسطة: {note.teacherName || 'المدرس'}
                  </div> */}
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
