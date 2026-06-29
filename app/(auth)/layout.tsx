import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 block text-center text-sm text-body">
          العودة إلى دليل التوجيه
        </Link>
        {children}
      </div>
    </main>
  );
}
