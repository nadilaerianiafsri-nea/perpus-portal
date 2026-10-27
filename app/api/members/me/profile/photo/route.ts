import { memberProfilePhotoProxy } from '@/members/profilePhotoProxy';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  return memberProfilePhotoProxy(request);
}

export async function DELETE(request: Request) {
  return memberProfilePhotoProxy(request);
}
