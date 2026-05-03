/* eslint-disable @typescript-eslint/no-require-imports */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function runTest() {
    const query = process.argv[2];
    
    // We'll use a trick: if it's a SELECT, we can try to use standard from().select()
    // but for testing, it's better to just use a fixed script for a specific test case.
    
    console.log("Checking for open payroll periods...");
    const { data: periods, error: pError } = await supabase
        .from('payroll_periods')
        .select('*')
        .limit(5);
        
    if (pError) {
        console.error("Error fetching periods:", pError.message);
        return;
    }
    
    if (!periods || periods.length === 0) {
        console.log("No payroll periods found. Please create one in the dashboard first.");
        return;
    }
    
    const period = periods[0];
    console.log(`Found period: ${period.name} (${period.start_date} to ${period.end_date}) ID: ${period.id}`);
    
    console.log("Running calculation...");
    const { data: result, error: rpcError } = await supabase.rpc('fn_calculate_payroll_for_period', {
        p_period_id: period.id
    });
    
    if (rpcError) {
        console.error("RPC Error:", rpcError.message);
    } else {
        console.log("Calculation Result:", JSON.stringify(result, null, 2));
        
        // Verify entries
        const { data: entries } = await supabase
            .from('payroll_entries')
            .select('*')
            .eq('period_id', period.id);
        console.log(`Generated ${entries?.length || 0} payroll entries.`);
        
        if (entries && entries.length > 0) {
            const entry = entries[0];
            const { data: items } = await supabase
                .from('payroll_line_items')
                .select('*')
                .eq('entry_id', entry.id);
            console.log(`Entry for ${entry.applicator_name} has ${items?.length || 0} line items.`);
        }
    }
}

runTest();
