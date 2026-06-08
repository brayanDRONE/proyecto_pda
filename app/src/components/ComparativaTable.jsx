/**
 * Tabla de comparativa CSG vs cajas escaneadas
 * Usada en ScanPage para mostrar resumen en tiempo real
 */
export default function ComparativaTable({ resumenCSG = {}, onFilaClick }) {
  const obtenerColorEstado = (estado) => {
    const colores = {
      'OK': 'bg-success bg-opacity-10 text-success',
      'EXCESO': 'bg-yellow-100 text-yellow-800',
      'FALTA': 'bg-red-100 text-red-800',
      'ANOMALÍA': 'bg-orange-100 text-orange-800',
    }
    return colores[estado] || 'bg-gray-50'
  }

  const items = Object.values(resumenCSG)

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        {/* Encabezados */}
        <thead>
          <tr className="bg-gray-100 border-b border-gray-300">
            <th className="p-2 text-left font-semibold text-gray-700">CSG</th>
            <th className="p-2 text-left font-semibold text-gray-700">Productor</th>
            <th className="p-2 text-center font-semibold text-gray-700">Decl.</th>
            <th className="p-2 text-center font-semibold text-gray-700">Scan.</th>
            <th className="p-2 text-center font-semibold text-gray-700">Dif.</th>
            <th className="p-2 text-center font-semibold text-gray-700">Estado</th>
          </tr>
        </thead>

        {/* Cuerpo */}
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan="6" className="p-4 text-center text-gray-500">
                Sin datos disponibles
              </td>
            </tr>
          ) : (
            items.map((item, idx) => {
              const diferencia = item.cajasEscaneadas - item.cajasDeclaradas
              const diferenciaTexto = diferencia > 0 ? `+${diferencia}` : diferencia

              return (
                <tr
                  key={`${item.csg}-${idx}`}
                  onClick={() => onFilaClick?.(item)}
                  className={`
                    border-b border-gray-200 cursor-pointer
                    transition-colors hover:bg-gray-50 active:bg-gray-100
                  `}
                  style={{ minHeight: '44px' }}
                >
                  {/* CSG */}
                  <td className="p-2 font-mono font-semibold text-gray-900">
                    {item.csg}
                  </td>

                  {/* Productor (resumido) */}
                  <td className="p-2 text-gray-700 truncate max-w-xs">
                    {item.productor.substring(0, 20)}
                    {item.productor.length > 20 ? '...' : ''}
                  </td>

                  {/* Cajas Declaradas */}
                  <td className="p-2 text-center font-semibold text-gray-900">
                    {item.cajasDeclaradas}
                  </td>

                  {/* Cajas Escaneadas */}
                  <td className="p-2 text-center font-semibold text-blue-600">
                    {item.cajasEscaneadas}
                  </td>

                  {/* Diferencia */}
                  <td className={`p-2 text-center font-semibold ${
                    diferencia === 0 ? 'text-gray-600' :
                    diferencia > 0 ? 'text-warning' :
                    'text-error'
                  }`}>
                    {diferenciaTexto}
                  </td>

                  {/* Estado (con color de fondo) */}
                  <td className="p-2 text-center">
                    <span className={`
                      px-2 py-1 rounded text-xs font-semibold whitespace-nowrap
                      ${obtenerColorEstado(item.estado)}
                    `}>
                      {item.estado}
                    </span>
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
