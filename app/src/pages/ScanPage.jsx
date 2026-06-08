import { useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLoteStore } from '../store/useLoteStore'
import { parsearQR, validarDuplicado } from '../utils/qrParser'
import { compararQRconPlanilla, encontrarLineaCorrespondiente } from '../utils/comparator'
import WedgeScanner from '../components/WedgeScanner'
import BoxCounter from '../components/BoxCounter'
import ComparativaTable from '../components/ComparativaTable'
import AlertBanner from '../components/AlertBanner'

/**
 * Página de escaneo caja a caja
 * - WedgeScanner activo recibiendo QR
 * - Tabla de resumen en tiempo real
 * - Contador de progreso
 */
export default function ScanPage() {
  const navigate = useNavigate()
  const { folioId } = useParams()

  const [ultimoEscaneo, setUltimoEscaneo] = useState(null)
  const [resultadoUltimo, setResultadoUltimo] = useState(null) // 'success', 'error', null
  const [mensajeError, setMensajeError] = useState('')

  const obtenerFolioActual = useLoteStore(state => state.obtenerFolioActual)
  const cajasEscaneadas = useLoteStore(state => state.cajasEscaneadas)
  const registrarCajaEscaneada = useLoteStore(state => state.registrarCajaEscaneada)
  const obtenerResumenPorCSG = useLoteStore(state => state.obtenerResumenPorCSG)
  const marcarRevisionCompletada = useLoteStore(state => state.marcarRevisionCompletada)
  const guardarRevisionFolio = useLoteStore(state => state.guardarRevisionFolio)

  const folio = obtenerFolioActual()
  const resumenCSG = obtenerResumenPorCSG()
  const totalEscaneado = Object.keys(cajasEscaneadas).length

  // Procesar contenido escaneado del QR
  const procesarEscaneo = useCallback((contenido) => {
    setMensajeError('')
    setResultadoUltimo(null)

    try {
      // Parsear QR
      const datosQR = parsearQR(contenido)
      if (!datosQR) {
        setMensajeError('QR inválido o mal formado')
        setResultadoUltimo('error')
        return false
      }

      // Validar no duplicado
      if (validarDuplicado(datosQR.ID, cajasEscaneadas)) {
        setMensajeError(`Caja #${datosQR.ID} ya fue escaneada`)
        setResultadoUltimo('error')
        return false
      }

      // Buscar línea correspondiente en el folio
      const linea = encontrarLineaCorrespondiente(datosQR, folio.lineas)
      if (!linea) {
        setMensajeError(`CSG ${datosQR.Pro} no encontrado en el folio`)
        setResultadoUltimo('error')
        return false
      }

      // Comparar datos
      const diferencias = compararQRconPlanilla(datosQR, linea)

      // Registrar caja en el store
      registrarCajaEscaneada(datosQR, linea, diferencias)

      // Feedback
      setUltimoEscaneo({
        id: datosQR.ID,
        pro: datosQR.Pro,
        esp: datosQR.Esp,
        conDiferencias: diferencias.length > 0,
        diferencias: diferencias,
      })

      setResultadoUltimo(diferencias.length === 0 ? 'success' : 'warning')

      return true
    } catch (error) {
      console.error('Error procesando escaneo:', error)
      setMensajeError('Error procesando QR')
      setResultadoUltimo('error')
      return false
    }
  }, [folio, cajasEscaneadas, registrarCajaEscaneada])

  const manejarFinalizarRevision = () => {
    marcarRevisionCompletada()
    guardarRevisionFolio() // Guardar en histórico de foliosRevisados
    // Volver a la lista de folios para continuar revisando
    navigate('/')
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
      {/* Header */}
      <div className="bg-blue-600 text-white p-4">
        <h1 className="text-xl font-bold">Escaneo de cajas</h1>
        <p className="text-sm text-blue-100 mt-1">Folio: {folio.folio}</p>
      </div>

      {/* Contenido scrolleable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="max-w-2xl mx-auto space-y-4">
          {/* Contador grande */}
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <BoxCounter
              escaneadas={totalEscaneado}
              total={folio.totalDeclarado}
              mostrarBarra={true}
            />
          </div>

          {/* WedgeScanner */}
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <WedgeScanner
              onScanComplete={procesarEscaneo}
              isActive={true}
            />
          </div>

          {/* Última lectura y feedback */}
          {ultimoEscaneo && (
            <AlertBanner
              tipo={
                resultadoUltimo === 'success' ? 'success' :
                resultadoUltimo === 'warning' ? 'anomaly' :
                'error'
              }
              mensaje={
                resultadoUltimo === 'success'
                  ? `✓ Caja #${ultimoEscaneo.id} OK`
                  : resultadoUltimo === 'warning'
                  ? `⚡ Caja #${ultimoEscaneo.id} con anomalías:\n${ultimoEscaneo.diferencias.map(d => `${d.campo}: ${d.valorPlanilla} vs ${d.valorQR}`).join('\n')}`
                  : `✗ Error: ${mensajeError}`
              }
              visible={true}
            />
          )}

          {/* Tabla de resumen por CSG */}
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-3">
              Resumen por Productor
            </h3>
            <ComparativaTable
              resumenCSG={resumenCSG}
              onFilaClick={(item) => {
                // TODO: mostrar detalle de CSG específico
              }}
            />
          </div>

          {/* Info */}
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 text-sm text-blue-800">
            <p>💡 Continúa escaneando. Puedes finalizar en cualquier momento.</p>
          </div>
        </div>
      </div>

      {/* Botones de acción */}
      <div className="p-4 bg-white border-t border-gray-200 space-y-3">
        <button
          onClick={manejarFinalizarRevision}
          className="w-full py-3 px-4 bg-success text-white rounded-lg
                     font-semibold text-base hover:bg-green-600
                     transition-all duration-200 active:scale-95"
          style={{ minHeight: '48px' }}
        >
          ✓ Finalizar revisión
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
