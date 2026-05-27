'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Cookies from 'js-cookie';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  FileText,
  TrendingUp,
  Users,
  Pencil,
  LogOut,
  Menu,
  X
} from 'lucide-react';

const teacherLinks = [
  { name: 'لوحة التحكم', icon: BookOpen, path: '/teacher' },
  { name: 'الامتحانات', icon: FileText, path: '/teacher/exams' },
  { name: 'إنشاء امتحان', icon: FileText, path: '/teacher/createExams' },
  { name: 'الملاحظات', icon: Pencil, path: '/teacher/notes' },
  { name: 'التقارير', icon: TrendingUp, path: '/teacher/reports' },
  { name: 'الطلاب', icon: Users, path: '/teacher/students' },
];

const studentLinks = [
  { name: 'الرئيسية', icon: BookOpen, path: '/student' },
  { name: 'الملاحظات', icon: Pencil, path: '/student/notes' },
  { name: 'تقاريري', icon: TrendingUp, path: '/student/reports' },
];

export default function Sidebar({ role, userName }) {
  const router = useRouter();
  const pathname = usePathname(); // ✅ لجلب المسار الحالي

  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  const links = role === 'teacher' ? teacherLinks : studentLinks;

  // ✅ التحقق من حجم الشاشة
  useEffect(() => {
    const checkScreen = () => {
      const desktop = window.innerWidth >= 768;
      setIsDesktop(desktop);
      if (desktop) setMobileOpen(false); // إغلاق الموبايل عند التكبير
    };

    checkScreen();
    window.addEventListener('resize', checkScreen);
    return () => window.removeEventListener('resize', checkScreen);
  }, []);

  // ✅ إغلاق القائمة عند تغيير الصفحة
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      Cookies.remove('isLoggedIn');
      Cookies.remove('userRole');
      Cookies.remove('userId');
      Cookies.remove('userName');
      router.push('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const handleNavClick = (path) => {
    router.push(path);
    // سيتم إغلاق القائمة تلقائياً عبر useEffect الذي يراقب pathname
  };

  // ✅ دالة التحقق من الرابط النشط
  const isActive = (path) => {
    if (!pathname) return false;
    // للصفحات الرئيسية
    if (path === '/teacher' || path === '/student') {
      return pathname === path;
    }
    // للصفحات الفرعية (مثل /teacher/exams/123)
    return pathname.startsWith(path);
  };

  return (
    <>
      {/* ✅ زر القائمة للموبايل - يظهر فقط على الشاشات الصغيرة */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 right-4 z-50 md:hidden p-2.5 bg-white rounded-xl shadow-md border border-gray-100 hover:bg-gray-50 transition"
        aria-label="فتح القائمة"
      >
        <Menu className="w-6 h-6 text-gray-700" />
      </button>

      {/* ✅ Overlay للموبايل فقط */}
      <AnimatePresence>
        {mobileOpen && !isDesktop && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* ✅ Sidebar الرئيسي */}
      <AnimatePresence mode="wait">
        {(isDesktop || mobileOpen) && (
          <motion.aside
            key="sidebar"
            initial={{ x: 280 }}
            animate={{ x: 0 }}
            exit={{ x: 280 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={`fixed top-0 right-0 h-full w-72 bg-white border-l border-gray-200 z-50 md:z-0 flex flex-col shadow-2xl md:shadow-none ${
              mobileOpen ? 'block' : 'hidden md:flex'
            }`}
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-indigo-600">
                EduPlatform
              </h2>
              <button
                onClick={() => setMobileOpen(false)}
                className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition"
                aria-label="إغلاق القائمة"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* User Info */}
            <div className="p-5 border-b border-gray-100">
              <p className="text-xs text-gray-400 mb-1">مرحباً بـ</p>
              <p className="font-bold text-gray-800 truncate">
                {userName || (role === 'teacher' ? 'المدرس' : 'الطالب')}
              </p>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
              {links.map((link) => {
                const active = isActive(link.path);
                return (
                  <button
                    key={link.path}
                    onClick={() => handleNavClick(link.path)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all text-sm font-medium ${
                      active
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                        : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-600'
                    }`}
                  >
                    <link.icon className="w-5 h-5" />
                    <span>{link.name}</span>
                    {/* مؤشر صغير للرابط النشط */}
                    {active && (
                      <span className="mr-auto w-1.5 h-1.5 rounded-full bg-white/80" />
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Logout Button */}
            <div className="p-4 border-t border-gray-100">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-red-600 hover:bg-red-50 transition-all text-sm font-medium"
              >
                <LogOut className="w-5 h-5" />
                <span>تسجيل الخروج</span>
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}