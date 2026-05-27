// /app/login/page.js
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import Cookies from 'js-cookie';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, ArrowLeft, Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { configureAuthPersistence } from '@/lib/firebase';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    configureAuthPersistence();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log("🔄 جارٍ تسجيل الدخول لـ:", email);

      // 1. تسجيل الدخول عبر Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log("✅ تم التحقق بنجاح، UID:", user.uid);

      // 2. محاولة جلب البيانات من Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));

      if (!userDoc.exists()) {
        console.error("❌ وثيقة Firestore مفقودة: لا توجد بيانات للمستخدم UID", user.uid);
        setError('بيانات المستخدم غير موجودة. يرجى التواصل مع الدعم الفني.');
        return;
      }

      console.log("✅ تم استرجاع بيانات Firestore:", userDoc.data());
      const userData = userDoc.data();

      // 3. حفظ الكوكيز
      Cookies.set('isLoggedIn', 'true', { expires: 30 });
      Cookies.set('userRole', userData.role, { expires: 30 });
      Cookies.set('userId', user.uid, { expires: 30 });
      Cookies.set('userName', userData.name, { expires: 30 });

      // 4. التوجيه
      router.push(userData.role === 'teacher' ? '/teacher' : '/student');

    } catch (err) {
      console.error("🔥 خطأ فادح في تسجيل الدخول:", {
        message: err.message,
        code: err.code,
        name: err.name,
        stack: err.stack
      });

      if (err.code === 'permission-denied') {
        setError('⚠️ خطأ في الصلاحيات: تحقق من قواعد أمان Firestore');
      } else if (err.code?.startsWith('auth/')) {
        switch (err.code) {
          case 'auth/invalid-email': setError('البريد الإلكتروني غير صحيح.'); break;
          case 'auth/wrong-password':
          case 'auth/user-not-found': setError('البريد الإلكتروني أو كلمة المرور غير صحيحة.'); break;
          default: setError('فشل التحقق من الهوية.');
        }
      } else {
        setError('حدث خطأ ما. تحقق من وحدة التحكم (F12) للتفاصيل.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-center">
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
            >
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Lock className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white">أهلاً بعودتك</h1>
              <p className="text-blue-100 text-sm mt-1">سجّل دخولك للمتابعة</p>
            </motion.div>
          </div>

          {/* Form */}
          <div className="p-6 space-y-5">
            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-center gap-2"
              >
                <span>⚠️</span>
                {error}
              </motion.div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">البريد الإلكتروني</label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    placeholder="example@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pr-10 pl-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-gray-50 focus:bg-white text-right"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">كلمة المرور</label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pr-10 pl-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-gray-50 focus:bg-white text-right"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Forgot Password */}
              <div className="text-left">
                <button type="button" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  نسيت كلمة المرور؟
                </button>
              </div>

              {/* Submit Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/25"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    جارٍ تسجيل الدخول...
                  </>
                ) : (
                  <>
                    تسجيل الدخول
                    <ArrowLeft className="w-5 h-5" />
                  </>
                )}
              </motion.button>
            </form>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-white text-gray-500">أو</span>
              </div>
            </div>

            {/* Register Link */}
            <p className="text-center text-gray-600">
              ليس لديك حساب؟{' '}
              <a
                href="/register"
                className="text-blue-600 hover:text-blue-700 font-semibold transition-colors"
              >
                إنشاء حساب جديد
              </a>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-400 text-xs mt-6">
          © 2026 منصة التعليم. جميع الحقوق محفوظة.
        </p>
      </motion.div>
    </div>
  );
}