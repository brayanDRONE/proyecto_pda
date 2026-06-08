import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLoteStore } from '../store/useLoteStore'

/**
 * Página de detalle del folio
 * Muestra composición del pallet desde la planilla Excel.
 * No pide conteo manual: el totalDeclarado es el dato oficial.
 * Un toque en "Iniciar Escaneo" para comenzar.
 */
export default function FolioDetailPage() {
  const navigate = useNavigate()
  const { folioId } = useParams()

  const obtenerFolioActual = useLoteStore(state => state.obtenerFolioActual)
  const establecerCantidadFisica = useLoteStore(state => state.establecerCantidadFisica)
  const marcarRevisionEnProgreso = useLoteStore(state => state.marcarRevisionEnProgreso)

  const folio = obtenerFolioActual()

  useEffect(() => {
    if (!folio) {
      navigate('/')
    }
  }, [folio, navigate])

  const manejarIniciarEscaneo = () => {
    // Usar totalDeclarado como la cantidad de referencia
    establecerCantidadFisica(folio.totalDeclarado)
    marcarRevisionEnProgreso()
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
        <button
          onClick={() => navigate('/')}
          className="text-blue-200 text-sm mb-1"
        >
          ← Volver
        </button>
        <h1 className="text-xl font-bold">Folio: {folio.folio}</h1>
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-md mx-auto space-y-4">

          {/* Total declarado - Dato principal */}
          <div className="bg-blue-600 text-white p-5 rounded-xl text-center shadow">
            <p className="text-sm text-blue-200 mb-1">Total declarado en planilla</p>
            <p className="text-5xl font-bold">{folio.totalDeclarado}</p>
            <p className="text-sm text-blue-200 mt-1">cajas</p>
          </div>

          {/* Composición por productor (CSG) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">
                Composición del pallet ({folio.lineas.length} productores)
              </h2>
            </div>
            <div className="divide-y divide-gray-100">
              {folio.lineas.map((linea, idx) => (
                <div key={idx} className="p-4 flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{linea.csg}</p>
                    {linea.especie && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {linea.especie} {linea.varComercial ? `· ${linea.varComercial}` : ''}
                      </p>
                    )}
                  </div>
                  <div className="text-right ml-3 flex-shrink-0">
                    <span className="text-lg font-bold text-blue-700">{linea.cajasDeclaradas}</span>
                    <span className="text-xs text-gray-400 ml-1">cajas</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-sm text-amber-800">
            <p>⚡ Escanea cada caja del pallet. El sistema comparará en tiempo real con esta planilla.</p>
          </div>

        </div>
      </div>

      {/* Botón iniciar */}
      <div className="p-4 bg-white border-t border-gray-200">
        <button
          onClick={manejarIniciarEscaneo}
          className="w-full py-4 bg-green-600 text-white rounded-xl
                     font-bold text-lg hover:bg-green-700
                     transition-all duration-200 active:scale-95 shadow-md"
          style={{ minHeight: '56px' }}
        >
          🔫 Iniciar Escaneo de Cajas
        </button>
      </div>
    </div>
  )
}
