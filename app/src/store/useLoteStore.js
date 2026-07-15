import { create } from 'zustand'

export const useLoteStore = create((set, get) => ({
  // ========== ESTADO DEL LOTE ==========

  // { "G310150372": { folio, totalDeclarado, lineas, estado, ... } }
  lotes: {},

  // Archivo Excel original (File object) — para exportar con observaciones
  archivoOriginal: null,

  // Folio actual en revisión
  folioActual: null,

  // ========== DATOS DE REVISIÓN ==========

  // Cajas escaneadas: { id: { datosQR, lineaAsignada, diferencias } }
  cajasEscaneadas: {},

  // Cajas asignadas manualmente (etiqueta ausente): { csg: { cantidad, motivo } }
  cajasAsignadas: {},

  // Cantidad física ingresada para el folio actual
  cantidadFisica: null,

  // Estado de revisión del folio actual: 'no-iniciada' | 'en-progreso' | 'completada'
  estadoRevision: 'no-iniciada',

  // Array de folios ya revisados en esta sesión
  foliosRevisados: [],

  // Lista de lotes (batches) cargados — cada uno agrupa los folios de un Excel
  // [ { id, nombreArchivo, fechaCarga, folioIds: [], estado } ]
  lotesBatch: [],

  // ========== ESTADO API ==========
  apiStatus: 'idle',
  apiError: null,
  modoOffline: !import.meta.env.VITE_API_URL,

  // ========== ACCIONES DEL LOTE ==========

  /**
   * Cargar lote desde objeto estructurado (después del parseo Excel local)
   * @param {Object} loteParsado  - { "FOLIO": { folio, totalDeclarado, lineas }, ... }
   * @param {File}   [archivo]    - archivo Excel original (opcional)
   */
  cargarLote: (loteParsado, archivo = null) => {
    const folioIds = Object.keys(loteParsado)
    const loteConEstado = {}
    const batchId = `lote-${Date.now()}`
    folioIds.forEach(k => {
      loteConEstado[k] = { ...loteParsado[k], estado: loteParsado[k].estado || 'pendiente', batchId }
    })
    const nuevoBatch = {
      id: batchId,
      nombreArchivo: archivo ? archivo.name : 'Planilla cargada',
      fechaCarga: new Date().toISOString(),
      folioIds,
      estado: 'pendiente',
    }
    set(state => ({
      lotes: { ...state.lotes, ...loteConEstado },
      archivoOriginal: archivo,
      lotesBatch: [...state.lotesBatch, nuevoBatch],
      folioActual: null,
      cajasEscaneadas: {},
      cajasAsignadas: {},
      cantidadFisica: null,
      estadoRevision: 'no-iniciada',
    }))
  },

  /**
   * Cargar lotes desde la API
   * @param {Array} lotesAPI - array de objetos devueltos por GET /api/lotes/
   */
  cargarLotesDesdeAPI: (lotesAPI) => {
    const lotes = {}
    lotesAPI.forEach(l => {
      lotes[l.folio_id] = {
        folio: l.folio_id,
        totalDeclarado: l.total_declarado,
        numLineas: l.num_lineas,
        lineas: l.lineas || [],
        estado: l.estado || 'pendiente',
        nombreArchivo: l.nombre_archivo,
        fechaCarga: l.fecha_carga,
        fechaRevision: l.fecha_revision,
        revisado: ['revisado', 'revisado-con-observaciones'].includes(l.estado),
        _desdeAPI: true,
      }
    })
    set({ lotes })
  },

  /**
   * Obtener resumen de todos los folios cargados
   * @returns {Array}
   */
  obtenerResumenFolios: () => {
    const lotes = get().lotes
    return Object.values(lotes).map(folio => ({
      folio: folio.folio,
      totalDeclarado: folio.totalDeclarado,
      numLineas: folio.lineas ? folio.lineas.length : (folio.numLineas || 0),
      estado: folio.estado || (folio.revisado ? 'revisado' : 'pendiente'),
    }))
  },

  // ========== ACCIONES DE REVISIÓN ==========

  /**
   * Iniciar revisión de un folio específico
   */
  iniciarRevision: (folioId) => {
    const lotes = get().lotes
    if (lotes[folioId]) {
      set(state => ({
        folioActual: folioId,
        cajasEscaneadas: {},
        cajasAsignadas: {},
        cantidadFisica: null,
        estadoRevision: 'no-iniciada',
        lotes: {
          ...state.lotes,
          [folioId]: { ...state.lotes[folioId], estado: 'en-revision' },
        },
      }))
    }
  },

  /**
   * Establecer cantidad física ingresada
   */
  establecerCantidadFisica: (cantidad) => {
    set({ cantidadFisica: cantidad })
  },

  /**
   * Marcar revisión como iniciada (botón "Iniciar revisión")
   */
  marcarRevisionEnProgreso: () => {
    set({ estadoRevision: 'en-progreso' })
  },

  /**
   * Registrar una caja escaneada en el folio actual
   */
  registrarCajaEscaneada: (datosQR, lineaAsignada, diferencias) => {
    const folioActual = get().folioActual
    const cajasEscaneadas = get().cajasEscaneadas
    if (!folioActual) return
    const idCaja = datosQR.ID
    set({
      cajasEscaneadas: {
        ...cajasEscaneadas,
        [idCaja]: { id: idCaja, datosQR, lineaAsignada, diferencias },
      },
    })
  },

  /**
   * Marcar revisión como completada y determinar estado final automáticamente
   */
  marcarRevisionCompletada: () => {
    const folioActual = get().folioActual
    const lotes = get().lotes
    if (folioActual && lotes[folioActual]) {
      const resumenCSG = get().obtenerResumenPorCSG()
      const cajasAsignadas = get().cajasAsignadas
      const hayDiferencias = Object.values(resumenCSG).some(r => r.estado !== 'OK')
      const hayAsignaciones = Object.keys(cajasAsignadas).length > 0
      const estadoFinal = (hayDiferencias || hayAsignaciones)
        ? 'revisado-con-observaciones'
        : 'revisado'
      set(state => ({
        lotes: {
          ...state.lotes,
          [folioActual]: { ...state.lotes[folioActual], revisado: true, estado: estadoFinal },
        },
        estadoRevision: 'completada',
      }))
    }
  },

  /**
   * Registrar cajas faltantes asignadas manualmente (etiqueta ausente)
   * @param {Object} asignaciones - { csg: { cantidad, motivo } }
   */
  asignarCajasFaltantes: (asignaciones) => {
    set({ cajasAsignadas: asignaciones })
  },

  // ========== QUERIES ==========

  /**
   * Obtener el folio actual en revisión
   */
  obtenerFolioActual: () => {
    const folioActual = get().folioActual
    const lotes = get().lotes
    return folioActual ? lotes[folioActual] : null
  },

  /**
   * Obtener resumen por CSG con TODOS los campos (especie, variedad, fecha, sector, csp)
   * y detalle de cajas individuales escaneadas
   */
  obtenerResumenPorCSG: () => {
    const folioActual = get().obtenerFolioActual()
    const cajasEscaneadas = get().cajasEscaneadas
    const cajasAsignadas = get().cajasAsignadas
    if (!folioActual) return {}

    const resumen = {}

    folioActual.lineas.forEach(linea => {
      resumen[linea.csg] = {
        csg: linea.csg,
        productor: linea.productor,
        especie: linea.especie || '',
        varComercial: linea.varComercial || '',
        fechaPack: linea.fechaPack || '',
        sector: linea.sector || '',
        csp: linea.csp || '',
        cajasDeclaradas: linea.cajasDeclaradas,
        cajasEscaneadas: 0,
        cajasAsignadas: 0,
        diferencias: [],
        cajasDetalle: [],
        estado: 'OK',
      }
    })

    Object.values(cajasEscaneadas).forEach(caja => {
      if (caja.lineaAsignada && resumen[caja.lineaAsignada.csg]) {
        resumen[caja.lineaAsignada.csg].cajasEscaneadas += 1
        resumen[caja.lineaAsignada.csg].cajasDetalle.push({
          id: caja.datosQR.ID,
          csp: caja.datosQR.Cua,
          especie: caja.datosQR.Esp,
          variedad: caja.datosQR.Var,
          fechaPack: caja.datosQR.FP,
          sector: caja.datosQR.Sector,
          diferencias: caja.diferencias,
        })
        if (caja.diferencias.length > 0) {
          resumen[caja.lineaAsignada.csg].diferencias.push(...caja.diferencias)
          resumen[caja.lineaAsignada.csg].estado = 'ANOMALÍA'
        }
      }
    })

    Object.entries(cajasAsignadas).forEach(([csg, asig]) => {
      if (resumen[csg]) {
        resumen[csg].cajasAsignadas = asig.cantidad || 0
      }
    })

    Object.values(resumen).forEach(item => {
      if (item.estado !== 'ANOMALÍA') {
        const totalEfectivo = item.cajasEscaneadas + item.cajasAsignadas
        if (totalEfectivo > item.cajasDeclaradas) item.estado = 'EXCESO'
        else if (totalEfectivo < item.cajasDeclaradas) item.estado = 'FALTA'
        else item.estado = 'OK'
      }
    })

    return resumen
  },

  /**
   * Obtener estadísticas generales de la revisión actual
   */
  obtenerEstadisticasRevision: () => {
    const folioActual = get().obtenerFolioActual()
    const cajasEscaneadas = get().cajasEscaneadas
    const cajasAsignadas = get().cajasAsignadas
    const resumenCSG = get().obtenerResumenPorCSG()

    if (!folioActual) {
      return { totalDeclarado: 0, totalEscaneado: 0, conDiferencias: 0, tiposAnomalia: {} }
    }

    const totalEscaneado = Object.keys(cajasEscaneadas).length
    const totalAsignadas = Object.values(cajasAsignadas).reduce((s, a) => s + (a.cantidad || 0), 0)
    const conDiferencias = Object.values(resumenCSG).filter(r => r.estado !== 'OK').length
    const tiposAnomalia = {}

    Object.values(cajasEscaneadas).forEach(caja => {
      caja.diferencias.forEach(diff => {
        tiposAnomalia[diff.campo] = (tiposAnomalia[diff.campo] || 0) + 1
      })
    })

    return {
      totalDeclarado: folioActual.totalDeclarado,
      totalEscaneado,
      totalAsignadas,
      cantidadFisica: get().cantidadFisica,
      conDiferencias,
      tiposAnomalia,
      cajasAsignadas,
    }
  },

  // ========== RESET ==========

  resetear: () => {
    set({
      lotes: {},
      lotesBatch: [],
      archivoOriginal: null,
      folioActual: null,
      cajasEscaneadas: {},
      cajasAsignadas: {},
      cantidadFisica: null,
      estadoRevision: 'no-iniciada',
      foliosRevisados: [],
    })
  },

  /**
   * Obtener lotes agrupados por batch (archivo Excel cargado)
   * Calcula el estado agregado del batch según el estado de sus folios
   */
  obtenerLotesBatch: () => {
    const lotesBatch = get().lotesBatch
    const lotes = get().lotes
    return lotesBatch.map(batch => {
      const folios = batch.folioIds.map(id => lotes[id]).filter(Boolean)
      const totalCajas = folios.reduce((s, f) => s + (f.totalDeclarado || 0), 0)
      const totalFolios = folios.length

      // Estado agregado del batch
      const todos = folios.map(f => f.estado || 'pendiente')
      let estadoBatch = 'pendiente'
      if (todos.every(e => e === 'revisado')) estadoBatch = 'revisado'
      else if (todos.some(e => e === 'revisado-con-observaciones')) estadoBatch = 'revisado-con-observaciones'
      else if (todos.some(e => e === 'en-revision' || e === 'revisado' || e === 'revisado-con-observaciones')) estadoBatch = 'en-revision'

      const revisados = folios.filter(f => ['revisado', 'revisado-con-observaciones'].includes(f.estado)).length
      return {
        ...batch,
        estado: estadoBatch,
        totalCajas,
        totalFolios,
        foliosRevisados: revisados,
        foliosDetalle: folios.map(f => ({
          folio: f.folio,
          totalDeclarado: f.totalDeclarado,
          numLineas: f.lineas ? f.lineas.length : (f.numLineas || 0),
          estado: f.estado || 'pendiente',
        })),
      }
    })
  },

  // ========== REPORTE CONSOLIDADO ==========

  guardarRevisionFolio: () => {
    const folioActual = get().obtenerFolioActual()
    const cajasEscaneadas = get().cajasEscaneadas
    const cajasAsignadas = get().cajasAsignadas
    const estadisticas = get().obtenerEstadisticasRevision()
    if (!folioActual) return
    const resumenCSG = get().obtenerResumenPorCSG()
    set(state => ({
      foliosRevisados: [
        ...state.foliosRevisados,
        {
          folioId: folioActual.folio,
          cajasEscaneadas,
          cajasAsignadas,
          resumenCSG,
          estadisticas,
          fechaRevision: new Date().toISOString(),
        },
      ],
    }))
  },

  obtenerReporteConsolidado: () => {
    const foliosRevisados = get().foliosRevisados
    const lotes = get().lotes

    if (foliosRevisados.length === 0) {
      return {
        folios: [], totalDeclarado: 0, totalEscaneado: 0,
        cantidadFisica: 0, conDiferencias: 0, tiposAnomalia: {},
        estadoFinal: 'Sin revisiones',
      }
    }

    let totalDeclarado = 0
    let totalEscaneado = 0
    let totalFisico = 0
    let conDiferencias = 0
    const tiposAnomalia = {}

    const foliosDetalle = foliosRevisados.map(fol => {
      totalDeclarado += fol.estadisticas.totalDeclarado || 0
      totalEscaneado += fol.estadisticas.totalEscaneado || 0
      totalFisico += fol.estadisticas.cantidadFisica || 0
      Object.entries(fol.estadisticas.tiposAnomalia || {}).forEach(([campo, count]) => {
        tiposAnomalia[campo] = (tiposAnomalia[campo] || 0) + count
      })
      Object.values(fol.resumenCSG || {}).forEach(csg => {
        if (csg.estado !== 'OK') conDiferencias += 1
      })
      return {
        folio: fol.folioId,
        totalDeclarado: fol.estadisticas.totalDeclarado,
        totalEscaneado: fol.estadisticas.totalEscaneado,
        diferencia: (fol.estadisticas.totalEscaneado || 0) - (fol.estadisticas.totalDeclarado || 0),
        cantidadFisica: fol.estadisticas.cantidadFisica,
        csgsConDiferencias: Object.values(fol.resumenCSG || {}).filter(c => c.estado !== 'OK').length,
        resumenCSG: fol.resumenCSG,
      }
    })

    return {
      folios: foliosDetalle,
      totalDeclarado,
      totalEscaneado,
      diferencia: totalEscaneado - totalDeclarado,
      cantidadFisica: totalFisico,
      conDiferencias,
      tiposAnomalia,
      numFolios: foliosRevisados.length,
      estadoFinal: totalEscaneado === totalDeclarado ? 'COMPLETADO SIN DIFERENCIAS' : 'CON DIFERENCIAS',
    }
  },
}))
