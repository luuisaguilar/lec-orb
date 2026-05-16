Revision SOR (Statement of Results) - Cambridge portal
Fecha revision: 2026-02-14

Los 6 PDF se analizaron con texto extraible (pypdf). Resumen:

1) Key English Test, sesion 20 MAR 2026, Hermosillo, centro MX426
   - Lote 16 paginas + lote 12 paginas = 28 candidatos (coincide con booking portal 20/03 Key OD).
   - Ubicacion: colegio nueva galicia\KEY FS\SOR\
   - Nota: el centro MX426 puede agrupar mas de un colegio en la misma sesion; si parte de los candidatos son de Instituto Los Pioneros, conserva copia o separa segun tu lista oficial.

2) Preliminary English Test, sesion 20 MAR 2026, Hermosillo, MX426
   - Un PDF es solo imagenes (24 paginas, sin texto extraible) y otro tiene 12 paginas con texto (12 candidatos en muestra).
   - Total 24+12 = 36 paginas de SOR (coincide con portal PET 36 el 20/03).
   - Ubicacion: colegio nueva galicia\PET FS\SOR\

3) First Certificate in English (FCE), sesion 21 MAR 2026, Hermosillo, MX426
   - PDF 9 paginas: varios candidatos FCE (alineado con plan 9 candidatos Nueva Galicia).
   - PDF 2 paginas: 2 candidatos (alineado con plan 2 candidatos Morera misma fecha).
   - Ubicacion: colegio nueva galicia\FCE FS\SOR\ y instituto morera\FCE FS\SOR\
   - IMPORTANTE: la separacion 9 vs 2 se hizo por conteo del plan (Nueva Galicia 9, Morera 2), no por verificacion nombre por nombre contra lista escolar. Si un candidato esta mal de carpeta, mueve solo su hoja o renombra segun tu control escolar.

Nombres de archivo incluyen fecha, examen, ciudad, MX426 y sufijo SOR original para trazabilidad.

--- Actualizacion: PDF por candidato ---
Se ejecuto el script lecorb/.../scripts/split_sor_statements.py (pypdf).
- Se generaron PDFs individuales (1 pagina = 1 candidato) solo cuando la pagina tenia texto extraible.
- Los PDFs "bundle" originales (KEY_OD_..., PET_OD_..., FCE_FS_...) se conservan en la misma carpeta SOR.
- El PET escaneado de 24 paginas NO se partio (sin texto).
- Algun nombre PET de 3 palabras puede quedar con apellidos/nombres invertidos en el nombre del archivo; revisar lista si hace falta.
