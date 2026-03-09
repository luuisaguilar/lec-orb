/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-vars */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkSchema() {
    // try inserting a mock slot
    const { data, error } = await supabase.from('event_slots').insert([{
        event_id: '11111111-1111-1111-1111-111111111111',
        slot_number: 999,
        start_time: '12:00:00',
        end_time: '13:00:00',
        component: 'speaking',
        date: '2026-03-03',
        is_break: false,
        status: 'PENDING'
    }]);

    console.log("Insert Error:", error);
}

checkSchema();
