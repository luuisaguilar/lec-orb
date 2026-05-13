"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { PlusCircle, Loader2 } from "lucide-react";
import { mutate } from "swr";
import useSWR from "swr";

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
import { Textarea } from "@/components/ui/textarea";

const opportunitySchema = z.object({
  title: z.string().min(1, "El título es requerido").max(300),
  contact_id: z.string().uuid("Debe seleccionar un contacto válido"),
  stage: z.enum(["new", "qualified", "proposal", "negotiation", "won", "lost"]),
  expected_amount: z.coerce.number().min(0, "Debe ser un valor positivo"),
  probability: z.coerce.number().min(0).max(100),
  expected_close: z.string().optional().or(z.literal("")),
  notes: z.string().max(5000).optional(),
});

type OpportunityFormValues = z.infer<typeof opportunitySchema>;

export default function AddOpportunityDialog({ children }: { children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch contacts for the select dropdown
  const { data: contactsData } = useSWR<{ contacts: { id: string, name: string }[] }>("/api/v1/crm/contacts?limit=200");
  const contacts = contactsData?.contacts || [];

  const form = useForm<OpportunityFormValues>({
    resolver: zodResolver(opportunitySchema),
    defaultValues: {
      title: "",
      contact_id: "",
      stage: "new",
      expected_amount: 0,
      probability: 10,
      expected_close: "",
      notes: "",
    },
  });

  const onSubmit = async (data: OpportunityFormValues) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/v1/crm/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          expected_close: data.expected_close || null,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al crear la oportunidad.");
      }

      toast.success("Oportunidad creada exitosamente.");
      mutate(
        (key) => typeof key === "string" && key.startsWith("/api/v1/crm/opportunities"),
        undefined,
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
            <PlusCircle className="h-4 w-4 mr-2" />
            Nueva Oportunidad
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] border-indigo-500/20 shadow-xl shadow-indigo-500/10">
        <DialogHeader>
          <DialogTitle className="text-xl font-outfit text-indigo-400">Crear Nueva Oportunidad</DialogTitle>
          <DialogDescription>
            Agrega un nuevo negocio o venta potencial al pipeline.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
            
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título de la Oportunidad <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="Ej. Implementación Q3 Escuela X" {...field} className="border-indigo-500/20 focus-visible:ring-indigo-500/30" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contact_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contacto / Cliente <span className="text-red-500">*</span></FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="border-indigo-500/20 focus:ring-indigo-500/30">
                        <SelectValue placeholder="Selecciona un contacto" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-[200px]">
                      {contacts.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="stage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Etapa Inicial</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="border-indigo-500/20 focus:ring-indigo-500/30">
                          <SelectValue placeholder="Etapa" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="new">Nuevo</SelectItem>
                        <SelectItem value="qualified">Calificado</SelectItem>
                        <SelectItem value="proposal">Propuesta</SelectItem>
                        <SelectItem value="negotiation">Negociación</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expected_close"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cierre Esperado</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} className="border-indigo-500/20 focus-visible:ring-indigo-500/30" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="expected_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monto Esperado (MXN)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} className="border-indigo-500/20 focus-visible:ring-indigo-500/30" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="probability"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Probabilidad (%)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" max="100" {...field} className="border-indigo-500/20 focus-visible:ring-indigo-500/30" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Contexto sobre el negocio..." 
                      className="resize-none min-h-[60px] border-indigo-500/20 focus-visible:ring-indigo-500/30" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4 border-t border-indigo-500/10">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <PlusCircle className="w-4 h-4 mr-2" />}
                Guardar Oportunidad
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
