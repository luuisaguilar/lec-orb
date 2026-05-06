"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail } from "lucide-react";
import { toast } from "sonner";

type Props = {
    invitationToken: string;
};

export function JoinPortalMagicLink({ invitationToken }: Props) {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!email.trim()) {
            toast.error("Ingresa tu correo");
            return;
        }
        setLoading(true);
        try {
            const res = await fetch("/api/v1/portal/magic-link", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: email.trim(),
                    invitationToken,
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                toast.error(typeof data?.error === "string" ? data.error : "No se pudo enviar el enlace");
                return;
            }
            toast.success(
                typeof data?.message === "string"
                    ? data.message
                    : "Si el correo coincide con la invitación, revisa tu bandeja."
            );
        } catch {
            toast.error("Error de red");
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={onSubmit} className="mt-6 space-y-3 text-left border rounded-lg p-4 bg-muted/30">
            <p className="text-sm font-medium flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Acceso sin contraseña (enlace mágico)
            </p>
            <p className="text-xs text-muted-foreground">
                Recibirás un correo de Supabase con un enlace. Debe ser el mismo correo invitado.
            </p>
            <div className="space-y-2">
                <Label htmlFor="magic-email">Correo</Label>
                <Input
                    id="magic-email"
                    type="email"
                    autoComplete="email"
                    placeholder="correo@ejemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
            </div>
            <Button type="submit" className="w-full" variant="secondary" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar enlace mágico"}
            </Button>
        </form>
    );
}
