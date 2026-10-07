import { normalizarQR } from './comparator'

export const SIN_SDP = 'Sin SDP'

const norm = (v) => String(v ?? '').toUpperCase().trim()

/**
 * Agrupa las cajas escaneadas por CSG + Proceso + CSP + Especie + Fec.Pack + SDP.
 * Los datos de productor/provincia/comuna no vienen en el QR, por eso no se incluyen.
 */
export function agruparFisico(cajasEscaneadas) {
  const grupos = new Map()
  Object.values(cajasEscaneadas || {}).forEach(({ datosQR: q }) => {
    if (!q) return
    const fila = {
      csg: q.Pro || '',
      proceso: q.NProc || '',
      csp: q.Fri || '',
      especie: q.Esp ? normalizarQR(q.Esp, 'especie') : '',
      variedad: (q.Var || q.VEti) ? normalizarQR(q.Var || q.VEti, 'variedad') : '',
      fechaPack: q.FP || '',
      sdp: q.Cua || SIN_SDP,
    }
    const key = Object.values(fila).map(norm).join('|')
    const g = grupos.get(key)
    if (g) g.cajas += 1
    else grupos.set(key, { ...fila, cajas: 1 })
  })
  return [...grupos.values()]
}

function coincide(fis, doc) {
  const sdpFis = fis.sdp === SIN_SDP ? '' : norm(fis.sdp)
  const sdpOk = sdpFis === norm(doc.sector)
  const procesoOk = !fis.proceso || !doc.proceso || norm(fis.proceso) === norm(doc.proceso)
  return (
    norm(fis.csg) === norm(doc.csg) &&
    norm(fis.csp) === norm(doc.csp) &&
    norm(fis.especie) === norm(doc.especie) &&
    norm(fis.fechaPack) === norm(doc.fechaPack) &&
    sdpOk && procesoOk
  )
}

/**
 * Explica por qué un grupo físico no calza con el detalle del folio.
 * @returns {{coincide: boolean, detalle: string, linea: Object|null}}
 */
export function describirFisico(fis, lineas) {
  const exacta = lineas.find(l => coincide(fis, l))
  if (exacta) return { coincide: true, detalle: 'Coincide con el detalle', linea: exacta }

  const mismas = lineas.filter(l => norm(l.csg) === norm(fis.csg))
  if (mismas.length === 0) {
    return { coincide: false, detalle: 'CSG no está en el detalle del folio', linea: null }
  }

  const sdpFis = fis.sdp === SIN_SDP ? '' : norm(fis.sdp)
  const difs = (l) => {
    const d = []
    if (sdpFis !== norm(l.sector)) d.push(`SDP (detalle: ${l.sector || 'sin SDP'})`)
    if (norm(fis.fechaPack) !== norm(l.fechaPack)) d.push(`Fec. Pack (detalle: ${l.fechaPack || '-'})`)
    if (norm(fis.csp) !== norm(l.csp)) d.push(`CSP (detalle: ${l.csp || '-'})`)
    if (norm(fis.especie) !== norm(l.especie)) d.push(`Especie (detalle: ${l.especie || '-'})`)
    if (fis.proceso && l.proceso && norm(fis.proceso) !== norm(l.proceso)) d.push(`Proceso (detalle: ${l.proceso})`)
    return d
  }
  const mejor = mismas.map(l => ({ l, d: difs(l) })).sort((a, b) => a.d.length - b.d.length)[0]
  return { coincide: false, detalle: `Difiere en ${mejor.d.join(', ')}`, linea: mejor.l }
}
/**
 * Cruce documental vs físico de un folio revisado.
 * @param {Object} lote     - folio de la planilla ({ folio, lineas, totalDeclarado })
 * @param {Object} revision - entrada de foliosRevisados
 */
export function compararFolio(lote, revision) {
  const lineas = lote?.lineas || []
  const documental = lineas.map(l => ({
    csg: l.csg, productor: l.productor, proceso: l.proceso || '',
    provOrigen: l.provOrigen, comunaOrigen: l.comunaOrigen, csp: l.csp,
    especie: l.especie, varComercial: l.varComercial,
    fechaPack: l.fechaPack, sector: l.sector, cajas: l.cajasDeclaradas || 0,
  }))
  const totalDoc = documental.reduce((s, d) => s + d.cajas, 0)

  if (revision?.revisionVisual) {
    return {
      folio: lote?.folio ?? revision.folioId, revisionVisual: true,
      documental, fisico: [], totalDoc, totalFis: totalDoc, diferencia: 0, noCorresponden: 0,
    }
  }

  const fisico = agruparFisico(revision?.cajasEscaneadas)
  const asignadas = Object.values(revision?.cajasAsignadas || {}).reduce((s, a) => s + (a.cantidad || 0), 0)

  fisico.forEach(f => {
    const doc = documental.find(d => coincide(f, d))
    const desc = describirFisico(f, lineas)
    f.detalle = desc.detalle
    f.estado = desc.coincide ? 'Coincide' : 'No corresponde'
    if (doc) doc.cajasFisicas = (doc.cajasFisicas || 0) + f.cajas
  })
  documental.forEach(d => {
    d.cajasFisicas = d.cajasFisicas || 0
    d.estado = d.cajasFisicas === d.cajas ? 'OK' : d.cajasFisicas < d.cajas ? 'Falta' : 'Exceso'
  })

  const totalFis = fisico.reduce((s, f) => s + f.cajas, 0) + asignadas
  return {
    folio: lote?.folio ?? revision?.folioId,
    revisionVisual: false,
    documental, fisico, asignadas, totalDoc, totalFis,
    diferencia: totalFis - totalDoc,
    noCorresponden: fisico.filter(f => f.estado !== 'Coincide').reduce((s, f) => s + f.cajas, 0),
  }
}

/**
 * Cruce de todos los folios revisados de un lote (batch).
 * Si un folio fue revisado más de una vez se usa la última revisión.
 */
export function compararLote(batch, lotes, foliosRevisados) {
  const ultimas = new Map()
  ;(foliosRevisados || []).forEach(r => {
    if (!r.batchId || r.batchId === batch.id) ultimas.set(String(r.folioId), r)
  })
  return batch.folioIds
    .filter(id => ultimas.has(String(id)) && lotes[id])
    .map(id => compararFolio(lotes[id], ultimas.get(String(id))))
}
