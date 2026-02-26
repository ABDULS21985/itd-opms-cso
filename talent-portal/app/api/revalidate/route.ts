import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

/**
 * On-demand ISR revalidation endpoint.
 *
 * POST /api/revalidate
 * Body: { path: string }
 * Headers: { Authorization: Bearer <REVALIDATION_SECRET> }
 *
 * Validates the secret token against REVALIDATION_SECRET env var,
 * then revalidates the specified path.
 */
export async function POST(request: NextRequest) {
  try {
    // Extract and validate the secret token
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    const secret = process.env.REVALIDATION_SECRET;

    if (!secret) {
      return NextResponse.json(
        { message: "REVALIDATION_SECRET is not configured." },
        { status: 500 }
      );
    }

    if (!token || token !== secret) {
      return NextResponse.json(
        { message: "Invalid revalidation token." },
        { status: 401 }
      );
    }

    // Parse the request body
    const body = await request.json().catch(() => null);

    if (!body || typeof body.path !== "string" || !body.path.trim()) {
      return NextResponse.json(
        { message: "Missing or invalid 'path' in request body." },
        { status: 400 }
      );
    }

    const pathToRevalidate = body.path.trim();

    // Revalidate the path
    revalidatePath(pathToRevalidate);

    return NextResponse.json({
      revalidated: true,
      path: pathToRevalidate,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: "Revalidation failed.",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
