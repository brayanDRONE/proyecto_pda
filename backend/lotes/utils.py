"""
Utilidades para generación de reportes comparativos de revisión SAG
"""


def generar_reporte_comparativo(lote, revision_data):
    """
    Genera el reporte comparativo entre lo escaneado y la planilla Excel.

    Por cada CSG revisado retorna:
      folio, csg, provincia, comuna, csp, especie, variedad, fecha,
      acumulado_cajas (escaneadas), cajas_declaradas, estado

    - Si el CSG existe en las líneas del folio → se incluyen
      provinciaOrigen y comunaOrigen desde esa línea.
    - Si el CSG NO existe en las líneas → provincia y comuna = 'No encontrado'.

    :param lote: instancia de models.Lote
    :param revision_data: dict con clave 'resumenCSG'
    :returns: list[dict]
    """
    lineas_por_csg = {l.csg: l for l in lote.lineas}
    resumen_csg = revision_data.get('resumenCSG', {})

    reporte = []
    for csg, data in resumen_csg.items():
        linea = lineas_por_csg.get(str(csg))

        if linea:
            provincia = linea.provinciaOrigen or 'No encontrado'
            comuna = linea.comunaOrigen or 'No encontrado'
            csp = linea.csp or data.get('csp') or '-'
            especie = linea.especie or data.get('especie') or '-'
            variedad = linea.varComercial or data.get('varComercial') or '-'
            fecha = linea.fechaPack or data.get('fechaPack') or '-'
        else:
            provincia = 'No encontrado'
            comuna = 'No encontrado'
            csp = data.get('csp') or '-'
            especie = data.get('especie') or '-'
            variedad = data.get('varComercial') or '-'
            fecha = data.get('fechaPack') or '-'

        reporte.append({
            'folio': lote.folio_id,
            'csg': csg,
            'provincia': provincia,
            'comuna': comuna,
            'csp': csp,
            'especie': especie,
            'variedad': variedad,
            'fecha': fecha,
            'acumulado_cajas': int(data.get('cajasEscaneadas', 0)),
            'cajas_declaradas': int(data.get('cajasDeclaradas', 0)),
            'estado': data.get('estado', '-'),
        })

    # Ordenar por CSG para consistencia
    reporte.sort(key=lambda r: r['csg'])
    return reporte
