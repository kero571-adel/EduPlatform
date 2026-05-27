import { cookies } from "next/headers";
import StudentLayoutClient from "./StudentLayoutClient";

export default async function StudentLayout({ children }) {
  const cookieStore = await cookies();

  const userName =
    cookieStore.get("userName")?.value || "الطالب";

  return (
    <StudentLayoutClient userName={userName}>
      {children}
    </StudentLayoutClient>
  );
}