"""
Views REST para gestión de lotes SAG
Endpoints:
    GET  /api/lotes/                       → lista todos los lotes
    POST /api/lotes/                       → crear lote (multipart: archivo + datos JSON)
    GET  /api/lotes/{folio_id}/            → detalle completo
    PATCH /api/lotes/{folio_id}/estado/    → actualizar estado
    POST /api/lotes/{folio_id}/revision/   → guardar resultado de revisión
    GET  /api/lotes/{folio_id}/archivo/    → descargar Excel original
    DELETE /api/lotes/{folio_id}/          → eliminar lote
"""
import json
import logging
from datetime import datetime

from django.http import StreamingHttpResponse, HttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from mongoengine.errors import DoesNotExist, NotUniqueError

from .models import Lote, LineasLote, ESTADOS_LOTE

logger = logging.getLogger(__name__)


class LoteListView(APIView):
    """
    GET  /api/lotes/  → Lista todos los lotes (versión liviana)
    POST /api/lotes/  → Crear nuevo lote desde Excel parseado
    """

    def get(self, request):
        try:
            lotes = Lote.objects.all().order_by('-fecha_carga')
            data = [l.to_list_dict() for l in lotes]
            return Response(data)
        except Exception as e:
            logger.exception('Error listando lotes')
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def post(self, request):
        """
        Body multipart/form-data:
          - archivo: File (.xlsx)
          - datos: JSON string con estructura { folio_id, total_declarado, lineas: [...] }
        """
        try:
            # Extraer datos JSON
            datos_raw = request.data.get('datos')
            if not datos_raw:
                return Response({'error': 'Campo "datos" requerido'}, status=status.HTTP_400_BAD_REQUEST)

            datos = json.loads(datos_raw) if isinstance(datos_raw, str) else datos_raw
            folio_id = datos.get('folio_id') or datos.get('folio')
            if not folio_id:
                return Response({'error': 'folio_id requerido en datos'}, status=status.HTTP_400_BAD_REQUEST)

            # Verificar si ya existe
            if Lote.objects(folio_id=str(folio_id)).first():
                return Response(
                    {'error': f'El folio {folio_id} ya existe en el sistema'},
                    status=status.HTTP_409_CONFLICT
                )

            # Construir lineas embebidas
            lineas_docs = []
            for l in datos.get('lineas', []):
                lineas_docs.append(LineasLote(
                    csg=str(l.get('csg', '')),
                    productor=l.get('productor', ''),
                    cajasDeclaradas=int(l.get('cajasDeclaradas', 0)),
                    especie=l.get('especie', ''),
                    varComercial=l.get('varComercial', ''),
                    fechaPack=l.get('fechaPack', ''),
                    sector=l.get('sector', ''),
                    csp=str(l.get('csp', '')),
                    varAgronomica=l.get('varAgronomica', ''),
                ))

            lote = Lote(
                folio_id=str(folio_id),
                nombre_archivo=datos.get('nombre_archivo', ''),
                total_declarado=int(datos.get('totalDeclarado', 0)),
                lineas=lineas_docs,
                estado='pendiente',
            )

            # Guardar archivo Excel si viene adjunto
            archivo = request.FILES.get('archivo')
            if archivo:
                lote.nombre_archivo = archivo.name
                lote.archivo.put(
                    archivo.read(),
                    content_type=archivo.content_type or 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    filename=archivo.name,
                )

            lote.save()
            return Response(lote.to_detail_dict(), status=status.HTTP_201_CREATED)

        except NotUniqueError:
            return Response({'error': 'Folio duplicado'}, status=status.HTTP_409_CONFLICT)
        except json.JSONDecodeError:
            return Response({'error': 'JSON inválido en campo "datos"'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.exception('Error creando lote')
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class LoteDetailView(APIView):
    """
    GET    /api/lotes/{folio_id}/  → Detalle completo del lote
    DELETE /api/lotes/{folio_id}/  → Eliminar lote
    """

    def _get_lote(self, folio_id):
        return Lote.objects.get(folio_id=folio_id)

    def get(self, request, folio_id):
        try:
            lote = self._get_lote(folio_id)
            return Response(lote.to_detail_dict())
        except DoesNotExist:
            return Response({'error': 'Folio no encontrado'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.exception('Error obteniendo lote')
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def delete(self, request, folio_id):
        try:
            lote = self._get_lote(folio_id)
            # Eliminar archivo de GridFS si existe
            if lote.archivo:
                lote.archivo.delete()
            lote.delete()
            return Response({'mensaje': f'Folio {folio_id} eliminado'}, status=status.HTTP_200_OK)
        except DoesNotExist:
            return Response({'error': 'Folio no encontrado'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.exception('Error eliminando lote')
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class LoteEstadoView(APIView):
    """
    PATCH /api/lotes/{folio_id}/estado/  → Actualizar estado del lote
    Body: { "estado": "en-revision" }
    """

    def patch(self, request, folio_id):
        try:
            nuevo_estado = request.data.get('estado')
            if nuevo_estado not in ESTADOS_LOTE:
                return Response(
                    {'error': f'Estado inválido. Opciones: {", ".join(ESTADOS_LOTE)}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            lote = Lote.objects.get(folio_id=folio_id)
            lote.estado = nuevo_estado
            if nuevo_estado in ('revisado', 'revisado-con-observaciones'):
                lote.fecha_revision = datetime.utcnow()
            lote.save()

            return Response({
                'folio_id': folio_id,
                'estado': lote.estado,
                'fecha_revision': lote.fecha_revision.isoformat() if lote.fecha_revision else None,
            })
        except DoesNotExist:
            return Response({'error': 'Folio no encontrado'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.exception('Error actualizando estado')
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class LoteRevisionView(APIView):
    """
    POST /api/lotes/{folio_id}/revision/  → Guardar resultado de revisión completa
    Body: {
        cajasEscaneadas: {...},
        cajasAsignadas: {...},
        resumenCSG: {...},
        estadisticas: {...}
    }
    """

    def post(self, request, folio_id):
        try:
            lote = Lote.objects.get(folio_id=folio_id)

            revision_data = {
                'cajasEscaneadas': request.data.get('cajasEscaneadas', {}),
                'cajasAsignadas': request.data.get('cajasAsignadas', {}),
                'resumenCSG': request.data.get('resumenCSG', {}),
                'estadisticas': request.data.get('estadisticas', {}),
                'fechaRevision': datetime.utcnow().isoformat(),
            }

            lote.revision_data = revision_data
            lote.fecha_revision = datetime.utcnow()

            # Determinar estado final automáticamente
            resumen = revision_data.get('resumenCSG', {})
            hay_diferencias = any(v.get('estado') != 'OK' for v in resumen.values())
            hay_asignaciones = bool(revision_data.get('cajasAsignadas'))

            if hay_diferencias or hay_asignaciones:
                lote.estado = 'revisado-con-observaciones'
            else:
                lote.estado = 'revisado'

            lote.save()

            return Response({
                'folio_id': folio_id,
                'estado': lote.estado,
                'mensaje': 'Revisión guardada correctamente',
            })
        except DoesNotExist:
            return Response({'error': 'Folio no encontrado'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.exception('Error guardando revisión')
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class LoteArchivoView(APIView):
    """
    GET /api/lotes/{folio_id}/archivo/  → Descargar Excel original
    """

    def get(self, request, folio_id):
        try:
            lote = Lote.objects.get(folio_id=folio_id)

            if not lote.archivo or not lote.archivo.grid_id:
                return Response({'error': 'Archivo no disponible para este folio'}, status=status.HTTP_404_NOT_FOUND)

            nombre = lote.nombre_archivo or f'{folio_id}.xlsx'
            contenido = lote.archivo.read()

            response = HttpResponse(
                contenido,
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            response['Content-Disposition'] = f'attachment; filename="{nombre}"'
            response['Content-Length'] = len(contenido)
            return response

        except DoesNotExist:
            return Response({'error': 'Folio no encontrado'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.exception('Error descargando archivo')
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
