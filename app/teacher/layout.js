// /app/teacher/layout.js
import { cookies } from 'next/headers';
import Sidebar from '@/components/Sidebar';

export default async function TeacherLayout({ children }) {
  const cookieStore = await cookies();
  const userName = cookieStore.get('userName')?.value || 'المدرس';

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Sidebar role="teacher" userName={userName} />
      <main className="md:mr-64 p-4 md:p-8 pt-16 md:pt-8 transition-all">
        {children}
      </main>
    </div>
  );
}