import { redirect } from "next/navigation";

import { findUserByEmailVerificationToken, verifyUserEmail } from "@/lib/db";

type VerifyEmailPageProps = {
  searchParams: Promise<{
    token?: string;
  }>;
};

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const { token } = await searchParams;

  if (!token) {
    redirect("/login?error=invalid-token");
  }

  const user = await findUserByEmailVerificationToken(token);

  if (!user || !user.emailVerificationTokenExpiresAt || new Date(user.emailVerificationTokenExpiresAt).getTime() < Date.now()) {
    redirect("/login?error=invalid-token");
  }

  await verifyUserEmail(user.id);
  redirect("/login?verified=1");
}
