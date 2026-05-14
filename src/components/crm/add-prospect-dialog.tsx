"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { UserPlus, Loader2 } from "lucide-react";
import { mutate } from "swr";
import type { CrmOpportunity, CrmOpportunityStage } from "./crm-kanban-board";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const prospectSchema = z.object({
  // Contact details
  name: z.string().min(1, "El nombre es requerido").max(200),
  email: z.string().email("Correo inválido").optional().or(z.literal("")),
  phone: z.string().max(50).optional().or(z.literal("")),
  type: z.enum(["school", "company", "individual"]),
  source: z.enum(["whatsapp", "referral", "web", "fair", "call", "outbound", "existing"]),
  
  // Opportunity details
  title: z.string().min(1, "El servicio / título es requerido").max(300),
  stage: z.enum(["new", "qualified", "proposal", "negotiation", "won", "lost"]),
  expected_amount: z.coerce.number().min(0).optional(),
});

type ProspectFormValues = z.infer<typeof prospectSchema>;

export default function AddProspectDialog({ children }: { children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ProspectFormValues>({
    resolver: zodResolver(prospectSchema) as any,
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      type: "individual",
      source: "whatsapp",
      title: "",
      stage: "new",
      expected_amount: 0,
    },
  });

  const onSubmit = async (data: ProspectFormValues) => {
    setIsSubmitting(true);
    try {
      // 1. Create Contact
      const contactRes = await fetch("/api/v1/crm/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: data.email || null,
          phone: data.phone || null,
          type: data.type,
          source: data.source,
        }),
      });

      if (!contactRes.ok) {
        const errorData = await contactRes.json();
        throw new Error(errorData.error || "Error al crear el contacto.");
      }

      const { contact } = await contactRes.json();

      // 2. Create Opportunity
      const oppRes = await fetch("/api/v1/crm/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact_id: contact.id,
          title: data.title,
          stage: data.stage,
          expected_amount: data.expected_amount || 0,
          probability: 10,
        }),
      });

      if (!oppRes.ok) {
        const errorData = await oppRes.json();
        throw new Error(errorData.error || "Error al crear la oportunidad.");
      }

      const { opportunity: rawOpp } = await oppRes.json();
      const validStages: readonly CrmOpportunityStage[] = ["new", "qualified", "proposal", "negotiation", "won", "lost"];
      const stage: CrmOpportunityStage = validStages.includes(rawOpp?.stage as CrmOpportunityStage)
        ? (rawOpp.stage as CrmOpportunityStage)
        : "new";
      const enriched: CrmOpportunity = {
        id: rawOpp.id,
        title: rawOpp.title,
        stage,
        expected_amount: Number(rawOpp.expected_amount ?? 0),
        probability: Number(rawOpp.probability ?? 0),
        expected_close: rawOpp.expected_close ?? null,
        contact_name: data.name,
      };

      toast.success("Prospecto y oportunidad creados exitosamente.");

      mutate(
        (key) => typeof key === "string" && key.startsWith("/api/v1/crm/contacts"),
        undefined,
        { revalidate: true }
      );
      // Merge into the exact cache key the pipeline uses, then revalidate so the board stays in sync with the server.
      mutate(
        "/api/v1/crm/opportunities",
        (current: { opportunities: CrmOpportunity[]; total?: number } | undefined) => {
          if (!current?.opportunities) {
            return { opportunities: [enriched], total: 1 };
          }
          const idx = current.opportunities.findIndex((o) => o.id === enriched.id);
          if (idx >= 0) {
            const next = [...current.opportunities];
            next[idx] = { ...next[idx], ...enriched };
            return { ...current, opportunities: next };
          }
          return {
            ...current,
            opportunities: [enriched, ...current.opportunities],
            total: (current.total ?? current.opportunities.length) + 1,
          };
        },
        { revalidate: true }
      );
      
      setOpen(false);
      form.reset();
    } catch (e: any) {
      toast.error(e.message || "Error inesperado.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20">
            <UserPlus className="h-4 w-4 mr-2" />
            Nuevo Prospecto
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] border-indigo-500/20 shadow-xl shadow-indigo-500/10">
        <DialogHeader>
          <DialogTitle className="text-xl font-outfit text-indigo-400">Nuevo Prospecto</DialogTitle>
          <DialogDescription>
            Registra un nuevo contacto y su oportunidad de negocio al mismo tiempo.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-2">
            
            {/* Sección de Contacto */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground border-b border-indigo-500/10 pb-2">Datos del Cliente</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre o Empresa <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="Ej. Instituto Montessori..." {...field} className="border-indigo-500/20 focus-visible:ring-indigo-500/30" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="border-indigo-500/20 focus:ring-indigo-500/30">
                            <SelectValue placeholder="Tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="individual">Individuo / Alumno</SelectItem>
                          <SelectItem value="school">Escuela / Colegio</SelectItem>
                          <SelectItem value="company">Empresa Corporativa</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono / WhatsApp</FormLabel>
                      <FormControl>
                        <Input placeholder="10 dígitos..." {...field} className="border-indigo-500/20 focus-visible:ring-indigo-500/30" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="source"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Canal / Origen</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="border-indigo-500/20 focus:ring-indigo-500/30">
                            <SelectValue placeholder="Origen" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="whatsapp">WhatsApp</SelectItem>
                          <SelectItem value="web">Sitio Web</SelectItem>
                          <SelectItem value="call">Llamada</SelectItem>
                          <SelectItem value="fair">Feria / Evento</SelectItem>
                          <SelectItem value="referral">Referido</SelectItem>
                          <SelectItem value="outbound">Outbound / Búsqueda</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Sección de Oportunidad */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground border-b border-indigo-500/10 pb-2">Negocio / Servicio</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Servicio de Interés <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="Ej. Certificación TOEFL 2026..." {...field} className="border-indigo-500/20 focus-visible:ring-indigo-500/30" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="stage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Etapa Inicial</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="border-indigo-500/20 focus:ring-indigo-500/30">
                            <SelectValue placeholder="Etapa" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="new">Nuevo (Lead)</SelectItem>
                          <SelectItem value="qualified">Calificado</SelectItem>
                          <SelectItem value="proposal">Propuesta / Cotización</SelectItem>
                          <SelectItem value="negotiation">Negociación</SelectItem>
                          <SelectItem value="won">Ganado / Inscrito</SelectItem>
                          <SelectItem value="lost">Perdido</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="expected_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor Estimado (MXN)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="Ej. 15000" {...field} className="border-indigo-500/20 focus-visible:ring-indigo-500/30" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-indigo-500/10">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Guardar Prospecto
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
