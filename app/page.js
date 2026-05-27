// /app/page.js
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export const metadata = {
  title: "EduPlatform - Redirecting...",
  description: "Online learning platform for teachers and students",
  robots: { index: false, follow: true },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function Home() {
  const cookieStore = await cookies();

  const isLoggedIn = cookieStore.get("isLoggedIn")?.value === "true";
  const userRole = cookieStore.get("userRole")?.value;

  if (isLoggedIn && userRole) {
    redirect(userRole === "teacher" ? "/teacher" : "/student");
  }

  redirect("/login");
}
