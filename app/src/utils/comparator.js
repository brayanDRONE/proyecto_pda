/**
 * Lógica de comparación entre datos escaneados (QR) y planilla
 * Identifica diferencias y anomalías
 */

/**
 * Mapeo de campos QR a campos de planilla
 */
const MAPA_CAMPOS = {
  Pro: 'csg',           // Productor en QR vs CSG en planilla
  Cua: 'csp',           // Centro packing QR vs CSP planilla
  Esp: 'especie',       // Especie
  Var: 'varComercial',  // Variedad comercial
  FP: 'fechaPack',      // Fecha packing
  Sector: 'sector',     // Sector/SDP
}

/**
 * Comparar datos de QR escaneado contra línea de planilla
 * Retorna array de diferencias encontradas
 * @param {Object} datosQR - datos parseados del QR
 * @param {Object} linea - línea de la planilla
 * @returns {Array} - [ { campo, valorPlanilla, valorQR }, ... ] vacío si OK
 */
export function compararQRconPlanilla(datosQR, linea) {
  const diferencias = []
  
  // Comparar cada campo mapeado
  Object.entries(MAPA_CAMPOS).forEach(([campoQR, campoPlanilla]) => {
    const valorQR = String(datosQR[campoQR] || '').toUpperCase().trim()
    const valorPlanilla = String(linea[campoPlanilla] || '').toUpperCase().trim()
    
    // Comparar (ignorar espacios y case)
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
