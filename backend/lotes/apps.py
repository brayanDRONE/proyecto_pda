from django.apps import AppConfig
import logging

logger = logging.getLogger(__name__)


class LotesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'lotes'

    def ready(self):
        from django.conf import settings
        import mongoengine as me
        try:
            me.connect(host=settings.MONGODB_URI)
            logger.info('MongoDB conectado correctamente')
        except Exception as e:
            logger.error(f'Error conectando MongoDB: {e}')
