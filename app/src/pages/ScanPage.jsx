import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLoteStore } from '../store/useLoteStore'
import { parsearQR, validarDuplicado } from '../utils/qrParser'
import { compararQRconPlanilla, encontrarLineaCorrespondiente } from '../utils/comparator'
import { actualizarEstado, guardarRevision, tieneBackend } from '../utils/api'
import WedgeScanner from '../components/WedgeScanner'
import BoxCounter from '../components/BoxCounter'
import ComparativaTable from '../components/ComparativaTable'
import AlertBanner from '../components/AlertBanner'
import AsignarFaltantesModal from '../components/AsignarFaltantesModal'
import { generarReportePDF } from '../utils/pdfReport'

export default function ScanPage() {
  const navigate = useNavigate()

  const [ultimoEscaneo, setUltimoEscaneo] = useState(null)
  const [resultadoUltimo, setResultadoUltimo] = useState(null)
  const [mensajeError, setMensajeError] = useState('')
  const [mostrarModalFaltantes, setMostrarModalFaltantes] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [revisionFinalizada, setRevisionFinalizada] = useState(false)
  const [observaciones, setObservaciones] = useState('')
  const [resumenFinal, setResumenFinal] = useState(null)
  const [estadisticasFinal, setEstadisticasFinal] = useState(null)

  const obtenerFolioActual = useLoteStore(state => state.obtenerFolioActual)
  const cajasEscaneadas = useLoteStore(state => state.cajasEscaneadas)
  const cajasAsignadas = useLoteStore(state => state.cajasAsignadas)
  const registrarCajaEscaneada = useLoteStore(state => state.registrarCajaEscaneada)
  const obtenerResumenPorCSG = useLoteStore(state => state.obtenerResumenPorCSG)
  const obtenerEstadisticasRevision = useLoteStore(state => state.obtenerEstadisticasRevision)
  const marcarRevisionCompletada = useLoteStore(state => state.marcarRevisionCompletada)
  const guardarRevisionFolio = useLoteStore(state => state.guardarRevisionFolio)
  const asignarCajasFaltantes = useLoteStore(state => state.asignarCajasFaltantes)
  const setLoteSeleccionadoId = useLoteStore(state => state.setLoteSeleccionadoId)
  const folioActualId = useLoteStore(state => state.folioActual)

  const folio = obtenerFolioActual()
  const resumenCSG = obtenerResumenPorCSG()
  const totalEscaneado = Object.keys(cajasEscaneadas).length
  const totalAsignadas = Object.values(cajasAsignadas).reduce((s, a) => s + (a.cantidad || 0), 0)

  // ── Procesar QR escaneado ────────────────────────────────────────────────
  const procesarEscaneo = useCallback((contenido) => {
    setMensajeError('')
    setResultadoUltimo(null)

    try {
      const datosQR = parsearQR(contenido)
      if (!datosQR) {
        // Analizar por qué falló el parse para dar mensaje específico
        let motivo = 'QR inválido o mal formado'
        try {
          const json = JSON.parse(contenido)
          if (!json.caja) {
            motivo = 'QR inválido: estructura incorrecta (falta clave "caja")'
          } else {
            const c = json.caja
            if (!c.ID)  motivo = 'QR inválido: ID de caja no encontrado'
            else if (!c.Pro) motivo = 'QR inválido: CGS (Pro) no encontrado'
            else if (!c.FP)  motivo = 'QR inválido: Fecha packing (FP) no encontrada'
            else if (!c.Sector) motivo = 'QR inválido: SDP/Sector no encontrado'
          }
        } catch (_) {
          motivo = 'QR inválido: no es un JSON válido'
        }
        setMensajeError(motivo)
        setResultadoUltimo('error')
        return false
      }

      if (validarDuplicado(datosQR.ID, cajasEscaneadas)) {
        setMensajeError(`Caja #${datosQR.ID} ya fue escaneada`)
        setResultadoUltimo('error')
        return false
      }

      const linea = encontrarLineaCorrespondiente(datosQR, folio.lineas)
      if (!linea) {
        // Mensaje específico: CGS no encontrado en el folio
        const csgEscaneado = datosQR.Pro || 'desconocido'
        setMensajeError(`CGS "${csgEscaneado}" no encontrado en el folio`)
        setResultadoUltimo('error')
        return false
      }

      const diferencias = compararQRconPlanilla(datosQR, linea)
      registrarCajaEscaneada(datosQR, linea, diferencias)

      setUltimoEscaneo({
        id: datosQR.ID,
        pro: datosQR.Pro,
        esp: datosQR.Esp,
        conDiferencias: diferencias.length > 0,
        diferencias,
      })

      if (diferencias.length === 0) {
        setResultadoUltimo('success')
        return true
      } else {
        // Construir mensaje descriptivo con los campos en anomalía
        const ETIQUETAS = {
          csg: 'CGS',
          csp: 'CSP',
          especie: 'Especie',
          varComercial: 'Variedad',
          fechaPack: 'Fecha packing',
          sector: 'SDP/Sector',
        }
        const detalle = diferencias
          .map(d => `${ETIQUETAS[d.campo] || d.campo}: planilla="${d.valorPlanilla}" | QR="${d.valorQR}"`)
          .join(' · ')
        setMensajeError(detalle)
        setResultadoUltimo('warning')
        return 'warning'  // → WedgeScanner llama beepWarning()
      }
    } catch (error) {
      console.error('Error procesando escaneo:', error)
      setMensajeError('Error procesando QR')
      setResultadoUltimo('error')
      return false
    }
  }, [folio, cajasEscaneadas, registrarCajaEscaneada])

  // ── Intentar finalizar — verifica si hay cajas faltantes ────────────────
  const intentarFinalizar = () => {
    if (!folio) return
    const resumen = obtenerResumenPorCSG()
    const faltantes = Object.values(resumen).filter(
      item => item.cajasEscaneadas + (item.cajasAsignadas || 0) < item.cajasDeclaradas
    ).map(item => ({
      _clave: item._clave,
      csg: item.csg,
      productor: item.productor,
      fechaPack: item.fechaPack,
      cajasDeclaradas: item.cajasDeclaradas,
      cajasEscaneadas: item.cajasEscaneadas,
      faltantes: item.cajasDeclaradas - item.cajasEscaneadas - (item.cajasAsignadas || 0),
    }))

    if (faltantes.length > 0 && Object.keys(cajasAsignadas).length === 0) {
      setMostrarModalFaltantes(true)
    } else {
      ejecutarFinalizar()
    }
  }

  const manejarConfirmarAsignacion = (asignaciones) => {
    asignarCajasFaltantes(asignaciones)
    setMostrarModalFaltantes(false)
    ejecutarFinalizar(asignaciones)
  }

  // ── Guardar revisión (local + API si disponible) ─────────────────────────
  const ejecutarFinalizar = async (asignacionesExtra = null) => {
    setGuardando(true)
    try {
      marcarRevisionCompletada()
      guardarRevisionFolio()

      // Capturar resumen y estadísticas ANTES de navegar
      const resumen = obtenerResumenPorCSG()
      const stats   = obtenerEstadisticasRevision()
      setResumenFinal(resumen)
      setEstadisticasFinal(stats)

      // Sincronizar con API si está configurada
      if (tieneBackend() && folioActualId) {
        try {
          await guardarRevision(folioActualId, {
            cajasEscaneadas,
            cajasAsignadas: asignacionesExtra || cajasAsignadas,
            resumenCSG: resumen,
            estadisticas: stats,
          })
        } catch (apiErr) {
          console.warn('No se pudo guardar en API (modo offline):', apiErr.message)
        }
      }

      // Mostrar pantalla de revisión finalizada (con opción de PDF)
      setRevisionFinalizada(true)
    } finally {
      setGuardando(false)
    }
  }

  // ── Descargar PDF ────────────────────────────────────────────────────────
  const handleDescargarPDF = () => {
    generarReportePDF({
      folio: folio?.folio || '',
      resumenCSG: resumenFinal || {},
      estadisticas: estadisticasFinal || {},
      observaciones,
      folioData: folio,
    })
  }

  // ── Continuar (salir a home) ─────────────────────────────────────────────
  const handleContinuar = () => {
    navigate('/')
  }


  // ── Guard: folio no cargado ──────────────────────────────────────────────
  if (!folio) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Cargando...</p>
      </div>
    )
  }

  // ── Pantalla de revisión finalizada ─────────────────────────────────────
  if (revisionFinalizada) {
    const items = resumenFinal ? Object.values(resumenFinal) : []
    const hayObs = items.some(i => i.estado !== 'OK')
    const estadoColor = hayObs ? 'border-orange-400 bg-orange-50' : 'border-green-400 bg-green-50'
    const estadoIcono = hayObs ? '⚠️' : '✅'
    const estadoTexto = hayObs ? 'Revisión completada con observaciones' : 'Revisión completada sin diferencias'

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Header verde */}
        <div className="bg-green-700 text-white p-4">
          <h1 className="text-xl font-bold">Revisión finalizada</h1>
          <p className="text-sm text-green-200 mt-1">Folio: {folio.folio}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="max-w-2xl mx-auto space-y-4">

            {/* Estado general */}
            <div className={`border-2 rounded-xl p-4 text-center ${estadoColor}`}>
              <p className="text-3xl mb-1">{estadoIcono}</p>
              <p className="font-bold text-gray-800 text-base">{estadoTexto}</p>
            </div>

            {/* Tarjetas resumen */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-xl shadow-sm p-4 text-center border border-gray-100">
                <p className="text-3xl font-bold text-blue-700">{estadisticasFinal?.totalDeclarado ?? 0}</p>
                <p className="text-xs text-gray-500 mt-1">Folio Documental</p>
                <p className="text-xs text-gray-400">(cajas declaradas)</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4 text-center border border-gray-100">
                <p className="text-3xl font-bold text-green-700">
                  {(estadisticasFinal?.totalEscaneado ?? 0) + (estadisticasFinal?.totalAsignadas ?? 0)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Folio Físico</p>
                <p className="text-xs text-gray-400">
                  ({estadisticasFinal?.totalEscaneado ?? 0} scan. + {estadisticasFinal?.totalAsignadas ?? 0} asig.)
                </p>
              </div>
            </div>

            {/* Tabla comparativa resumen */}
            <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
              <h3 className="font-semibold text-gray-800 mb-3 text-sm">
                📋 Comparativa Folio Documental vs Folio Físico
              </h3>
              {items.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-100 border-b-2 border-gray-200">
                        <th className="p-2 text-left font-semibold text-gray-600">CSG</th>
                        <th className="p-2 text-left font-semibold text-gray-600">Productor</th>
                        <th className="p-2 text-center font-semibold text-gray-600">Decl.</th>
                        <th className="p-2 text-center font-semibold text-blue-600">Scan.</th>
                        <th className="p-2 text-center font-semibold text-orange-600">Asig.</th>
                        <th className="p-2 text-center font-semibold text-gray-600">Dif.</th>
                        <th className="p-2 text-center font-semibold text-gray-600">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => {
                        const ef  = item.cajasEscaneadas + (item.cajasAsignadas || 0)
                        const dif = ef - item.cajasDeclaradas
                        const colores = {
                          'OK':       'bg-green-50',
                          'FALTA':    'bg-red-50',
                          'EXCESO':   'bg-yellow-50',
                          'ANOMALÍA': 'bg-orange-50',
                        }
                        const textEstado = {
                          'OK':       'text-green-700',
                          'FALTA':    'text-red-700',
                          'EXCESO':   'text-yellow-700',
                          'ANOMALÍA': 'text-orange-700',
                        }
                        return (
                          <tr key={idx} className={`border-b border-gray-100 ${colores[item.estado] || ''}`}>
                            <td className="p-2 font-mono font-semibold text-gray-900">{item.csg}</td>
                            <td className="p-2 text-gray-700 max-w-[120px]">
                              <span className="block truncate" title={item.productor}>{item.productor || '—'}</span>
                            </td>
                            <td className="p-2 text-center font-semibold text-gray-900">{item.cajasDeclaradas}</td>
                            <td className="p-2 text-center font-semibold text-blue-600">{item.cajasEscaneadas}</td>
                            <td className="p-2 text-center font-semibold text-orange-600">
                              {item.cajasAsignadas > 0 ? item.cajasAsignadas : '—'}
                            </td>
                            <td className={`p-2 text-center font-semibold ${dif === 0 ? 'text-gray-500' : dif > 0 ? 'text-yellow-700' : 'text-red-600'}`}>
                              {dif > 0 ? `+${dif}` : `${dif}`}
                            </td>
                            <td className="p-2 text-center">
                              <span className={`px-1.5 py-0.5 rounded text-xs font-bold whitespace-nowrap ${textEstado[item.estado] || ''}`}>
                                {item.estado}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-gray-400 text-center py-2">Sin datos de revisión</p>
              )}
            </div>

            {/* Composición del pallet (folio documental) */}
            {folio.lineas && folio.lineas.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                <h3 className="font-semibold text-gray-800 mb-3 text-sm">
                  📦 Composición del Pallet — Folio Documental ({folio.lineas.length} productor{folio.lineas.length !== 1 ? 'es' : ''})
                </h3>
                <div className="divide-y divide-gray-100">
                  {folio.lineas.map((linea, idx) => (
                    <div key={idx} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex justify-between items-start mb-1">
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{linea.csg}</p>
                          {linea.productor && <p className="text-xs text-gray-500">{linea.productor}</p>}
                        </div>
                        <div className="text-right flex-shrink-0 ml-3">
                          <span className="text-lg font-bold text-blue-700">{linea.cajasDeclaradas}</span>
                          <span className="text-xs text-gray-400 ml-1">cajas</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-x-3 gap-y-0.5 text-xs">
                        {linea.especie && <span className="text-gray-500">🌿 {linea.especie}</span>}
                        {linea.varComercial && <span className="text-gray-500">🍒 {linea.varComercial}</span>}
                        {linea.fechaPack && <span className="text-gray-500">📅 {linea.fechaPack}</span>}
                        {linea.sector && <span className="text-gray-500">📍 {linea.sector}</span>}
                        {linea.csp && <span className="text-gray-500 font-mono">CSP: {linea.csp}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recuadro de observaciones */}
            <div className="bg-white rounded-xl shadow-sm p-4 border border-amber-200">
              <h3 className="font-semibold text-amber-800 mb-2 text-sm flex items-center gap-1">
                📝 Observaciones
              </h3>
              <textarea
                value={observaciones}
                onChange={e => setObservaciones(e.target.value)}
                placeholder="Ingrese aquí cualquier observación relevante sobre la revisión del pallet (anomalías físicas, daños, discrepancias no contempladas, etc.)..."
                className="w-full min-h-[90px] text-sm rounded-lg border border-amber-200
                           bg-amber-50 p-3 text-gray-700 placeholder-gray-400
                           focus:outline-none focus:ring-2 focus:ring-amber-300 resize-y"
              />
              <p className="text-xs text-gray-400 mt-1">
                Las observaciones se incluirán en el reporte PDF.
              </p>
            </div>

          </div>
        </div>

        {/* Botones de acción */}
        <div className="p-4 bg-white border-t border-gray-200 space-y-3">
          <button
            onClick={handleDescargarPDF}
            className="w-full py-3 px-4 bg-blue-600 text-white rounded-xl
                       font-bold text-base hover:bg-blue-700
                       transition-all duration-200 active:scale-95 shadow-sm
                       flex items-center justify-center gap-2"
            style={{ minHeight: '52px' }}
          >
            <span>⬇️</span>
            <span>Descargar Reporte PDF</span>
          </button>

          <button
            onClick={handleContinuar}
            className="w-full py-3 px-4 bg-green-600 text-white rounded-xl
                       font-semibold text-base hover:bg-green-700
                       transition-all duration-200 active:scale-95"
            style={{ minHeight: '48px' }}
          >
            Continuar →
          </button>
        </div>
      </div>
    )
  }

  // ── Pantalla de escaneo ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Modal de faltantes */}
      {mostrarModalFaltantes && (
        <AsignarFaltantesModal
          faltantes={Object.values(resumenCSG)
            .filter(item => item.cajasEscaneadas + (item.cajasAsignadas || 0) < item.cajasDeclaradas)
            .map(item => ({
              _clave: item._clave,
              csg: item.csg,
              productor: item.productor,
              fechaPack: item.fechaPack,
              cajasDeclaradas: item.cajasDeclaradas,
              cajasEscaneadas: item.cajasEscaneadas,
              faltantes: item.cajasDeclaradas - item.cajasEscaneadas - (item.cajasAsignadas || 0),
            }))}
          onConfirmar={manejarConfirmarAsignacion}
          onCancelar={() => setMostrarModalFaltantes(false)}
        />
      )}

      {/* Header */}
      <div className="bg-blue-600 text-white p-4">
        <h1 className="text-xl font-bold">Escaneo de cajas</h1>
        <p className="text-sm text-blue-100 mt-1">Folio: {folio.folio}</p>
      </div>

      {/* Contenido scrolleable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="max-w-2xl mx-auto space-y-4">

          {/* Contador */}
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <BoxCounter
              escaneadas={totalEscaneado + totalAsignadas}
              total={folio.totalDeclarado}
              mostrarBarra={true}
            />
            {totalAsignadas > 0 && (
              <p className="text-xs text-orange-600 mt-1 text-center">
                ({totalEscaneado} escaneadas + {totalAsignadas} asignadas por etiqueta ausente)
              </p>
            )}
          </div>

          {/* Scanner */}
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <WedgeScanner onScanComplete={procesarEscaneo} isActive={true} />
          </div>

          {/* Última lectura */}
          {(ultimoEscaneo || mensajeError) && (
            <AlertBanner
              tipo={
                resultadoUltimo === 'success' ? 'success' :
                resultadoUltimo === 'warning' ? 'anomaly' : 'error'
              }
              mensaje={
                resultadoUltimo === 'success'
                  ? `✓ Caja #${ultimoEscaneo?.id} OK — CGS: ${ultimoEscaneo?.pro}`
                  : resultadoUltimo === 'warning'
                  ? `⚡ Caja #${ultimoEscaneo?.id} — ANOMALÍA DETECTADA:\n${mensajeError}`
                  : `✗ ERROR: ${mensajeError}`
              }
              visible={true}
            />
          )}

          {/* Tabla comparativa completa */}
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-3">
              Resumen por Productor
            </h3>
            <ComparativaTable
              resumenCSG={resumenCSG}
              onFilaClick={() => {}}
            />
          </div>

          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 text-sm text-blue-800">
            <p>💡 Toca una fila para ver las cajas individuales escaneadas.</p>
          </div>
        </div>
      </div>

      {/* Botones de acción */}
      <div className="p-4 bg-white border-t border-gray-200 space-y-3">
        <button
          onClick={intentarFinalizar}
          disabled={guardando}
          className="w-full py-3 px-4 bg-green-600 text-white rounded-lg
                     font-semibold text-base hover:bg-green-700
                     transition-all duration-200 active:scale-95 disabled:opacity-60"
          style={{ minHeight: '48px' }}
        >
          {guardando ? '⏳ Guardando...' : '✓ Finalizar revisión'}
        </button>

        <button
          onClick={() => navigate('/folios')}
          className="w-full py-2 px-4 bg-gray-200 text-gray-800 rounded-lg
                     font-semibold text-base hover:bg-gray-300
                     transition-all duration-200 active:scale-95"
          style={{ minHeight: '44px' }}
        >
          ← Cancelar
        </button>
      </div>
    </div>
  )
}
