import { adminGrantsProxy } from "@/admin/grantsProxy";

export async function GET(request: Request) {
  return adminGrantsProxy(request);
}

export async function POST(request: Request) {
  return adminGrantsProxy(request);
}
