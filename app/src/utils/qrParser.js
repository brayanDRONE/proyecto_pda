/**
 * Parser del QR de cajas
 * Parsea JSON embebido en QR y valida estructura
 */

/**
 * Parsear contenido del QR (escaneado por el wedge scanner)
 * El QR contiene un JSON: {"caja":{"ID":"...", "Esp":"...", ...}}
 * @param {string} contenidoQR - contenido escaneado del QR
 * @returns {Object} - { ID, Pro, Cua, Esp, Var, FP, Sector, ... } o null si es inválido
 */
export function parsearQR(contenidoQR) {
  try {
    // Intentar parsear como JSON
    const json = JSON.parse(contenidoQR)
    
    // Validar estructura: debe tener clave "caja"
    if (!json.caja || typeof json.caja !== 'object') {
      console.error('QR inválido: no tiene estructura {"caja":{...}}')
      return null
    }
    
    const datosCaja = json.caja
    
    // Extraer campos críticos
    const datosNormalizados = {
      ID: datosCaja.ID ? String(datosCaja.ID) : null,
      Pro: datosCaja.Pro ? String(datosCaja.Pro) : null,          // CSG (productor)
      Cua: datosCaja.Cua ? String(datosCaja.Cua) : null,          // CSP (centro de packing)
      Esp: datosCaja.Esp ? String(datosCaja.Esp) : null,          // Especie
      Var: datosCaja.Var ? String(datosCaja.Var) : null,          // Variedad
      FP: datosCaja.FP ? String(datosCaja.FP) : null,             // Fecha packing
      Sector: datosCaja.Sector ? String(datosCaja.Sector) : null, // Sector
      // Campos adicionales para referencia
      NProc: datosCaja.NProc ? String(datosCaja.NProc) : null,
      Turno: datosCaja.Turno ? String(datosCaja.Turno) : null,
      Linea: datosCaja.Linea ? String(datosCaja.Linea) : null,
      Emp: datosCaja.Emp ? String(datosCaja.Emp) : null,
    }
    
    // Validar que tenga al menos el ID
    if (!datosNormalizados.ID) {
      console.error('QR inválido: no tiene ID de caja')
      return null
    }
    
    return datosNormalizados
  } catch (error) {
    console.error('Error al parsear QR:', error.message)
    return null
  }
}

/**
 * Validar que un QR ya fue escaneado (evitar duplicados)
 * @param {string} idCaja - ID de la caja
 * @param {Object} cajasEscaneadas - { id: cajaData, ... }
 * @returns {boolean} - true si ya existe
 */
export function validarDuplicado(idCaja, cajasEscaneadas) {
  return cajasEscaneadas.hasOwnProperty(idCaja)
}

/**
 * Obtener descripción legible del resultado del QR
 * @param {Object} datosQR
 * @returns {string}
 */
export function obtenerDescripcionQR(datosQR) {
  return `Caja #${datosQR.ID} | Pro: ${datosQR.Pro} | Esp: ${datosQR.Esp} | Var: ${datosQR.Var}`
}
