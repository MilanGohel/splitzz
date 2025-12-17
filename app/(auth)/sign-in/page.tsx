import { LoginForm } from "@/components/auth/LoginForm";

export default function SignIn() {
    return (
        <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6 dark:bg-black">
            <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-lg dark:bg-neutral-950">
                <div className="text-center">
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                        Welcome Back
                    </h1>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        Please sign in to your account
                    </p>
                </div>
                <LoginForm />
            </div>
        </main>
    )
}