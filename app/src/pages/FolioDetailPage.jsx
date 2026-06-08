import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLoteStore } from '../store/useLoteStore'
import AlertBanner from '../components/AlertBanner'

/**
 * Página de detalle del folio
 * Muestra resumen + campo para ingresar cantidad física
 * Al completar: navega a escaneo de cajas
 */
export default function FolioDetailPage() {
  const navigate = useNavigate()
  const { folioId } = useParams()
  const [cantidadIngresada, setCantidadIngresada] = useState('')

  const obtenerFolioActual = useLoteStore(state => state.obtenerFolioActual)
  const establecerCantidadFisica = useLoteStore(state => state.establecerCantidadFisica)
  const marcarRevisionEnProgreso = useLoteStore(state => state.marcarRevisionEnProgreso)

  const folio = obtenerFolioActual()

  useEffect(() => {
    // Validar que existe el folio
    if (!folio) {
      navigate('/folios')
    }
  }, [folio, navigate])

  const hayDiferencia = () => {
    const cantidad = parseInt(cantidadIngresada) || 0
    return cantidad !== folio.totalDeclarado
  }

  const manejarIniciarRevision = () => {
    const cantidad = parseInt(cantidadIngresada)
    
    if (!cantidadIngresada.trim()) {
      alert('Por favor ingresa la cantidad de cajas')
      return
    }

    // Registrar cantidad física
    establecerCantidadFisica(cantidad)
    marcarRevisionEnProgreso()

    // Navegar a escaneo
    navigate(`/folio/${folioId}/scan`)
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
        <h1 className="text-2xl font-bold">Folio: {folio.folio}</h1>
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-md mx-auto space-y-6">
          {/* Resumen del folio */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold mb-4 text-gray-900">
              Resumen del lote
            </h2>

            <div className="space-y-3">
              {/* Total Declarado */}
              <div className="flex justify-between">
                <span className="text-gray-600">Total Declarado:</span>
                <span className="font-semibold text-gray-900">
                  {folio.totalDeclarado} cajas
                </span>
              </div>

              {/* Cantidad de líneas */}
              <div className="flex justify-between">
                <span className="text-gray-600">Productores (CSG):</span>
                <span className="font-semibold text-gray-900">
                  {folio.lineas.length}
                </span>
              </div>

              {/* Listado de CSG (resumido) */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-2">Productores:</p>
                <div className="space-y-1 text-xs text-gray-700">
                  {folio.lineas.map((linea, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span>{linea.csg}</span>
                      <span className="text-gray-500">{linea.cajasDeclaradas} cajas</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Input de cantidad física */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <label className="block mb-3">
              <span className="text-lg font-semibold text-gray-900 block mb-2">
                ¿Cuántas cajas tiene físicamente el pallet?
              </span>
              <input
                type="number"
                min="0"
                value={cantidadIngresada}
                onChange={(e) => setCantidadIngresada(e.target.value)}
                placeholder="0"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg
                           text-2xl font-bold text-center text-gray-900
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                style={{ minHeight: '56px' }}
              />
            </label>
          </div>

          {/* Alerta si hay diferencia */}
          {cantidadIngresada && hayDiferencia() && (
            <AlertBanner
              tipo="warning"
              mensaje={`Diferencia detectada: ${Math.abs(parseInt(cantidadIngresada) - folio.totalDeclarado)} cajas`}
              visible={true}
            />
          )}

          {/* Info */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              ℹ️ Conteo de cajas físicas antes de iniciar el escaneo.
            </p>
          </div>
        </div>
      </div>

      {/* Botones de acción */}
      <div className="p-4 bg-white border-t border-gray-200 space-y-3">
        <button
          onClick={manejarIniciarRevision}
          disabled={!cantidadIngresada.trim()}
          className={`
            w-full py-3 px-4 rounded-lg font-semibold text-base
            transition-all duration-200 active:scale-95
            ${
              cantidadIngresada.trim()
                ? 'bg-success text-white hover:bg-green-600'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }
          `}
          style={{ minHeight: '48px' }}
        >
          ▶ Iniciar revisión
        </button>

        <button
          onClick={() => navigate('/folios')}
          className="w-full py-2 px-4 bg-gray-200 text-gray-800 rounded-lg
                     font-semibold text-base hover:bg-gray-300
                     transition-all duration-200 active:scale-95"
          style={{ minHeight: '44px' }}
        >
          ← Volver
        </button>
      </div>
    </div>
  )
}
