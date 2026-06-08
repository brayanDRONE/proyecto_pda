/**
 * Contador grande de progreso
 * Muestra: "32 / 72 cajas" con barra de progreso
 * Usado en ScanPage
 */
export default function BoxCounter({ escaneadas = 0, total = 0, mostrarBarra = true }) {
  const porcentaje = total > 0 ? Math.round((escaneadas / total) * 100) : 0

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Número grande */}
      <div className="text-center">
        <div className="text-5xl font-bold text-blue-600">
          {escaneadas}
          <span className="text-2xl text-gray-500"> / {total}</span>
        </div>
        <p className="text-base text-gray-600 mt-2">cajas</p>
      </div>

      {/* Barra de progreso */}
      {mostrarBarra && (
        <div className="w-full max-w-xs">
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${porcentaje}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 text-center mt-1">
            {porcentaje}% completado
          </p>
        </div>
      )}

      {/* Diferencia */}
      <div className={`text-lg font-semibold ${
        escaneadas === total ? 'text-success' :
        escaneadas > total ? 'text-warning' :
        escaneadas < total ? 'text-error' :
        'text-gray-600'
      }`}>
        {escaneadas === total ? '✓ Coincide' : `${total - escaneadas} falta${(total - escaneadas) !== 1 ? 'n' : ''}`}
      </div>
    </div>
  )
}
