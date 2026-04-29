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

export interface AuditItem {
  id: string;
  title: string;
  q: string;
  status: 'cumple' | 'noconf' | 'oport' | '';
  notes: string;
  tags: string[];
}

export const HR_PROFILES: JobProfile[] = [
  {
    "id": "ADMINISTRADOR DE SISTEMAS",
    "title": "Administrador de Sistemas",
    "reportsTo": ["Diseñador y Desarrollador Web"],
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
    "reportsTo": ["Coordinadora de Exámenes"],
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
    "reportsTo": ["Gerencia de Administración y Finanzas"],
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
    "reportsTo": ["Representante LEC Baja California"],
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
    "reportsTo": ["Coordinadora de Exámenes"],
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
    "reportsTo": ["Coordinación Feria de Libro"],
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
    "reportsTo": ["Servicios Generales"],
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
    "reportsTo": ["Director General"],
    "subordinates": ["Instructor"],
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
    "reportsTo": ["Director General"],
    "subordinates": ["Practicante", "Enlace de Sistema Integral"],
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
    "reportsTo": ["Gerente de Operaciones"],
    "subordinates": ["Aplicador", "Auxiliar de Exámenes"],
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
    "attributes": "Excelentes habilidades de organización and planificación.\r\nCapacidad para trabajar de manera efectiva en un entorno educativo dinámico y colaborativo.\r\nHabilidad para comunicarse de manera clara y efectiva con el personal docente, los estudiantes y otros miembros del equipo educativo.\r\nOrientación al detalle y capacidad para trabajar con precisión en la administración y calificación de exámenes",
    "file": "PERFIL DE PUESTO COORDINADORA DE EXAMENES (1).xlsx",
    "processId": "PROC_EXAMENES"
  },
  {
    "id": "COORDINADORA DE PROYECTOS",
    "title": "Coordinadora de Proyectos",
    "reportsTo": ["Director General"],
    "subordinates": ["Representante LEC Nuevo Leon"],
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
    "reportsTo": ["Gerente de Administración y Finanzas"],
    "subordinates": ["Auxiliar de Feria de Libro"],
    "mission": "Planificar, organizar y ejecutar las ferias del libro para la venta de libros y/o material didáctico, verificando los requerimientos técnicos y administrativos para asegurar un eficiente desarrollo \r\ndel evento.",
    "sex": "Indistinto",
    "experience": "1 año",
    "travel": "Si",
    "education": "Secundaria o Preparatoria",
    "specialty": "Ventas y/o  atención al público",
    "desiredExp": "Mínima de 1 año en atención al cliente.\r\nMínima de 6 meses en ventas, incluyendo la identificación de necesidades del cliente y cierre de ventas.\r\nEn el manejo de inventarios, incluyendo el registro y seguimiento de existencias, reposición de productos y control de stock.\r\nPráctica de trabajo en escuelas o entornos educativos, lo que demuestra habilidades para interactuar con estudiantes, profesores y personal administrativo.\r\nEn el trato con niños, ya sea en entornos educativos o en otras actividades relacionadas, demostrando habilidades de comunicación y empatía.",
    "knowledge": "Familiaridad de libros y literatura, incluyendo géneros literarios, autores y títulos relevantes.\r\nEn el manejo de inventarios, incluyendo técnicas de conteo, control y organización.\r\nDe técnicas de venta, con preferencia de contar con la capacidad de recomendar libros adecuados a los intereses y necesidades de los clientes.\r\nDe técnicas de atención al cliente, incluyendo la capacidad de proporcionar un servicio amable, informativo y personalizado.",
    "skills": "Comunicación (verbal y escrita)\r\nManejo de herramientas de colaboración (Videoconferencias) en línea como Google Workspace para Educación, Microsoft Teams, Zoom.\r\nManejo de herramientas de presentación como Google Slides, Prezi.\r\nManejo de herramientas de paquete office (Microsoft Word, Excel, Powerpoint)\r\nManejo de heramientas de comunicación digital como correos electrónicos, mensajería instantánea (Whatsapp, Messenger, Telegram)\r\nManejo de herramientas de inventario como AdminTotal\r\nManejo de redes sociales (Facebook, Instagram)\r\nFamiliaridad with herramientas y software de punto de venta, así como manejo básico de cajas registradoras y sistemas de pago.",
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
    "subordinates": ["Gerente de Operaciones", "Coordinadora de Calidad y Responsabilidad Social", "Gerente de Administración y Finanzas", "Coordinadora de Proyectos"],
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
  }
];

export const HR_PROCESSES: BusinessProcess[] = [
  {
    "id": "PROC_RRHH",
    "title": "Proceso de Recursos Humanos",
    "kpis": "1. 95% de capacitaciones programadas cumplidas\n2. Reducción del 10% en la rotación de personal trimestral.",
    "risks": "1. Inconformidad del empleado por falta de claridad en sus tareas.\n2. Contratar aspirantes que no reúnen los requisitos del perfil.",
    "improvements": "1. Implementación de un módulo de RRHH en el Sistema Integral.\n2. Análisis de riesgos psicosociales (NOM-035).",
    "actors": "Director General, Área Solicitante, Recursos Humanos, Aspirante Externo, Personal Interno.",
    "inputsOutputs": "Entradas: Solicitud de Personal (Todas las áreas).\nSalidas: Personal Contratado, Evaluación de Desempeño.",
    "resources": "Humanos: Reclutador, Capacitadores.\nTecnológicos: Sistema Integral, Plataformas de Empleo.",
    "documents": "1. Perfil de Puesto.pdf\n2. Expediente de Personal\n3. Formato de Evaluación de Desempeño.xlsx",
    "mermaidCode": "graph TD\n    A[Solicitud de Personal] --> B{\"¿Talento interno?\"}\n    B -- Sí --> C[Ascenso / Reubicación]\n    B -- No --> D[Reclutamiento Externo]\n    D --> E[Entrevistas]\n    E --> F[Firma de Contrato y Alta IMSS]\n    F --> G[Inducción y Capacitación Inicial]\n    C --> G"
  },
  {
    "id": "PROC_FINANZAS",
    "title": "Proceso de Finanzas",
    "kpis": "1. 100% de conciliaciones bancarias al día.\n2. Reducción de cuentas por cobrar a más de 30 días en un 15%.",
    "risks": "1. Flujo de caja insuficiente para obligaciones.\n2. Errores en facturación o pagos a proveedores.",
    "improvements": "1. Automatización de reportes financieros.\n2. Integración de la plataforma de cobranza.",
    "actors": "Gerente de Administración y Finanzas, Director General, Proceso Ventas, Proveedores.",
    "inputsOutputs": "Entradas: Órdenes de Compra, Facturas (Proceso Ventas, Proyectos).\nSalidas: Pagos, Reportes Financieros, Presupuestos.",
    "resources": "Financieros: Cuentas bancarias.\nTecnológicos: Software Contable, Sistema Integral.",
    "documents": "1. Reporte de Flujo de Efectivo.xlsx\n2. Comprobantes de Pago.pdf\n3. Presupuesto Anual",
    "mermaidCode": "graph TD\n    A[Recepción de Solicitud de Pago] --> B{\"¿Presupuesto Aprobado?\"}\n    B -- Sí --> C[Validación de Factura]\n    B -- No --> D[Autorización de Director General]\n    D --> C\n    C --> E[Programación de Pago]\n    E --> F[Ejecución y Registro Contable]"
  }
];

export const AUDIT_CLAUSES = [
  { id: '4', name: 'Contexto de la Organización' },
  { id: '5', name: 'Liderazgo' },
  { id: '6', name: 'Planificación' },
  { id: '7', name: 'Apoyo' },
  { id: '8', name: 'Operación' },
  { id: '9', name: 'Evaluación del Desempeño' },
  { id: '10', name: 'Mejora' }
];

export const DEFAULT_AUDIT: AuditItem[] = [
  { id: '4.1', title: 'Contexto de la organización', q: '¿Se han determinado las cuestiones externas e internas pertinentes para su propósito y dirección estratégica?', status: '', notes: '', tags: ['ISO 9001', 'ISO 21001'] },
  { id: '4.2', title: 'Partes interesadas', q: '¿Se comprenden las necesidades y expectativas de los estudiantes y otros beneficiarios?', status: '', notes: '', tags: ['ISO 9001', 'ISO 21001'] },
  { id: '5.1', title: 'Liderazgo and compromiso', q: '¿La alta dirección demuestra liderazgo y compromiso con el Sistema de Gestión?', status: '', notes: '', tags: ['ISO 9001'] },
  { id: '5.1.2', title: 'Enfoque al estudiante', q: '¿Se mantiene el enfoque principal en la satisfacción de las necesidades de los alumnos?', status: '', notes: '', tags: ['ISO 21001'] },
  { id: '5.2', title: 'Política Integral', q: '¿La política es apropiada al propósito de la organización y se comunica?', status: '', notes: '', tags: ['ISO 9001', 'ISO 21001'] },
  { id: '6.1', title: 'Acciones para abordar riesgos', q: '¿Se han determinado los riesgos y oportunidades que es necesario abordar?', status: '', notes: '', tags: ['ISO 9001', 'ISO 21001'] },
  { id: '6.2', title: 'Objetivos de Calidad', q: '¿Se han establecido objetivos coherentes con la política y son medibles?', status: '', notes: '', tags: ['ISO 9001', 'ISO 21001'] },
  { id: '7.1.5', title: 'Recursos de seguimiento', q: '¿Se determinan y proporcionan los recursos necesarios para la validez de los resultados?', status: '', notes: '', tags: ['ISO 9001'] },
  { id: '7.2', title: 'Competencia', q: '¿Se asegura que el personal (especialmente instructores) es competente basado en educación/experiencia?', status: '', notes: '', tags: ['ISO 9001', 'ISO 21001'] },
  { id: '8.1', title: 'Planificación and control', q: '¿Se planifican, implementan y controlan los procesos necesarios para la provisión del servicio educativo?', status: '', notes: '', tags: ['ISO 21001'] },
  { id: '8.5', title: 'Control de la prestación', q: '¿Se implementa el servicio bajo condiciones controladas y se valida el material didáctico?', status: '', notes: '', tags: ['ISO 9001', 'ISO 21001'] },
  { id: '9.1', title: 'Satisfacción del cliente/estudiante', q: '¿Se realiza seguimiento a las percepciones de los estudiantes sobre el cumplimiento de sus necesidades?', status: '', notes: '', tags: ['ISO 9001', 'ISO 21001'] },
  { id: '9.2', title: 'Auditoría interna', q: '¿Se llevan a cabo auditorías internas a intervalos planificados?', status: '', notes: '', tags: ['ISO 9001', 'ISO 21001'] },
  { id: '10.2', title: 'No conformidad y acción correctiva', q: '¿Se toman acciones para controlar y corregir las no conformidades?', status: '', notes: '', tags: ['ISO 9001', 'ISO 21001'] },
  { id: '10.3', title: 'Mejora continua', q: '¿Se mejora continuamente la conveniencia, adecuación y eficacia del SGC?', status: '', notes: '', tags: ['ISO 9001', 'ISO 21001'] }
];
