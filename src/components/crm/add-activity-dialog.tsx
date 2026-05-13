"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { CalendarPlus, Loader2, MessageCircle, Phone, Mail, Calendar, CheckSquare, FileText } from "lucide-react";
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

const activitySchema = z.object({
  subject: z.string().min(1, "El asunto es requerido").max(300),
  contact_id: z.string().uuid("Debe seleccionar un contacto válido"),
  opportunity_id: z.string().uuid().optional().or(z.literal("")),
  type: z.enum(["call", "email", "meeting", "task", "whatsapp", "note"]),
  due_date: z.string().optional().or(z.literal("")),
  description: z.string().max(5000).optional(),
});

type ActivityFormValues = z.infer<typeof activitySchema>;

export default function AddActivityDialog({ children }: { children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch contacts for the select dropdown
  const { data: contactsData } = useSWR<{ contacts: { id: string, name: string }[] }>("/api/v1/crm/contacts?limit=200");
  const contacts = contactsData?.contacts || [];

  // Fetch opportunities to link
  const { data: oppsData } = useSWR<{ opportunities: { id: string, title: string, contact_id: string }[] }>("/api/v1/crm/opportunities");
  const allOpps = oppsData?.opportunities || [];

  const form = useForm<ActivityFormValues>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      subject: "",
      contact_id: "",
      opportunity_id: "",
      type: "note",
      due_date: "",
      description: "",
    },
  });

  const selectedContactId = form.watch("contact_id");
  const filteredOpps = allOpps.filter(o => o.contact_id === selectedContactId);

  const onSubmit = async (data: ActivityFormValues) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/v1/crm/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          opportunity_id: data.opportunity_id || null,
          due_date: data.due_date || null,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al registrar la actividad.");
      }

      toast.success("Actividad registrada exitosamente.");
      mutate(
        (key) => typeof key === "string" && key.startsWith("/api/v1/crm/activities"),
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
            <CalendarPlus className="h-4 w-4 mr-2" />
            Nueva Actividad
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] border-indigo-500/20 shadow-xl shadow-indigo-500/10">
        <DialogHeader>
          <DialogTitle className="text-xl font-outfit text-indigo-400">Registrar Actividad</DialogTitle>
          <DialogDescription>
            Anota llamadas, reuniones o correos para llevar el seguimiento.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
            
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Asunto <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="Ej. Llamada de seguimiento..." {...field} className="border-indigo-500/20 focus-visible:ring-indigo-500/30" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
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
                        <SelectItem value="note"><div className="flex items-center"><FileText className="w-4 h-4 mr-2" /> Nota</div></SelectItem>
                        <SelectItem value="call"><div className="flex items-center"><Phone className="w-4 h-4 mr-2" /> Llamada</div></SelectItem>
                        <SelectItem value="whatsapp"><div className="flex items-center"><MessageCircle className="w-4 h-4 mr-2 text-green-500" /> WhatsApp</div></SelectItem>
                        <SelectItem value="email"><div className="flex items-center"><Mail className="w-4 h-4 mr-2" /> Correo</div></SelectItem>
                        <SelectItem value="meeting"><div className="flex items-center"><Calendar className="w-4 h-4 mr-2" /> Reunión</div></SelectItem>
                        <SelectItem value="task"><div className="flex items-center"><CheckSquare className="w-4 h-4 mr-2" /> Tarea</div></SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha Programada</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} className="border-indigo-500/20 focus-visible:ring-indigo-500/30" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="contact_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contacto <span className="text-red-500">*</span></FormLabel>
                  <Select onValueChange={(val) => {
                    field.onChange(val);
                    form.setValue("opportunity_id", ""); // reset opp
                  }} value={field.value}>
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

            {selectedContactId && filteredOpps.length > 0 && (
              <FormField
                control={form.control}
                name="opportunity_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Oportunidad Asociada (Opcional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="border-indigo-500/20 focus:ring-indigo-500/30">
                          <SelectValue placeholder="Vincular a oportunidad" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-[150px]">
                        <SelectItem value="">Ninguna</SelectItem>
                        {filteredOpps.map(o => (
                          <SelectItem key={o.id} value={o.id}>{o.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción / Detalles</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Resumen de la llamada o reunión..." 
                      className="resize-none min-h-[80px] border-indigo-500/20 focus-visible:ring-indigo-500/30" 
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
                {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CalendarPlus className="w-4 h-4 mr-2" />}
                Guardar Actividad
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
