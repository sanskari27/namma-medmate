import { handle } from "../../../../server/router";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET(req: Request) { return handle(req); }
export function POST(req: Request) { return handle(req); }
export function PATCH(req: Request) { return handle(req); }
export function PUT(req: Request) { return handle(req); }
export function DELETE(req: Request) { return handle(req); }
