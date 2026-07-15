import * as XLSX from 'xlsx'

/**
 * Parser inteligente de planilla SAG
 * - Detecta automáticamente la fila con encabezados buscando "N° Folio"
 * - Agrupa filas por folio
 * - Retorna estructura normalizada
 */

/**
 * Parsear archivo Excel de lote SAG
 * @param {File|Blob} archivo - archivo .xlsx
 * @returns {Promise<Object>} - { "FOLIO": { folio, totalDeclarado, lineas }, ... }
 */
export async function parsearExcelSAG(archivo) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const datos = new Uint8Array(e.target.result)
        const workbook = XLSX.read(datos, { type: 'array' })
        const hoja = workbook.Sheets[workbook.SheetNames[0]]
        
        // Convertir a JSON para procesar
        const jsonData = XLSX.utils.sheet_to_json(hoja, { header: 1 })
        
        // Buscar fila con encabezados
        const filaEncabezados = encontrarFilaEncabezados(jsonData)
        
        if (filaEncabezados === -1) {
          reject(new Error('No se encontró fila con encabezados (N° Folio)'))
          return
        }
        
        // Extraer encabezados y mapeo de columnas
        const encabezados = jsonData[filaEncabezados]
        const mapeoColumnas = crearMapeoColumnas(encabezados)
        
        // Procesar datos desde la fila siguiente
        const datosFilas = jsonData.slice(filaEncabezados + 1)
        
        // Agrupar por folio
        const lotes = agruparPorFolio(datosFilas, mapeoColumnas)
        
        resolve(lotes)
      } catch (error) {
        reject(error)
      }
    }
    
    reader.onerror = () => reject(new Error('Error al leer archivo'))
    reader.readAsArrayBuffer(archivo)
  })
}

/**
 * Encontrar la fila que contiene los encabezados
 * Busca la celda con "N° Folio" o similar
 */
function encontrarFilaEncabezados(datos) {
  for (let i = 0; i < datos.length; i++) {
    const fila = datos[i]
    for (let j = 0; j < fila.length; j++) {
      const celda = String(fila[j]).toLowerCase().trim()
      if (celda.includes('folio') || celda.includes('nº folio') || celda.includes('n° folio')) {
        return i
      }
    }
  }
  return -1
}

/**
 * Crear objeto de mapeo: nombreEncabezado -> índiceColumna
 * Mejorado para manejar estructura con espacios en blanco
 */
function crearMapeoColumnas(encabezados) {
  const mapa = {}
  
  const columnasEsperadas = [
    { claves: ['n° folio', 'nº folio', 'folio'], id: 'n° folio' },
    { claves: ['csg'], id: 'csg' },
    { claves: ['productor'], id: 'productor' },
    { claves: ['proceso'], id: 'proceso' },
    { claves: ['provincia origen', 'prov origen', 'prov. origen'], id: 'provincia origen' },
    { claves: ['comuna origen', 'com origen', 'com. origen'], id: 'comuna origen' },
    { claves: ['csp'], id: 'csp' },
    { claves: ['provincia pack', 'prov pack', 'prov. pack'], id: 'provincia pack' },
    { claves: ['comuna pack', 'com pack', 'com. pack'], id: 'comuna pack' },
    { claves: ['especie', 'especie/species'], id: 'especie' },
    { claves: ['variedad agronómica', 'var agronómica', 'var. agronómica'], id: 'variedad agronómica' },
    { claves: ['variedad comercial', 'var comercial', 'var. comercial'], id: 'variedad comercial' },
    { claves: ['fec.pack', 'fec.pack.', 'fecha pack', 'fec pack', 'fechapack', 'fecpack', 'f.pack', 'fpack'], id: 'fec.pack' },
    { claves: ['lote'], id: 'lote' },
    { claves: ['sdp/sector', 'sdp', 'sector'], id: 'sdp/sector' },
    { claves: ['cajas', 'cajas/boxes', 'cajas boxes'], id: 'cajas' },
    { claves: ['total', 'total'], id: 'total' },
  ]
  
  encabezados.forEach((encabezado, idx) => {
    if (!encabezado) return
    const normalizado = String(encabezado).toLowerCase().trim()
    // Versión sin puntos, barras ni espacios para comparación flexible
    const normalizadoLimpio = normalizado.replace(/[.\/\s]/g, '')

    columnasEsperadas.forEach(col => {
      col.claves.forEach(clave => {
        const claveLimpia = clave.replace(/[.\/\s]/g, '')
        if (normalizadoLimpio.includes(claveLimpia) || normalizado.includes(clave)) {
          mapa[col.id] = idx
        }
      })
    })
  })
  
  return mapa
}

/**
 * Agrupar filas por folio y normalizar estructura
 */
function agruparPorFolio(datosFilas, mapeo) {
  const lotes = {}
  let folioActual = null
  let lineasFolio = []
  let totalFolio = 0
  
  datosFilas.forEach((fila, idx) => {
    // Obtener valores con fallback
    const obtener = (clave) => {
      const colIdx = mapeo[clave]
      return colIdx !== undefined ? String(fila[colIdx] || '').trim() : ''
    }
    
    const folio = obtener('n° folio')
    const csg = obtener('csg')
    const cajas = parseInt(obtener('cajas')) || 0
    const total = parseInt(obtener('total')) || 0
    
    // Si la fila tiene un folio nuevo, iniciar grupo
    if (folio) {
      // Guardar grupo anterior si existe
      if (folioActual && lineasFolio.length > 0) {
        // Si no se encontró total explícito, calcular sumando cajas de líneas
        const totalCalculado = totalFolio > 0 ? totalFolio : lineasFolio.reduce((sum, l) => sum + (l.cajasDeclaradas || 0), 0)
        
        lotes[folioActual] = {
          folio: folioActual,
          totalDeclarado: totalCalculado,
          lineas: lineasFolio,
          revisado: false,
        }
      }
      
      folioActual = folio
      lineasFolio = []
      totalFolio = total
    }
    
    // Procesar línea si tiene CSG o cajas
    if ((csg || cajas > 0) && folioActual) {
      lineasFolio.push({
        csg: csg || '',
        productor: obtener('productor'),
        provOrigen: obtener('provincia origen'),
        comunaOrigen: obtener('comuna origen'),
        csp: obtener('csp'),
        provPack: obtener('provincia pack'),
        comunaPack: obtener('comuna pack'),
        especie: obtener('especie'),
        varAgronomica: obtener('variedad agronómica'),
        varComercial: obtener('variedad comercial'),
        fechaPack: obtener('fec.pack'),
        sector: obtener('sdp/sector'),
        cajasDeclaradas: cajas,
      })
      
      // Acumular total si se proporciona en la línea
      if (total > 0) {
        totalFolio = total
      }
    }
  })
  
  // Guardar último grupo
  if (folioActual && lineasFolio.length > 0) {
    const totalCalculado = totalFolio > 0 ? totalFolio : lineasFolio.reduce((sum, l) => sum + (l.cajasDeclaradas || 0), 0)
    lotes[folioActual] = {
      folio: folioActual,
      totalDeclarado: totalCalculado,
      lineas: lineasFolio,
      revisado: false,
    }
  }
  
  return lotes
}
