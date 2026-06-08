import * as XLSX from 'xlsx'

/**
 * Generador de reportes Excel con estilos
 * Colorea filas según tipo de diferencia
 */

/**
 * Generar reporte Excel descargable
 * @param {Object} folio - { folio, totalDeclarado, lineas, ... }
 * @param {Object} statsRevision - { totalEscaneado, conDiferencias, ... }
 * @param {Object} cajasEscaneadas - cajas registradas
 * @param {Object} resumenCSG - resumen por CSG
 */
export function generarReporteExcel(folio, statsRevision, cajasEscaneadas, resumenCSG) {
  try {
    // Crear workbook
    const wb = XLSX.utils.book_new()
    
    // Hoja 1: Reporte detallado
    const wsReporte = crearHojaReporte(folio, statsRevision, cajasEscaneadas, resumenCSG)
    XLSX.utils.book_append_sheet(wb, wsReporte, 'Reporte')
    
    // Hoja 2: Resumen por CSG
    const wsResumen = crearHojaResumen(resumenCSG)
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen por CSG')
    
    // Descargar
    const nombreArchivo = `Reporte_${folio.folio}_${obtenerFechaFormato()}.xlsx`
    XLSX.writeFile(wb, nombreArchivo)
    
  } catch (error) {
    console.error('Error al generar reporte:', error)
    throw error
  }
}

/**
 * Crear hoja con reporte detallado
 */
function crearHojaReporte(folio, stats, cajasEscaneadas, resumenCSG) {
  const datos = []
  
  // Encabezado con datos generales
  datos.push(['REPORTE DE INSPECCIÓN SAG'])
  datos.push([])
  datos.push(['Folio:', folio.folio])
  datos.push(['Total Declarado:', folio.totalDeclarado])
  datos.push(['Total Escaneado:', stats.totalEscaneado])
  datos.push(['Cantidad Física:', stats.cantidadFisica || '-'])
  datos.push(['Estado:', stats.totalEscaneado === folio.totalDeclarado ? 'OK ✓' : 'DIFERENCIA ✗'])
  datos.push([])
  
  // Encabezados de tabla
  datos.push(['CSG', 'Productor', 'Cajas Decl.', 'Cajas Scan.', 'Dif.', 'Estado', 'Observación'])
  
  // Llenar con datos por CSG
  Object.values(resumenCSG).forEach(item => {
    const diferencia = item.cajasEscaneadas - item.cajasDeclaradas
    datos.push([
      item.csg,
      item.productor,
      item.cajasDeclaradas,
      item.cajasEscaneadas,
      diferencia,
      item.estado,
      obtenerObservacion(item),
    ])
  })
  
  // Fila final de resumen
  const totalEscan = Object.values(resumenCSG).reduce((sum, r) => sum + r.cajasEscaneadas, 0)
  const totalDecl = Object.values(resumenCSG).reduce((sum, r) => sum + r.cajasDeclaradas, 0)
  
  datos.push([])
  datos.push(['REAL:', totalEscan, 'DECLARADO:', totalDecl])
  
  // Convertir a worksheet
  const ws = XLSX.utils.aoa_to_sheet(datos)
  
  // Aplicar estilos (colores de fondo)
  aplicarEstilos(ws, datos, resumenCSG)
  
  // Ajustar ancho de columnas
  ws['!cols'] = [
    { wch: 15 },  // CSG
    { wch: 25 },  // Productor
    { wch: 12 },  // Cajas Decl
    { wch: 12 },  // Cajas Scan
    { wch: 8 },   // Dif
    { wch: 12 },  // Estado
    { wch: 30 },  // Observación
  ]
  
  return ws
}

/**
 * Crear hoja con resumen por CSG
 */
function crearHojaResumen(resumenCSG) {
  const datos = []
  
  datos.push(['RESUMEN POR CSG'])
  datos.push([])
  datos.push(['CSG', 'Productor', 'Cajas Declaradas', 'Cajas Escaneadas', 'Estado'])
  
  Object.values(resumenCSG).forEach(item => {
    datos.push([
      item.csg,
      item.productor,
      item.cajasDeclaradas,
      item.cajasEscaneadas,
      item.estado,
    ])
  })
  
  const ws = XLSX.utils.aoa_to_sheet(datos)
  ws['!cols'] = [
    { wch: 15 },
    { wch: 25 },
    { wch: 18 },
    { wch: 18 },
    { wch: 15 },
  ]
  
  return ws
}

/**
 * Aplicar estilos de color a las celdas
 */
function aplicarEstilos(ws, datos, resumenCSG) {
  // Mapeo de colores
  const colores = {
    OK: 'C6EFCE',        // Verde claro
    EXCESO: 'FFFF99',    // Amarillo
    FALTA: 'FF9999',     // Rojo claro
    ANOMALÍA: 'FFD580',  // Naranja
    HEADER: 'D3D3D3',    // Gris
  }
  
  let filaActual = 9 // La tabla comienza en fila 9 (después de metadata)
  
  Object.values(resumenCSG).forEach((item, idx) => {
    const fila = filaActual + idx
    const color = colores[item.estado] || 'FFFFFF'
    
    // Aplicar color a todas las celdas de la fila
    for (let col = 0; col < 7; col++) {
      const celda = XLSX.utils.encode_cell({ r: fila, c: col })
      if (!ws[celda]) ws[celda] = { t: 's', v: '' }
      ws[celda].s = {
        fill: { fgColor: { rgb: color } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' },
        },
      }
    }
  })
}

/**
 * Generar observación según estado
 */
function obtenerObservacion(item) {
  if (item.estado === 'OK') {
    return 'Sin diferencias'
  } else if (item.estado === 'EXCESO') {
    return `Exceso: ${item.cajasEscaneadas - item.cajasDeclaradas} cajas adicionales`
  } else if (item.estado === 'FALTA') {
    return `Falta: ${item.cajasDeclaradas - item.cajasEscaneadas} cajas`
  } else if (item.estado === 'ANOMALÍA') {
    return `Anomalía en campos: ${item.diferencias.map(d => d.campo).join(', ')}`
  }
  return ''
}

/**
 * Obtener fecha en formato dd/mm/yyyy
 */
function obtenerFechaFormato() {
  const hoy = new Date()
  return `${String(hoy.getDate()).padStart(2, '0')}${String(hoy.getMonth() + 1).padStart(2, '0')}${hoy.getFullYear()}`
}
