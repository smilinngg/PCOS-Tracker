import { NextResponse } from "next/server"

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"

export async function GET(req: Request, context: any) {
  try {
    // Await params to support both Next 14 and Next 15+ seamlessly
    const params = await context.params
    const email = params.email
    
    const res = await fetch(`${BACKEND_URL}/history/${email}`)
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (error: any) {
    return NextResponse.json({ detail: "Internal Server Error" }, { status: 500 })
  }
}
