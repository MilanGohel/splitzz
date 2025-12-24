"use client"

import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
} from "@/components/ui/card"
import { createAuthClient } from "better-auth/react";
import { useRouter } from "next/navigation";
import { FaGoogle } from "react-icons/fa";

export function LoginForm() {
    const authClient = createAuthClient({});
    const router = useRouter();

    const onLoginWithGoogle = async () => {
        const data = await authClient.signIn.social({
            provider: "google"
        });
        if (data.error) {
            console.error("Login failed:", data.error);
            router.push("/sign-in")
        }
    }

    return (
        <Card className="w-full max-w-sm border-none">
            <CardContent className="pt-6">
                <Button
                    variant="outline"
                    className="w-full cursor-pointer"
                    onClick={onLoginWithGoogle}
                >
                    <FaGoogle />
                    Login with Google
                </Button>
            </CardContent>
        </Card>
    )
}