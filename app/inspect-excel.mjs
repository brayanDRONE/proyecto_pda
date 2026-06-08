import XLSX from 'xlsx';

const wb = XLSX.readFile('../recursos/PK_SIF_DetalleSAG - 2026-06-08T114325.416.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const json = XLSX.utils.sheet_to_json(ws, { header: 1 });

console.log('\n=== ESTRUCTURA DETALLADA DEL EXCEL REAL ===\n');
console.log(`Total de filas: ${json.length}`);
console.log(`Total de columnas (máximo): ${Math.max(...json.map(r => r.length))}\n`);

// Encontrar encabezados
const encabezadoRow = 6;
const encabezados = json[encabezadoRow];

console.log('📋 ENCABEZADOS (Fila 6):');
encabezados.forEach((h, i) => {
  if (h) console.log(`  ${i}: ${h}`);
});

console.log('\n📊 PRIMEROS 20 FOLIOS Y SUS LINEAS:\n');

let folioActual = null;
let lineasPorFolio = {};

for (let i = encabezadoRow + 1; i < json.length; i++) {
  const row = json[i];
  const folio = row[0];
  const csg = row[3];
  const productor = row[6];
  const especie = row[34];
  const variedad = row[40];
  const cajas = row[54];
  
  if (folio && folio.trim()) {
    folioActual = folio;
    if (!lineasPorFolio[folioActual]) lineasPorFolio[folioActual] = [];
  }
  
  if (folioActual && (csg || productor || cajas)) {
    lineasPorFolio[folioActual].push({
      csg,
      productor,
      especie,
      variedad,
      cajas: cajas || 0
    });
  }
}

Object.entries(lineasPorFolio).slice(0, 20).forEach(([folio, lineas]) => {
  const totalCajas = lineas.reduce((sum, l) => sum + (parseInt(l.cajas) || 0), 0);
  console.log(`📦 Folio: ${folio} | Total cajas: ${totalCajas}`);
  lineas.forEach((l, idx) => {
    console.log(`   Línea ${idx + 1}: CSG=${l.csg} | Productor=${(l.productor || 'N/A').substring(0, 30)} | Cajas=${l.cajas}`);
  });
  console.log();
});

