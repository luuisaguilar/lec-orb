import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
    console.log("Testing connection to Supabase...");

    // Check organizations table
    const { error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .limit(1);

    if (orgError) {
        console.error("❌ Error fetching organizations:");
        console.error(orgError.message);
    } else {
        console.log("✅ Successfully queried 'organizations' table.");
    }

    // Check profiles table 
    const { error: profError } = await supabase
        .from('profiles')
        .select('*')
        .limit(1);

    if (profError) {
        console.error("❌ Error fetching profiles:");
        console.error(profError.message);
    } else {
        console.log("✅ Successfully queried 'profiles' table.");
    }

    console.log("Verification finished.");
}

testConnection();
