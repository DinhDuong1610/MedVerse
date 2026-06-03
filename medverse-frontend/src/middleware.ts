import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ACCESS_TOKEN_COOKIE = 'mv_access_token';

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;

    const isProtectedRoute = pathname.startsWith('/dashboard');
    const isLoginRoute = pathname.startsWith('/login');

    if (isProtectedRoute && !token) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('next', pathname);

        return NextResponse.redirect(loginUrl);
    }

    if (isLoginRoute && token) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/login/:path*', '/dashboard/:path*'],
};