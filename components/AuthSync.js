// /components/AuthSync.js
'use client';

import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import Cookies from 'js-cookie';
import { useRouter, usePathname } from 'next/navigation';

export default function AuthSync() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Don't run on auth pages to avoid loops
    if (pathname === '/login' || pathname === '/register') {
      return;
    }

    const unsub = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          // User is logged in via Firebase
          const role = Cookies.get('userRole');
          
          // If cookies missing, sync them from Firestore
          if (!role) {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
              const data = userDoc.data();
              Cookies.set('isLoggedIn', 'true', { expires: 30 });
              Cookies.set('userRole', data.role, { expires: 30 });
              Cookies.set('userId', user.uid, { expires: 30 });
              Cookies.set('userName', data.name, { expires: 30 });
              
              // Redirect to appropriate dashboard
              const target = data.role === 'teacher' ? '/teacher' : '/student';
              if (pathname !== target) {
                router.replace(target);
              }
            }
          }
        } else {
          // User not logged in - clean up and redirect
          Cookies.remove('isLoggedIn');
          Cookies.remove('userRole');
          Cookies.remove('userId');
          Cookies.remove('userName');
          
          if (pathname !== '/login' && pathname !== '/register') {
            router.replace('/login');
          }
        }
      } catch (error) {
        console.error('AuthSync error:', error);
        // Fallback: redirect to login on error
        router.replace('/login');
      }
      // ✅ No loading screen - let the page render normally
    });

    return () => unsub();
  }, [router, pathname]);

  // ✅ Return null - no loading screen to avoid getting stuck
  return null;
}