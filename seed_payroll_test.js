/* eslint-disable @typescript-eslint/no-require-imports */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function seedTest() {
    console.log("Seeding test data for Payroll...");
    
    // 1. Get organization
    const { data: orgs } = await supabase.from('organizations').select('*').limit(1);
    if (!orgs || orgs.length === 0) {
        console.error("No organization found to seed.");
        return;
    }
    const orgId = orgs[0].id;
    console.log(`Using Org: ${orgs[0].name} (${orgId})`);

    // 2. Create Payroll Period
    const { data: period, error: pErr } = await supabase.from('payroll_periods').insert([{
        org_id: orgId,
        name: 'Test Period Phase 3',
        start_date: '2026-03-01',
        end_date: '2026-03-31',
        status: 'open'
    }]).select().single();
    
    if (pErr) {
        console.error("Error creating period:", pErr.message);
        return;
    }
    console.log(`Created Period: ${period.name} ID: ${period.id}`);

    // 3. Ensure an applicator exists
    let { data: applicator } = await supabase.from('applicators').select('*').limit(1).single();
    if (!applicator) {
        const { data: newApp } = await supabase.from('applicators').insert([{
            org_id: orgId,
            name: 'Test Applicator',
            rate_per_hour: 250
        }]).select().single();
        applicator = newApp;
    }
    console.log(`Using Applicator: ${applicator.name}`);

    // 4. Create Event
    const { data: event, error: eErr } = await supabase.from('events').insert([{
        org_id: orgId,
        name: 'Test Certification Event',
        event_date: '2026-03-15',
        status: 'confirmed'
    }]).select().single();
    
    if (eErr) {
        console.error("Error creating event:", eErr.message);
        return;
    }
    console.log(`Created Event: ${event.name}`);

    // 5. Assign to Staff
    await supabase.from('event_staff').insert([{
        org_id: orgId,
        event_id: event.id,
        applicator_id: applicator.id,
        role: 'SE',
        hourly_rate: 300,
        fixed_payment: 50
    }]);

    // 6. Create Slot and Complete it
    // Need an event_exam first
    const { data: exam } = await supabase.from('event_exams').insert([{
        event_id: event.id,
        exam_id: (await supabase.from('exams').select('id').limit(1).single()).data?.id || '00000000-0000-0000-0000-000000000000',
        duration_minutes: 120 // 2 hours
    }]).select().single();

    if (exam) {
        await supabase.from('slots').insert([{
            event_exam_id: exam.id,
            applicator_id: applicator.id,
            slot_number: 1,
            start_time: '09:00:00',
            end_time: '11:00:00',
            date: '2026-03-15',
            status: 'completed'
        }]);
        console.log("Created and completed 2-hour slot.");
    }

    console.log("Ready for calculation test!");
}

seedTest();
