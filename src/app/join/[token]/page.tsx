import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CheckCircle2, XCircle, UserPlus, AlertTriangle, Clock } from "lucide-react";
import { getInvitationResult } from "./queries";
import { acceptInvitation } from "./actions";

export default async function JoinPage({
    params,
    searchParams,
}: {
    params: Promise<{ token: string }>;
    searchParams?: Promise<{ error?: string; expired?: string }>;
}) {
    // Next.js 15+ requires awaiting params and searchParams before use
    const { token } = await params;
    const sp = await searchParams;
    const acceptError = sp?.error ? decodeURIComponent(sp.error) : null;

    // 1. Validate Token securely on the server
    const result = await getInvitationResult(token);

    const isExpiredParam = sp?.expired === "1";

    if (!result.ok || isExpiredParam) {
        const failReason = result.ok ? undefined : result.reason;
        const isAlreadyProcessed = failReason === "already_processed";
        const isServerError = failReason === "server_error" && !isExpiredParam;
        const isExpired = isExpiredParam || failReason === "not_found";

        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
                <Card className="max-w-md w-full text-center p-6 border-t-4 border-t-red-500 shadow-xl">
                    {isAlreadyProcessed ? (
                        <Clock className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                    ) : (
                        <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    )}
                    <CardTitle className="text-2xl mb-2">
                        {isAlreadyProcessed 
                            ? "Invitación Ya Utilizada" 
                            : isExpired 
                            ? "Invitación Expirada" 
                            : "Invitación Inválida"}
                    </CardTitle>
                    <CardDescription className="mb-6">
                        {isAlreadyProcessed
                            ? "Esta invitación ya fue aceptada o revocada. Pide al administrador que te envíe una nueva invitación."
                            : isServerError
                            ? "Hubo un error al verificar la invitación. Por favor intenta de nuevo o contacta al administrador."
                            : "Esta invitación ha expirado, fue revocada o el enlace es incorrecto."}
                    </CardDescription>
                    
                    <div className="flex flex-col gap-3 mt-6">
                        <Button asChild variant="outline" className="w-full">
                            <Link href="mailto:soporte@lec.mx?subject=Nueva Invitación Platform&body=Hola, mi invitación ha expirado. ¿Podrían enviarme una nueva?">
                                Pedir nueva invitación
                            </Link>
                        </Button>
                        <Button asChild className="w-full bg-[#002e5d] text-white">
                            <Link href="/login">Ir al Inicio</Link>
                        </Button>
                    </div>
                </Card>
            </div>
        );
    }

    const preview = result.preview;

    // 2. Check if user is logged in
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
                <Card className="max-w-md w-full text-center p-6 border-t-4 border-t-[#002e5d] shadow-xl">
                    <UserPlus className="h-12 w-12 text-[#002e5d] mx-auto mb-4" />
                    <CardHeader>
                        <CardTitle className="text-2xl uppercase tracking-tighter">Únete a {preview.organizationName}</CardTitle>
                        <CardDescription>
                            Has sido invitado con el rol de <strong>{preview.role}</strong> para <strong>{preview.invitedEmailMasked}</strong>.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {(preview.jobTitle || preview.location) && (
                            <div className="rounded-md border bg-slate-100 p-3 text-left text-sm">
                                <p>
                                    <strong>Rol empresa:</strong> {preview.jobTitle || "Pendiente por definir"}
                                </p>
                                <p>
                                    <strong>Sede:</strong> {preview.location || "Pendiente por definir"}
                                </p>
                            </div>
                        )}
                        <p className="text-sm text-muted-foreground">
                            Para aceptar esta invitación, primero debes iniciar sesión o crear una cuenta con el correo invitado.
                        </p>
                        <div className="flex flex-col gap-2">
                            <Button asChild className="bg-[#002e5d] text-white">
                                <Link href={`/register?next=/join/${token}`}>Crear Cuenta</Link>
                            </Button>
                            <Button asChild variant="outline">
                                <Link href={`/login?next=/join/${token}`}>Ya tengo cuenta</Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // 3. Confirm Join
    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
            <Card className="max-w-md w-full text-center p-6 border-t-4 border-t-green-500 shadow-xl">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <CardHeader>
                    <CardTitle className="text-2xl">Confirmar Invitación</CardTitle>
                    <CardDescription>
                        Estás a punto de unirte a <strong>{preview.organizationName}</strong> como <strong>{preview.role}</strong>.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-left border rounded-lg p-4 bg-green-50/50">
                    <div className="text-sm">
                        <p className="font-bold text-green-800">Tu cuenta actual:</p>
                        <p className="text-green-700">{user.email}</p>
                    </div>
                    {(preview.jobTitle || preview.location) && (
                        <div className="text-sm space-y-1">
                            <p className="font-bold text-green-800">Asignación al aceptar:</p>
                            <p className="text-green-700">
                                Rol empresa: {preview.jobTitle || "Pendiente por definir"}
                            </p>
                            <p className="text-green-700">Sede: {preview.location || "Pendiente por definir"}</p>
                        </div>
                    )}
                </CardContent>

                {acceptError && (
                    <div className="mt-4 rounded-md bg-red-50 border border-red-200 p-3 flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                        <p className="text-sm text-red-700">{acceptError}</p>
                    </div>
                )}

                <form action={acceptInvitation}>
                    <input type="hidden" name="token" value={token} />
                    <Button type="submit" className="w-full mt-6 bg-[#002e5d] text-white hover:bg-[#001f3f]">
                        Aceptar y Continuar
                    </Button>
                </form>
            </Card>
        </div>
    );
}
