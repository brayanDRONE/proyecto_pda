import XLSX from 'xlsx'

// Datos de prueba con estructura SAG
const testData = [
  // Encabezado de documento
  ['PLANILLA DE DESCRIPCIÓN DE LOTE - INSPECCIÓN SAG'],
  [`Fecha: ${new Date().toLocaleDateString('es-CL')}`],
  ['N° Inspección: 2026-001'],
  [],

  // Encabezados de columnas
  [
    'N° Folio', 'CSG', 'Productor', 'Proceso', 'Provincia Origen', 'Comuna Origen',
    'CSP', 'Provincia Pack.', 'Comuna Pack.', 'Especie', 'Variedad Agronómica',
    'Variedad Comercial', 'Fec.Pack', 'SDP/Sector', 'Cajas', 'Total'
  ],

  // Folio 1: G310150372 - 72 cajas
  ['G310150372', '119185', '119185 SOC. E INMOBILIARIA PICHIDEGUA', 'Packing', 'Cachapoal', 'PICHIDEGUA', '171972', 'Cachapoal', 'PICHIDEGUA', 'LIMON', 'GENOVA', 'GENOVA', '01/06/2026', '', 22, ''],
  ['', '119185', '', '', '', '', '', '', '', '', '', '', '', '', 15, ''],
  ['', '119185', '', '', '', '', '', '', '', '', '', '', '', '', 20, ''],
  ['', '140529', '140529 AGRICOLA LA CALERA', 'Packing', 'Cachapoal', 'LA CALERA', '171972', 'Cachapoal', 'PICHIDEGUA', 'LIMON', 'GENOVA', 'GENOVA', '01/06/2026', '', 15, 72],

  // Folio 2: G310150373 - 48 cajas
  ['G310150373', '142850', '142850 AGRICOLA SANTA ROSA', 'Packing', 'Colchagua', 'SANTA CRUZ', '172100', 'Colchagua', 'SANTA CRUZ', 'LIMON', 'EUREKA', 'EUREKA', '02/06/2026', '', 30, ''],
  ['', '142850', '', '', '', '', '', '', '', '', '', '', '', '', 18, 48],

  // Folio 3: G310150374 - 96 cajas
  ['G310150374', '145000', '145000 FUNDO LOS MOLLES', 'Packing', 'Maule', 'TALCA', '172200', 'Maule', 'TALCA', 'LIMÓN', 'FINO', 'FINO', '03/06/2026', 'A1', 40, ''],
  ['', '145000', '', '', '', '', '', '', '', '', '', '', '', '', 20, ''],
  ['', '150250', '150250 VIÑAS AGRICOLAS', 'Packing', 'Maule', 'CURICO', '172200', 'Maule', 'TALCA', 'LIMÓN', 'FINO', 'FINO', '03/06/2026', 'B2', 36, 96],
]

// Crear workbook
const ws = XLSX.utils.aoa_to_sheet(testData)
const wb = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(wb, ws, 'Inspección SAG')

// Ajustar ancho de columnas
ws['!cols'] = [
  { wch: 15 },  // N° Folio
  { wch: 12 },  // CSG
  { wch: 30 },  // Productor
  { wch: 12 },  // Proceso
  { wch: 18 },  // Provincia Origen
  { wch: 15 },  // Comuna Origen
  { wch: 12 },  // CSP
  { wch: 18 },  // Provincia Pack.
  { wch: 18 },  // Comuna Pack.
  { wch: 12 },  // Especie
  { wch: 18 },  // Variedad Agronómica
  { wch: 18 },  // Variedad Comercial
  { wch: 12 },  // Fec.Pack
  { wch: 12 },  // SDP/Sector
  { wch: 10 },  // Cajas
  { wch: 10 },  // Total
]

// Guardar
XLSX.writeFile(wb, 'public/Planilla_Prueba_SAG.xlsx')
console.log('✓ Archivo de prueba creado: Planilla_Prueba_SAG.xlsx')
