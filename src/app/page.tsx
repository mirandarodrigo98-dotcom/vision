import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export default async function Home() {
  const session = await getSession();

  if (session) {
    if (session.role === 'admin' || session.role === 'operator') {
      redirect('/admin/dashboard');
    } else {
      redirect('/app');
    }
  }

  redirect('/api/auth/cleanup');
}
