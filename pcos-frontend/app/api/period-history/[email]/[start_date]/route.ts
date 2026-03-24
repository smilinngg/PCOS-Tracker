import { NextResponse } from "next/server"

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"

export async function DELETE(req: Request, context: any) {
  try {
    const params = await context.params
    const email = params.email
    const start_date = params.start_date
    const res = await fetch(`${BACKEND_URL}/period-history/${email}/${start_date}`, { method: "DELETE" })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (error: any) {
    return NextResponse.json({ detail: "Internal Server Error" }, { status: 500 })
  }
}
