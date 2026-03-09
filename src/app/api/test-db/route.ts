import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
    const supabase = await createClient();

    // Quick and dirty way to check what rows exist with PENDIENTE or get the column metadata
    // We can't run raw SQL easily without the postgres connection string, but we can query the table directly.

    await supabase
        .rpc('get_cenni_enum_values'); // We might not have this, so let's try reading a fake row to see the error, or reading an existing one

    // Let's try to do an insert that we know will fail just to see if the default is triggered

    const { data, error } = await supabase
        .from('cenni_cases')
        .insert({
            folio_cenni: 'TEST-DEFAULT',
            cliente_estudiante: 'Test Default',
            // Omit estatus to let it default
        })
        .select()
        .single();

    return NextResponse.json({ testInsert: { data, error } });
}
