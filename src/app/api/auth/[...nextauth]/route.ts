import { NextResponse } from 'next/server';

// Auth is handled by Firebase — this route is no longer used.
export function GET() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
export function POST() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
