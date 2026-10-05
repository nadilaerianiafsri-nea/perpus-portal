import VerifyEmail from '@/auth/VerifyEmail';
export const metadata = { referrer: 'no-referrer' as const, robots: { index: false, follow: false } };
export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> }) {
  const value = (await searchParams).token;
  return <VerifyEmail token={typeof value === 'string' ? value : ''} />;
}
