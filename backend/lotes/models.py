"""
Modelos MongoDB via mongoengine para gestión de lotes SAG
"""
import mongoengine as me
from datetime import datetime


ESTADOS_LOTE = ('pendiente', 'en-revision', 'revisado', 'revisado-con-observaciones')


class LineasLote(me.EmbeddedDocument):
    """Línea individual dentro de un folio (un CSG con sus datos)"""
    csg = me.StringField()
    productor = me.StringField()
    cajasDeclaradas = me.IntField(default=0)
    especie = me.StringField()
    varComercial = me.StringField()
    fechaPack = me.StringField()
    sector = me.StringField()
    csp = me.StringField()
    varAgronomica = me.StringField()
    provinciaOrigen = me.StringField()
    comunaOrigen = me.StringField()
    provinciaPack = me.StringField()
    comunaPack = me.StringField()


class Lote(me.Document):
    """
    Documento principal de un lote (folio) en MongoDB.
    Cada folio del Excel se guarda como un documento separado.
    """
    folio_id = me.StringField(required=True, unique=True)
    nombre_archivo = me.StringField()

    # Datos parseados del Excel (estructura de lineas)
    total_declarado = me.IntField(default=0)
    lineas = me.EmbeddedDocumentListField(LineasLote)

    # Archivo Excel original almacenado en GridFS
    archivo = me.FileField(collection_name='lotes_archivos')

    # Estado del flujo de trabajo
    estado = me.StringField(
        choices=ESTADOS_LOTE,
        default='pendiente'
    )

    # Timestamps
    fecha_carga = me.DateTimeField(default=datetime.utcnow)
    fecha_revision = me.DateTimeField(null=True)

    # Resultado de la revisión (guardado al finalizar)
    revision_data = me.DictField(default=dict)

    meta = {
        'collection': 'lotes',
        'ordering': ['-fecha_carga'],
        'indexes': ['folio_id', 'estado'],
    }

    def tiene_observaciones(self):
        """Determina si la revisión tiene diferencias o asignaciones"""
        if not self.revision_data:
            return False
        resumen = self.revision_data.get('resumenCSG', {})
        return any(v.get('estado') != 'OK' for v in resumen.values())

    def to_list_dict(self):
        """Versión liviana para listado (sin lineas completas)"""
        return {
            'folio_id': self.folio_id,
            'nombre_archivo': self.nombre_archivo,
            'total_declarado': self.total_declarado,
            'num_lineas': len(self.lineas),
            'estado': self.estado,
            'fecha_carga': self.fecha_carga.isoformat() if self.fecha_carga else None,
            'fecha_revision': self.fecha_revision.isoformat() if self.fecha_revision else None,
        }

    def to_detail_dict(self):
        """Versión completa para detalle"""
        d = self.to_list_dict()
        d['lineas'] = [
            {
                'csg': l.csg,
                'productor': l.productor,
                'cajasDeclaradas': l.cajasDeclaradas,
                'especie': l.especie,
                'varComercial': l.varComercial,
                'fechaPack': l.fechaPack,
                'sector': l.sector,
                'csp': l.csp,
            }
            for l in self.lineas
        ]
        d['revision_data'] = self.revision_data
        return d
