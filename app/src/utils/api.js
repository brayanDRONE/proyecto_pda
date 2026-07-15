/**
 * api.js — Wrapper de llamadas al backend SAG PDA
 *
 * Lee la URL base desde VITE_API_URL (variable de entorno).
 * Si no está configurada, funciona en modo offline (solo local).
 */

const BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

/** true si hay backend configurado */
export const tieneBackend = () => Boolean(BASE_URL)

async function request(path, options = {}) {
  if (!BASE_URL) throw new Error('VITE_API_URL no configurado')
  const res = await fetch(`${BASE_URL}${path}`, options)
  if (!res.ok) {
    let msg = `HTTP ${res.status}`
    try {
      const err = await res.json()
      msg = err.error || err.detail || msg
    } catch (_) {}
    throw new Error(msg)
  }
  return res
}

// ─────────────────────────────────────────────────────────
// LOTES
// ─────────────────────────────────────────────────────────

/**
 * Obtener lista de todos los lotes con su estado
 * @returns {Promise<Array>}
 */
export async function fetchLotes() {
  const res = await request('/api/lotes/')
  return res.json()
}

/**
 * Obtener detalle completo de un folio
 * @param {string} folioId
 * @returns {Promise<Object>}
 */
export async function fetchLote(folioId) {
  const res = await request(`/api/lotes/${folioId}/`)
  return res.json()
}

/**
 * Crear un nuevo lote en el servidor
 * @param {File|null} archivo   - archivo Excel original (puede ser null)
 * @param {Object}    datos     - { folio_id, totalDeclarado, lineas, nombre_archivo }
 * @returns {Promise<Object>}
 */
export async function crearLote(archivo, datos) {
  const formData = new FormData()
  formData.append('datos', JSON.stringify(datos))
  if (archivo) {
    formData.append('archivo', archivo)
  }
  const res = await request('/api/lotes/', {
    method: 'POST',
    body: formData,
  })
  return res.json()
}

/**
 * Actualizar el estado de un folio
 * @param {string} folioId
 * @param {string} estado  - 'pendiente'|'en-revision'|'revisado'|'revisado-con-observaciones'
 * @returns {Promise<Object>}
 */
export async function actualizarEstado(folioId, estado) {
  const res = await request(`/api/lotes/${folioId}/estado/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ estado }),
  })
  return res.json()
}

/**
 * Guardar resultado completo de una revisión
 * @param {string} folioId
 * @param {Object} revisionData - { cajasEscaneadas, cajasAsignadas, resumenCSG, estadisticas }
 * @returns {Promise<Object>}
 */
export async function guardarRevision(folioId, revisionData) {
  const res = await request(`/api/lotes/${folioId}/revision/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(revisionData),
  })
  return res.json()
}

/**
 * Descargar el Excel original de un folio como Blob
 * @param {string} folioId
 * @returns {Promise<Blob>}
 */
export async function descargarArchivo(folioId) {
  const res = await request(`/api/lotes/${folioId}/archivo/`)
  return res.blob()
}

/**
 * Eliminar un lote del servidor
 * @param {string} folioId
 * @returns {Promise<Object>}
 */
export async function eliminarLote(folioId) {
  const res = await request(`/api/lotes/${folioId}/`, { method: 'DELETE' })
  return res.json()
}
