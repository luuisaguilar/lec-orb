export interface JobProfile {
  id: string;
  title: string;
  reportsTo: string[];
  subordinates: string[];
  mission: string;
  sex?: string;
  experience?: string;
  travel?: string;
  education?: string;
  specialty?: string;
  desiredExp?: string;
  knowledge?: string;
  skills?: string;
  languages?: string;
  responsibilities: string;
  otherRoles?: string;
  attributes?: string;
  file?: string;
  processId?: string;
}

export interface OrgNode {
  id: string;
  role: string;
  name: string;
  area: string;
  parentId?: string;
  children?: OrgNode[];
  mission?: string;
  responsibilities?: string | string[];
  type: 'directive' | 'coordination' | 'operative';
  sex?: string;
  experience?: string;
  travel?: string;
  education?: string;
  specialty?: string;
  knowledge?: string;
  skills?: string;
  languages?: string;
  processId?: string;
  last_pdf_path?: string;
}

/**
 * Builds a hierarchical tree from a flat list of HR profiles.
 * Works with both static data and Supabase records.
 */
export function buildHierarchy(rawData: any[]): OrgNode {
  if (!rawData || rawData.length === 0) return { id: 'root', role: 'No Data', name: '', area: '', type: 'operative' };

  const nodeMap = new Map<string, OrgNode>();
  
  rawData.forEach(p => {
    const isDB = 'role_title' in p;
    const nodeId = isDB ? p.node_id : p.id;
    const requirements = isDB ? (p.requirements || {}) : p;

    nodeMap.set(nodeId, {
      id: nodeId,
      role: isDB ? p.role_title : p.title,
      name: isDB ? (p.holder_name || 'Vacante / Por asignar') : 'Vacante / Por asignar',
      area: isDB ? p.area : (p.id ? p.id.split(' ')[0] : 'Gral'),
      mission: p.mission,
      responsibilities: p.responsibilities,
      type: (isDB ? p.role_type : 'operative') as 'directive' | 'coordination' | 'operative',
      sex: requirements.sex,
      experience: requirements.experience,
      travel: requirements.travel,
      education: requirements.education,
      specialty: requirements.specialty,
      knowledge: requirements.knowledge,
      skills: requirements.skills,
      languages: requirements.languages,
      processId: p.process_id || p.processId,
      last_pdf_path: p.last_pdf_path,
      parentId: isDB ? p.parent_node_id : (p.reportsTo?.[0] ? p.reportsTo[0] : undefined),
      children: []
    });
  });

  const roots: OrgNode[] = [];

  nodeMap.forEach(node => {
    const parentId = node.parentId;
    let actualParentId = parentId;
    if (parentId && !nodeMap.has(parentId)) {
        const parentByTitle = Array.from(nodeMap.values()).find(n => n.role === parentId);
        if (parentByTitle) actualParentId = parentByTitle.id;
    }

    if (!actualParentId || actualParentId === node.id) {
      roots.push(node);
    } else {
      const parent = nodeMap.get(actualParentId);
      if (parent) {
        parent.children = parent.children || [];
        if (!parent.children.find(c => c.id === node.id)) {
          parent.children.push(node);
        }
      } else {
        roots.push(node);
      }
    }
  });

  const directorGeneral = roots.find(r => r.role.toUpperCase() === 'DIRECTOR GENERAL' || r.id.toUpperCase() === 'DIRECTOR GENERAL');
  return directorGeneral || roots[0] || Array.from(nodeMap.values())[0];
}


export const HR_PROFILES = [
  {
    "id": "ADMINISTRADOR DE SISTEMAS",
    "title": "Administrador de Sistemas",
    "reportsTo": [
      "Diseñador y Desarrollador Web"
    ],
    "subordinates": [],
    "mission": "Garantizar el correcto funcionamiento, mantenimiento y seguridad de la infraestructura tecnológica de la empresa. Administrar servidores, redes y sistemas informáticos, así como ofrecer soporte técnico a los usuarios internos.",
    "sex": "Indistinto",
    "experience": "Deseable 1 año",
    "travel": "Si",
    "education": "Licenciatura o Ingeniería",
    "specialty": "Tecnologías de la Información, Redes, Seguridad Informática",
    "desiredExp": "",
    "knowledge": "Administración de sistemas operativos (Windows, Linux), redes LAN/WAN, firewalls, respaldos, virtualización (VMware, Hyper-V), servicios en la nube, ciberseguridad, Active Directory, herramientas de monitoreo.",
    "skills": "Capacidad analítica. \r\nResolución de problemas.\r\n Atención al cliente.\r\n Trabajo bajo presión.\r\n Organización.\r\n Documentación técnica.\r\n Trabajo en equipo.",
    "languages": "Español, deseable Inglés técnico nivel B1-B2 MCRE",
    "responsibilities": "Administrar servidores y redes.\r\n Monitorear el desempeño de la infraestructura tecnológica. \r\nImplementar y dar mantenimiento a sistemas.\r\n Realizar respaldos y planes de recuperación.\r\n Brindar soporte técnico a usuarios.\r\n Garantizar la seguridad informática.\r\n Documentar procedimientos.",
    "otherRoles": "Apoyo en adquisición de tecnología.\r\n Apoyo en capacitación tecnológica.\r\nApoyo en áreas que lo requieran.",
    "attributes": "Proactividad.\r\n Pensamiento lógico.\r\n Responsabilidad.\r\n Orientación al servicio\r\n Capacidad de aprendizaje continuo.\r\n Atención al detalle.",
    "file": "PERFIL DE PUESTO ADMINISTRADOR DE SISTEMAS (1).xlsx",
    "processId": "PROC_FINANZAS"
  },
  {
    "id": "APLICADOR",
    "title": "Aplicador",
    "reportsTo": [
      "Coordinadora de Exámenes"
    ],
    "subordinates": [],
    "mission": "Aplicar exámenes de manera profesional y capacitada para logra el trabajo de la manera \r\nmás eficiente de tal forma que se cumpla con los estándares de Cambridge y con otras casa certificadoras del idioma de inglés, con el fin de lograr la satisfacción de nuestros clientes.",
    "sex": "Indistinto",
    "experience": "N/A",
    "travel": "Si",
    "education": "Licenciatura o Carrera Trunca",
    "specialty": "Enseñanza del Inglés o afín",
    "desiredExp": "En la enseñanza de inglés a niños, jóvenes y adultos, preferentemente en al menos un nivel.\r\nDe los estándares y principios de enseñanza de inglés como lengua extranjera.\r\nCon los diferentes enfoques y metodologías utilizados en la enseñanza del inglés.\r\nEn la administración de exámenes de evaluación del idioma inglés, como el IELTS, TOEFL ITP, LinguaSkill, entre otros.",
    "knowledge": "Comprensión de las directrices y manuales relacionados con los exámenes de evaluación del inglés.\r\nFamiliaridad con los procedimientos y requisitos específicos de cada examen, así como el uso adecuado del material y las instrucciones proporcionadas.\r\nComprensión de los criterios de evaluación utilizados en los exámenes y capacidad para aplicarlos de manera justa y coherente.\r\nDe las normas de confidencialidad y ética relacionadas con la administración de exámenes.                                    Conocimientos sobre los recursos relativos a la atención a personas con discapacidad.\r\nConocimientos sobre las posibles barreras de participación de los alumnos con discapacidad.",
    "skills": "Comunicación (verbal y escrita)\r\nManejo de herramientas de colaboración (Videoconferencias) en línea como Google Workspace para Educación, Microsoft Teams o Zoom.\r\nManejo de herramientas de presentación como Google Slides o Prezi.\r\nManejo de herramientas de paquete office (Microsoft Word, Excel, Powerpoint)\r\nManejo de heramientas de comunicación digital como correos electrónicos, mensajería instantánea (Whatsapp, Messenger, Telegram)",
    "languages": "Español, Nivel deseable Ingles B2 MCRE ( Marco Común de Referencia Europeo)",
    "responsibilities": "Mantener la confidencialidad del material del examen y asegurar su custodia segura antes y después de su administración.\r\nFamiliarizarse y cumplir con los manuales y directrices proporcionados por Cambridge  u otras casas certificadoras para la administración de exámenes.\r\nTratar a todos los candidatos de manera justa y equitativa, sin mostrar favoritismo ni discriminación.\r\nEstar familiarizado con los procedimientos del examen, asegurando que se sigan adecuadamente y que los candidatos reciban las instrucciones necesarias.\r\nConocer el material del examen y ser capaz de utilizar las instrucciones y recursos proporcionados de manera efectiva durante su administración.\r\nAplicar los criterios de evaluación establecidos de manera consistente y justa al evaluar el desempeño de los candidatos.\r\nMantener un comportamiento profesional, actuar con respeto y cortesía hacia los candidatos.\r\nApoyar y mostrar flexibilidad en la organización y logística de los exámenes, adaptándose a las necesidades y circunstancias particulares.                                                                              Asegurar el aumento del desempeño del SGC y SGOE de acuerdo a los controles establecidos en el proceso.\r\nColaborar en la participación de los alumnos con discapacidad.\r\nPotenciar el desarrollo de las capacidades de los alumnos con necesidades educativas especiales. \r\nPromover la inclusión de los alumnos con necesidades específicas \r\nOfrecer recursos para adaptar y mejorar proceso de aprendizaje.\r\nGarantizar el enfoque a los estudiantes, partes interesadas durante la aplicacion de examenes.\r\nMantener una comunicacion acertivamente con coordinacion de Examenes, Gerencia de Proyectos y partes interesadas.",
    "otherRoles": "Impartir cursos.\r\nApoyo en áreas que lo requieran.",
    "attributes": "Excelentes habilidades de comunicación oral y escrita en inglés.\r\nOrganización y capacidad para trabajar de manera autónoma y en equipo.\r\nAtención al detalle y capacidad para seguir instrucciones precisas.\r\nProactivo.\r\nFlexible.",
    "file": "PERFIL DE PUESTO APLICADORES (1).xlsx",
    "processId": ""
  },
  {
    "id": "ASISTENTE ADMINISTRATIVO",
    "title": "Asistente Administrativo",
    "reportsTo": [
      "Gerencia de Administración y Finanzas"
    ],
    "subordinates": [],
    "mission": "Proveer servicio al cliente de calidad para apoyar al logro de objetivos y metas de la empresa. Apoyar en actividades administrativas básicas con excelente actitud.",
    "sex": "",
    "experience": "",
    "travel": "",
    "education": "Preparatoria / Carrera Trunca",
    "specialty": "Contabilidad, Administración, Informática o afín",
    "desiredExp": "Minima de 2 años en puestos relacionados con la recepción y atención al cliente, preferiblemente en empresas de diversos sectores.\r\nMinima de 2 años en el uso de sistemas de gestión de correo electrónico, programación de citas y manejo de llamadas telefónicas.\r\nEn el manejo de documentos y archivo.",
    "knowledge": "Comprensión de los sistemas de archivo y los procesos de retención de registros.\r\nComprension básica de la contabilidad, lo que puede incluir la facturación, la gestión de gastos y la preparación de informes financieros.",
    "skills": "Comunicación (verbal y escrita)\r\nManejo de herramientas de colaboración (Videoconferencias) en línea como Google Workspace para Educación, Microsoft Teams, o Zoom.\r\nManejo de herramientas de paquete office (Microsoft Word, Excel, Powerpoint)\r\nManejo de heramientas de comunicación digital como correos electrónicos, mensajería instantánea (Whatsapp, Messenger, Telegram)\r\nManejo de herramientas contables como AdminTotal",
    "languages": "Español, Nivel deseable Ingles A1 MCRE ( Marco Común de Referencia Europeo)",
    "responsibilities": "Atención a clientes\r\nSeguimiento a llamadas telefónicas / correos\r\nSeguimiento a quejas/dudas de clientes\r\nEntrega de certificados/ manejo de documentación\r\nEmisión de facturas\r\nSeguimiento a pago de facturas\r\nRegistro de movimientos contables\r\nAtender auditorías aplicables\r\nParticipar en las actividades de ESR que se le asignen                                                                                               Asegurar el aumento del desempeño del SGC y SGOE de acuerdo a los controles establecidos en el proceso.",
    "otherRoles": "Apoyo a diferentes coordinaciones en el área administrativa. Apoyo en áreas que lo requieran.",
    "attributes": "Compromiso\r\nHonestidad\r\nActitud \r\nResponsabilidad",
    "file": "PERFIL DE PUESTO ASISTENTE ADMINISTRATIVO (3).xlsx",
    "processId": ""
  },
  {
    "id": "ASISTENTE LEC BC",
    "title": "Asistente LEC BC",
    "reportsTo": [
      "Representante LEC Baja California"
    ],
    "subordinates": [],
    "mission": "Brindar apoyo administrativo, operativo y logístico a la coordinación de LEC BC, facilitando el desarrollo eficiente de actividades académicas, administrativas y de comunicación interna y externa.",
    "sex": "",
    "experience": "",
    "travel": "",
    "education": "Carrera técnica o licenciatura trunca",
    "specialty": "Administración, Comunicación, Educación o afín",
    "desiredExp": "",
    "knowledge": "Manejo de paquetería Office (Word, Excel, PowerPoint).\nHerramientas de videoconferencia (Google Meet, Zoom).\nRedacción de documentos formales.\nOrganización de archivos físicos y digitales.\nAtención telefónica y digital.",
    "skills": "Organización y planificación\nComunicación verbal y escrita\nAtención al cliente\nTrabajo bajo presión\nMultitareas y seguimiento oportuno",
    "languages": "Español, Nivel deseable Ingles A1",
    "responsibilities": "Dar seguimiento a requerimientos administrativos y de coordinación.\nGestionar agenda, reuniones y documentación.\nAtender llamadas y correos institucionales.\nApoyar en elaboración de reportes, informes y logística de eventos.\nAsistir a la coordinación en tareas operativas y académicas.",
    "otherRoles": "Apoyo en actividades académicas, logísticas y de eventos especiales.\nApoyo en áreas que lo requieran.",
    "attributes": "Responsabilidad y actitud de servicio.\nIniciativa y proactividad.\nDiscreción y manejo de información confidencial.\nCapacidad de organización y aprendizaje continuo.",
    "file": "PERFIL DE PUESTO ASISTENTE LEC BC (1).xlsx",
    "processId": ""
  },
  {
    "id": "AUXILIAR EXÁMENES",
    "title": "Auxiliar Exámenes",
    "reportsTo": [
      "Coordinadora de Exámenes"
    ],
    "subordinates": [],
    "mission": "Brindar apoyo administrativo, logístico y operativo en la planificación, organización, ejecución, validación, recepción y envío de exámenes, así como en la gestión de certificados y documentación correspondiente. Todo ello con el propósito de asegurar el cumplimiento de los procedimientos establecidos por la organización y los organismos certificadores, garantizando la calidad y trazabilidad en cada etapa del proceso.",
    "sex": "Indistinto",
    "experience": "1 años",
    "travel": "Si",
    "education": "Carrera técnica, Profesional Técnico, o Licenciatura trunca",
    "specialty": "Administración, Educación, Pedagogía,Negocios Internacionales o afín",
    "desiredExp": "Experiencia no indispensable,  actividades administrativas o de apoyo académico.Manejo de documentos, control de archivos o procesos de evaluación.",
    "knowledge": "Manejo de documentos académicos, control de archivos y expedientes.\r\nConocimientos básicos de los procesos de evaluación y certificación.\r\nFamiliaridad con el uso de plataformas digitales de gestión educativa.\r\nConocimientos básicos de normas de calidad (ISO 9001 e ISO 21001) deseables.\r\nConocimiento de atención a personas.",
    "skills": "Organización, gestion de tiempo  y control documental.\r\nComunicacion efectiva (verbal y escrita).\r\nManejo de herramientas ofimáticas (MS Office, especialmente Excel y Word).\r\nAtención al detalle.\r\nAdaptabilidad.\r\nTrabajo en equipo.\r\nÉtica profesional.\r\nDiscreción y manejo de información confidencial.",
    "languages": "Inglés Nivel A2 deseable (Marco Común de Referencia Europeo)",
    "responsibilities": "Apoyar en la preparación y distribución de los materiales de examen.\r\nRevisar el inventario de exámenes y materiales de evaluación.\r\nGestionar la recepción y entrega de exámenes aplicados.\r\nApoyar en el control y archivo de certificados emitidos.\r\nRegistrar y mantener actualizados los reportes de aplicaciones de exámenes.\r\nCoordinar con los aplicadores el calendario y la logística de aplicación de exámenes.\r\nAsistir en la atención de auditorías documentales.\r\nColaborar en la elaboración de reportes e indicadores mensuales.\r\nApoyar en la gestión de comunicación con candidatos, aplicadores y partes interesadas.\r\nParticipar en las capacitaciones y actualizaciones que la organización determine.\r\nDar soporte en el seguimiento a incidentes menores durante la aplicación de exámenes.\r\nAsistir en actividades de mejora continua y cumplimiento de requisitos normativos.",
    "otherRoles": "Apoyo administrativo en otras áreas.\r\nApoyo en la organización de eventos de capacitación.\r\nRespaldo al Coordinador en actividades operativas.\r\nApoyo en áreas que lo requieran.",
    "attributes": "Alto nivel de organización y responsabilidad.\r\nProactividad y capacidad de aprendizaje rápido.\r\nActitud de servicio y disposición al trabajo colaborativo.\r\nCapacidad de mantener la confidencialidad de la información.\r\nAtención al detalle y seguimiento de procedimientos establecidos.",
    "file": "PERFIL DE PUESTO AUXILIAR EXAMENES (1).xlsx",
    "processId": "PROC_EXAMENES"
  },
  {
    "id": "AUXILIAR FERIA DE LIBRO",
    "title": "Auxiliar Feria de Libro",
    "reportsTo": [
      "Coordinación Feria de Libro"
    ],
    "subordinates": [],
    "mission": "Apoyar en la organización y ejecución de las ferias del libro para la venta de libros y/o \r\nmaterial didáctico, verificando la atención y logística necesaria para asegurar \r\nun eficiente desarrollo del eventoen las instituciones.",
    "sex": "",
    "experience": "",
    "travel": "",
    "education": "Preparatoria",
    "specialty": "Indistinta",
    "desiredExp": "En atención al cliente.\r\nEn ventas, incluyendo la identificación de necesidades del cliente y cierre de ventas.\r\n En el trato con niños, ya sea en entornos educativos o en otras actividades relacionadas, demostrando habilidades de comunicación y empatía.",
    "knowledge": "En el manejo de inventarios, incluyendo técnicas de conteo, control y organización.\r\nFamiliaridad con herramientas y software de punto de venta, así como habilidades básicas en el manejo de cajas registradoras y sistemas de pago.\r\nDe técnicas de atención al cliente, incluyendo la capacidad de proporcionar un servicio amable, informativo y personalizado.\r\nConocimiento sobre los recursos relativos a la atención a personas con discapacidad.\r\nConocimientos sobre las posibles barreras de participación de los alumnos con discapacidad.",
    "skills": "Comunicación (verbal y escrita)\r\nManejo de herramientas de paquete office (Microsoft Word, Excel, Powerpoint)\r\nManejo de heramientas de comunicación digital como correos electrónicos, mensajería instantánea (Whatsapp, Messenger, Telegram)",
    "languages": "Español, Nivel deseable Ingles A1 MCRE ( Marco Común de Referencia Europeo)",
    "responsibilities": "Registrar y mantener actualizado el inventario de libros disponibles en la feria, incluyendo información como título, autor, editorial y cantidad disponible.\r\nOrganizar y clasificar los libros en las áreas designadas, asegurando que estén correctamente etiquetados y fácilmente accesibles.\r\nRealizar inventarios periódicos para verificar el stock y realizar ajustes en caso necesario.\r\nColaborar con el coordinador de la feria para identificar libros faltantes o en baja cantidad y coordinar su reposición.\r\nAsistir en la instalación y desmontaje de stands, ayudando a montar y desmontar la exhibición de libros y otros materiales promocionales.\r\nApoyar en la organización y decoración de los espacios de la feria, asegurando que estén limpios y ordenados.\r\nBrindar información y asistencia a los visitantes de la feria, respondiendo preguntas sobre los libros disponibles, horarios y actividades programadas.\r\nAyudar en la atención y venta de libros, ofreciendo recomendaciones, cobrando y registrando las transacciones de manera precisa.\r\nColaborar en la elaboración de la lista de libros mas vendidos, tomando en cuenta las preferencias de los organizadores y las demandas del público objetivo.\r\nAsegurar el aumento del desempeño del SGC y SGOE de acuerdo a los controles establecidos en el proceso.\r\nColaborar en la participación de los alumnos con discapacidad.\r\nPotenciar el desarrollo de las capacidades de los alumnos con necesidades educativas especiales. \r\nPromover la inclusión de los alumnos con necesidades específicas \r\nOfrecer recursos para adaptar y mejorar proceso de aprendizaje.\r\nGarantizar el enfoque a los estudiantes, partes interesadas durante la aplicacion de examenes.\r\nMantener una comunicacion acertivamente con coordinacion de Examenes, Gerencia de Proyectos y partes interesadas.",
    "otherRoles": "Apoyo en áreas que lo requieran.",
    "attributes": "Compromiso.\r\nHonestidad.\r\nBuena Actitud .\r\nResponsabilidad.\r\nLiderazgo.\r\nTrabajo en Equipo.",
    "file": "PERFIL DE PUESTO AUXILIAR FERIA DE LIBRO (1).xlsx",
    "processId": "PROC_FERIA_LIBRO"
  },
  {
    "id": "AUXILIAR DE SERVICIOS GENERALES",
    "title": "Auxiliar de Servicios Generales",
    "reportsTo": [
      "Servicios Generales"
    ],
    "subordinates": [],
    "mission": "Responsable de dar apoyo al puesto de Inventario en la gestión efectiva y eficiente de los procesos de control de inventario de la empresa, para garantizar la exactitud y disponibilidad del inventario de la empresa en todo momento. Apoyo en actividades de mantenimiento que se le requieran.",
    "sex": "",
    "experience": "",
    "travel": "",
    "education": "Secundaria",
    "specialty": "Indistinto",
    "desiredExp": "Mínima de 3  meses en puestos relacionados con el inventario. \nMínima de 6 meses en apoyo en áreas de mantenimiento.",
    "knowledge": "En reporte eportes de los desperfectos de las instalaciones, equipos y mobiliarios para su reparación y mantenimiento. En realización de tareas relacionadas al puesto que sean encomendadas. En operar y controlar las herramientas y equipos de mantenimiento.",
    "skills": "Manejo de heramientas de comunicación digital como correos electrónicos, mensajería instantánea (Whatsapp, Messenger, Telegram)\nManejo de herramientas y equipo de mantenimiento.",
    "languages": "Español, Nivel deseable Ingles A1 MCRE ( Marco Común de Referencia Europeo)",
    "responsibilities": "Apoyar al Responsable de Inventario en la gestión y control de inventario.\nRealizar la recepción, almacenamiento y recolección de materiales que requiera la empresa.\nActividades de limpieza y mantenimiento de las instalaciones de la empresa.\nColaborar con otros departamentos de la empresa, incluyendo compras, finanzas, producción y logística.\nParticipar en las actividades de ESR que se le asignen.                                                                                                    Asegurar el aumento del desempeño del SGC y SGOE de acuerdo a los controles establecidos en el proceso.",
    "otherRoles": "Apoyo en programa de mantenimiento preventivo, Apoyo en áreas que lo requieran.",
    "attributes": "Habilidad para trabajar en equipo y colaborar con otros departamentos de la empresa. Proactividad.\nAtención al detalle y capacidad para trabajar en un ambiente dinámico y cambiante.\nOrientado a la mejora continua.\nCapacidad para trabajar bajo presión y cumplir con los objetivos y metas establecidos por la empresa.",
    "file": "PERFIL DE PUESTO AUXILIARES DE SERVICIOS GENERALES (1).xlsx",
    "processId": "PROC_RRHH"
  },
  {
    "id": "COORDINADOR ACADÉMICO",
    "title": "Coordinador Académico",
    "reportsTo": [
      "Director General"
    ],
    "subordinates": [
      "Instructor"
    ],
    "mission": "Garantizar la excelencia académica y el cumplimiento de los objetivos educativos de la organización, coordinando y supervisando las actividades académicas y el desarrollo de los programas de enseñanza.\r\nDiseñar cursos de fortalecimiento académico para academias de inglés y afines a su experiencia y/o contratar a diseñadores de cursos en otras áreas según la solicitud de preparación a través de cursos, talleres y/o conferencias de los clientes. \r\nSeleccionar instructores con el perfil correcto y comprobable para impartición de los cursos solicitados.",
    "sex": "Indistinto",
    "experience": "2 años",
    "travel": "Si",
    "education": "Licenciatura o Maestría",
    "specialty": "Educación o Enseñanza del Inglés o afín",
    "desiredExp": "Minimo de 2 años como coordinador en alguna institución educativa.\r\nMinimo de 1 año en el diseño, desarrollo y evaluación de planes de estudio y programas educativos.\r\n En la gestión y desarrollo profesional del personal docente, incluyendo la planificación de capacitaciones y evaluaciones de desempeño.\r\n En el diseño curricular y desarrollo de programas educativos.\r\nEn la gestión y coordinación de equipos docentes.",
    "knowledge": "En las normas y regulaciones educativas aplicables en la región.\r\nDe procesos de acreditación y certificación de idioma.\r\nPedagógicos: Tener una sólida comprensión de los principios y teorías educativas, así como de los métodos de enseñanza y evaluación.\r\nPlanificación curricular: Saber diseñar y desarrollar planes de estudio, programas académicos y actividades de aprendizaje que se ajusten a los estándares educativos y a las necesidades de los estudiantes. \r\nConocimiento sobre los recursos relativos a la atención a personas con discapacidad.\r\nConocimientos sobre las posibles barreras de participación de los alumnos con discapacidad.",
    "skills": "Comunicación (verbal y escrita)\r\nManejo de herramientas de colaboración (Videoconferencias) en línea como Google Workspace para Educación, Microsoft Teams, Zoom.\r\nManejo de herramientas de presentación como Google Slides, Prezi.\r\nManejo de herramientas de paquete office (Microsoft Word, Excel, Powerpoint)\r\nManejo de herramientas educativas como PowerSchool, Infinite Campus, Canvas, Blackboard, Moodle, Google Classroom.\r\nManejo de heramientas de comunicación digital como correos electrónicos, mensajería instantánea (Whatsapp, Messenger, Telegram)",
    "languages": "Español, Nivel deseable Ingles B2 MCRE ( Marco Común de Referencia Europeo)",
    "responsibilities": "Diseñar, implementar y evaluar programas académicos que cumplan con los estándares de calidad y las necesidades de los clientes.\r\nCoordinar y supervisar equipos de instructores, brindando apoyo, capacitación y retroalimentación para la entrega de cursos, talleres y/o conferencias que se soliciten.\r\nEstablecer políticas y procedimientos relacionados con la planificación curricular, evaluación y seguimiento los mismos.\r\nRealizar seguimiento y evaluación del desempeño de los docentes, asegurando la calidad de la enseñanza y la mejora continua.\r\nColaborar con otros departamentos para asegurar la integración de las actividades académicas con otros aspectos de la organización.\r\nPromover un ambiente de aprendizaje inclusivo y estimulante para los estudiantes.\r\nEvaluar y seleccionar recursos educativos y materiales didácticos adecuados para los programas académicos.\r\nMantener una comunicación efectiva con los instructores y las otras áreas.\r\nMonitorear y reportar indicadores de satisfacción de cursos impartidos, evaluación docente, estadísticas de alcance e impacto de los programas solicitados por el cliente.\r\nMantenerse actualizado sobre las tendencias y avances en educación, asistiendo a conferencias y capacitaciones pertinentes.\r\nAtender auditorías aplicables.\r\nParticipar en las actividades de ESR que se le asignen.\r\nColaborar en la participación de los alumnos con discapacidad.\r\nPotenciar el desarrollo de las capacidades de los alumnos con necesidades educativas especiales. \r\nPromover la inclusión de los alumnos con necesidades específicas \r\nOfrecer recursos para adaptar y mejorar proceso de aprendizaje.\r\nGarantizar el enfoque a los estidiantes, partes interesadas durante la aplicacion de examenes.\r\nMantener una comunicacion acertivamente con coordinacion de Examenes, Gerencia de Proyectos y partes interesadas.\r\nAsegurar el aumento del desempeño del SGC y SGOE de acuerdo a los controles establecidos en el proceso.",
    "otherRoles": "Instructor, maestro de inglés, examinador oral de certificaciones de idioma, Apoyo en áreas que lo requieran",
    "attributes": "Liderazgo y capacidad para motivar y guiar a docentes e instructores.\r\nExcelentes habilidades de comunicación verbal y escrita.\r\nOrganización y capacidad para gestionar múltiples tareas y proyectos.\r\nOrientación al logro de resultados y cumplimiento de metas académicas.\r\nPensamiento estratégico y habilidades para la toma de decisiones.\r\nHabilidades de resolución de problemas y gestión de conflictos.\r\nCapacidad para establecer y mantener relaciones de colaboración con diversas partes interesadas.",
    "file": "PERFIL DE PUESTO COORDINADOR ACADEMICO.xlsx",
    "processId": "SUBPROC_COORD_ACADEMICA"
  },
  {
    "id": "COORDINADORA DE CALIDAD Y RESPONSABILIDAD SOCIAL",
    "title": "Coordinadora de Calidad y Responsabilidad Social",
    "reportsTo": [
      "Director General"
    ],
    "subordinates": [
      "Practicante",
      "Enlace de Sistema Integral"
    ],
    "mission": "Promover e implementar políticas y prácticas de Responsabilidad Social Empresarial (RSE), así como garantizar el cumplimiento de normas y estándares nacionales e internacionales como ISO y ESR, siempre procurando la satisfacción de las partes interersadas (clientes, estudiantes, comunidad, colaboradores internos y externos, etc.). Liderar la gestión estratégica del talento humano mediante procesos de atracción, desarrollo, bienestar y cultura organizacional, integrando la sostenibilidad, el cumplimiento normativo y la mejora continua en todos los niveles de la organización.",
    "sex": "Indistinto",
    "experience": "3 años",
    "travel": "Si",
    "education": "Licenciatura o Maestría",
    "specialty": "Administración, Gestión Empresarial, Ingeniería Industrial o afín",
    "desiredExp": "Coordinación de programas de sostenibilidad, seguridad, medio ambiente y normas ISO (mínimo 3 años).\r\nDiseño, implementación y evaluación de programas y proyectos de RSE.\r\nGestión de procesos de obtención y mantenimiento de certificaciones ISO.\r\nIdentificación y gestión de riesgos y oportunidades en RSE y cumplimiento normativo.\r\nDiseño de estrategias de desarrollo organizacional, cultura organizacional y clima laboral.\r\nAdministración de procesos de reclutamiento, selección, capacitación y evaluación del desempeño.\r\nImplementación de acciones de inclusión, equidad y bienestar organizacional.",
    "knowledge": "Normativas y estándares ISO (9001, 21001) y su aplicación en la organización.\r\nPrincipios y estrategias de RSE y sostenibilidad corporativa.\r\nGestión de sistemas de calidad y mejora continua.\r\nMarco legal laboral mexicano y mejores prácticas en Recursos Humanos.\r\nDesarrollo de KPIs para RH, ISO y desempeño organizacional.\r\nEvaluación y mejora de clima organizacional y cultura corporativa.",
    "skills": "Comunicación oral y escrita efectiva.\r\nLiderazgo ético con enfoque humano.\r\nPensamiento estratégico y enfoque en resultados.\r\nPlaneación, organización y gestión del tiempo.\r\nCapacidad de análisis y toma de decisiones informadas.\r\nTrabajo colaborativo y gestión transversal.\r\nManejo de herramientas digitales (Google Workspace, Microsoft Office, Zoom, Teams, etc.).",
    "languages": "Español, Nivel deseable Ingles B1 MCRE ( Marco Común de Referencia Europeo)",
    "responsibilities": "Coordinar e implementar programas de RSE alineados a los objetivos estratégicos.\r\nSupervisar el cumplimiento de normas ISO y coordinar auditorías internas y externas.\r\nElaborar y presentar informes de desempeño en RSE, ISO y procesos de talento humano.\r\nCapacitar y sensibilizar al personal en temas de sostenibilidad, ética, derechos humanos e inclusión.\r\nGestionar procesos de atracción, desarrollo y retención del talento.\r\nCoordinar programas de bienestar, cultura y clima laboral.\r\nDiseñar e implementar KPIs para RH y sistemas de gestión de calidad.\r\nFomentar la mejora continua y la alineación de valores institucionales.\r\nRepresentar a la organización ante organismos certificadores y cámaras empresariales.",
    "otherRoles": "Apoyo estratégico en proyectos de innovación y transformación organizacional.\r\nRepresentación institucional ante organismos y eventos de responsabilidad social.\r\nApoyo en otras áreas según necesidades institucionales.",
    "attributes": "Compromiso con los valores de sostenibilidad, inclusión y responsabilidad social.\r\nÉtica profesional y honestidad en la gestión.\r\nAutonomía y sentido de responsabilidad.\r\nLiderazgo colaborativo e inspirador.\r\nCapacidad de adaptación al cambio y resiliencia.\r\nOrientación a resultados y mejora continua.",
    "file": "PERFIL DE PUESTO COORDINADORA DE CALIDAD Y RESPONSABILIDAD SOCIAL (1).xlsx",
    "processId": "SUBPROC_AUDITORIAS_INTERNAS"
  },
  {
    "id": "COORDINADORA DE EXÁMENES",
    "title": "Coordinadora de Exámenes",
    "reportsTo": [
      "Gerente de Operaciones"
    ],
    "subordinates": [
      "Aplicador",
      "Auxiliar de Exámenes"
    ],
    "mission": "Coordinar el desarrollo de las actividades de aplicación de exámenes para las certificaciones \r\nde enseñanza y aprendizaje del idioma inglés, verificando y validando el cumplimiento de los \r\nestándares internacionales que demandan los organismos representativos.",
    "sex": "Indistinto",
    "experience": "2 años",
    "travel": "Si",
    "education": "Licenciatura o Carrera Trunca",
    "specialty": "Enseñanza del Inglés, Educación y/o Pedagogía o afín",
    "desiredExp": "Mínimo 2 años en el campo de la enseñanza, preferiblemente en instituciones educativas de nivel medio o superior.\r\nAl menos 1 año como Coordinador de escuela o puesto similar en cualquier nivel educativo.",
    "knowledge": "De los sistemas y metodologías de evaluación y exámenes utilizados en el ámbito educativo.\r\nFamiliaridad con las tecnologías de evaluación en línea y la administración de exámenes electrónicos.\r\nComprensión de los principios de validación y confiabilidad de los exámenes.\r\nDe los requisitos y estándares académicos establecidos por instituciones educativas o entidades reguladoras.\r\nConocimiento sobre los recursos relativos a la atención a personas con discapacidad.\r\nConocimientos sobre las posibles barreras de participación de los alumnos con discapacidad.",
    "skills": "Comunicación (verbal y escrita)\r\nManejo de herramientas de colaboración (Videoconferencias) en línea como Google Workspace para Educación, Microsoft Teams, Zoom.\r\nManejo de herramientas de presentación como Google Slides, Prezi.\r\nManejo de herramientas de paquete office (Microsoft Word, Excel, Powerpoint)\r\nManejo de herramientas educativas como PowerSchool, Infinite Campus, Canvas, Blackboard, Moodle, Google Classroom.\r\nManejo de heramientas de comunicación digital como correos electrónicos, mensajería instantánea (Whatsapp, Messenger, Telegram)",
    "languages": "Español, Nivel deseable Ingles B2 MCRE ( Marco Común de Referencia Europeo)",
    "responsibilities": "Garantizar que las aplicaciones de exámenes se desarrollen sin problemas:\r\nCoordinar y supervisar el proceso de aplicación de exámenes, asegurando que se sigan los procedimientos establecidos y se cumplan los requisitos de seguridad y confidencialidad.\r\nPreparar y distribuir el material de prueba a los aplicadores y supervisores designados, asegurando que esté completo y en condiciones adecuadas.\r\nRealizar un seguimiento continuo durante las aplicaciones de exámenes para identificar y resolver cualquier problema o inconveniente que pueda surgir.\r\nEstablecer una comunicación regular y efectiva con International House, para informar sobre cualquier cambio, imprevisto o situación relevante que surja durante la coordinación de los exámenes.\r\nProporcionar actualizaciones oportunas sobre el progreso de las aplicaciones de exámenes y cualquier problema que requiera atención por parte de International House.\r\nSupervisar el proceso de recepción de los exámenes enviados por International House, asegurando que se reciban correctamente y que coincidan con las aplicaciones realizadas.\r\nIdentificar y resolver cualquier discrepancia o problema que surja al recibir los exámenes, como daños en el material o errores en la documentación adjunta.\r\nEvaluar y seleccionar cuidadosamente a los aplicadores y supervisores de exámenes, asegurándose de que cumplan con los requisitos de competencia y capacitación establecidos.\r\nProporcionar una orientación clara y detallada sobre las responsabilidades y procedimientos a seguir durante las aplicaciones de exámenes, asegurando que los aplicadores estén debidamente preparados.\r\nCoordinar el envío seguro y oportuno de los exámenes completados a Cambridge Assessment English u otras entidades responsables, siguiendo los procedimientos y requisitos establecidos.\r\nAsegurar la recepción y gestión adecuada de los certificados emitidos por Cambridge Assessment English u otras entidades responsables, asegurando su custodia y distribución correcta a los candidatos.\r\nMantener un registro preciso y seguro de todos los certificados y exámenes recibidos y enviados, asumiendo la responsabilidad de su custodia y evitando cualquier pérdida o extravío.\r\nAtender auditorías aplicables\r\nParticipar en las actividades de ESR que se le asignen\r\nPresentar indicadores mensuales.\r\nColaborar en la participación de los alumnos con discapacidad.\r\nPotenciar el desarrollo de las capacidades de los alumnos con necesidades educativas especiales. \r\nPromover la inclusión de los alumnos con necesidades específicas \r\nOfrecer recursos para adaptar y mejorar proceso de aprendizaje.\r\nGarantizar el enfoque a los estidiantes, partes interesadas durante la aplicacion de examenes.\r\nMantener una comunicacion acertivamente con coordinacion de Examenes, Gerencia de Proyectos y partes interesadas.\r\nAsegurar el aumento del desempeño del SGC y SGOE de acuerdo a los controles establecidos en el proceso.",
    "otherRoles": "Aplicador de exámenes\r\nDar capacitación\r\nApoyar otras áreas en proyectos de la empresa\r\nApoyo en áreas que lo requieran.",
    "attributes": "Excelentes habilidades de organización y planificación.\r\nCapacidad para trabajar de manera efectiva en un entorno educativo dinámico y colaborativo.\r\nHabilidad para comunicarse de manera clara y efectiva con el personal docente, los estudiantes y otros miembros del equipo educativo.\r\nOrientación al detalle y capacidad para trabajar con precisión en la administración y calificación de exámenes",
    "file": "PERFIL DE PUESTO COORDINADORA DE EXAMENES (1).xlsx",
    "processId": "PROC_EXAMENES"
  },
  {
    "id": "COORDINADORA DE PROYECTOS",
    "title": "Coordinadora de Proyectos",
    "reportsTo": [
      "Director General"
    ],
    "subordinates": [
      "Representante LEC Nuevo Leon"
    ],
    "mission": "Liderar y supervisar la ejecución exitosa de proyectos, asegurando el cumplimiento de los objetivos, plazos y recursos asignados. \r\nPromoviendo la eficiencia, calidad y satisfacción del cliente en cada proyecto, aplicando buenas prácticas de gestión y fomentando la colaboración y comunicación efectiva entre los miembros del equipo.",
    "sex": "Indistinto",
    "experience": "1 año",
    "travel": "Si",
    "education": "Licenciatura / Carrera Técnica",
    "specialty": "Administración, Finanzas, Project Managment o afín",
    "desiredExp": "Mínima de 1 año en la coordinación de proyectos, preferiblemente en un entorno relacionado con la industria o sector específico.\r\nPráctica mínima de 6 meses en la aplicación de metodologías de gestión de proyectos.\r\nEn la planificación y ejecución de proyectos, incluyendo la elaboración de planes, seguimiento de tareas y gestión de recursos.\r\nEn la gestión de equipos, incluyendo la capacidad de motivar, liderar y desarrollar a los miembros del equipo.",
    "knowledge": "Comprensión de las técnicas y herramientas de gestión de proyectos.\r\nDe los principios de control de calidad y aseguramiento de la calidad en la gestión de proyectos.\r\nComprensión de los conceptos financieros básicos relacionados con la gestión de proyectos, como presupuestos, costos y rentabilidad.\r\nConocimiento sobre los recursos relativos a la atención a personas con discapacidad.\r\nConocimientos en sistemas  alternativos de comunicación (Lenguaje de Señas, Lectura Braille, etc.).\r\nConocimientos sobre las posibles barreras de participación de los alumnos con discapacidad.",
    "skills": "Comunicación (verbal y escrita)\r\nManejo de herramientas de colaboración (Videoconferencias) en línea como Google Workspace para Educación, Microsoft Teams, Zoom.\r\nManejo de herramientas de presentación como Google Slides, Prezi.\r\nManejo de herramientas de paquete office (Microsoft Word, Excel, Powerpoint)\r\nManejo de heramientas de comunicación digital como correos electrónicos, mensajería instantánea (Whatsapp, Messenger, Telegram)",
    "languages": "Español, Nivel deseable Ingles B1 MCRE ( Marco Común de Referencia Europeo)",
    "responsibilities": "Definir los objetivos, alcance, plazos y recursos necesarios para cada proyecto.\r\nElaborar planes de proyecto detallados, incluyendo la secuencia de actividades, asignación de tareas y estimación de recursos.\r\nRealizar seguimiento regular del avance del proyecto, identificando desviaciones y tomando acciones correctivas según sea necesario.\r\nCoordinar reuniones de seguimiento y presentar informes de progreso relevantes.\r\nFacilitar la comunicación y colaboración efectiva entre los miembros del equipo, fomentando un ambiente de trabajo positivo y motivador.\r\nIdentificar y asegurar los recursos necesarios para la ejecución exitosa del proyecto, incluyendo personal, equipos, materiales y proveedores externos.\r\nRealizar seguimiento y control del presupuesto asignado al proyecto, asegurando un uso eficiente de los recursos y gestionando adecuadamente los costos.\r\nCoordinar la resolución de problemas, facilitando la colaboración entre los miembros del equipo y tomando decisiones oportunas para minimizar el impacto en el proyecto.\r\nAtender auditorías aplicables\r\nParticipar en las actividades de ESR que se le asignen.\r\nColaborar en la participación de los alumnos con discapacidad.\r\nPotenciar el desarrollo de las capacidades de los alumnos con necesidades educativas especiales. \r\nPromover la inclusión de los alumnos con necesidades específicas \r\nOfrecer recursos para adaptar y mejorar proceso de aprendizaje.\r\nGarantizar el enfoque a los estudiantes, partes interesadas durante la aplicacion de examenes.\r\nMantener una comunicacion acertivamente con coordinacion de Examenes, Gerencia de Proyectos y partes interesadas.\r\nAsegurar el aumento del desempeño del SGC y SGOE de acuerdo a los controles establecidos en el proceso.",
    "otherRoles": "Apoyo en áreas que lo requieran.",
    "attributes": "Compromiso\r\nHonestidad\r\nBuena Actitud \r\nResponsabilidad\r\nLiderazgo\r\nTrabajo en Equipo",
    "file": "PERFIL DE PUESTO COORDINADORA DE PROYECTOS (1).xlsx",
    "processId": "SUBPROC_GESTION_PROYECTOS"
  },
  {
    "id": "COORDINADORA DE FERIA DEL LIBRO",
    "title": "Coordinadora de Feria del Libro",
    "reportsTo": [
      "Gerente de Administración y Finanzas"
    ],
    "subordinates": [
      "Auxiliar de Feria de Libro"
    ],
    "mission": "Planificar, organizar y ejecutar las ferias del libro para la venta de libros y/o material didáctico, verificando los requerimientos técnicos y administrativos para asegurar un eficiente desarrollo \r\ndel evento.",
    "sex": "Indistinto",
    "experience": "1 año",
    "travel": "Si",
    "education": "Secundaria o Preparatoria",
    "specialty": "Ventas y/o  atención al público",
    "desiredExp": "Mínima de 1 año en atención al cliente.\r\nMínima de 6 meses en ventas, incluyendo la identificación de necesidades del cliente y cierre de ventas.\r\nEn el manejo de inventarios, incluyendo el registro y seguimiento de existencias, reposición de productos y control de stock.\r\nPractica de trabajo en escuelas o entornos educativos, lo que demuestra habilidades para interactuar con estudiantes, profesores y personal administrativo.\r\nEn el trato con niños, ya sea en entornos educativos o en otras actividades relacionadas, demostrando habilidades de comunicación y empatía.",
    "knowledge": "Familiaridad de libros y literatura, incluyendo géneros literarios, autores y títulos relevantes.\r\nEn el manejo de inventarios, incluyendo técnicas de conteo, control y organización.\r\nDe técnicas de venta, con preferencia de contar con la capacidad de recomendar libros adecuados a los intereses y necesidades de los clientes.\r\nDe técnicas de atención al cliente, incluyendo la capacidad de proporcionar un servicio amable, informativo y personalizado.",
    "skills": "Comunicación (verbal y escrita)\r\nManejo de herramientas de colaboración (Videoconferencias) en línea como Google Workspace para Educación, Microsoft Teams, Zoom.\r\nManejo de herramientas de paquete office (Microsoft Word, Excel, Powerpoint)\r\nManejo de heramientas de comunicación digital como correos electrónicos, mensajería instantánea (Whatsapp, Messenger, Telegram)\r\nManejo de herramientas de inventario como AdminTotal\r\nManejo de redes sociales (Facebook, Instagram)\r\nFamiliaridad con herramientas y software de punto de venta, así como manejo básico de cajas registradoras y sistemas de pago.",
    "languages": "Español, Nivel deseable Ingles A1 MCRE ( Marco Común de Referencia Europeo)",
    "responsibilities": "Atención a clientes\r\nSeguimiento a llamadas telefónicas / correos\r\nSeguimiento a quejas/dudas de clientes\r\nVerificar la planeación de las ferias de libro, y se cumplan en tiempo y forma. \r\nRevisar que se cuente con el material, lay out, controles, necesarios para el desarrollo de la feria de libro.\r\nAutorizar descuentos en libros.\r\nGestionar la selección y el reclutamiento de auxiliar de feria de libro estableciendo los criterios y requisitos necesarios.\r\nCoordinar la programación de actividades, como presentaciones de libros, charlas y talleres, asegurando una oferta variada y atractiva.\r\nSupervisar el desarrollo de la feria, resolviendo problemas y garantizando un flujo adecuado de actividades.\r\nEvaluar y realizar informes sobre los resultados de la feria\r\nAtender auditorías aplicables\r\nParticipar en las actividades de ESR que se le asignen\r\nPresentar indicadores mensuales                                                                                                                                     Asegurar el aumento del desempeño del SGC y SGOE de acuerdo a los controles establecidos en el proceso.",
    "otherRoles": "Apoyo como vigilante en aplicación de exámenes\r\nApoyo en preparación de material para cursos\r\nApoyo en áreas que lo requieran.",
    "attributes": "Compromiso\r\nHonestidad\r\nActitud \r\nResponsabilidad\r\nLiderazgo\r\nTrabajo en Equipo",
    "file": "PERFIL DE PUESTO COORDNADORA DE FERIA DE LIBRO (1).xlsx",
    "processId": "PROC_FERIA_LIBRO"
  },
  {
    "id": "DIRECTOR GENERAL",
    "title": "Director General",
    "reportsTo": [],
    "subordinates": [
      "Gerente de Operaciones",
      "Coordinadora de Calidad y Responsabilidad Social",
      "Gerente de Administración y Finanzas",
      "Coordinadora de Proyectos"
    ],
    "mission": "Dirigir y liderar la eficiente operación de Languages and Education Consulting (LEC) para el logro de los objetivos de la organización con una visión enfocada en la calidad, proyección positiva hacia la comunidad y utilidad financiera proyectada, asegurando el cumplimiento de los estándares internacionales establecidos por los organismos representativos.",
    "sex": "Indistinto",
    "experience": "5 años",
    "travel": "Si",
    "education": "Licenciatura o Maestría",
    "specialty": "Educación, Enseñanza del Inglés, Administración y afin.",
    "desiredExp": "Mínima de 5 años en puestos directivos dirgiendo y liderando en empresas en el sector privado o gubernamental con enfoque en la educación y asi como en proveduría de productos y servicios.",
    "knowledge": "En administración y gestión empresarial.\r\nDe contabilidad para el seguimiento financiero y control presupuestario.",
    "skills": "Comunicación (verbal y escrita)\r\nManejo de herramientas de colaboración (Videoconferencias) en línea como Google Workspace para Educación, Microsoft Teams, Zoom.\r\nManejo de herramientas de paquete office (Microsoft Word, Excel, Powerpoint)\r\n\r\nManejo de heramientas de comunicación digital como correos electrónicos, mensajería instantánea (Whatsapp, Messenger, Telegram)",
    "languages": "Español, Nivel deseable Ingles C1 MCRE ( Marco Común de Referencia Europeo)",
    "responsibilities": "Planificar, evaluar y dar seguimiento a los procesos de LEC, asegurando la calidad y eficiencia de los servicios brindados.\r\nFijar y dirigir, de acuerdo a los objetivos y prioridades de LEC, la operación general de la organización.\r\nDirigir, organizar y proporcionar los servicios de consultoría educativa, estableciendo altos estándares de calidad.\r\nAutorizar cotizaciones y adquisiciones de bienes y servicios necesarios para el desarrollo de las actividades de LEC.\r\nAutorizar el gasto y garantizar la correcta administración de los recursos financieros.\r\nElaborar y autorizar contratos de prestación de servicios, asegurando la correcta ejecución y cumplimiento de los mismos.\r\nPresidir las reuniones de LEC y autorizar los acuerdos resultantes de las mismas.\r\nAtender auditorías aplicables\r\nParticipar en las actividades de ESR que se le asignen                                                                                                Asegurar el aumento del desempeño del SGC y SGOE de acuerdo a los controles establecidos en el proceso.",
    "otherRoles": "Asistir a eventos que considere de su competencia.\r\nApoyo en áreas que lo requieran.",
    "attributes": "Compromiso con los valores y principios de LEC.\r\nHonestidad y ética profesional.\r\nResponsabilidad en el cumplimiento de tareas y metas establecidas.\r\nLiderazgo efectivo para motivar y guiar a los colaboradores de LEC.\r\nHabilidades de planificación y organización para garantizar la eficiencia de los procesos.\r\nCapacidad de administración de recursos financieros y humanos.\r\nGestión del cambio para adaptarse y liderar los desafíos del entorno empresarial.\r\nCapacidad para la toma de decisiones basadas en análisis y evaluación adecuada de situaciones.",
    "file": "PERFIL DE PUESTO DIRECTOR GENERAL (1).xlsx",
    "processId": "PROC_RRHH"
  },
  {
    "id": "DISEÑADOR Y DESARROLLADOR WEB",
    "title": "Diseñador y Desarrollador Web",
    "reportsTo": [
      "Gerente de Operaciones"
    ],
    "subordinates": [
      "Administrador de Sistemas"
    ],
    "mission": "Crear y mantener sitios web atractivos, funcionales y efectivos para nuestros clientes. Debe combinar habilidades creativas y técnicas para diseñar y desarrollar interfaces web intuitivas y optimizadas, asi como tambien desarollo y mantenimiento de sistemas informaticos en base a las necesidades de la empresa, brindando experiencias del agrado de los usuarios.",
    "sex": "Indistinto",
    "experience": "2 años",
    "travel": "Si",
    "education": "Licenciatura o Carrera Tecnica",
    "specialty": "Diseño grafico, Sistemas computacionales, Diseño web o afín.",
    "desiredExp": "",
    "knowledge": "Conocimiento de lenguajes de programación web como HTML, CSS, PHP y JavaScript.\r\nExperiencia en el uso de herramientas y frameworks de diseño web, como Bootstrap, jQuery, etc.\r\nConocimientos de diseño gráfico, incluyendo el uso de software como Adobe Photoshop, Illustrator, Corel Draw u otros programas similares.\r\nFamiliaridad con conceptos de usabilidad y experiencia de usuario (UX).\r\nConocimientos de SEO (Optimización de Motores de Búsqueda) para garantizar que los sitios web sean fáciles de encontrar en los motores de búsqueda.\r\nCapacidad para trabajar con sistemas de gestión de contenido (CMS) como WordPress, Drupal, Joomla, etc.",
    "skills": "Comunicación (verbal y escrita)\r\nManejo de herramientas de colaboración (Videoconferencias) en línea como Google Workspace para Educación, Microsoft Teams, Zoom.\r\nManejo de herramientas de paquete office (Microsoft Word, Excel, Powerpoint)\r\nManejo de heramientas de comunicación digital como correos electrónicos, mensajería instantánea (Whatsapp, Messenger, Telegram)",
    "languages": "Español, Nivel deseable Ingles A1 MCRE ( Marco Común de Referencia Europeo)",
    "responsibilities": "Diseñar, desarrollar y mantener acutalizados sitios web interactivos y atractivos, asi como tambien el material grafico y multimedia requerido siguiendo los requisitos y directrices de la empresa.\r\nCrear interfaces de usuario intuitivas y optimizadas para mejorar la experiencia del usuario.\r\nOptimizar los sitios web para mejorar su rendimiento, velocidad de carga y capacidad de respuesta.\r\nColaborar con diseñadores gráficos y equipos de desarrollo para garantizar la coherencia visual y técnica en el diseño y desarrollo de los sitios web.\r\nMantenerse al día con las últimas tendencias y avances en diseño web y desarrollo, y aplicarlos de manera efectiva en los proyectos.\r\nSolucionar problemas técnicos y resolver errores en los sitios web existentes.\r\nRealizar pruebas de usabilidad y obtener retroalimentación de los usuarios para mejorar continuamente los sitios web.\r\nAtender auditorías aplicables\r\nParticipar en las actividades de ESR que se le asignen                                                                                                    Asegurar el aumento del desempeño del SGC y SGOE de acuerdo a los controles establecidos en el proceso.",
    "otherRoles": "Apoyo en áreas que lo requieran",
    "attributes": "Creatividad y habilidades artísticas para diseñar interfaces visuales atractivas.\r\nPensamiento analítico y habilidades para resolver problemas técnicos.\r\nAtención al detalle y capacidad para seguir pautas y requisitos específicos del cliente.\r\nCapacidad para trabajar de manera autónoma y gestionar múltiples proyectos al mismo tiempo.\r\nBuena comunicación y habilidades interpersonales para colaborar eficazmente con otros miembros del equipo y clientes.\r\nMentalidad orientada al usuario y capacidad para comprender las necesidades y expectativas de los usuarios finales.",
    "file": "PERFIL DE PUESTO DISENADOR Y DESAROLLADOR WEB (1).xlsx",
    "processId": ""
  },
  {
    "id": "EJECUTIVO DE VENTAS",
    "title": "Ejecutivo de ventas",
    "reportsTo": [
      "Gerente de Operaciones"
    ],
    "subordinates": [],
    "mission": "Captar clientes y nuevas oportunidades de negocio, identificando las necesidades e intereses de clientes potenciales con la finalidad de crear relaciones de trabajo a corto y largo plazo que den soporte a los objetivos de la organización",
    "sex": "Indistinto",
    "experience": "2 años",
    "travel": "Si",
    "education": "Licenciatura o carrera técnica",
    "specialty": "Administración y/o Ventas",
    "desiredExp": "",
    "knowledge": "De técnicas de ventas y habilidades de negociación.\r\nDe los principios y procesos de atención al cliente.\r\nDe técnicas de prospección.\r\nDe los canales de venta y de estrategias de marketing.\r\nDe los sistemas y herramientas de gestión de ventas.\r\nDe los procesos de seguimiento postventa y fidelización de clientes.",
    "skills": "Comunicación (verbal y escrita)\r\nManejo de herramientas de colaboración (Videoconferencias) en línea como Google Workspace, Microsoft Teams, Zoom.\r\nManejo de herramientas de presentación como Google Slides, Prezi.\r\nManejo de herramientas de paquete office (Microsoft Word, Excel, Powerpoint)\r\nManejo de herramientas de gestion de recursos como Admintotal\r\nManejo de heramientas de comunicación digital como correos electrónicos, mensajería instantánea (Whatsapp, Messenger, Telegram)",
    "languages": "Español, Nivel deseable Ingles B1 MCRE ( Marco Común de Referencia Europeo)",
    "responsibilities": "Llevar a cabo estrategias de ventas para el logro metas.\r\nRealizar llamadas y visitas de prospección y/o seguimiento a clientes.\r\nEnvió de cotizaciones según la detección de oportunidades.\r\nSeguimiento a necesidades y requerimientos de clientes.\r\nGestionar y actualizar la base de datos de clientes y prospectos.\r\nGestionar y cumplir con el proceso de ventas\r\nAtender auditorías aplicables.\r\nParticipar en las actividades de ESR que se le asignen.\r\nPresentar indicadores mensuales.                                                                                                                                       Asegurar el aumento del desempeño del SGC y SGOE de acuerdo a los controles establecidos en el proceso.",
    "otherRoles": "Apoyo a coordinación de feria de libros.\r\nApoyo a gerencia de proyectos.\r\nApoyo en áreas que lo requieran",
    "attributes": "Orientación a resultados.\r\nOrganizado.\r\nHabilidades comunicativas.\r\nCompromiso.\r\nManejo de relaciones.\r\nHabilidades de trabajo en equipo.\r\nEnfoque al crecimiento.",
    "file": "PERFIL DE PUESTO EJECUTIVO DE VENTAS (1).xlsx",
    "processId": "PROC_VENTAS"
  },
  {
    "id": "ENLACE DE SISTEMA INTEGRAL",
    "title": "Enlace De Sistema Integral",
    "reportsTo": [
      "Coordinadora de Calidad y Responsabilidad Social"
    ],
    "subordinates": [],
    "mission": "Asegurar la integración adecuada, el seguimiento continuo y la operación eficiente de los sistemas tecnológicos y plataformas digitales de la organización, actuando como un vínculo eficaz y brindando soporte a las áreas que conforman el Sistema Integral y las herramientas digitales, con el fin de garantizar que estos sistemas respalden los objetivos estratégicos y operativos de la organización",
    "sex": "Indistinto",
    "experience": "Deseable 1 año",
    "travel": "Si",
    "education": "Licenciatura, Ingeniería, o Carrera Trunca",
    "specialty": "Tecnologías de la Información, Sistemas de Gestión de Calidad, o afines",
    "desiredExp": "",
    "knowledge": "Normas ISO 9001:2015 e ISO 21001:2018\r\nPlataformas tecnológicas empresariales\r\nProcesos de auditoría y control de calidad\r\nDocumentación y control de procedimientos\r\nFundamentos de tecnologías de la información y gestión de proyectos",
    "skills": "Capacidad de análisis \r\nComunicación efectiva y trabajo en equipo\r\nResolución de problemas\r\nOrganización y gestión del tiempo\r\nAtención al detalle\r\nProactividad y orientación al servicio Trabajo en equipo.",
    "languages": "Español, deseable Inglés nivel B1 MCRE",
    "responsibilities": "Coordinar la integración, operación y seguimiento de los sistemas y plataformas tecnológicas de la empresa.\r\nServir como enlace y punto de contacto entre las áreas del sistema integral, calidad, operaciones y otras áreas clave.\r\nVerificar que los sistemas cumplan con los requerimientos técnicos, operativos y normativos aplicables.\r\nApoyar en auditorías internas y externas relacionadas con sistemas tecnológicos y calidad.\r\nDocumentar procesos, evidencias y procedimientos relacionados con la gestión tecnológica.\r\nCoordinar y apoyar acciones correctivas y mejoras tecnológicas en colaboración con áreas involucradas.\r\nBrindar soporte, capacitación básica y difusión sobre el uso correcto de sistemas y normativas aplicables.",
    "otherRoles": "Apoyo en implementación y seguimiento de proyectos tecnológicos y de mejora continua.\r\nParticipación en iniciativas transversales de calidad, seguridad informática y eficiencia operativa.\r\nColaboración en la capacitación y actualización de normativas y procedimientos tecnológicos.",
    "attributes": "Proactividad\r\nPensamiento lógico y analítico\r\nResponsabilidad y compromiso\r\nTrabajo en equipo y colaboración interdisciplinaria\r\nCapacidad de aprendizaje continuo\r\nAtención al detalle y orientación a resultados",
    "file": "PERFIL DE PUESTO ENLACE DE SISTEMA INTEGRAL (1).xlsx",
    "processId": "PROC_FINANZAS"
  },
  {
    "id": "GERENTE DE ADMINISTRACIÓN Y FINANZAS",
    "title": "Gerente de Administración y Finanzas",
    "reportsTo": [
      "Director General"
    ],
    "subordinates": [
      "Coordinadora de Feria del Libro",
      "Asistente Administrativo",
      "Responsable de Servicios Generales"
    ],
    "mission": "Planificar, dirigir y controlar los recursos financieros, administrativos y de compras de la organización, asegurando la adquisición eficiente de bienes y servicios, optimizando los recursos y garantizando el cumplimiento de los objetivos estratégicos. Desarrollar relaciones sólidas con proveedores, gestionar presupuestos y aplicar controles internos que aseguren el buen funcionamiento financiero y operativo de la empresa.",
    "sex": "",
    "experience": "",
    "travel": "",
    "education": "Licenciatura",
    "specialty": "Contabilidad, Administración, Finanzas o afin",
    "desiredExp": "Mínimo 3 años en roles de administración, finanzas y compras\r\nGestión de proveedores, presupuestos y contratos\r\nAnálisis de costos y optimización de recursos\r\nSupervisión de equipos de trabajo y procesos administrativos\r\nControl de inventarios y cadena de suministro\r\nEvaluación y selección de proveedores\r\nImplementación de controles internos y relaciones con bancos",
    "knowledge": "Procesos de compras y cadena de suministro\r\nTécnicas de negociación\r\nAnálisis financiero, contable y presupuestario\r\nLegislación fiscal, comercial y laboral mexicana\r\nPlaneación estratégica y control interno\r\nGestión administrativa, financiera y contable\r\nSistemas de información financiera y ERP (como AdminTotal)",
    "skills": "Comunicación efectiva (verbal y escrita)\r\nLiderazgo y gestión de equipos\r\nManejo de herramientas de oficina (Word, Excel, PowerPoint)\r\nManejo de herramientas de videoconferencia (Google Workspace, Teams, Zoom)\r\nManejo de herramientas de comunicación digital (email, mensajería instantánea)\r\nManejo de herramientas contables y de gestión (AdminTotal, software contable)\r\nCapacidad de análisis, negociación y resolución de problemas",
    "languages": "Español, Nivel deseable Ingles A1 MCRE ( Marco Común de Referencia Europeo)",
    "responsibilities": "Planear y controlar el presupuesto general\r\nIdentificar necesidades de compras y gestionar adquisiciones\r\nNegociar con proveedores y asegurar relaciones sólidas\r\nSupervisar el cumplimiento de normativas fiscales y contables\r\nAnalizar costos y realizar comparativas para toma de decisiones\r\nSupervisar y controlar inventarios, pagos, caja chica y viáticos\r\nElaborar contratos, informes y estados financieros\r\nPresentar indicadores mensuales y reportes financieros\r\nAtender auditorías internas y externas\r\nGestionar riesgos administrativos y financieros\r\nImplementar mejoras en procesos administrativos y de compras\r\nParticipar en actividades de Responsabilidad Social Empresarial (ESR)\r\nAsegurar el desempeño del SGC y SGOE según normas ISO",
    "otherRoles": "Apoyo en áreas que lo requieran.",
    "attributes": "Proactividad\r\nTrabajo en equipo\r\nPaciencia\r\nCapacidad de análisis y resolución de problemas\r\nOrientación al logro de resultados y a la mejora continua\r\nHabilidades de comunicación y negociación\r\nVisión estratégica \r\nPensamiento critico.",
    "file": "PERFIL DE PUESTO GERENTE DE ADMINISTRACION Y FINANZAS (1).xlsx",
    "processId": "PROC_FINANZAS"
  },
  {
    "id": "GERENTE DE OPERACIONES",
    "title": "Gerente de Operaciones",
    "reportsTo": [
      "Director General"
    ],
    "subordinates": [
      "Coordinador Académico",
      "Coordinadora de Exámenes",
      "Diseñador y Desarrollador Web",
      "Ejecutivo de ventas",
      "Responsable de Comunicación",
      "Representante LEC Baja California"
    ],
    "mission": "Coordinar de manera adecuada cada una de las áreas que integran la empresa con el objetivo de asegurar el cumplimiento de las responsabilidades de las coordinaciones y los objetivos de la organización.",
    "sex": "Indistinto",
    "experience": "1 año",
    "travel": "Si",
    "education": "Licenciatura o Carrera Trunca",
    "specialty": "Educación, Enseñanza del Inglés, Administración o afin.",
    "desiredExp": "Mínima de 1 año en posiciones de coordinación de personal y recursos, preferiblemente en un entorno empresarial.\r\nEn el área de ventas, incluyendo la gestión de equipos de ventas, estrategias de marketing y cumplimiento de objetivos comerciales.\r\nEn la administración y supervisión de operaciones empresariales, incluyendo la gestión de presupuestos, control de costos y mejora de procesos.",
    "knowledge": "Comprension de certificaciones y normativas relacionadas con la industria o sector específico de la empresa.     En administración organizacional.",
    "skills": "Comunicación (verbal y escrita)\r\nManejo de herramientas de colaboración (Videoconferencias) en línea como Google Workspace, Microsoft Teams, Zoom.   \r\nManejo de herramientas de presentación como Google Slides, Prezi.                                                                   Manejo de personal.\r\nManejo de herramientas de paquete office (Microsoft Word, Excel, Powerpoint)\r\nManejo de heramientas de comunicación digital como correos electrónicos, mensajería instantánea (Whatsapp, Messenger, Telegram)\r\nManejo de redes sociales (Facebook, Instagram)",
    "languages": "Español, Nivel deseable Ingles B1 MCRE ( Marco Común de Referencia Europeo)",
    "responsibilities": "Dar seguimiento a los pagos de clientes y proveedores, garantizando el cumplimiento de los plazos establecidos.\r\nSupervisar y asegurar que los procesos internos se lleven a cabo correctamente, identificando oportunidades de mejora y aplicando acciones correctivas cuando sea necesario.\r\nGestionar los recursos necesarios para las diferentes áreas y coordinaciones de la empresa, asegurando un uso eficiente y óptimo.\r\nDar seguimiento y evaluar el avance de las actividades y proyectos en curso, asegurando su cumplimiento en tiempo y forma.\r\nMantener una comunicación efectiva con el equipo de trabajo, brindando orientación, apoyo y retroalimentación.\r\nParticipar en la toma de decisiones estratégicas y en la planificación de metas y objetivos a corto y largo plazo.\r\nRepresentar a la empresa ante clientes, proveedores y otros actores externos, manteniendo relaciones comerciales sólidas y gestionando posibles conflictos.\r\nMantenerse actualizado sobre las tendencias y novedades del sector, identificando oportunidades de crecimiento y mejora.\r\nAtender auditorías aplicables\r\nParticipar en las actividades de ESR que se le asignen.                                                                                                     Asegurar el aumento del desempeño del SGC y SGOE de acuerdo a los controles establecidos en el proceso.",
    "otherRoles": "Apoyo en áreas que lo requieran.",
    "attributes": "Paciencia para manejar situaciones complejas y resolver problemas de manera efectiva.\r\nOrganizado/a, capaz de gestionar múltiples tareas y prioridades.\r\nHabilidad para trabajar en equipo y fomentar la colaboración entre los miembros de la organización.\r\nHonestidad y responsabilidad en la gestión de los recursos y toma de decisiones.\r\nDiscreción para tratar información confidencial de la empresa y los clientes.\r\nProactividad para identificar oportunidades de mejora y proponer soluciones.\r\nFacilidad de palabra y habilidades de comunicación efectiva en diferentes niveles de la organización.\r\nCapacidad de mediación",
    "file": "PERFIL DE PUESTO GERENTE DE OPERACIONES (1).xlsx",
    "processId": ""
  },
  {
    "id": "INSTRUCTOR",
    "title": "Instructor",
    "reportsTo": [
      "Coordinador Académico"
    ],
    "subordinates": [],
    "mission": "Brindar una experiencia educativa de alta calidad a los participantes, proporcionando conocimientos y habilidades en el campo de enseñanza de idiomas. \r\nAsegurar un ambiente de aprendizaje efectivo, motivador y enriquecedor para los participantes.",
    "sex": "Indistinto",
    "experience": "3 años",
    "travel": "Si",
    "education": "Licenciatura o Maestría",
    "specialty": "Educación, Enseñanza del Inglés u otra especialización según el tipo de curso solicitado.",
    "desiredExp": "",
    "knowledge": "Habilidades de comunicación (verbal y escrita)\r\nFamiliaridad con las metodologías y enfoques pedagógicos más actualizados en el área de especialización que requiera el curso, taller y/o conferencia solicitado.\r\nConocimiento sobre los recursos relativos a la atención a personas con discapacidad.\r\nConocimientos sobre las posibles barreras de participación de los alumnos con discapacidad.",
    "skills": "Comunicación (verbal y escrita)\r\nManejo de herramientas de colaboración (Videoconferencias) en línea como Google Workspace para Educación, Microsoft Teams, Zoom.\r\nManejo de herramientas de presentación como Google Slides, Prezi.\r\nManejo de herramientas de paquete office (Microsoft Word, Excel, Powerpoint)\r\nManejo de heramientas de comunicación digital como correos electrónicos, mensajería instantánea (Whatsapp, Messenger, Telegram)",
    "languages": "Español, Nivel deseable Ingles B1 MCRE ( Marco Común de Referencia Europeo)",
    "responsibilities": "Impartir clases de manera efectiva, siguiendo el plan de estudios establecido.\r\nPreparar y entregar material didáctico de calidad, adaptado a las necesidades y niveles de los participantes.\r\nEvaluar y realizar un seguimiento del progreso de los participantes, brindando retroalimentación constructiva.\r\nEstimular la participación activa de los participantes, fomentando un ambiente de aprendizaje dinámico y colaborativo.\r\nMantenerse actualizado en los avances y tendencias en la enseñanza, participando en actividades de desarrollo profesional y capacitación.\r\nParticipar en reuniones de equipo y colaborar con otros instructores para mejorar la calidad de la enseñanza.\r\nAsegurar el aumento del desempeño del SGC y SGOE de acuerdo a los controles establecidos en el proceso.\r\nColaborar en la participación de los alumnos con discapacidad.\r\nPotenciar el desarrollo de las capacidades de los alumnos con necesidades educativas especiales. \r\nPromover la inclusión de los alumnos con necesidades específicas \r\nOfrecer recursos para adaptar y mejorar proceso de aprendizaje.\r\nGarantizar el enfoque a los estidiantes, partes interesadas durante la aplicacion de examenes.\r\nMantener una comunicacion acertivamente con coordinacion de Examenes, Gerencia de Proyectos y partes interesadas.",
    "otherRoles": "Capacitador, examinador. Apoyo en áreas que lo requieran.",
    "attributes": "Vocación por los procesos de enseñanza y el aprendizaje en su área de especialización.\r\nPaciencia y empatía hacia los estudiantes.\r\nCreatividad para desarrollar enfoques didácticos innovadores.\r\nOrganización y capacidad para gestionar el tiempo de manera efectiva.\r\nFlexibilidad para adaptarse a las necesidades cambiantes de los participantes y la organización.\r\nProfesionalismo y ética en el trabajo.\r\nCapacidad para crear un ambiente inclusivo y respetuoso en el aula.\r\nHabilidades interpersonales para establecer relaciones positivas con los estudiantes y el equipo educativo.\r\nMotivación para su propio crecimiento y desarrollo profesional.",
    "file": "PERFIL DE PUESTO INSTRUCTORES (1).xlsx",
    "processId": "PROC_ACADEMICA"
  },
  {
    "id": "PRACTICANTE",
    "title": "Practicante",
    "reportsTo": [
      "Coordinadora de Calidad y Responsabilidad Social"
    ],
    "subordinates": [],
    "mission": "Brindar apoyo y asistencia en proyectos relacionados con la optimización de procesos y el desarrollo de estrategias para mejorar la eficiencia y efectividad del sistema de gestión de la empresa.",
    "sex": "Indistinto",
    "experience": "No requerido",
    "travel": "No requerido",
    "education": "Estudiante de Licenciatura.",
    "specialty": "La que requiera el proyecto.",
    "desiredExp": "Familiaridad con la estructura y funcionamiento de las empresas, incluyendo aspectos financieros, recursos humanos y operativos.\r\nExperiencia en el análisis de tiempos y movimientos.\r\nEn el análisis de requerimientos, diseño de arquitecturas y desarrollo de soluciones tecnológicas.",
    "knowledge": "Familiardiad en los principios y conceptos de gestión de calidad, como ISO 9001 u otros estándares similares.\r\nFamiliaridad con herramientas y técnicas para el análisis de procesos, como diagramas de flujo, diagramas de causa y efecto, y análisis FODA.\r\nComprensión de los fundamentos de la mejora continua y la resolución de problemas.\r\nComprension de conceptos de logística y cadena de suministro, incluyendo inventario, transporte y distribución.\r\nFamiliaridad con software de Inteligencia Artificial.\r\nDe recursos y tecnologías educativas para la enseñanza de idiomas, incluyendo software de aprendizaje, plataformas en línea y recursos multimedia.",
    "skills": "Comunicación (verbal y escrita)\r\nManejo de herramientas de colaboración (Videoconferencias) en línea como Google Workspace, Microsoft Teams, Zoom.\r\nManejo de herramientas de presentación como Google Slides, Prezi.\r\nManejo de herramientas de paquete office (Microsoft Word, Excel, Powerpoint)                                                   Manejo de sofware de Inteligencia Artificial.\r\nManejo de herramientas educativas como PowerSchool, Infinite Campus, Canvas, Blackboard, Moodle, Google Classroom.\r\nManejo de heramientas de comunicación digital como correos electrónicos, mensajería instantánea (Whatsapp, Messenger, Telegram).\r\nConocimientos acordes a las necesidaes del proyecto del área solicitante.",
    "languages": "Español, Nivel deseable Ingles A2 MCRE ( Marco Común de Referencia Europeo)",
    "responsibilities": "Colaborar en la identificación de oportunidades de mejora en los procesos y procedimientos existentes.\r\nAsistir en la documentación y estandarización de los procesos y políticas de la empresa.\r\nParticipar en la elaboración de indicadores clave de desempeño (KPIs) y en el seguimiento de su cumplimiento.\r\nApoyar en la implementación de acciones correctivas y preventivas para abordar no conformidades o desviaciones identificadas.\r\nColaborar en la realización de auditorías internas para evaluar el cumplimiento de los estándares de calidad y proponer recomendaciones de mejora.\r\nParticipar en la capacitación del personal en temas relacionados con la gestión de calidad y la mejora continua.\r\nRealizar el seguimiento de los planes de acción y las metas establecidas en el sistema de gestión.              Conocimiento relativo al proyecto para el que se le contrata.\r\nAtender auditorías aplicables.\r\nParticipar en las actividades de ESR que se le asignen.                                                                                                      Asegurar el aumento del desempeño del SGC y SGOE de acuerdo a los controles establecidos en el proceso.",
    "otherRoles": "Apoyo en áreas que lo requieran.",
    "attributes": "Proactividad.\r\nPensamiento analítico.\r\nOrientación a resultados.\r\nHabilidades de comunicación.\r\nTrabajo en equipo.\r\nAdaptabilidad.\r\nOrientación al cliente.",
    "file": "PERFIL DE PUESTO PRACTICANTE (1).xlsx",
    "processId": ""
  },
  {
    "id": "REPRESENTANTE LEC BAJA CALIFORNIA",
    "title": "Representante LEC Baja California",
    "reportsTo": [
      "Gerente de Operaciones"
    ],
    "subordinates": [
      "Asistente LEC BC"
    ],
    "mission": "Proveer excelente servicio al cliente, para apoyar al logro de objetivos y metas de la empresa.  Apoyar en actividades administrativas con excelente actitud cumpliendo los objetivos de la organización.",
    "sex": "Indistinto",
    "experience": "1 año",
    "travel": "Si",
    "education": "Licenciatura / Carrera Trunca",
    "specialty": "Enseñanza del Inglés, Educación, o afín.",
    "desiredExp": "",
    "knowledge": "Comprension de certificaciones y normativas de los diferentes instrumentos y productos que oferta la organización.    \r\nEn administración organizacional.\r\nConocimiento sobre los recursos relativos a la atención a personas con discapacidad.\r\nConocimientos en sistemas  alternativos de comunicación (Lenguaje de Señas, Lectura Braille, etc.).\r\nConocimientos sobre las posibles barreras de participación de los alumnos con discapacidad.",
    "skills": "Comunicación (verbal y escrita)\r\nManejo de herramientas de colaboración (Videoconferencias) en línea como Google Workspace para Educación, Microsoft Teams, Zoom.\r\nManejo de herramientas de presentación como Google Slides, Prezi.\r\nManejo de herramientas de paquete office (Microsoft Word, Excel, Powerpoint)\r\nManejo de heramientas de comunicación digital como correos electrónicos, mensajería instantánea (Whatsapp, Messenger, Telegram)\r\nManejo de redes sociales (Facebook, Instagram)\r\nFamiliaridad con herramientas y software de punto de venta, así como habilidades básicas en el manejo de cajas registradoras y sistemas de pago.",
    "languages": "Español, Nivel deseable Ingles B2 MCRE ( Marco Común de Referencia Europeo)",
    "responsibilities": "Brindar atención al público interno y externo, asegurando un trato amable y profesional.\r\nAdministrar documentos digitales y físicos, asegurando su correcta organización y resguardo.\r\nRecepcionar llamadas telefónicas y correos electrónicos, proporcionando información precisa y resolviendo consultas o derivándolas a los departamentos correspondientes.\r\nAplicar y gestionar exámenes, asegurando su correcta administración y registro.\r\nRealizar visitas a clientes prospectos, presentando los servicios de la empresa y estableciendo relaciones comerciales.\r\nResguardar materiales confidenciales de manera segura y confiable.\r\nRealizar seguimiento a clientes, asegurando su satisfacción y atendiendo cualquier inquietud o queja de manera oportuna.\r\nCapacitarse en los diferentes entrenamientos proporcionados para garantizar una correcta ejecución de las aplicaciones y servicios ofrecidos.\r\nEntregar certificados y documentación a los clientes de acuerdo con los procedimientos establecidos.\r\nAtender auditorías aplicables.\r\nComprender la Politica Integral de la Organización.\r\nAsegurar el cumplimiento de los resultados esperados del SGC y SGOE.\r\nAsegurar el aumento del desempeño del SGC y SGOE de acuerdo a los controles establecidos en el proceso.\r\nMejorar continuamente el proceso.\r\nGarantizar el enfoque a los estudiantes, partes interesadas durante la ejecucion de las actividades de venta.\r\nMantener una comunicacion acertivamente con Dirección y partes interesadas.\r\nConocimientos en sistemas  alternativos de comunicación (Lenguaje de Señas, Lectura Braille, etc.).",
    "otherRoles": "Apoyo en áreas que lo requieran.",
    "attributes": "Compromiso con la misión y valores de la empresa.\r\nActitud positiva y proactiva en el trato con clientes y compañeros de trabajo.\r\nHonestidad en el manejo de información confidencial y en la comunicación con clientes.\r\nLiderazgo para tomar iniciativas y resolver problemas de manera efectiva.\r\nResponsabilidad en el cumplimiento de las tareas asignadas y en el seguimiento de los clientes.\r\nHabilidad para trabajar en equipo y colaborar con otros departamentos en beneficio de los clientes y la organización.",
    "file": "PERFIL DE PUESTO REPRESENTANTE LEC BAJA CALIFORNIA (1).xlsx",
    "processId": ""
  },
  {
    "id": "REPRESENTANTE LEC NUEVO LEON",
    "title": "Representante LEC Nuevo Leon",
    "reportsTo": [
      "Coordinadora de Proyectos"
    ],
    "subordinates": [],
    "mission": "Proveer excelente servicio al cliente, para apoyar al logro de objetivos y metas de la empresa.  Apoyar en actividades administrativas con excelente actitud cumpliendo los objetivos de la organización.",
    "sex": "Indistinto",
    "experience": "1 año",
    "travel": "Si",
    "education": "Licenciatura / Carrera Trunca",
    "specialty": "Enseñanza del Inglés, Educación, o afín.",
    "desiredExp": "",
    "knowledge": "Comprension de certificaciones y normativas de los diferentes instrumentos y productos que oferta la organización.   \r\nEn administración organizacional.\r\nConocimiento sobre los recursos relativos a la atención a personas con discapacidad.\r\nConocimientos en sistemas  alternativos de comunicación (Lenguaje de Señas, Lectura Braille, etc.).\r\nConocimientos sobre las posibles barreras de participación de los alumnos con discapacidad.",
    "skills": "Comunicación (verbal y escrita)\r\nManejo de herramientas de colaboración (Videoconferencias) en línea como Google Workspace para Educación, Microsoft Teams, Zoom.\r\nManejo de herramientas de presentación como Google Slides, Prezi.\r\nManejo de herramientas de paquete office (Microsoft Word, Excel, Powerpoint)\r\nManejo de heramientas de comunicación digital como correos electrónicos, mensajería instantánea (Whatsapp, Messenger, Telegram)\r\nManejo de redes sociales (Facebook, Instagram)\r\nFamiliaridad con herramientas y software de punto de venta, así como habilidades básicas en el manejo de cajas registradoras y sistemas de pago.",
    "languages": "Español, Nivel deseable Ingles B2 MCRE ( Marco Común de Referencia Europeo)",
    "responsibilities": "Brindar atención al público interno y externo, asegurando un trato amable y profesional.\r\nAdministrar documentos digitales y físicos, asegurando su correcta organización y resguardo.\r\nRecepcionar llamadas telefónicas y correos electrónicos, proporcionando información precisa y resolviendo consultas o derivándolas a los departamentos correspondientes.\r\nAplicar y gestionar exámenes, asegurando su correcta administración y registro.\r\nRealizar visitas a clientes prospectos, presentando los servicios de la empresa y estableciendo relaciones comerciales.\r\nResguardar materiales confidenciales de manera segura y confiable.\r\nRealizar seguimiento a clientes, asegurando su satisfacción y atendiendo cualquier inquietud o queja de manera oportuna.\r\nCapacitarse en los diferentes entrenamientos proporcionados para garantizar una correcta ejecución de las aplicaciones y servicios ofrecidos.\r\nEntregar certificados y documentación a los clientes de acuerdo con los procedimientos establecidos.\r\nAtender auditorías aplicables.\r\nComprender la Politica Integral de la Organización.\r\nAsegurar el cumplimiento de los resultados esperados del SGC y SGOE.\r\nAsegurar el aumento del desempeño del SGC y SGOE de acuerdo a los controles establecidos en el proceso.\r\nMejorar continuamente el proceso.\r\nGarantizar el enfoque a los estudiantes, partes interesadas durante la ejecucion de las actividades de venta.\r\nMantener una comunicacion acertivamente con Dirección y partes interesadas.\r\nConocimientos en sistemas  alternativos de comunicación (Lenguaje de Señas, Lectura Braille, etc.).",
    "otherRoles": "Apoyo en áreas que lo requieran.",
    "attributes": "Compromiso con la misión y valores de la empresa.\r\nActitud positiva y proactiva en el trato con clientes y compañeros de trabajo.\r\nHonestidad en el manejo de información confidencial y en la comunicación con clientes.\r\nLiderazgo para tomar iniciativas y resolver problemas de manera efectiva.\r\nResponsabilidad en el cumplimiento de las tareas asignadas y en el seguimiento de los clientes.\r\nHabilidad para trabajar en equipo y colaborar con otros departamentos en beneficio de los clientes y la organización.",
    "file": "PERFIL DE PUESTO REPRESENTANTE LEC NUEVO LEON (1).xlsx",
    "processId": ""
  },
  {
    "id": "RESPONSABLE DE COMUNICACIÓN",
    "title": "Responsable de Comunicación",
    "reportsTo": [
      "Gerente de Operaciones"
    ],
    "subordinates": [],
    "mission": "Diseñar, implementar y mantener estrategias de comunicación interna y externa que fortalezcan la imagen institucional. Gestionar contenidos digitales y redes sociales alineados con los valores y objetivos organizacionales asegurando una presencia digital coherente, profesional y efectiva.",
    "sex": "Indistinto",
    "experience": "Deseable 1 años",
    "travel": "Si",
    "education": "Licenciatura, Ingeniería, o Carrera Técnica",
    "specialty": "Comunicación, Marketing Digital, Gestión Empresarial, Diseño Gráfico, Relaciones Públicas o afín",
    "desiredExp": "",
    "knowledge": "Plataformas de redes sociales (Facebook, Instagram, LinkedIn, TikTok, X/Twitter), fotografía y edición básica de video (deseable)",
    "skills": "Comunicación clara (oral y escrita).\r\n Creatividad e innovación.\r\n Análisis estratégico.\r\n Organización y gestión del tiempo.\r\n Trabajo en equipo.\r\n Dominio de herramientas digitales (Google Workspace, Teams, Zoom, etc.)",
    "languages": "Español, deseable Inglés nivel A2-B1 MCRE",
    "responsibilities": "Diseñar y ejecutar planes de comunicación interna.\r\n Crear, publicar y monitorear contenido en redes sociales.\r\n Gestionar imagen institucional.\r\n Coordinar campañas de difusión.\r\n Supervisar la reputación institucional.\r\n Producir material visual y audiovisual. \r\nApoyar en eventos internos y externos.",
    "otherRoles": "Apoyo en áreas que lo requieran",
    "attributes": "Proactividad.\r\n Creatividad.\r\n Empatía.\r\n Habilidades interpersonales.\r\n Capacidad para generar ideas.\r\nVisión estratégica",
    "file": "PERFIL DE PUESTO RESPONSABLE DE COMUNICACION (1).xlsx",
    "processId": "PROC_VENTAS"
  },
  {
    "id": "RESPONSABLE DE SERVICIOS GENERALES",
    "title": "Responsable de Servicios Generales",
    "reportsTo": [
      "Gerente de Administración y Finanzas"
    ],
    "subordinates": [
      "Auxiliar de Servicios Generales"
    ],
    "mission": "Asegurar que la empresa adquiera los productos y servicios necesarios con la mejor relación calidad-precio, garantizando la disponibilidad oportuna de los mismos y optimizando los recursos. Buscando establecer relaciones sólidas con proveedores confiables y negociar acuerdos beneficiosos para la organización.",
    "sex": "Indistinto",
    "experience": "2 años",
    "travel": "Si",
    "education": "Preparatoria / Carrera Trunca",
    "specialty": "Administración, Finanzas o afín",
    "desiredExp": "",
    "knowledge": "Comprension del proceso de compras, desde la identificación de necesidades hasta la recepción de los productos o servicios adquiridos.\r\nFamiliaridad con técnicas de negociación y habilidades para obtener acuerdos beneficiosos.\r\nDe análisis de costos y presupuestos.\r\nDe las regulaciones y legislación relacionadas con las compras y contratos.",
    "skills": "Comunicación (verbal y escrita)\r\nManejo de herramientas de colaboración (Videoconferencias) en línea como Google Workspace para Educación, Microsoft Teams o Zoom.\r\nManejo de herramientas de presentación como Google Slides o Prezi.\r\nManejo de herramientas de paquete office (Microsoft Word, Excel, Powerpoint)\r\nManejo de heramientas de comunicación digital como correos electrónicos, mensajería instantánea (Whatsapp, Messenger, Telegram)\r\nManejo de herramientas de gestion de recursos como AdminTotal",
    "languages": "Español, Nivel deseable Ingles B1 MCRE ( Marco Común de Referencia Europeo)",
    "responsibilities": "Identificar necesidades de compra.\r\nInvestigar y evaluar proveedores.\r\nComparar y seleccionar las mejores ofertas.\r\nNegociar contratos con proveedores.\r\nGestionar y mantener relaciones con proveedores.\r\nControlar el inventario de bienes y servicios.\r\nRealizar seguimiento y control del proceso de compras.\r\nRealizar análisis de costos y comparativas de precios.\r\nOptimizar los costos de adquisición.\r\nCumplir con normativas y políticas internas y externas.\r\nEvaluar y gestionar riesgos en las adquisiciones.\r\nGestionar eficientemente la cadena de suministro.\r\nAtender auditorías aplicables.\r\nParticipar en las actividades de ESR que se le asignen.\r\nPresentar indicadores mensuales.                                                                                                                            Asegurar el aumento del desempeño del SGC y SGOE de acuerdo a los controles establecidos en el proceso.",
    "otherRoles": "Apoyo en áreas que lo requieran.",
    "attributes": "Compromiso.\r\nHonestidad.\r\nBuena Actitud .\r\nResponsabilidad.\r\nLiderazgo.\r\nTrabajo en Equipo.",
    "file": "PERFIL DE PUESTO RESPONSABLE DE SERVICIO GENERAL (1).xlsx",
    "processId": "PROC_RRHH"
  },
  {
    "id": "ESPECIALISTA PARA ORGANIZACIÓN DE EVENTOS Y PROTOCOLO",
    "title": "Especialista para Organización de Eventos y Protocolo",
    "reportsTo": [
      "Gerente de Operaciones"
    ],
    "subordinates": [],
    "mission": "Planificar, organizar y ejecutar eventos corporativos, académicos y protocolarios de la organización, asegurando la máxima calidad, la correcta proyección de la imagen institucional y la satisfacción de los asistentes y partes interesadas.",
    "sex": "Indistinto",
    "experience": "Deseable 1 año",
    "travel": "Si",
    "education": "Licenciatura o Carrera Técnica",
    "specialty": "Comunicación, Relaciones Públicas, Organización de Eventos, Administración o afín.",
    "desiredExp": "Experiencia en la coordinación y logística de eventos corporativos, académicos o públicos. Conocimientos en gestión de proveedores y presupuestos.",
    "knowledge": "Protocolo y etiqueta de eventos. Negociación con proveedores. Gestión de presupuestos. Dominio de herramientas de ofimática y software de gestión de proyectos.",
    "skills": "Excelente comunicación verbal y escrita. Habilidades de organización y planificación. Atención al detalle. Capacidad de resolución de problemas bajo presión. Creatividad y enfoque al cliente.",
    "languages": "Español, Nivel deseable Inglés B1 MCRE",
    "responsibilities": "Diseñar, planificar y coordinar la logística integral de los eventos de la organización. Seleccionar, negociar y coordinar proveedores (catering, audiovisuales, sedes, etc.). Gestionar las invitaciones, registro y atención a los asistentes. Velar por el cumplimiento de los estándares de calidad y protocolo. Evaluar los resultados de los eventos y presentar reportes de mejora. Participar en las actividades de ESR que se le asignen. Asegurar el aumento del desempeño del SGC y SGOE.",
    "otherRoles": "Apoyo en actividades de relaciones públicas. Apoyo en áreas que lo requieran.",
    "attributes": "Liderazgo, dinamismo, creatividad, responsabilidad, excelente presentación, empatía y adaptabilidad.",
    "file": "PERFIL DE PUESTO ESPECIALISTA PARA ORGANIZACION DE EVENTOS.xlsx",
    "processId": "SUBPROC_GESTION_PROYECTOS"
  },
  {
    "id": "AUXILIAR DE OPERACIONES",
    "title": "Auxiliar de operaciones",
    "reportsTo": [
      "Gerente de Operaciones"
    ],
    "subordinates": [],
    "mission": "Brindar soporte operativo y administrativo a la Gerencia de Operaciones para garantizar la correcta ejecución de los procesos internos, el cumplimiento de las metas departamentales y la fluidez en la prestación de servicios.",
    "sex": "Indistinto",
    "experience": "Deseable 6 meses",
    "travel": "Ocasional",
    "education": "Preparatoria, Carrera Técnica o Licenciatura Trunca",
    "specialty": "Administración, Operaciones o afín.",
    "desiredExp": "Experiencia previa en actividades administrativas, atención al cliente o soporte operativo. Manejo de archivo y bases de datos.",
    "knowledge": "Manejo de paquetería Office (Word, Excel, PowerPoint). Conocimiento básico de procesos administrativos y logísticos.",
    "skills": "Organización, seguimiento oportuno de tareas, comunicación efectiva, trabajo en equipo, capacidad para seguir instrucciones precisas y manejo básico de herramientas digitales.",
    "languages": "Español",
    "responsibilities": "Asistir en la planificación y seguimiento de las actividades operativas diarias. Actualizar bases de datos y registros internos de la operación. Apoyar en la elaboración de reportes e informes de seguimiento. Controlar el flujo de documentación y correspondencia operativa. Atender requerimientos logísticos básicos del equipo de operaciones. Colaborar con otras áreas para el buen desarrollo de los proyectos. Asegurar el cumplimiento de las directrices del SGC.",
    "otherRoles": "Apoyo en recepción y atención a clientes cuando sea requerido. Apoyo en áreas que lo requieran.",
    "attributes": "Actitud de servicio, proactividad, responsabilidad, orden, atención al detalle y compromiso.",
    "file": "PERFIL DE PUESTO AUXILIAR DE OPERACIONES.xlsx",
    "processId": "PROC_RRHH"
  }
];

export const ORG_DATA_RAW = HR_PROFILES;

export interface BusinessProcess {
  id: string;
  title: string;
  kpis: string;
  risks: string;
  improvements: string;
  actors: string;
  inputsOutputs: string;
  resources: string;
  documents: string;
  mermaidCode: string;
}

export const HR_PROCESSES = [
  {
    id: 'PROC_RRHH',
    title: 'Proceso de Recursos Humanos',
    kpis: '1. 95% de capacitaciones programadas cumplidas\n2. Reducción del 10% en la rotación de personal trimestral.',
    risks: '1. Inconformidad del empleado por falta de claridad en sus tareas.\n2. Contratar aspirantes que no reúnen los requisitos del perfil.',
    improvements: '1. Implementación de un módulo de RRHH en el Sistema Integral.\n2. Análisis de riesgos psicosociales (NOM-035).',
    actors: 'Director General, Área Solicitante, Recursos Humanos, Aspirante Externo, Personal Interno.',
    inputsOutputs: 'Entradas: Solicitud de Personal (Todas las áreas).\nSalidas: Personal Contratado, Evaluación de Desempeño.',
    resources: 'Humanos: Reclutador, Capacitadores.\nTecnológicos: Sistema Integral, Plataformas de Empleo.',
    documents: '1. Perfil de Puesto.pdf\n2. Expediente de Personal\n3. Formato de Evaluación de Desempeño.xlsx',
    mermaidCode: 'graph TD\n    A[Solicitud de Personal] --> B{"¿Talento interno?"}\n    B -- Sí --> C[Ascenso / Reubicación]\n    B -- No --> D[Reclutamiento Externo]\n    D --> E[Entrevistas]\n    E --> F[Firma de Contrato y Alta IMSS]\n    F --> G[Inducción y Capacitación Inicial]\n    C --> G'
  },
  {
    id: 'PROC_FINANZAS',
    title: 'Proceso de Finanzas',
    kpis: '1. 100% de conciliaciones bancarias al día.\n2. Reducción de cuentas por cobrar a más de 30 días en un 15%.',
    risks: '1. Flujo de caja insuficiente para obligaciones.\n2. Errores en facturación o pagos a proveedores.',
    improvements: '1. Automatización de reportes financieros.\n2. Integración de la plataforma de cobranza.',
    actors: 'Gerente de Administración y Finanzas, Director General, Proceso Ventas, Proveedores.',
    inputsOutputs: 'Entradas: Órdenes de Compra, Facturas (Proceso Ventas, Proyectos).\nSalidas: Pagos, Reportes Financieros, Presupuestos.',
    resources: 'Financieros: Cuentas bancarias.\nTecnológicos: Software Contable, Sistema Integral.',
    documents: '1. Reporte de Flujo de Efectivo.xlsx\n2. Comprobantes de Pago.pdf\n3. Presupuesto Anual',
    mermaidCode: 'graph TD\n    A[Recepción de Solicitud de Pago] --> B{"¿Presupuesto Aprobado?"}\n    B -- Sí --> C[Validación de Factura]\n    B -- No --> D[Autorización de Director General]\n    D --> C\n    C --> E[Programación de Pago]\n    E --> F[Ejecución y Registro Contable]'
  },
  {
    id: 'PROC_VENTAS',
    title: 'Proceso de Ventas y Comunicación',
    kpis: '1. Conversión del 20% en prospectos de certificaciones.\n2. 90% de satisfacción en encuestas de atención inicial.',
    risks: '1. Información incorrecta proporcionada al cliente.\n2. Seguimiento tardío a prospectos interesados.',
    improvements: '1. Implementación de CRM automatizado.\n2. Plantillas de comunicación estandarizadas.',
    actors: 'Responsable de Comunicación, Representantes de Ventas, Director General.',
    inputsOutputs: 'Entradas: Prospectos (Web, Redes), Campañas.\nSalidas: Clientes Registrados, Reportes de Ventas.',
    resources: 'Tecnológicos: CRM, Redes Sociales, LEC Orb.',
    documents: '1. Catálogo de Productos.pdf\n2. Guión de Ventas\n3. Lista de Precios Vigente',
    mermaidCode: 'graph TD\n    A[Prospecto Registrado] --> B[Primer Contacto / Calificación]\n    B --> C{"¿Interesado?"}\n    C -- No --> D[Seguimiento Posterior]\n    C -- Sí --> E[Presentación de Propuesta]\n    E --> F[Cierre / Inscripción]\n    F --> G[Handoff a Operaciones]'
  },
  {
    id: 'PROC_EXAMENES',
    title: 'Proceso de Aplicación de Exámenes',
    kpis: '1. 0 incidencias de seguridad en material confidencial.\n2. 100% de reportes de aplicación entregados en tiempo.',
    risks: '1. Extravío de material de examen.\n2. Fallas técnicas durante aplicaciones digitales.',
    improvements: '1. Digitalización de reportes de incidencias.\n2. Auditoría aleatoria de aplicaciones.',
    actors: 'Coordinador de Exámenes, Aplicadores, Candidatos, Cambridge/TOEFL.',
    inputsOutputs: 'Entradas: Registro de Candidatos, Material Confidencial.\nSalidas: Resultados, Reportes de Sesión.',
    resources: 'Físicos: Salones, Computadoras.\nLogísticos: Material de Examen Seguro.',
    documents: '1. Manual del Aplicador.pdf\n2. Protocolo de Seguridad\n3. Registro de Incidencias.xlsx',
    mermaidCode: 'graph TD\n    A[Recepción de Material] --> B[Preparación de Sesión]\n    B --> C[Identificación de Candidatos]\n    C --> D[Aplicación de Examen]\n    D --> E[Recolección y Empaque]\n    E --> F[Envío a Centro Evaluador]'
  },
  {
    id: 'PROC_ACADEMICA',
    title: 'Proceso de Gestión Académica',
    kpis: '1. 90% de satisfacción en evaluaciones docentes.\n2. Cumplimiento del 100% en el diseño de cursos solicitados.',
    risks: '1. Deserción de alumnos por baja calidad académica.\n2. Falta de instructores capacitados.',
    improvements: '1. Actualización continua de materiales didácticos.\n2. Implementación de encuestas de satisfacción automatizadas.',
    actors: 'Coordinador Académico, Instructores, Estudiantes, Clientes.',
    inputsOutputs: 'Entradas: Requerimiento de curso, Perfil de estudiantes.\nSalidas: Curso impartido, Evaluación de estudiantes.',
    resources: 'Humanos: Instructores capacitados.\nTecnológicos: Plataformas educativas (LMS), Material didáctico.',
    documents: '1. Plan de Estudios.pdf\n2. Evaluación Docente.xlsx\n3. Lista de Asistencia.pdf',
    mermaidCode: 'graph TD\n    A[Solicitud de Curso] --> B[Diseño/Adaptación del Programa]\n    B --> C[Asignación de Instructor]\n    C --> D[Impartición del Curso]\n    D --> E[Evaluación de Estudiantes y Docente]\n    E --> F[Entrega de Resultados/Constancias]'
  },
  {
    id: 'PROC_FERIA_LIBRO',
    title: 'Proceso de Feria del Libro',
    kpis: '1. 100% de cumplimiento en el cronograma de ferias.\n2. Incremento del 15% en ventas respecto al año anterior.',
    risks: '1. Falta de stock de títulos demandados.\n2. Problemas logísticos en el montaje de la feria.',
    improvements: '1. Digitalización del control de inventario en tiempo real.\n2. Estrategias de preventa en escuelas.',
    actors: 'Coordinadora de Feria del Libro, Auxiliar, Editoriales, Escuelas.',
    inputsOutputs: 'Entradas: Solicitud de feria por escuela, Catálogo de editoriales.\nSalidas: Libros vendidos, Reporte de ventas y utilidades.',
    resources: 'Físicos: Libros, Material de montaje (Stands, cajas registadoras).\nLogísticos: Transporte.',
    documents: '1. Inventario de Feria.xlsx\n2. Reporte de Ventas.pdf\n3. Convenio con Escuela.pdf',
    mermaidCode: 'graph TD\n    A[Planificación y Convenio con Escuela] --> B[Solicitud de Material a Editoriales]\n    B --> C[Recepción y Etiquetado de Inventario]\n    C --> D[Montaje de Feria]\n    D --> E[Atención y Venta]\n    E --> F[Desmontaje y Cierre de Caja]\n    F --> G[Reporte de Resultados]'
  },
  {
    id: 'SUBPROC_COORD_ACADEMICA',
    title: 'Subproceso de Coordinación Académica',
    kpis: '1. 100% de instructores evaluados trimestralmente.\n2. 95% de programas educativos aprobados sin observaciones.',
    risks: '1. Programas no alineados a los requerimientos del cliente.\n2. Instructores con bajo desempeño.',
    improvements: '1. Estandarización de rúbricas de evaluación.\n2. Creación de un banco de recursos compartidos para instructores.',
    actors: 'Coordinador Académico, Instructores, Dirección General.',
    inputsOutputs: 'Entradas: Retroalimentación de alumnos, Nuevos requerimientos educativos.\nSalidas: Programas de estudio aprobados, Reportes de desempeño.',
    resources: 'Tecnológicos: Sistema Integral, Plataformas LMS.',
    documents: '1. Rúbricas de Evaluación.pdf\n2. Reporte de Desempeño Docente.xlsx',
    mermaidCode: 'graph TD\n    A[Revisión de Requerimientos Educativos] --> B[Diseño Curricular]\n    B --> C[Validación de Contenidos]\n    C --> D[Capacitación a Instructores]\n    D --> E[Supervisión de Clases]\n    E --> F[Retroalimentación y Mejora Continua]'
  },
  {
    id: 'SUBPROC_AUDITORIAS_INTERNAS',
    title: 'Subproceso de Auditorías Internas y SGC',
    kpis: '1. 100% del programa anual de auditorías cumplido.\n2. Cierre del 90% de las No Conformidades en el tiempo estipulado.',
    risks: '1. Incumplimiento de normativas ISO (9001/21001).\n2. Cierre ineficaz de acciones correctivas.',
    improvements: '1. Uso de software para el seguimiento de hallazgos.\n2. Capacitación continua en cultura de calidad.',
    actors: 'Coordinadora de Calidad y RS, Auditores Internos, Dueños de Procesos.',
    inputsOutputs: 'Entradas: Programa Anual de Auditorías, Manual de Calidad.\nSalidas: Informes de Auditoría, Acciones Correctivas (SAC).',
    resources: 'Humanos: Auditores capacitados.\nTecnológicos: Sistema de Gestión Documental.',
    documents: '1. Plan de Auditoría.pdf\n2. Informe de Auditoría.pdf\n3. Registro de SAC.xlsx',
    mermaidCode: 'graph TD\n    A[Elaboración del Programa de Auditorías] --> B[Planificación de Auditoría Específica]\n    B --> C[Ejecución de la Auditoría]\n    C --> D[Elaboración de Informe y Hallazgos]\n    D --> E[Apertura de SAC (No Conformidades)]\n    E --> F[Seguimiento y Cierre de Hallazgos]'
  },
  {
    id: 'SUBPROC_GESTION_PROYECTOS',
    title: 'Subproceso de Gestión de Proyectos y Eventos',
    kpis: '1. 100% de proyectos entregados dentro del presupuesto y plazo.\n2. 90% de satisfacción de los stakeholders en eventos.',
    risks: '1. Retrasos en el cronograma por factores externos.\n2. Sobrecostos no planificados.',
    improvements: '1. Implementación de metodologías ágiles.\n2. Plantillas estandarizadas para planificación de eventos.',
    actors: 'Coordinadora de Proyectos, Especialista de Eventos, Proveedores, Clientes.',
    inputsOutputs: 'Entradas: Propuesta de Proyecto/Evento, Presupuesto.\nSalidas: Proyecto concluido, Evento realizado, Reporte final.',
    resources: 'Financieros: Presupuesto asignado.\nTecnológicos: Software de gestión de proyectos (Trello, Asana).',
    documents: '1. Cronograma de Actividades.xlsx\n2. Presupuesto del Proyecto.xlsx\n3. Reporte de Cierre.pdf',
    mermaidCode: 'graph TD\n    A[Recepción de Requerimiento/Propuesta] --> B[Planificación y Presupuesto]\n    B --> C[Aprobación del Proyecto]\n    C --> D[Ejecución y Coordinación de Proveedores]\n    D --> E[Monitoreo y Control de Avances]\n    E --> F[Cierre del Proyecto/Evento]\n    F --> G[Evaluación de Resultados]'
  }
];

export interface AuditItem {
  id: string;
  title: string;
  q: string;
  status: 'cumple' | 'noconf' | 'oport' | '';
  notes: string;
  tags: string[];
}

export const DEFAULT_AUDIT: AuditItem[] = [
  {
    "id": "4.1",
    "title": "Contexto de la organización",
    "q": "¿Se han determinado las cuestiones externas e internas pertinentes para su propósito y dirección estratégica?",
    "status": "",
    "notes": "",
    "tags": [
      "ISO 9001",
      "ISO 21001"
    ]
  },
  {
    "id": "4.2",
    "title": "Partes interesadas",
    "q": "¿Se comprenden las necesidades y expectativas de los estudiantes y otros beneficiarios?",
    "status": "",
    "notes": "",
    "tags": [
      "ISO 9001",
      "ISO 21001"
    ]
  },
  {
    "id": "5.1",
    "title": "Liderazgo y compromiso",
    "q": "¿La alta dirección demuestra liderazgo y compromiso con el Sistema de Gestión?",
    "status": "",
    "notes": "",
    "tags": [
      "ISO 9001"
    ]
  },
  {
    "id": "5.1.2",
    "title": "Enfoque al estudiante",
    "q": "¿Se mantiene el enfoque principal en la satisfacción de las necesidades de los alumnos?",
    "status": "",
    "notes": "",
    "tags": [
      "ISO 21001"
    ]
  },
  {
    "id": "5.2",
    "title": "Política Integral",
    "q": "¿La política es apropiada al propósito de la organización y se comunica?",
    "status": "",
    "notes": "",
    "tags": [
      "ISO 9001",
      "ISO 21001"
    ]
  },
  {
    "id": "6.1",
    "title": "Acciones para abordar riesgos",
    "q": "¿Se han determinado los riesgos y oportunidades que es necesario abordar?",
    "status": "",
    "notes": "",
    "tags": [
      "ISO 9001",
      "ISO 21001"
    ]
  },
  {
    "id": "6.2",
    "title": "Objetivos de Calidad",
    "q": "¿Se han establecido objetivos coherentes con la política y son medibles?",
    "status": "",
    "notes": "",
    "tags": [
      "ISO 9001",
      "ISO 21001"
    ]
  },
  {
    "id": "7.1.5",
    "title": "Recursos de seguimiento",
    "q": "¿Se determinan y proporcionan los recursos necesarios para la validez de los resultados?",
    "status": "",
    "notes": "",
    "tags": [
      "ISO 9001"
    ]
  },
  {
    "id": "7.2",
    "title": "Competencia",
    "q": "¿Se asegura que el personal (especialmente instructores) es competente basado en educación/experiencia?",
    "status": "",
    "notes": "",
    "tags": [
      "ISO 9001",
      "ISO 21001"
    ]
  },
  {
    "id": "8.1",
    "title": "Planificación y control",
    "q": "¿Se planifican, implementan y controlan los procesos necesarios para la provisión del servicio educativo?",
    "status": "",
    "notes": "",
    "tags": [
      "ISO 21001"
    ]
  },
  {
    "id": "8.5",
    "title": "Control de la prestación",
    "q": "¿Se implementa el servicio bajo condiciones controladas y se valida el material didáctico?",
    "status": "",
    "notes": "",
    "tags": [
      "ISO 9001",
      "ISO 21001"
    ]
  },
  {
    "id": "9.1",
    "title": "Satisfacción del cliente/estudiante",
    "q": "¿Se realiza seguimiento a las percepciones de los estudiantes sobre el cumplimiento de sus necesidades?",
    "status": "",
    "notes": "",
    "tags": [
      "ISO 9001",
      "ISO 21001"
    ]
  },
  {
    "id": "9.2",
    "title": "Auditoría interna",
    "q": "¿Se llevan a cabo auditorías internas a intervalos planificados?",
    "status": "",
    "notes": "",
    "tags": [
      "ISO 9001",
      "ISO 21001"
    ]
  },
  {
    "id": "10.2",
    "title": "No conformidad y acción correctiva",
    "q": "¿Se toman acciones para controlar y corregir las no conformidades?",
    "status": "",
    "notes": "",
    "tags": [
      "ISO 9001",
      "ISO 21001"
    ]
  },
  {
    "id": "10.3",
    "title": "Mejora continua",
    "q": "¿Se mejora continuamente la conveniencia, adecuación y eficacia del SGC?",
    "status": "",
    "notes": "",
    "tags": [
      "ISO 9001",
      "ISO 21001"
    ]
  }
];

export const AUDIT_CLAUSES = [
  { id: "4",  name: "Contexto de la organización" },
  { id: "5",  name: "Liderazgo" },
  { id: "6",  name: "Planificación" },
  { id: "7",  name: "Apoyo" },
  { id: "8",  name: "Operación" },
  { id: "9",  name: "Evaluación del desempeño" },
  { id: "10", name: "Mejora" },
];

export interface RiskItem {
  process: string;
  failure: string;
  effect: string;
  sev: number;
  occ: number;
  det: number;
  npr: number;
  status: 'critical' | 'mitigating' | 'controlled';
}

export const HR_RISKS: RiskItem[] = [
  { process: "EXÁMENES", failure: "Pérdida de material confidencial", effect: "Pérdida de certificación Cambridge", sev: 10, occ: 2, det: 3, npr: 60, status: 'controlled' },
  { process: "FINANZAS", failure: "Error en declaración fiscal", effect: "Multas y recargos", sev: 8, occ: 3, det: 4, npr: 96, status: 'mitigating' },
  { process: "RRHH", failure: "Alta rotación de personal clave", effect: "Interrupción de servicios", sev: 7, occ: 6, det: 5, npr: 210, status: 'critical' },
  { process: "IT", failure: "Caída del servidor LEC Orb", effect: "Parálisis operativa", sev: 9, occ: 2, det: 2, npr: 36, status: 'controlled' },
];
