/**
 * Tarjeta que muestra el resumen de un folio
 * Usada en FolioListPage
 */
export default function FolioCard({ folio, onClick }) {
  const obtenerEstadoBadge = (estado) => {
    const configs = {
      'pendiente':                   { bg: 'bg-gray-100',    text: 'text-gray-600',   etiqueta: 'Pendiente' },
      'en-revision':                 { bg: 'bg-blue-100',   text: 'text-blue-800',   etiqueta: '🔄 En revisión' },
      'revisado':                    { bg: 'bg-green-100',  text: 'text-green-800',  etiqueta: '✓ Revisado' },
      'revisado-con-observaciones':  { bg: 'bg-orange-100', text: 'text-orange-800', etiqueta: '⚠️ Con observaciones' },
      'completado':                  { bg: 'bg-green-100',  text: 'text-green-800',  etiqueta: '✓ Completado' },
    }
    return configs[estado] || configs['pendiente']
  }

  const badge = obtenerEstadoBadge(folio.estado)

  return (
    <button
      onClick={onClick}
      className={`
        w-full p-4 bg-white border border-gray-200 rounded-lg shadow-sm
        transition-all duration-200 active:scale-95 hover:shadow-md
        text-left
      `}
      style={{ minHeight: '100px', touchAction: 'manipulation' }}
    >
      {/* Encabezado: Folio + Badge */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-bold text-gray-900">
            {folio.folio}
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            {folio.numLineas} línea{folio.numLineas !== 1 ? 's' : ''}
          </p>
        </div>
        <span className={`
          px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap
          ${badge.bg} ${badge.text}
        `}>
          {badge.etiqueta}
        </span>
      </div>

      {/* Info: Total de cajas */}
      <div className="flex items-center gap-2 text-sm text-gray-700">
        <span className="font-semibold">{folio.totalDeclarado}</span>
        <span className="text-gray-500">cajas declaradas</span>
      </div>
    </button>
  )
}
