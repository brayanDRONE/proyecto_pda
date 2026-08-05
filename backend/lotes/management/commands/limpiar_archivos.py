from django.core.management.base import BaseCommand
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = (
        'Elimina lotes no revisados con más de 24 h desde su carga '
        'y libera los archivos GridFS de lotes ya revisados.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--horas',
            type=int,
            default=24,
            help='Horas máximas de retención para lotes no revisados (default: 24)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Mostrar qué se eliminaría sin ejecutar la eliminación',
        )

    def handle(self, *args, **options):
        # Import aquí para evitar problemas de inicialización
        from lotes.models import Lote

        horas = options['horas']
        dry_run = options['dry_run']
        limite = datetime.utcnow() - timedelta(hours=horas)

        # ── 1. Eliminar lotes no revisados con más de N horas ──────────────
        lotes_viejos = Lote.objects(
            fecha_carga__lt=limite,
            estado__nin=['revisado', 'revisado-con-observaciones'],
        )
        eliminados = 0
        for lote in lotes_viejos:
            if dry_run:
                self.stdout.write(
                    f'[DRY-RUN] Eliminaría lote {lote.folio_id} '
                    f'(cargado: {lote.fecha_carga}, estado: {lote.estado})'
                )
            else:
                try:
                    if lote.archivo and lote.archivo.grid_id:
                        lote.archivo.delete()
                    lote.delete()
                    eliminados += 1
                    logger.info('Lote eliminado por TTL: %s', lote.folio_id)
                except Exception as exc:
                    logger.error('Error eliminando lote %s: %s', lote.folio_id, exc)

        # ── 2. Liberar archivos de lotes ya revisados (GridFS) ────────────
        lotes_revisados = Lote.objects(
            estado__in=['revisado', 'revisado-con-observaciones'],
        )
        archivos_liberados = 0
        for lote in lotes_revisados:
            if lote.archivo and lote.archivo.grid_id:
                if dry_run:
                    self.stdout.write(
                        f'[DRY-RUN] Liberaría archivo de lote revisado {lote.folio_id}'
                    )
                else:
                    try:
                        lote.archivo.delete()
                        lote.save()
                        archivos_liberados += 1
                        logger.info('Archivo liberado (revisado): %s', lote.folio_id)
                    except Exception as exc:
                        logger.error('Error liberando archivo %s: %s', lote.folio_id, exc)

        if not dry_run:
            self.stdout.write(
                self.style.SUCCESS(
                    f'Limpieza completada: {eliminados} lotes eliminados, '
                    f'{archivos_liberados} archivos liberados.'
                )
            )
