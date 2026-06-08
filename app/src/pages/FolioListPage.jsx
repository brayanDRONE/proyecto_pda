import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLoteStore } from '../store/useLoteStore'
import FolioCard from '../components/FolioCard'

/**
 * Página con lista de folios disponibles
 * Cada folio muestra: número, cantidad de líneas, total de cajas, estado
 * Filtro de búsqueda por número de folio
 */
export default function FolioListPage() {
  const navigate = useNavigate()
  const [busqueda, setBusqueda] = useState('')
  const obtenerResumenFolios = useLoteStore(state => state.obtenerResumenFolios)
  const iniciarRevision = useLoteStore(state => state.iniciarRevision)

  const folios = obtenerResumenFolios()

  // Filtrar folios por búsqueda
  const foliosFiltrados = useMemo(() => {
    if (!busqueda.trim()) return folios
    return folios.filter(f =>
      f.folio.toLowerCase().includes(busqueda.toLowerCase())
    )
  }, [folios, busqueda])

  const manejarSeleccionFolio = (folio) => {
    // Inicializar revisión de ese folio
    iniciarRevision(folio.folio)
    // Navegar al detalle del folio
    navigate(`/folio/${folio.folio}/detail`)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4">
        <h1 className="text-2xl font-bold">Folios</h1>
        <p className="text-sm text-blue-100 mt-1">
          {folios.length} folio{folios.length !== 1 ? 's' : ''} disponible{folios.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Campo de búsqueda */}
      <div className="p-4 bg-white border-b border-gray-200">
        <input
          type="text"
          placeholder="🔍 Buscar por N° Folio..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg
                     text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          style={{ minHeight: '44px' }}
        />
      </div>

      {/* Lista de folios */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-2xl mx-auto space-y-3">
          {foliosFiltrados.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">
                {busqueda ? 'No se encontraron folios' : 'Sin folios disponibles'}
              </p>
            </div>
          ) : (
            foliosFiltrados.map((folio, idx) => (
              <FolioCard
                key={folio.folio}
                folio={folio}
                onClick={() => manejarSeleccionFolio(folio)}
              />
            ))
          )}
        </div>
      </div>

      {/* Botón volver */}
      <div className="p-4 bg-white border-t border-gray-200">
        <button
          onClick={() => navigate('/')}
          className="w-full py-2 px-4 bg-gray-200 text-gray-800 rounded-lg
                     font-semibold text-base hover:bg-gray-300
                     transition-all duration-200 active:scale-95"
          style={{ minHeight: '44px' }}
        >
          ← Volver a carga
        </button>
      </div>
    </div>
  )
}
