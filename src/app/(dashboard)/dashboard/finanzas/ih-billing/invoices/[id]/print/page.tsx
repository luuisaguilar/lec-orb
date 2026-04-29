import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

function fmt(n: number) {
    return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);
}

export default async function PrintInvoicePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: invoice } = await supabase
        .from("ih_invoices")
        .select("*, ih_sessions(id, school_name, exam_type, session_date, students_applied, tariff, subtotal_lec)")
        .eq("id", id)
        .single();

    if (!invoice) redirect("/dashboard/finanzas/ih-billing");

    const sessions = (invoice.ih_sessions ?? []) as {
        id: string; school_name: string; exam_type: string;
        session_date: string; students_applied: number; tariff: number; subtotal_lec: number;
    }[];

    return (
        <html lang="es">
            <head>
                <meta charSet="utf-8" />
                <title>Factura {invoice.invoice_number}</title>
                <style>{`
                    * { box-sizing: border-box; margin: 0; padding: 0; }
                    body { font-family: Arial, sans-serif; font-size: 12px; color: #111; padding: 32px; }
                    .header { display: flex; justify-content: space-between; margin-bottom: 32px; }
                    .company { font-size: 18px; font-weight: bold; color: #002e5d; }
                    .meta { text-align: right; color: #555; }
                    h2 { font-size: 14px; margin-bottom: 12px; color: #002e5d; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
                    th { background: #002e5d; color: white; text-align: left; padding: 6px 8px; font-size: 11px; }
                    td { padding: 5px 8px; border-bottom: 1px solid #eee; }
                    tr:nth-child(even) td { background: #f8fafc; }
                    .total-row td { font-weight: bold; background: #f1f5f9; border-top: 2px solid #002e5d; }
                    .footer { margin-top: 32px; font-size: 11px; color: #888; text-align: center; }
                    @media print { @page { margin: 20mm; } }
                `}</style>
            </head>
            <body>
                <div className="header">
                    <div>
                        <div className="company">Languages Education Consulting</div>
                        <div style={{ color: "#555", marginTop: 4 }}>Centro Examinador Cambridge</div>
                    </div>
                    <div className="meta">
                        <div><strong>Factura:</strong> {invoice.invoice_number}</div>
                        <div><strong>Periodo:</strong> {invoice.period_label}</div>
                        {invoice.invoice_date && <div><strong>Fecha:</strong> {invoice.invoice_date}</div>}
                        <div><strong>Región:</strong> {invoice.region === "SONORA" ? "Sonora" : "Baja California"}</div>
                    </div>
                </div>

                <h2>Detalle de sesiones</h2>
                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Escuela</th>
                            <th>Examen</th>
                            <th>Fecha</th>
                            <th style={{ textAlign: "right" }}>Alumnos</th>
                            <th style={{ textAlign: "right" }}>Tarifa</th>
                            <th style={{ textAlign: "right" }}>Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sessions.map((s, i) => (
                            <tr key={s.id}>
                                <td>{i + 1}</td>
                                <td>{s.school_name}</td>
                                <td>{s.exam_type}</td>
                                <td>{s.session_date}</td>
                                <td style={{ textAlign: "right" }}>{s.students_applied}</td>
                                <td style={{ textAlign: "right" }}>{fmt(s.tariff)}</td>
                                <td style={{ textAlign: "right" }}>{fmt(Number(s.subtotal_lec ?? 0))}</td>
                            </tr>
                        ))}
                        <tr className="total-row">
                            <td colSpan={4} style={{ textAlign: "right" }}>TOTAL</td>
                            <td style={{ textAlign: "right" }}>{invoice.total_students}</td>
                            <td></td>
                            <td style={{ textAlign: "right" }}>{fmt(Number(invoice.total_amount ?? 0))}</td>
                        </tr>
                    </tbody>
                </table>

                {invoice.notes && (
                    <div style={{ marginBottom: 24 }}>
                        <strong>Notas:</strong> {invoice.notes}
                    </div>
                )}

                <div className="footer">
                    Languages Education Consulting · Centro Examinador Cambridge en México
                </div>

                <script dangerouslySetInnerHTML={{ __html: "window.onload = () => window.print();" }} />
            </body>
        </html>
    );
}
