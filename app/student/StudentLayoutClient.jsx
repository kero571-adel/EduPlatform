"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";

export default function StudentLayoutClient({ children, userName }) {
  const pathname = usePathname();

  // لو داخل صفحة امتحان
  const isExamPage = pathname.startsWith("/student/exam/");

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* اخفاء الـ sidebar أثناء الامتحان */}
      {!isExamPage && <Sidebar role="student" userName={userName} />}

      <main
        className={
          isExamPage ? "" : "md:mr-64 p-4 md:p-8 pt-16 md:pt-8 transition-all"
        }
      >
        {children}
      </main>
    </div>
  );
}
