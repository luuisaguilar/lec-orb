import { HR_PROFILES } from '../src/lib/data/hr';
import * as fs from 'fs';

function generateSeedSQL() {
    console.log('Generating HR Seed SQL...');
    
    let sql = `-- Seed data for hr_profiles\n`;
    sql += `-- To be run in Supabase SQL Editor\n\n`;
    
    // We need a subquery to get the org_id
    const orgSubquery = `(SELECT id FROM public.organizations LIMIT 1)`;

    HR_PROFILES.forEach(p => {
        const responsibilities = p.responsibilities 
            ? p.responsibilities.split('\n').map(r => r.trim()).filter(r => r !== '')
            : [];

        let roleType = 'operative';
        const t = p.id.toUpperCase();
        if (t.includes('GERENTE') || t === 'DIRECTOR GENERAL' || t.includes('DIRECCION')) roleType = 'directive';
        else if (t.includes('COORDINADOR') || t.includes('REPRESENTANTE')) roleType = 'coordination';

        const requirements = {
            education: p.education,
            experience: p.experience,
            specialty: p.specialty,
            languages: p.languages,
            knowledge: p.knowledge,
            skills: p.skills,
            travel: p.travel,
            sex: p.sex
        };

        let parentNodeId = 'NULL';
        if (p.reportsTo && p.reportsTo.length > 0) {
            const reportsToName = p.reportsTo[0];
            const parent = HR_PROFILES.find(hp => hp.title === reportsToName || hp.id === reportsToName);
            if (parent) {
                parentNodeId = `'${parent.id}'`;
            }
        }

        const mission = p.mission ? p.mission.replace(/'/g, "''") : '';
        const roleTitle = p.title ? p.title.replace(/'/g, "''") : '';
        const nodeId = p.id.replace(/'/g, "''");
        const area = p.id.split(' ')[0].replace(/'/g, "''");
        const processId = p.processId ? `'${p.processId}'` : 'NULL';

        sql += `INSERT INTO public.hr_profiles (org_id, node_id, role_title, holder_name, area, role_type, mission, responsibilities, requirements, parent_node_id, process_id)\n`;
        sql += `VALUES (${orgSubquery}, '${nodeId}', '${roleTitle}', 'Vacante / Por asignar', '${area}', '${roleType}', '${mission}', '${JSON.stringify(responsibilities).replace(/'/g, "''")}'::jsonb, '${JSON.stringify(requirements).replace(/'/g, "''")}'::jsonb, ${parentNodeId}, ${processId})\n`;
        sql += `ON CONFLICT (org_id, node_id) DO UPDATE SET\n`;
        sql += `    role_title = EXCLUDED.role_title,\n`;
        sql += `    mission = EXCLUDED.mission,\n`;
        sql += `    responsibilities = EXCLUDED.responsibilities,\n`;
        sql += `    requirements = EXCLUDED.requirements,\n`;
        sql += `    parent_node_id = EXCLUDED.parent_node_id,\n`;
        sql += `    process_id = EXCLUDED.process_id,\n`;
        sql += `    updated_at = NOW();\n\n`;
    });

    fs.writeFileSync('./supabase/migrations/20260430_hr_data_seed.sql', sql);
    console.log('Done! Generated supabase/migrations/20260430_hr_data_seed.sql');
}

generateSeedSQL();
