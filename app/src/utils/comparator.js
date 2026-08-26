/**
 * Lógica de comparación entre datos escaneados (QR) y planilla
 * Identifica diferencias y anomalías
 */

// ─── Tablas de equivalencia QR → Planilla ────────────────────────────────────
// Las etiquetas QR usan abreviaturas; la planilla usa nombres completos.

const EQUIV_ESPECIE = {
  'MA':  'MANDARINA',
  'MAN': 'MANDARINA',
  'LI':  'LIMÓN',
  'LIM': 'LIMÓN',
  'NA':  'NARANJA',
  'NAR': 'NARANJA',
  'TO':  'TORONJA',
  'TOR': 'TORONJA',
  'PE':  'PERA',
  'MZ':  'MANZANA',
  'UV':  'UVA',
  'KI':  'KIWI',
  'CI':  'CIRUELA',
  'CE':  'CEREZA',
  'DU':  'DURAZNO',
  'NU':  'NECTARÍN',
  'AR':  'ARANDANO',
}

const EQUIV_VARIEDAD = {
  // Mandarinas
  'WMC':      'W.MURCOTT',
  'WMURCOTT': 'W.MURCOTT',
  'VETI':     'W.MURCOTT',   // alias alternativo en algunas etiquetas
  'CLEM':     'CLEMENTINA',
  'NOV':      'NOVA',
  'SAT':      'SATSUMA',
  'ORRI':     'ORRI',
  'MERC':     'MERCOTT',
  // Limones
  'EUR':      'EUREKA',
  'LIS':      'LISBOA',
  'GEN':      'GÉNOVA',
  // Naranjas
  'NAV':      'NAVEL',
  'VAL':      'VALENCIA',
  // Uvas
  'TH':       'THOMPSON',
  'RED':      'RED GLOBE',
  'CRI':      'CRIMSON',
  'FLA':      'FLAME',
  'SUG':      'SUGRATWO',
  'AUT':      'AUTUMN ROYAL',
  // Cerezas
  'LAP':      'LAPINS',
  'BIN':      'BING',
  'REG':      'REGINA',
  'SYM':      'SYMPHONY',
  // Manzanas
  'GALA':     'GALA',
  'FJIF':     'FUJI',
  'GS':       'GRANNY SMITH',
  'RED1':     'RED DELICIOUS',
}

/**
 * Normaliza el valor del QR al nombre equivalente de la planilla.
 * Si no hay equivalencia registrada, devuelve el mismo valor en mayúsculas.
 * @param {string} valorQR
 * @param {'especie'|'variedad'} tipo
 * @returns {string}
 */
function normalizarQR(valorQR, tipo) {
  const v = String(valorQR || '').toUpperCase().trim()
  if (tipo === 'especie')   return EQUIV_ESPECIE[v]  || v
  if (tipo === 'variedad')  return EQUIV_VARIEDAD[v] || v
  return v
}

/**
 * Mapeo de campos QR a campos de planilla.
 *
 * Notas importantes sobre el formato QR:
 *  - "Fri" en el QR contiene el CSP (centro de packing).
 *  - "Cua" en el QR contiene el SDP (código numérico del sector/packing),
 *    que es el mismo número que aparece en la columna SDP/Sector de la planilla.
 *  - "Sector" en el QR es el número de sector físico (1, 2, 3…), NO el SDP.
 */
const MAPA_CAMPOS = {
  Pro: 'csg',          // Productor → CSG planilla
  Fri: 'csp',          // CSP → "Fri" en QR (p.ej. "175848")
  Esp: 'especie',      // Especie (abreviada en QR, se normaliza)
  Var: 'varComercial', // Variedad comercial (abreviada en QR, se normaliza)
  FP:  'fechaPack',    // Fecha packing
  Cua: 'sector',       // SDP → "Cua" en QR contiene el código SDP (p.ej. "57172")
}

/**
 * Comparar datos de QR escaneado contra línea de planilla.
 * Aplica normalización de abreviaturas antes de comparar especie y variedad.
 * @param {Object} datosQR - datos parseados del QR
 * @param {Object} linea   - línea de la planilla
 * @returns {Array} - [ { campo, valorPlanilla, valorQR }, ... ] vacío si OK
 */
export function compararQRconPlanilla(datosQR, linea) {
  const diferencias = []

  Object.entries(MAPA_CAMPOS).forEach(([campoQR, campoPlanilla]) => {
    // Valor crudo del QR en mayúsculas
    const rawQR = String(datosQR[campoQR] || '').toUpperCase().trim()

    // Normalizar abreviaturas según el campo
    let valorQR = rawQR
    if (campoPlanilla === 'especie')      valorQR = normalizarQR(rawQR, 'especie')
    else if (campoPlanilla === 'varComercial') valorQR = normalizarQR(rawQR, 'variedad')

    const valorPlanilla = String(linea[campoPlanilla] || '').toUpperCase().trim()

    if (valorQR !== valorPlanilla) {
      diferencias.push({
        campo: campoPlanilla,
        valorPlanilla: String(linea[campoPlanilla] || ''),
        valorQR: String(datosQR[campoQR] || ''),
      })
    }
  })

  return diferencias
}

/**
 * Buscar la línea del folio que corresponde a un QR
 * Se busca por el campo Pro (CSG del productor)
 * @param {Object} datosCaja - datosQR
 * @param {Array} lineas - líneas del folio
 * @returns {Object|null} - línea encontrada o null
 */
export function encontrarLineaCorrespondiente(datosCaja, lineas) {
  const proQR = String(datosCaja.Pro).toUpperCase().trim()
  
  // Buscar por CSG
  const linea = lineas.find(l => 
    String(l.csg).toUpperCase().trim() === proQR
  )
  
  return linea || null
}

/**
 * Obtener descripción de diferencias encontradas
 * @param {Array} diferencias - [ { campo, valorPlanilla, valorQR }, ... ]
 * @returns {string} - descripción legible
 */
export function obtenerDescripcionDiferencias(diferencias) {
  if (!diferencias || diferencias.length === 0) {
    return 'Sin diferencias'
  }
  
  const campos = diferencias.map(d => `${d.campo}: "${d.valorPlanilla}" vs "${d.valorQR}"`)
  return campos.join(' | ')
}

/**
 * Obtener tipo de anomalía basado en diferencias
 * @param {Array} diferencias
 * @returns {string} - 'OK' | 'ANOMALÍA'
 */
export function obtenerTipoAnomalia(diferencias) {
  return diferencias.length === 0 ? 'OK' : 'ANOMALÍA'
}

/**
 * Validar si una caja escaneada corresponde al folio
 * Verifica que la línea encontrada sea válida
 * @param {Object} datosQR
 * @param {Object} linea
 * @returns {boolean}
 */
export function validarCorrespondenciaFolio(datosQR, linea) {
  return linea !== null && linea !== undefined
}
