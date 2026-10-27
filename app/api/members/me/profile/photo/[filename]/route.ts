import { memberProfilePhotoReadProxy } from '@/members/profilePhotoProxy';

export const runtime = 'nodejs';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;
  return memberProfilePhotoReadProxy(request, filename);
}
