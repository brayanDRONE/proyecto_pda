/**
 * Banner de alertas visuales para diferencias y anomalías
 * Usado en ScanPage y ReportPage
 */
export default function AlertBanner({ tipo = null, mensaje = '', visible = true }) {
  if (!visible || !tipo) return null

  const configs = {
    'info': {
      bg: 'bg-blue-50 border-blue-200',
      icon: 'ℹ️',
      texto: 'text-blue-800',
      titulo: 'Información',
    },
    'success': {
      bg: 'bg-success bg-opacity-10 border-success border-opacity-30',
      icon: '✓',
      texto: 'text-success',
      titulo: 'Correcto',
    },
    'warning': {
      bg: 'bg-yellow-50 border-yellow-200',
      icon: '⚠️',
      texto: 'text-yellow-800',
      titulo: 'Advertencia',
    },
    'anomaly': {
      bg: 'bg-orange-50 border-orange-200',
      icon: '⚡',
      texto: 'text-orange-800',
      titulo: 'Anomalía',
    },
    'error': {
      bg: 'bg-red-50 border-red-200',
      icon: '✗',
      texto: 'text-red-800',
      titulo: 'Error',
    },
  }

  const config = configs[tipo] || configs['info']

  return (
    <div className={`
      w-full p-3 rounded-lg border-2
      ${config.bg} ${config.texto}
      animate-fade-in
    `}>
      <div className="flex gap-3 items-start">
        <span className="text-2xl flex-shrink-0">{config.icon}</span>
        <div className="flex-1">
          <h4 className="font-semibold text-sm">{config.titulo}</h4>
          <p className="text-xs mt-1 whitespace-pre-wrap break-words">
            {mensaje}
          </p>
        </div>
      </div>
    </div>
  )
}
