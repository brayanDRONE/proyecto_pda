// Script para simular múltiples escaneos de QR
// Cada folio tiene 72 cajas distribuidas entre 2 productores: 175556 (53) y 118193 (19)

const escaneos = [];

// Simular 53 cajas del productor 175556
for (let i = 1; i <= 53; i++) {
  escaneos.push({
    id: `BOX${String(i).padStart(4, '0')}`,
    pro: '175556',
    cua: '92',
    esp: 'LIMON',
    var: 'GENOVA',
    fp: '04062026',
    sector: 'A1'
  });
}

// Simular 19 cajas del productor 118193
for (let i = 54; i <= 72; i++) {
  escaneos.push({
    id: `BOX${String(i).padStart(4, '0')}`,
    pro: '118193',
    cua: '92',
    esp: 'LIMON',
    var: 'GENOVA',
    fp: '04062026',
    sector: 'A1'
  });
}

console.log('Escaneos generados:', escaneos.length);
console.log('\nSimula escribir esto en el navegador (línea por línea + Enter):');
escaneos.forEach((e, i) => {
  const qr = JSON.stringify({caja: {ID: e.id, Pro: e.pro, Cua: e.cua, Esp: e.esp, Var: e.var, FP: e.fp, Sector: e.sector}});
  console.log(`${i + 1}. ${qr}`);
});
