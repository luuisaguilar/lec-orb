"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { getEmailRedirectOrigin } from "@/lib/env/app-url";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GlobeBackground } from "@/components/auth/globe-background";
import { Loader2, Mail } from "lucide-react";

const schema = z.object({
    email: z.string().email("Correo inválido"),
});

type FormValues = z.infer<typeof schema>;

function ForgotPasswordForm() {
    const searchParams = useSearchParams();
    const next = searchParams.get("next");
    const [error, setError] = useState<string | null>(null);
    const [sent, setSent] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<FormValues>({
        resolver: zodResolver(schema),
    });

    async function onSubmit(values: FormValues) {
        setError(null);
        const supabase = createClient();
        const origin = getEmailRedirectOrigin();
        const target = next
            ? `/reset-password?next=${encodeURIComponent(next)}`
            : "/reset-password";

        const { error: resetError } = await supabase.auth.resetPasswordForEmail(values.email, {
            redirectTo: `${origin}${target}`,
        });

        if (resetError) {
            setError("No se pudo enviar el correo de recuperación. Inténtalo de nuevo.");
            return;
        }

        setSent(true);
    }

    return (
        <div suppressHydrationWarning className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
            <GlobeBackground />
            <Card className="w-full max-w-md bg-slate-950/40 border-white/10 backdrop-blur-3xl ring-1 ring-white/20 rounded-[2rem]">
                <CardHeader className="text-center pt-10">
                    <CardTitle className="text-3xl font-outfit font-black text-white tracking-tight">
                        Recuperar contraseña
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                        Te enviaremos un enlace para crear una nueva contraseña.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5 pb-10 px-8">
                    {sent ? (
                        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
                            Revisa tu correo. Si existe una cuenta con ese email, recibirás el enlace de recuperación.
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-slate-300">Correo</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="tu@email.com"
                                        className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-slate-600 h-11 rounded-xl"
                                        {...register("email")}
                                    />
                                </div>
                                {errors.email && (
                                    <p className="text-xs text-red-400">{errors.email.message}</p>
                                )}
                            </div>

                            {error && (
                                <p className="text-sm text-red-400">{error}</p>
                            )}

                            <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Enviar enlace
                            </Button>
                        </form>
                    )}

                    <div className="text-center">
                        <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="text-xs text-slate-400 hover:text-primary">
                            Volver a iniciar sesión
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default function ForgotPasswordPage() {
    return (
        <Suspense>
            <ForgotPasswordForm />
        </Suspense>
    );
}

