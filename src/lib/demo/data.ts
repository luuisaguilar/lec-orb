// In-memory mock data store for demo mode
// This simulates the database for the demo experience

import { DEMO_ORG, DEMO_USER } from "./config";

export interface MockPack {
    id: string;
    org_id: string;
    codigo: string;
    nombre: string;
    status: "EN_SITIO" | "PRESTADO";
    current_school_id: string | null;
    current_applicator_id: string | null;
    notes: string | null;
    deleted_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface MockMovement {
    id: string;
    org_id: string;
    pack_id: string;
    type: "SALIDA" | "ENTRADA" | "AJUSTE";
    school_id: string | null;
    school_name: string | null;
    applicator_id: string | null;
    applicator_name: string | null;
    previous_status: string;
    new_status: string;
    notes: string | null;
    performed_by: string;
    created_at: string;
}

export interface MockSchool {
    id: string;
    org_id: string;
    name: string;
    address: string | null;
    city: string | null;
    contact_name: string | null;
    contact_phone: string | null;
    contact_email: string | null;
    levels: string[];
    rooms: any[];
    notes: string | null;
    deleted_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface MockApplicator {
    id: string;
    org_id: string;
    name: string;
    email: string | null;
    phone: string | null;
    rate_per_hour: number | null;
    roles: string[];
    certified_levels: string[];
    auth_user_id: string | null;
    notes: string | null;
    deleted_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface MockExamCatalog {
    id: string;
    org_id: string;
    name: string;
    code: string;
    duration_minutes: number;
    students_per_session: number;
    level: string;
    notes: string | null;
    deleted_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface MockOrgMember {
    id: string;
    org_id: string;
    user_id: string;
    role: "admin" | "supervisor" | "operador" | "applicator";
    full_name: string;
    email: string;
    created_at: string;
    updated_at: string;
}

export interface MockOrgInvitation {
    id: string;
    org_id: string;
    email: string;
    role: "admin" | "supervisor" | "operador" | "applicator";
    status: "pending" | "accepted" | "expired" | "revoked";
    invited_by: string;
    created_at: string;
    accepted_at: string | null;
}


// ===== SEED DATA =====

const now = new Date().toISOString();
const yesterday = new Date(Date.now() - 86400000).toISOString();
const twoDaysAgo = new Date(Date.now() - 172800000).toISOString();

let counter = 0;
function nextId() {
    return `demo-${++counter}-${Date.now()}`;
}

// Global mutable stores
export const mockPacks: MockPack[] = [
    { id: "pack-001", org_id: DEMO_ORG.id, codigo: "SPK-0001", nombre: "Starters Pack A", status: "EN_SITIO", current_school_id: null, current_applicator_id: null, notes: "Paquete inicial", deleted_at: null, created_at: twoDaysAgo, updated_at: now },
    { id: "pack-002", org_id: DEMO_ORG.id, codigo: "SPK-0002", nombre: "Starters Pack B", status: "PRESTADO", current_school_id: "school-001", current_applicator_id: "applicator-001", notes: null, deleted_at: null, created_at: twoDaysAgo, updated_at: yesterday },
    { id: "pack-003", org_id: DEMO_ORG.id, codigo: "SPK-0003", nombre: "Movers Pack A", status: "EN_SITIO", current_school_id: null, current_applicator_id: null, notes: null, deleted_at: null, created_at: twoDaysAgo, updated_at: now },
    { id: "pack-004", org_id: DEMO_ORG.id, codigo: "SPK-0004", nombre: "Movers Pack B", status: "PRESTADO", current_school_id: "school-002", current_applicator_id: "applicator-002", notes: "Enviado a Guadalajara", deleted_at: null, created_at: yesterday, updated_at: yesterday },
    { id: "pack-005", org_id: DEMO_ORG.id, codigo: "SPK-0005", nombre: "Flyers Pack A", status: "EN_SITIO", current_school_id: null, current_applicator_id: null, notes: null, deleted_at: null, created_at: yesterday, updated_at: now },
    { id: "pack-006", org_id: DEMO_ORG.id, codigo: "SPK-0006", nombre: "KET Pack A", status: "EN_SITIO", current_school_id: null, current_applicator_id: null, notes: null, deleted_at: null, created_at: now, updated_at: now },
    { id: "pack-007", org_id: DEMO_ORG.id, codigo: "SPK-0007", nombre: "PET Pack A", status: "PRESTADO", current_school_id: "school-001", current_applicator_id: "applicator-003", notes: null, deleted_at: null, created_at: now, updated_at: now },
    { id: "pack-008", org_id: DEMO_ORG.id, codigo: "SPK-0008", nombre: "FCE Pack A", status: "EN_SITIO", current_school_id: null, current_applicator_id: null, notes: "Nuevo", deleted_at: null, created_at: now, updated_at: now },
];

export const mockMovements: MockMovement[] = [
    { id: "mov-001", org_id: DEMO_ORG.id, pack_id: "pack-002", type: "SALIDA", school_id: "school-001", school_name: "Colegio Americano", applicator_id: "applicator-001", applicator_name: "Ana García", previous_status: "EN_SITIO", new_status: "PRESTADO", notes: null, performed_by: DEMO_USER.id, created_at: yesterday },
    { id: "mov-002", org_id: DEMO_ORG.id, pack_id: "pack-004", type: "SALIDA", school_id: "school-002", school_name: "Instituto Cervantes", applicator_id: "applicator-002", applicator_name: "Carlos López", previous_status: "EN_SITIO", new_status: "PRESTADO", notes: null, performed_by: DEMO_USER.id, created_at: yesterday },
    { id: "mov-003", org_id: DEMO_ORG.id, pack_id: "pack-007", type: "SALIDA", school_id: "school-001", school_name: "Colegio Americano", applicator_id: "applicator-003", applicator_name: "María Rodríguez", previous_status: "EN_SITIO", new_status: "PRESTADO", notes: null, performed_by: DEMO_USER.id, created_at: now },
];

export const mockSchools: MockSchool[] = [
    { id: "school-001", org_id: DEMO_ORG.id, name: "Colegio Americano", address: "Av. Reforma 123, CDMX", city: "CDMX", contact_name: "Dir. Alejandra Torres", contact_phone: "+52 55 1234 5678", contact_email: "contacto@camericano.edu.mx", levels: ["Primaria", "Secundaria"], rooms: [], notes: null, deleted_at: null, created_at: twoDaysAgo, updated_at: now },
    { id: "school-002", org_id: DEMO_ORG.id, name: "Instituto Cervantes", address: "Calle Juárez 456, Guadalajara", city: "Guadalajara", contact_name: "Prof. Ricardo Morales", contact_phone: "+52 33 9876 5432", contact_email: "info@cervantes.edu.mx", levels: ["Secundaria", "Preparatoria"], rooms: [], notes: "Sede principal", deleted_at: null, created_at: twoDaysAgo, updated_at: now },
    { id: "school-003", org_id: DEMO_ORG.id, name: "Escuela Montessori del Valle", address: "Blvd. de la Luz 789, Monterrey", city: "Monterrey", contact_name: "Lic. Patricia Vega", contact_phone: "+52 81 5555 1234", contact_email: "pvega@montessori.edu.mx", levels: ["Primaria"], rooms: [], notes: null, deleted_at: null, created_at: yesterday, updated_at: now },
    { id: "school-004", org_id: DEMO_ORG.id, name: "Preparatoria Anglo Mexicano", address: "Av. Universidad 321, Puebla", city: "Puebla", contact_name: null, contact_phone: null, contact_email: "admin@anglo.edu.mx", levels: ["Preparatoria"], rooms: [], notes: "Nuevo convenio 2026", deleted_at: null, created_at: now, updated_at: now },
];

export const mockApplicators: MockApplicator[] = [
    { id: "applicator-001", org_id: DEMO_ORG.id, name: "Ana García", email: "ana.garcia@lec.com", phone: "+52 55 1111 2222", rate_per_hour: 350, roles: ["examiner", "supervisor"], certified_levels: ["Starters", "Movers", "Flyers"], auth_user_id: null, notes: null, deleted_at: null, created_at: twoDaysAgo, updated_at: now },
    { id: "applicator-002", org_id: DEMO_ORG.id, name: "Carlos López", email: "carlos.lopez@lec.com", phone: "+52 33 3333 4444", rate_per_hour: 300, roles: ["examiner"], certified_levels: ["KET", "PET"], auth_user_id: null, notes: null, deleted_at: null, created_at: twoDaysAgo, updated_at: now },
    { id: "applicator-003", org_id: DEMO_ORG.id, name: "María Rodríguez", email: "maria.rodriguez@lec.com", phone: "+52 81 5555 6666", rate_per_hour: 400, roles: ["examiner", "supervisor", "trainer"], certified_levels: ["Starters", "Movers", "Flyers", "KET", "PET", "FCE"], auth_user_id: null, notes: "Senior examiner", deleted_at: null, created_at: twoDaysAgo, updated_at: now },
    { id: "applicator-004", org_id: DEMO_ORG.id, name: "Roberto Hernández", email: "roberto.h@lec.com", phone: null, rate_per_hour: 280, roles: ["examiner"], certified_levels: ["Starters", "Movers"], auth_user_id: null, notes: "En capacitación", deleted_at: null, created_at: yesterday, updated_at: now },
    { id: "applicator-005", org_id: DEMO_ORG.id, name: "Laura Martínez", email: null, phone: "+52 55 7777 8888", rate_per_hour: 320, roles: ["examiner"], certified_levels: ["Flyers", "KET", "PET"], auth_user_id: null, notes: null, deleted_at: null, created_at: now, updated_at: now },
];

export const mockExamCatalog: MockExamCatalog[] = [
    { id: "exam-001", org_id: DEMO_ORG.id, name: "Starters", code: "YLE-S", duration_minutes: 5, students_per_session: 1, level: "Pre-A1", notes: null, deleted_at: null, created_at: twoDaysAgo, updated_at: now },
    { id: "exam-002", org_id: DEMO_ORG.id, name: "Movers", code: "YLE-M", duration_minutes: 7, students_per_session: 1, level: "A1", notes: null, deleted_at: null, created_at: twoDaysAgo, updated_at: now },
    { id: "exam-003", org_id: DEMO_ORG.id, name: "Flyers", code: "YLE-F", duration_minutes: 9, students_per_session: 1, level: "A2", notes: null, deleted_at: null, created_at: twoDaysAgo, updated_at: now },
    { id: "exam-004", org_id: DEMO_ORG.id, name: "Key (KET)", code: "KET", duration_minutes: 12, students_per_session: 2, level: "A2", notes: null, deleted_at: null, created_at: twoDaysAgo, updated_at: now },
    { id: "exam-005", org_id: DEMO_ORG.id, name: "Preliminary (PET)", code: "PET", duration_minutes: 14, students_per_session: 2, level: "B1", notes: null, deleted_at: null, created_at: twoDaysAgo, updated_at: now },
    { id: "exam-006", org_id: DEMO_ORG.id, name: "First (FCE)", code: "FCE", duration_minutes: 16, students_per_session: 2, level: "B2", notes: null, deleted_at: null, created_at: twoDaysAgo, updated_at: now },
];

export const mockOrgMembers: MockOrgMember[] = [
    { id: "member-001", org_id: DEMO_ORG.id, user_id: DEMO_USER.id, role: "admin", full_name: "Demo Admin", email: "demo@lec-platform.com", created_at: twoDaysAgo, updated_at: now },
    { id: "member-002", org_id: DEMO_ORG.id, user_id: "user-002", role: "supervisor", full_name: "Laura Martínez (Sup)", email: "laura.m@lec-platform.com", created_at: twoDaysAgo, updated_at: now },
    { id: "member-003", org_id: DEMO_ORG.id, user_id: "user-003", role: "operador", full_name: "Carlos Operator", email: "carlos.op@lec-platform.com", created_at: yesterday, updated_at: now },
    { id: "member-004", org_id: DEMO_ORG.id, user_id: "user-004", role: "applicator", full_name: "Ana García", email: "ana.garcia@lec-platform.com", created_at: twoDaysAgo, updated_at: now },
];

export const mockOrgInvitations: MockOrgInvitation[] = [
    { id: "invitation-001", org_id: DEMO_ORG.id, email: "nuevo.supervisor@lec-platform.com", role: "supervisor", status: "pending", invited_by: DEMO_USER.id, created_at: yesterday, accepted_at: null },
    { id: "invitation-002", org_id: DEMO_ORG.id, email: "operador.noreply@lec-platform.com", role: "operador", status: "expired", invited_by: DEMO_USER.id, created_at: twoDaysAgo, accepted_at: null },
    { id: "invitation-003", org_id: DEMO_ORG.id, email: "applicator.test@lec-platform.com", role: "applicator", status: "pending", invited_by: DEMO_USER.id, created_at: now, accepted_at: null },
];


// ===== MUTATION HELPERS =====

export function addMockPack(pack: Omit<MockPack, "id" | "org_id" | "created_at" | "updated_at" | "deleted_at">) {
    const id = nextId();
    const newPack: MockPack = {
        id,
        org_id: DEMO_ORG.id,
        ...pack,
        deleted_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };
    mockPacks.unshift(newPack);
    return newPack;
}

export function addMockMovement(mov: Omit<MockMovement, "id" | "org_id" | "performed_by" | "created_at">) {
    const id = nextId();
    const newMov: MockMovement = {
        id,
        org_id: DEMO_ORG.id,
        performed_by: DEMO_USER.id,
        created_at: new Date().toISOString(),
        ...mov,
    };
    mockMovements.unshift(newMov);
    return newMov;
}

export function addMockSchool(school: Omit<MockSchool, "id" | "org_id" | "created_at" | "updated_at" | "deleted_at">) {
    const id = nextId();
    const newSchool: MockSchool = {
        id,
        org_id: DEMO_ORG.id,
        ...school,
        deleted_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };
    mockSchools.unshift(newSchool);
    return newSchool;
}

export function addMockApplicator(app: Omit<MockApplicator, "id" | "org_id" | "created_at" | "updated_at" | "deleted_at">) {
    const newApp: MockApplicator = {
        id: `APP-MOCK-${Date.now()}`, // Using a specific ID format for clarity
        org_id: DEMO_ORG.id,
        ...app,
        deleted_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };
    mockApplicators.push(newApp); // Changed from unshift to push for consistency with bulk add
    return newApp;
}

export function addBulkMockApplicators(applicators: Omit<MockApplicator, "id" | "org_id" | "created_at" | "updated_at" | "deleted_at">[]) {
    const newApps = applicators.map((app, idx) => ({
        ...app,
        id: `APP-MOCK-BULK-${Date.now()}-${idx}`, // Unique ID for bulk imports
        org_id: DEMO_ORG.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
    }));
    mockApplicators.push(...newApps);
    return newApps;
}

export function addMockOrgInvitation(invitation: Omit<MockOrgInvitation, "id" | "org_id" | "status" | "invited_by" | "created_at" | "accepted_at">) {
    const id = nextId();
    const newInv: MockOrgInvitation = {
        id,
        org_id: DEMO_ORG.id,
        status: "pending",
        invited_by: DEMO_USER.id,
        created_at: new Date().toISOString(),
        accepted_at: null,
        ...invitation,
    };
    mockOrgInvitations.unshift(newInv);
    return newInv;
}

export function updateMockOrgInvitationStatus(id: string, status: MockOrgInvitation["status"]) {
    const idx = mockOrgInvitations.findIndex(i => i.id === id);
    if (idx !== -1) {
        mockOrgInvitations[idx] = { ...mockOrgInvitations[idx], status };
        return mockOrgInvitations[idx];
    }
    return null;
}

export function deleteMockOrgMember(id: string) {
    const idx = mockOrgMembers.findIndex((m) => m.id === id);
    if (idx !== -1) {
        mockOrgMembers.splice(idx, 1);
        return true;
    }
    return false;
}


// ===== EVENTS =====

export interface MockEvent {
    id: string;
    org_id: string;
    name: string;
    event_date: string;
    school_id: string | null;
    school_name: string | null;
    venue_notes: string | null;
    status: string;
    notes: string | null;
    deleted_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface MockEventExam {
    id: string;
    org_id: string;
    event_id: string;
    exam_name: string;
    exam_code: string | null;
    duration_minutes: number;
    students_per_session: number;
    total_students: number;
    start_time: string | null;
    end_time: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

export interface MockSlot {
    id: string;
    org_id: string;
    event_exam_id: string;
    slot_number: number;
    start_time: string;
    end_time: string;
    applicator_id: string | null;
    applicator_name: string | null;
    room_name: string | null;
    pack_id: string | null;
    status: string;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
const twoWeeks = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);

export const mockEvents: MockEvent[] = [
    { id: "event-001", org_id: DEMO_ORG.id, name: "Starters & Movers — Colegio Americano", event_date: tomorrow, school_id: "school-001", school_name: "Colegio Americano", venue_notes: "Salón 101 y 102", status: "confirmed", notes: "30 alumnos Starters, 20 Movers", deleted_at: null, created_at: yesterday, updated_at: now },
    { id: "event-002", org_id: DEMO_ORG.id, name: "KET & PET — Instituto Cervantes", event_date: nextWeek, school_id: "school-002", school_name: "Instituto Cervantes", venue_notes: "Auditorio principal", status: "draft", notes: null, deleted_at: null, created_at: now, updated_at: now },
    { id: "event-003", org_id: DEMO_ORG.id, name: "FCE — Escuela Montessori", event_date: twoWeeks, school_id: "school-003", school_name: "Escuela Montessori del Valle", venue_notes: null, status: "draft", notes: "Pendiente confirmar fecha", deleted_at: null, created_at: now, updated_at: now },
];

export const mockEventExams: MockEventExam[] = [
    { id: "ee-001", org_id: DEMO_ORG.id, event_id: "event-001", exam_name: "Starters", exam_code: "YLE-S", duration_minutes: 5, students_per_session: 1, total_students: 30, start_time: "09:00", end_time: "11:30", notes: null, created_at: yesterday, updated_at: now },
    { id: "ee-002", org_id: DEMO_ORG.id, event_id: "event-001", exam_name: "Movers", exam_code: "YLE-M", duration_minutes: 7, students_per_session: 1, total_students: 20, start_time: "12:00", end_time: "14:20", notes: null, created_at: yesterday, updated_at: now },
    { id: "ee-003", org_id: DEMO_ORG.id, event_id: "event-002", exam_name: "Key (KET)", exam_code: "KET", duration_minutes: 12, students_per_session: 2, total_students: 16, start_time: "08:00", end_time: "09:36", notes: null, created_at: now, updated_at: now },
    { id: "ee-004", org_id: DEMO_ORG.id, event_id: "event-002", exam_name: "Preliminary (PET)", exam_code: "PET", duration_minutes: 14, students_per_session: 2, total_students: 10, start_time: "10:00", end_time: "11:10", notes: null, created_at: now, updated_at: now },
    { id: "ee-005", org_id: DEMO_ORG.id, event_id: "event-003", exam_name: "First (FCE)", exam_code: "FCE", duration_minutes: 16, students_per_session: 2, total_students: 8, start_time: null, end_time: null, notes: "Pendiente", created_at: now, updated_at: now },
];

export const mockSlots: MockSlot[] = [
    // Starters slots (event-001, ee-001) - first 6 of 30
    { id: "slot-001", org_id: DEMO_ORG.id, event_exam_id: "ee-001", slot_number: 1, start_time: "09:00", end_time: "09:05", applicator_id: "applicator-001", applicator_name: "Ana García", room_name: "Salón 101", pack_id: "pack-001", status: "assigned", notes: null, created_at: yesterday, updated_at: now },
    { id: "slot-002", org_id: DEMO_ORG.id, event_exam_id: "ee-001", slot_number: 2, start_time: "09:05", end_time: "09:10", applicator_id: "applicator-001", applicator_name: "Ana García", room_name: "Salón 101", pack_id: "pack-001", status: "assigned", notes: null, created_at: yesterday, updated_at: now },
    { id: "slot-003", org_id: DEMO_ORG.id, event_exam_id: "ee-001", slot_number: 3, start_time: "09:10", end_time: "09:15", applicator_id: "applicator-003", applicator_name: "María Rodríguez", room_name: "Salón 102", pack_id: "pack-003", status: "assigned", notes: null, created_at: yesterday, updated_at: now },
    { id: "slot-004", org_id: DEMO_ORG.id, event_exam_id: "ee-001", slot_number: 4, start_time: "09:15", end_time: "09:20", applicator_id: null, applicator_name: null, room_name: null, pack_id: null, status: "open", notes: null, created_at: yesterday, updated_at: now },
    { id: "slot-005", org_id: DEMO_ORG.id, event_exam_id: "ee-001", slot_number: 5, start_time: "09:20", end_time: "09:25", applicator_id: null, applicator_name: null, room_name: null, pack_id: null, status: "open", notes: null, created_at: yesterday, updated_at: now },
    // KET slots (event-002, ee-003) - 8 slots for 16 students @ 2/session
    { id: "slot-006", org_id: DEMO_ORG.id, event_exam_id: "ee-003", slot_number: 1, start_time: "08:00", end_time: "08:12", applicator_id: "applicator-002", applicator_name: "Carlos López", room_name: "Auditorio A", pack_id: null, status: "assigned", notes: null, created_at: now, updated_at: now },
    { id: "slot-007", org_id: DEMO_ORG.id, event_exam_id: "ee-003", slot_number: 2, start_time: "08:12", end_time: "08:24", applicator_id: "applicator-002", applicator_name: "Carlos López", room_name: "Auditorio A", pack_id: null, status: "assigned", notes: null, created_at: now, updated_at: now },
    { id: "slot-008", org_id: DEMO_ORG.id, event_exam_id: "ee-003", slot_number: 3, start_time: "08:24", end_time: "08:36", applicator_id: null, applicator_name: null, room_name: null, pack_id: null, status: "open", notes: null, created_at: now, updated_at: now },
];

export function addMockEvent(event: Omit<MockEvent, "id" | "org_id" | "created_at" | "updated_at" | "deleted_at">) {
    const id = nextId();
    const newEvent: MockEvent = {
        id,
        org_id: DEMO_ORG.id,
        ...event,
        deleted_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };
    mockEvents.unshift(newEvent);
    return newEvent;
}

// ===== PAYROLL =====

export interface MockPayrollPeriod {
    id: string;
    org_id: string;
    name: string;
    start_date: string;
    end_date: string;
    status: string;
    total_amount: number;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

export interface MockPayrollEntry {
    id: string;
    org_id: string;
    period_id: string;
    applicator_id: string;
    applicator_name: string;
    hours_worked: number;
    rate_per_hour: number;
    events_count: number;
    slots_count: number;
    subtotal: number;
    adjustments: number;
    total: number;
    status: string;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

const lastMonth = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
const monthStart = new Date().toISOString().slice(0, 8) + "01";
const monthEnd = new Date().toISOString().slice(0, 10);
const prevMonthStart = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 8) + "01";

export const mockPayrollPeriods: MockPayrollPeriod[] = [
    { id: "period-001", org_id: DEMO_ORG.id, name: "Febrero 2026", start_date: prevMonthStart, end_date: lastMonth, status: "paid", total_amount: 14250, notes: "Pagado 28/02", created_at: yesterday, updated_at: now },
    { id: "period-002", org_id: DEMO_ORG.id, name: "Marzo 2026", start_date: monthStart, end_date: monthEnd, status: "open", total_amount: 8640, notes: null, created_at: now, updated_at: now },
];

export const mockPayrollEntries: MockPayrollEntry[] = [
    // Feb period
    { id: "pe-001", org_id: DEMO_ORG.id, period_id: "period-001", applicator_id: "applicator-001", applicator_name: "Ana García", hours_worked: 12, rate_per_hour: 350, events_count: 3, slots_count: 24, subtotal: 4200, adjustments: 0, total: 4200, status: "paid", notes: null, created_at: yesterday, updated_at: now },
    { id: "pe-002", org_id: DEMO_ORG.id, period_id: "period-001", applicator_id: "applicator-002", applicator_name: "Carlos López", hours_worked: 8, rate_per_hour: 300, events_count: 2, slots_count: 16, subtotal: 2400, adjustments: 0, total: 2400, status: "paid", notes: null, created_at: yesterday, updated_at: now },
    { id: "pe-003", org_id: DEMO_ORG.id, period_id: "period-001", applicator_id: "applicator-003", applicator_name: "María Rodríguez", hours_worked: 15, rate_per_hour: 400, events_count: 4, slots_count: 30, subtotal: 6000, adjustments: 150, total: 6150, status: "paid", notes: "Bono supervisor", created_at: yesterday, updated_at: now },
    { id: "pe-004", org_id: DEMO_ORG.id, period_id: "period-001", applicator_id: "applicator-004", applicator_name: "Roberto Hernández", hours_worked: 5, rate_per_hour: 280, events_count: 1, slots_count: 10, subtotal: 1400, adjustments: 100, total: 1500, status: "paid", notes: "Ajuste capacitación", created_at: yesterday, updated_at: now },
    // Mar period
    { id: "pe-005", org_id: DEMO_ORG.id, period_id: "period-002", applicator_id: "applicator-001", applicator_name: "Ana García", hours_worked: 6, rate_per_hour: 350, events_count: 2, slots_count: 12, subtotal: 2100, adjustments: 0, total: 2100, status: "pending", notes: null, created_at: now, updated_at: now },
    { id: "pe-006", org_id: DEMO_ORG.id, period_id: "period-002", applicator_id: "applicator-002", applicator_name: "Carlos López", hours_worked: 4, rate_per_hour: 300, events_count: 1, slots_count: 8, subtotal: 1200, adjustments: 0, total: 1200, status: "pending", notes: null, created_at: now, updated_at: now },
    { id: "pe-007", org_id: DEMO_ORG.id, period_id: "period-002", applicator_id: "applicator-003", applicator_name: "María Rodríguez", hours_worked: 8, rate_per_hour: 400, events_count: 2, slots_count: 16, subtotal: 3200, adjustments: 0, total: 3200, status: "pending", notes: null, created_at: now, updated_at: now },
    { id: "pe-008", org_id: DEMO_ORG.id, period_id: "period-002", applicator_id: "applicator-005", applicator_name: "Laura Martínez", hours_worked: 6.7, rate_per_hour: 320, events_count: 2, slots_count: 13, subtotal: 2144, adjustments: -4, total: 2140, status: "pending", notes: null, created_at: now, updated_at: now },
];

// ===== CENNI =====

export interface MockCenniCase {
    id: string;
    org_id: string;
    folio_cenni: string;
    cliente_estudiante: string;
    celular: string | null;
    correo: string | null;
    solicitud_cenni: boolean;
    acta_o_curp: boolean;
    id_documento: boolean;
    certificado: string | null;
    datos_curp: string | null;
    cliente: string | null;
    estatus: string;
    estatus_certificado: string | null;
    notes: string | null;
    deleted_at: string | null;
    created_at: string;
    updated_at: string;
}

export const mockCenniCases: MockCenniCase[] = [
    { id: "cenni-001", org_id: DEMO_ORG.id, folio_cenni: "322901", cliente_estudiante: "ANABEL LOPEZ", celular: "6622336481", correo: "lunabel09@hotmail.com", solicitud_cenni: true, acta_o_curp: true, id_documento: true, certificado: "✅", datos_curp: "LOFA851009MSRPLN07", cliente: null, estatus: "ENVIADO", estatus_certificado: null, notes: null, deleted_at: null, created_at: twoDaysAgo, updated_at: now },
    { id: "cenni-002", org_id: DEMO_ORG.id, folio_cenni: "335611", cliente_estudiante: "REBECA MORENO", celular: "662 501 7635", correo: "rebecamoreno0820@hotmail.com", solicitud_cenni: true, acta_o_curp: true, id_documento: true, certificado: "✅", datos_curp: "MOFR940820MSRRNB01", cliente: null, estatus: "ENVIADO", estatus_certificado: null, notes: null, deleted_at: null, created_at: twoDaysAgo, updated_at: now },
    { id: "cenni-003", org_id: DEMO_ORG.id, folio_cenni: "343383", cliente_estudiante: "APODACA URIBE CESAR LUIS", celular: null, correo: "yfelix.69@gmail.com", solicitud_cenni: true, acta_o_curp: true, id_documento: true, certificado: "OXFORD OOPT", datos_curp: "AOUC021104HSRPRSA8", cliente: "ENSO", estatus: "ENVIADO", estatus_certificado: null, notes: null, deleted_at: null, created_at: twoDaysAgo, updated_at: now },
    { id: "cenni-004", org_id: DEMO_ORG.id, folio_cenni: "342573", cliente_estudiante: "ESCOBEDO TORRES DANIELA", celular: null, correo: "yfelix.69@gmail.com", solicitud_cenni: true, acta_o_curp: true, id_documento: true, certificado: "LINGUASKILL", datos_curp: "EOTD030512MSRSRNA3", cliente: "ENSO", estatus: "ENVIADO", estatus_certificado: null, notes: null, deleted_at: null, created_at: twoDaysAgo, updated_at: now },
    { id: "cenni-005", org_id: DEMO_ORG.id, folio_cenni: "344129", cliente_estudiante: "CASTILLO CAZARES KENDRA GPE", celular: null, correo: null, solicitud_cenni: true, acta_o_curp: true, id_documento: true, certificado: null, datos_curp: null, cliente: "EXTERNO", estatus: "ENVIADO", estatus_certificado: null, notes: null, deleted_at: null, created_at: twoDaysAgo, updated_at: now },
    { id: "cenni-006", org_id: DEMO_ORG.id, folio_cenni: "344220", cliente_estudiante: "VALENZUELA SALCIDO MARIA JOSE", celular: null, correo: "coordinacionexamenes@lec.mx", solicitud_cenni: true, acta_o_curp: true, id_documento: true, certificado: null, datos_curp: null, cliente: "LEC", estatus: "ENVIADO", estatus_certificado: null, notes: null, deleted_at: null, created_at: twoDaysAgo, updated_at: now },
    { id: "cenni-007", org_id: DEMO_ORG.id, folio_cenni: "338694", cliente_estudiante: "MUÑOZ FLORES IRLANDA", celular: null, correo: "lec.bajacalifornia@gmail.com", solicitud_cenni: true, acta_o_curp: true, id_documento: true, certificado: "COPIA LINGUASKILL", datos_curp: null, cliente: "BC", estatus: "BC", estatus_certificado: null, notes: null, deleted_at: null, created_at: twoDaysAgo, updated_at: now },
    { id: "cenni-008", org_id: DEMO_ORG.id, folio_cenni: "345638", cliente_estudiante: "MARIA DEL ROSARIO VALENZUELA COTA", celular: null, correo: "mariadelrosario.1705@outlook.com", solicitud_cenni: true, acta_o_curp: true, id_documento: true, certificado: "COPIA OOPT", datos_curp: "VACR940517MSLLTS09", cliente: "SINALOA", estatus: "ENVIADO", estatus_certificado: null, notes: null, deleted_at: null, created_at: yesterday, updated_at: now },
    { id: "cenni-009", org_id: DEMO_ORG.id, folio_cenni: "359284", cliente_estudiante: "ARLETH LEYVA SOTOMAYOR", celular: null, correo: "sotomayorarleth2003@gmail.com", solicitud_cenni: false, acta_o_curp: false, id_documento: false, certificado: "COPIAS LINGUA", datos_curp: "LESA030623MSRYTRA2", cliente: "EXTERNO", estatus: "ENVIADO", estatus_certificado: "15-03-2025", notes: null, deleted_at: null, created_at: yesterday, updated_at: now },
    { id: "cenni-010", org_id: DEMO_ORG.id, folio_cenni: "372659", cliente_estudiante: "KENDRA GUADALUPE CASTILLO CAZAREZ", celular: null, correo: "kgcc.123@outlook.es", solicitud_cenni: false, acta_o_curp: false, id_documento: false, certificado: "COPIA OOPT", datos_curp: "CACK000116MSRSZNA2", cliente: "EXTERNO", estatus: "SOLICITADO", estatus_certificado: "08-01-2026", notes: null, deleted_at: null, created_at: now, updated_at: now },
    { id: "cenni-011", org_id: DEMO_ORG.id, folio_cenni: "367689", cliente_estudiante: "KATE DANIELA VERDUGO TORRES", celular: null, correo: "Verdugokatedaniela@gmail.com", solicitud_cenni: false, acta_o_curp: false, id_documento: false, certificado: "COPIA TOEFL ITP", datos_curp: "VETK950228MSRRRT02", cliente: "EXTERNO", estatus: "SOLICITADO", estatus_certificado: "23-01-2026", notes: null, deleted_at: null, created_at: now, updated_at: now },
    { id: "cenni-012", org_id: DEMO_ORG.id, folio_cenni: "374010", cliente_estudiante: "GILBERTO ADRIAN ZAVALA VALENZUELA", celular: null, correo: "zavalacbtisadrian@gmail.com", solicitud_cenni: false, acta_o_curp: false, id_documento: false, certificado: "COPIA OOPT", datos_curp: "ZAVG860404HSRVLL06", cliente: "EXTERNO", estatus: "SOLICITADO", estatus_certificado: "23-01-2026", notes: null, deleted_at: null, created_at: now, updated_at: now },
];

export function addMockCenniCase(c: Omit<MockCenniCase, "id" | "org_id" | "created_at" | "updated_at" | "deleted_at">) {
    const id = `cenni-${Date.now()}`;
    const newCase: MockCenniCase = {
        id,
        org_id: DEMO_ORG.id,
        ...c,
        deleted_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };
    mockCenniCases.unshift(newCase);
    return newCase;
}

export function updateMockCenniCase(id: string, updates: Partial<MockCenniCase>) {
    const idx = mockCenniCases.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    mockCenniCases[idx] = { ...mockCenniCases[idx], ...updates, updated_at: new Date().toISOString() };
    return mockCenniCases[idx];
}

export function addBulkMockCenni(cennis: Omit<MockCenniCase, "id" | "org_id" | "created_at" | "updated_at" | "deleted_at">[]) {
    const newCases = cennis.map((c, idx) => ({
        ...c,
        id: `CENNI-MOCK-BULK-${Date.now()}-${idx}`,
        org_id: DEMO_ORG.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
    }));
    mockCenniCases.push(...newCases);
    return newCases;
}
