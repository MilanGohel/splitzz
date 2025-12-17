
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
} from "@/components/ui/card"

export function LoginForm() {
    
    const onSignIn = () => {
        
    }

    return (
        <Card className="w-full max-w-sm border-none">
            <CardContent className="pt-6">
                <Button
                    variant="outline"
                    className="w-full dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800 dark:border-neutral-700"
                >
                    <link href="https://fonts.googleapis.com/icon?family=Material+Icons"
                        rel="stylesheet"></link>
                    Login with Google
                </Button>
            </CardContent>
        </Card>
    )
}