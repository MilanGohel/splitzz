"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { authClient } from "@/utils/auth-client";
import { FcGoogle } from "react-icons/fc";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/lib/stores/auth-store";
import { SplitzzMark } from "@/components/brand/logo";

export default function LoginPage() {
  const router = useRouter();
  const isLoggedIn = useAuthStore((state) => !!state.user);
  const isAuthChecking = useAuthStore((state) => state.isAuthChecking);

  useEffect(() => {

    if (!isAuthChecking && isLoggedIn) {
      router.push("/dashboard");
    }
  }, [isLoggedIn, router, isAuthChecking]);

  if (isAuthChecking || isLoggedIn) {
    return (
      <>
        <main className="w-full h-screen flex items-center justify-center bg-background">
          <Loader2 className="animate-spin" />
        </main>
      </>
    );
  }

  const handleGoogleSignIn = async () => {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: "/dashboard",
      fetchOptions: {
        onRequest: () => {
          toast.loading("Redirecting to Google...");
        },
        onError: (ctx) => {
          toast.dismiss();
          toast.error(ctx.error.message);
        },
      },
    });
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border bg-card text-card-foreground">
        <CardHeader className="text-center flex flex-col items-center">
          <SplitzzMark size={48} className="mb-2" glow />
          <CardTitle className="text-2xl font-bold tracking-tight">
            Welcome to Split<span className="text-emerald-500 font-extrabold">zz</span>
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Sign in to manage and settle your shared expenses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="w-full gap-2 border-border hover:bg-muted/10"
            onClick={handleGoogleSignIn}
          >
            <FcGoogle className="size-5" />
            Continue with Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
