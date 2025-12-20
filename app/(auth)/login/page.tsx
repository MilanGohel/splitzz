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

export default function LoginPage() {
  const router = useRouter();

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
      }
    }); // Redirect handled by better-auth
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-surface bg-surface text-white">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-brand">
            Welcome to Splitzz
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Sign in to manage your shared expenses
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
