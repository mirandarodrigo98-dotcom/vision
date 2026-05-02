import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const cookieStore = await cookies();
  cookieStore.delete('session_id');
  return NextResponse.redirect(new URL('/login', request.url));
}
