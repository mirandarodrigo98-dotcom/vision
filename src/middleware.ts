import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const sessionId = request.cookies.get('session_id')?.value;
  const { pathname } = request.nextUrl;

  // Rotas públicas
  if (pathname === '/login' || pathname.startsWith('/_next') || pathname === '/') {
    return NextResponse.next();
  }

  // Se não tem sessão, redireciona para login
  if (!sessionId) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Nota: A validação real da sessão (role, expiração) 
  // será feita nos Layouts/Server Components pois o middleware 
  // roda em Edge e não tem acesso ao SQLite.
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
