import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Hardcode the credentials for now since env vars aren't working
const USERNAME = 'admin'
const PASSWORD = 'Hines'

export function middleware(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  
  if (authHeader) {
    const base64Credentials = authHeader.split(' ')[1]
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii')
    const [username, password] = credentials.split(':')
    
    if (username === USERNAME && password === PASSWORD) {
      return NextResponse.next()
    }
  }

  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Secure Area"',
    },
  })
}

export const config = {
  matcher: '/:path*',
} 