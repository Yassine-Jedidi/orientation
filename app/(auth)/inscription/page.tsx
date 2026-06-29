import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthForm } from "@/components/auth/auth-form";
import { auth } from "@/lib/auth";

export default async function SignUpPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect("/");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-center text-title-lg">إنشاء حساب</CardTitle>
      </CardHeader>
      <CardContent>
        <AuthForm mode="sign-up" />
      </CardContent>
    </Card>
  );
}
