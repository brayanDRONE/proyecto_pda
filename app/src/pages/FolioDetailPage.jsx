import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLoteStore } from '../store/useLoteStore'
import { actualizarEstado, tieneBackend } from '../utils/api'

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

  const manejarIniciarEscaneo = async () => {
    establecerCantidadFisica(folio.totalDeclarado)
    marcarRevisionEnProgreso()
    // Sincronizar estado en-revision con API (si está disponible)
    if (tieneBackend() && folioId) {
      try { await actualizarEstado(folioId, 'en-revision') } catch (_) {}
    }
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

          {/* Composición por productor (CSG) — todos los campos */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">
                Composición del pallet ({folio.lineas.length} productor{folio.lineas.length !== 1 ? 'es' : ''})
              </h2>
            </div>
            <div className="divide-y divide-gray-100">
              {folio.lineas.map((linea, idx) => (
                <div key={idx} className="p-4">
                  {/* Fila superior: CSG + productor + cajas */}
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold text-gray-900">{linea.csg}</p>
                      {linea.productor && (
                        <p className="text-xs text-gray-500">{linea.productor}</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <span className="text-xl font-bold text-blue-700">{linea.cajasDeclaradas}</span>
                      <span className="text-xs text-gray-400 ml-1">cajas</span>
                    </div>
                  </div>

                  {/* Grilla de atributos */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    {linea.especie && (
                      <Campo label="Especie" valor={linea.especie} />
                    )}
                    {linea.varComercial && (
                      <Campo label="Variedad" valor={linea.varComercial} />
                    )}
                    {linea.fechaPack && (
                      <Campo label="Fec. Pack" valor={linea.fechaPack} destacado />
                    )}
                    {linea.sector && (
                      <Campo label="Sector/SDP" valor={linea.sector} />
                    )}
                    {linea.csp && (
                      <Campo label="CSP" valor={linea.csp} />
                    )}
                    {linea.provOrigen && (
                      <Campo label="Prov. Origen" valor={linea.provOrigen} />
                    )}
                    {linea.comunaOrigen && (
                      <Campo label="Comuna Origen" valor={linea.comunaOrigen} />
                    )}
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

// Componente auxiliar para mostrar un campo etiqueta/valor
function Campo({ label, valor, destacado = false }) {
  return (
    <div>
      <span className="text-gray-400 block">{label}</span>
      <span className={`font-semibold ${destacado ? 'text-blue-700' : 'text-gray-800'}`}>
        {valor}
      </span>
    </div>
  )
}
