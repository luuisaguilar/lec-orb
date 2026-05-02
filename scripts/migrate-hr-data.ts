import { createAdminClient } from '../src/lib/supabase/admin';
import { HR_PROFILES } from '../src/lib/data/hr';

async function migrateHRData() {
    console.log('🚀 Iniciando migración de datos de RRHH...');
    
    const supabase = createAdminClient();

    // 1. Obtener la organización por defecto (o la primera que exista)
    const { data: orgs, error: orgError } = await supabase
        .from('organizations')
        .select('id, name')
        .limit(1);

    if (orgError || !orgs || orgs.length === 0) {
        console.error('❌ Error: No se encontró ninguna organización en la base de datos.', orgError);
        return;
    }

    const orgId = orgs[0].id;
    console.log(`🏢 Usando organización: ${orgs[0].name} (${orgId})`);

    // 2. Mapear datos estáticos al esquema de base de datos
    const profilesToInsert = HR_PROFILES.map(p => {
        // Normalizar responsabilidades (convertir string con saltos de línea a array)
        const responsibilities = p.responsibilities 
            ? p.responsibilities.split('\n').map(r => r.trim()).filter(r => r !== '')
            : [];

        // Determinar tipo de rol
        let roleType = 'operative';
        const t = p.id.toUpperCase();
        if (t.includes('GERENTE') || t === 'DIRECTOR GENERAL' || t.includes('DIRECCION')) roleType = 'directive';
        else if (t.includes('COORDINADOR') || t.includes('REPRESENTANTE')) roleType = 'coordination';

        // Mapear requisitos
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

        // Encontrar parent_node_id (basado en reportsTo)
        // reportsTo es un array de nombres de roles o IDs. Buscamos el ID correspondiente.
        let parentNodeId = null;
        if (p.reportsTo && p.reportsTo.length > 0) {
            const reportsToName = p.reportsTo[0];
            const parent = HR_PROFILES.find(hp => hp.title === reportsToName || hp.id === reportsToName);
            if (parent) {
                parentNodeId = parent.id;
            }
        }

        return {
            org_id: orgId,
            node_id: p.id,
            role_title: p.title,
            holder_name: 'Vacante / Por asignar',
            area: p.id.split(' ')[0],
            role_type: roleType,
            mission: p.mission,
            responsibilities: responsibilities,
            requirements: requirements,
            parent_node_id: parentNodeId,
            process_id: p.processId || null,
            updated_at: new Date().toISOString()
        };
    });

    console.log(`📊 Procesados ${profilesToInsert.length} perfiles para migración.`);

    // 3. Insertar con UPSERT (Idempotencia)
    // Usamos node_id y org_id como clave única para el conflicto
    const { error } = await supabase
        .from('hr_profiles')
        .upsert(profilesToInsert, { 
            onConflict: 'org_id, node_id',
            ignoreDuplicates: false 
        });

    if (error) {
        console.error('❌ Error durante el UPSERT:', error);
    } else {
        console.log('✅ Migración completada exitosamente.');
    }
}

migrateHRData().catch(err => {
    console.error('💥 Error fatal en la migración:', err);
    process.exit(1);
});
