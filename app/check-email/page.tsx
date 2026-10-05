import CheckEmail from '@/auth/CheckEmail';
export const metadata = { referrer: 'no-referrer' as const, robots: { index: false, follow: false } };
export default async function Page({ searchParams }: { searchParams: Promise<{ email?: string | string[] }> }) {
  const value = (await searchParams).email;
  return <CheckEmail initialEmail={typeof value === 'string' ? value : ''} />;
}
