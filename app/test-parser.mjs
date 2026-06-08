import XLSX from 'xlsx';

// Simular la función del parser
function encontrarFilaEncabezados(datos) {
  for (let i = 0; i < datos.length; i++) {
    const fila = datos[i];
    for (let j = 0; j < fila.length; j++) {
      const celda = String(fila[j]).toLowerCase().trim();
      if (celda.includes('folio') || celda.includes('nº folio') || celda.includes('n° folio')) {
        return i;
      }
    }
  }
  return -1;
}

function crearMapeoColumnas(encabezados) {
  const mapa = {};

  const columnasEsperadas = [
    { claves: ['n° folio', 'nº folio', 'folio'], id: 'n° folio' },
    { claves: ['csg'], id: 'csg' },
    { claves: ['productor'], id: 'productor' },
    { claves: ['cajas', 'cajas/boxes'], id: 'cajas' },
    { claves: ['total'], id: 'total' },
  ];

  encabezados.forEach((encabezado, idx) => {
    if (!encabezado) return;
    const normalizado = String(encabezado).toLowerCase().trim();

    columnasEsperadas.forEach((col) => {
      col.claves.forEach((clave) => {
        if (normalizado.includes(clave.replace(/[.\/]/g, ''))) {
          mapa[col.id] = idx;
        }
      });
    });
  });

  return mapa;
}

// Leer el archivo
const wb = XLSX.readFile('../recursos/PK_SIF_DetalleSAG - 2026-06-08T114325.416.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1 });

const filaEncabezados = encontrarFilaEncabezados(jsonData);
console.log(`✅ Encabezados encontrados en fila: ${filaEncabezados}`);

const encabezados = jsonData[filaEncabezados];
const mapeo = crearMapeoColumnas(encabezados);

console.log('\n📋 Mapeo de columnas:');
console.log('  n° folio:', mapeo['n° folio']);
console.log('  csg:', mapeo['csg']);
console.log('  productor:', mapeo['productor']);
console.log('  cajas:', mapeo['cajas']);
console.log('  total:', mapeo['total']);

// Procesar primeras líneas
console.log('\n📊 Parsing de datos (primeras 30 filas):');

const datosFilas = jsonData.slice(filaEncabezados + 1);
const lotes = {};
let folioActual = null;
let lineasFolio = [];
let totalFolio = 0;
let contadorFolios = 0;

datosFilas.forEach((fila, idx) => {
  const obtener = (clave) => {
    const colIdx = mapeo[clave];
    return colIdx !== undefined ? String(fila[colIdx] || '').trim() : '';
  };

  const folio = obtener('n° folio');
  const csg = obtener('csg');
  const cajas = parseInt(obtener('cajas')) || 0;
  const total = parseInt(obtener('total')) || 0;

  if (folio) {
    if (folioActual && lineasFolio.length > 0 && contadorFolios < 5) {
      const totalCalculado = totalFolio > 0 ? totalFolio : lineasFolio.reduce((sum, l) => sum + (l.cajasDeclaradas || 0), 0);
      console.log(`\n📦 Folio: ${folioActual}`);
      console.log(`   Total Declarado: ${totalCalculado}`);
      console.log(`   Líneas: ${lineasFolio.length}`);
      lineasFolio.forEach((l, i) => {
        console.log(`     - CSG: ${l.csg} | Cajas: ${l.cajasDeclaradas}`);
      });
      contadorFolios++;
    }

    folioActual = folio;
    lineasFolio = [];
    totalFolio = total;
  }

  if ((csg || cajas > 0) && folioActual) {
    lineasFolio.push({
      csg: csg || '',
      cajasDeclaradas: cajas,
    });

    if (total > 0) {
      totalFolio = total;
    }
  }
});

// Procesar último grupo
if (folioActual && lineasFolio.length > 0 && contadorFolios < 5) {
  const totalCalculado = totalFolio > 0 ? totalFolio : lineasFolio.reduce((sum, l) => sum + (l.cajasDeclaradas || 0), 0);
  console.log(`\n📦 Folio: ${folioActual}`);
  console.log(`   Total Declarado: ${totalCalculado}`);
  console.log(`   Líneas: ${lineasFolio.length}`);
  lineasFolio.forEach((l, i) => {
    console.log(`     - CSG: ${l.csg} | Cajas: ${l.cajasDeclaradas}`);
  });
}

console.log(`\n✅ Parser completado exitosamente`);
