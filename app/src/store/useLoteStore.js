import { create } from 'zustand'

/**
 * Store global de estado de la aplicación
 * Gestiona:
 * - Datos del lote cargado (folios, líneas)
 * - Estado de revisión por folio (cajas escaneadas, diferencias)
 * - Navegación actual
 */

export const useLoteStore = create((set, get) => ({
  // ========== ESTADO DEL LOTE ==========
  
  // Objeto con estructura: { "G310150372": { folio, totalDeclarado, lineas, ...}, ... }
  lotes: {},
  
  // Folio actual en revisión
  folioActual: null,
  
  // ========== DATOS DE REVISIÓN ==========
  
  // Cajas escaneadas en el folio actual: { id: cajaData, datosQR, lineaAsignada, diferencias }
  cajasEscaneadas: {},
  
  // Cantidad física ingresada para el folio actual
  cantidadFisica: null,
  
  // Estado de revisión del folio actual: 'no-iniciada' | 'en-progreso' | 'completada'
  estadoRevision: 'no-iniciada',
  
  // Array de folios ya revisados: [ { folioId, cajas, estadisticas }, ... ]
  foliosRevisados: [],
  
  // ========== ACCIONES DEL LOTE ==========
  
  /**
   * Cargar lote desde objeto estructurado (después del parseo Excel)
   * @param {Object} loteParsado - { "FOLIO": { folio, totalDeclarado, lineas }, ... }
   */
  cargarLote: (loteParsado) => {
    set({ 
      lotes: loteParsado,
      folioActual: null,
      cajasEscaneadas: {},
      cantidadFisica: null,
      estadoRevision: 'no-iniciada',
    })
  },
  
  /**
   * Obtener resumen de todos los folios cargados
   * @returns {Array} - [ { folio, totalDeclarado, numLineas, estado }, ... ]
   */
  obtenerResumenFolios: () => {
    const lotes = get().lotes
    return Object.values(lotes).map(folio => ({
      folio: folio.folio,
      totalDeclarado: folio.totalDeclarado,
      numLineas: folio.lineas.length,
      estado: folio.revisado ? 'completado' : 'pendiente',
    }))
  },
  
  // ========== ACCIONES DE REVISIÓN ==========
  
  /**
   * Iniciar revisión de un folio específico
   * @param {string} folioId
   */
  iniciarRevision: (folioId) => {
    const lotes = get().lotes
    if (lotes[folioId]) {
      set({
        folioActual: folioId,
        cajasEscaneadas: {},
        cantidadFisica: null,
        estadoRevision: 'no-iniciada',
      })
    }
  },
  
  /**
   * Establecer cantidad física ingresada
   * @param {number} cantidad
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
   * @param {Object} datosQR - datos parseados del QR
   * @param {Object} lineaAsignada - línea del folio que corresponde
   * @param {Array} diferencias - array de diferencias encontradas
   */
  registrarCajaEscaneada: (datosQR, lineaAsignada, diferencias) => {
    const folioActual = get().folioActual
    const cajasEscaneadas = get().cajasEscaneadas
    
    if (!folioActual) return
    
    const idCaja = datosQR.ID
    
    set({
      cajasEscaneadas: {
        ...cajasEscaneadas,
        [idCaja]: {
          id: idCaja,
          datosQR,
          lineaAsignada,
          diferencias, // array vacío si no hay diferencias
        },
      },
    })
  },
  
  /**
   * Marcar revisión como completada
   */
  marcarRevisionCompletada: () => {
    const folioActual = get().folioActual
    const lotes = get().lotes
    
    if (folioActual && lotes[folioActual]) {
      set(state => ({
        lotes: {
          ...state.lotes,
          [folioActual]: {
            ...state.lotes[folioActual],
            revisado: true,
          },
        },
        estadoRevision: 'completada',
      }))
    }
  },
  
  // ========== QUERIES ==========
  
  /**
   * Obtener el folio actual en revisión
   * @returns {Object|null}
   */
  obtenerFolioActual: () => {
    const folioActual = get().folioActual
    const lotes = get().lotes
    return folioActual ? lotes[folioActual] : null
  },
  
  /**
   * Obtener resumen de cajas escaneadas por CSG
   * @returns {Object} - { "CSG": { decl, escaneadas, anomalias }, ... }
   */
  obtenerResumenPorCSG: () => {
    const folioActual = get().obtenerFolioActual()
    const cajasEscaneadas = get().cajasEscaneadas
    
    if (!folioActual) return {}
    
    const resumen = {}
    
    // Inicializar con todas las líneas (CSG)
    folioActual.lineas.forEach(linea => {
      resumen[linea.csg] = {
        csg: linea.csg,
        productor: linea.productor,
        cajasDeclaradas: linea.cajasDeclaradas,
        cajasEscaneadas: 0,
        diferencias: [],
        estado: 'OK',
      }
    })
    
    // Contar cajas escaneadas y marcar anomalías
    Object.values(cajasEscaneadas).forEach(caja => {
      if (caja.lineaAsignada && resumen[caja.lineaAsignada.csg]) {
        resumen[caja.lineaAsignada.csg].cajasEscaneadas += 1
        
        if (caja.diferencias.length > 0) {
          resumen[caja.lineaAsignada.csg].diferencias.push(...caja.diferencias)
          resumen[caja.lineaAsignada.csg].estado = 'ANOMALÍA'
        }
      }
    })
    
    // Actualizar estados finales
    Object.values(resumen).forEach(item => {
      if (item.estado !== 'ANOMALÍA') {
        if (item.cajasEscaneadas > item.cajasDeclaradas) {
          item.estado = 'EXCESO'
        } else if (item.cajasEscaneadas < item.cajasDeclaradas) {
          item.estado = 'FALTA'
        } else {
          item.estado = 'OK'
        }
      }
    })
    
    return resumen
  },
  
  /**
   * Obtener estadísticas generales de la revisión actual
   * @returns {Object} - { totalDeclarado, totalEscaneado, foliosConDiferencias, ... }
   */
  obtenerEstadisticasRevision: () => {
    const folioActual = get().obtenerFolioActual()
    const cajasEscaneadas = get().cajasEscaneadas
    const resumenCSG = get().obtenerResumenPorCSG()
    
    if (!folioActual) {
      return {
        totalDeclarado: 0,
        totalEscaneado: 0,
        conDiferencias: 0,
        tiposAnomalia: {},
      }
    }
    
    const totalEscaneado = Object.keys(cajasEscaneadas).length
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
      cantidadFisica: get().cantidadFisica,
      conDiferencias,
      tiposAnomalia,
    }
  },
  
  // ========== RESET ==========
  
  /**
   * Reiniciar estado completo de la aplicación
   */
  resetear: () => {
    set({
      lotes: {},
      folioActual: null,
      cajasEscaneadas: {},
      cantidadFisica: null,
      estadoRevision: 'no-iniciada',
      foliosRevisados: [],
    })
  },
  
  // ========== REPORTE CONSOLIDADO ==========
  
  /**
   * Guardar la revisión actual en el histórico de folios revisados
   */
  guardarRevisionFolio: () => {
    const folioActual = get().obtenerFolioActual()
    const cajasEscaneadas = get().cajasEscaneadas
    const estadisticas = get().obtenerEstadisticasRevision()
    
    if (!folioActual) return
    
    const resumenCSG = get().obtenerResumenPorCSG()
    
    set(state => ({
      foliosRevisados: [
        ...state.foliosRevisados,
        {
          folioId: folioActual.folio,
          cajasEscaneadas,
          resumenCSG,
          estadisticas,
          fechaRevision: new Date().toISOString(),
        },
      ],
    }))
  },
  
  /**
   * Obtener reporte consolidado de todos los folios revisados
   * @returns {Object} - { folios: [...], totalDeclarado, totalEscaneado, tiposAnomalia, ... }
   */
  obtenerReporteConsolidado: () => {
    const foliosRevisados = get().foliosRevisados
    const lotes = get().lotes
    
    if (foliosRevisados.length === 0) {
      return {
        folios: [],
        totalDeclarado: 0,
        totalEscaneado: 0,
        cantidadFisica: 0,
        conDiferencias: 0,
        tiposAnomalia: {},
        estadoFinal: 'Sin revisiones',
      }
    }
    
    let totalDeclarado = 0
    let totalEscaneado = 0
    let totalFisico = 0
    let conDiferencias = 0
    const tiposAnomalia = {}
    
    const foliosDetalle = foliosRevisados.map(fol => {
      const loteData = lotes[fol.folioId]
      totalDeclarado += fol.estadisticas.totalDeclarado || 0
      totalEscaneado += fol.estadisticas.totalEscaneado || 0
      totalFisico += fol.estadisticas.cantidadFisica || 0
      
      // Consolidar anomalías
      Object.entries(fol.estadisticas.tiposAnomalia || {}).forEach(([campo, count]) => {
        tiposAnomalia[campo] = (tiposAnomalia[campo] || 0) + count
      })
      
      // Contar CSGs con diferencias
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
