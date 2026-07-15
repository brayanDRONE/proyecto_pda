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

export default function ScanPage() {
  const navigate = useNavigate()

  const [ultimoEscaneo, setUltimoEscaneo] = useState(null)
  const [resultadoUltimo, setResultadoUltimo] = useState(null)
  const [mensajeError, setMensajeError] = useState('')
  const [mostrarModalFaltantes, setMostrarModalFaltantes] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const obtenerFolioActual = useLoteStore(state => state.obtenerFolioActual)
  const cajasEscaneadas = useLoteStore(state => state.cajasEscaneadas)
  const cajasAsignadas = useLoteStore(state => state.cajasAsignadas)
  const registrarCajaEscaneada = useLoteStore(state => state.registrarCajaEscaneada)
  const obtenerResumenPorCSG = useLoteStore(state => state.obtenerResumenPorCSG)
  const obtenerEstadisticasRevision = useLoteStore(state => state.obtenerEstadisticasRevision)
  const marcarRevisionCompletada = useLoteStore(state => state.marcarRevisionCompletada)
  const guardarRevisionFolio = useLoteStore(state => state.guardarRevisionFolio)
  const asignarCajasFaltantes = useLoteStore(state => state.asignarCajasFaltantes)
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
        setMensajeError('QR inválido o mal formado')
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
        setMensajeError(`CSG ${datosQR.Pro} no encontrado en el folio`)
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
      csg: item.csg,
      productor: item.productor,
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

      // Sincronizar con API si está configurada
      if (tieneBackend() && folioActualId) {
        try {
          const stats = obtenerEstadisticasRevision()
          const resumen = obtenerResumenPorCSG()
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

      navigate('/')
    } finally {
      setGuardando(false)
    }
  }

  if (!folio) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Modal de faltantes */}
      {mostrarModalFaltantes && (
        <AsignarFaltantesModal
          faltantes={Object.values(resumenCSG)
            .filter(item => item.cajasEscaneadas + (item.cajasAsignadas || 0) < item.cajasDeclaradas)
            .map(item => ({
              csg: item.csg,
              productor: item.productor,
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
                  ? `✓ Caja #${ultimoEscaneo?.id} OK`
                  : resultadoUltimo === 'warning'
                  ? `⚡ Caja #${ultimoEscaneo?.id} con anomalías:\n${ultimoEscaneo?.diferencias.map(d => `${d.campo}: ${d.valorPlanilla} → ${d.valorQR}`).join('\n')}`
                  : `✗ Error: ${mensajeError}`
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
