import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ログインページとログインAPIは認証不要
  if (pathname === '/login' || pathname === '/api/login') {
    return NextResponse.next();
  }

  const auth = request.cookies.get('auth')?.value;

  if (auth !== 'authenticated') {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
