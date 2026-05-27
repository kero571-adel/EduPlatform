// /middleware.js
import { NextResponse } from 'next/server';

// 📋 Configuration: Define route protections
const PROTECTED_ROUTES = {
  teacher: ['/teacher', '/teacher/lectures', '/teacher/students', '/teacher/reports'],
  student: ['/student', '/student/lectures', '/student/exams', '/student/profile'],
  auth: ['/results'], // Pages that require login but work for both roles
};

const AUTH_ROUTES = ['/login', '/register'];
const PUBLIC_ROUTES = ['/', '/privacy', '/terms']; // Add any public pages here

// 🔍 Helper: Check if path matches a prefix
const matchesPath = (pathname, prefix) => {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
};

// 🔍 Helper: Check if path is in public list
const isPublicRoute = (pathname) => {
  return PUBLIC_ROUTES.some((route) => matchesPath(pathname, route));
};

// 🔐 Helper: Validate user session from cookies
const validateSession = (request) => {
  const isLoggedIn = request.cookies.get('isLoggedIn')?.value === 'true';
  const userRole = request.cookies.get('userRole')?.value;
  const userId = request.cookies.get('userId')?.value;

  // Basic validation: all required cookies must exist
  if (!isLoggedIn || !userRole || !userId) {
    return { isValid: false, role: null };
  }

  // Validate role is one of the expected values
  if (!['teacher', 'student'].includes(userRole)) {
    return { isValid: false, role: null };
  }

  return { isValid: true, role: userRole };
};

// 🚀 Main middleware function
export function middleware(request) {
  const { pathname } = request.nextUrl;
  const { isValid, role } = validateSession(request);

  // ✅ Allow public routes without authentication
  if (isPublicRoute(pathname)) {
    // If user is logged in, redirect them to their dashboard
    if (isValid && role) {
      const dashboard = role === 'teacher' ? '/teacher' : '/student';
      return NextResponse.redirect(new URL(dashboard, request.url));
    }
    return NextResponse.next();
  }

  // 🔐 Protect auth routes (login/register) from logged-in users
  if (AUTH_ROUTES.includes(pathname)) {
    if (isValid && role) {
      const dashboard = role === 'teacher' ? '/teacher' : '/student';
      return NextResponse.redirect(new URL(dashboard, request.url));
    }
    return NextResponse.next();
  }

  // 🛡️ Protect teacher routes
  if (PROTECTED_ROUTES.teacher.some((route) => matchesPath(pathname, route))) {
    if (!isValid || role !== 'teacher') {
      // Log attempt for monitoring (optional: send to analytics)
      console.warn(`⚠️ Unauthorized teacher route access: ${pathname} by role: ${role || 'guest'}`);
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  // 🛡️ Protect student routes
  if (PROTECTED_ROUTES.student.some((route) => matchesPath(pathname, route))) {
    if (!isValid || role !== 'student') {
      console.warn(`⚠️ Unauthorized student route access: ${pathname} by role: ${role || 'guest'}`);
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  // 🛡️ Protect auth-required routes (like /results)
  if (PROTECTED_ROUTES.auth.includes(pathname)) {
    if (!isValid) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  // 🔄 Default: allow other routes (404s, API routes, etc.)
  return NextResponse.next();
}

// ⚙️ Matcher configuration: Only run middleware on specific routes
// This improves performance by skipping middleware on static assets, images, etc.
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (public files)
     * - api routes (if you have any)
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|api/).*)',
  ],
};