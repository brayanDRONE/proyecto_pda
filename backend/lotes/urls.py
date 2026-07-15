from django.urls import path
from . import views

urlpatterns = [
    path('lotes/', views.LoteListView.as_view(), name='lote-list'),
    path('lotes/<str:folio_id>/', views.LoteDetailView.as_view(), name='lote-detail'),
    path('lotes/<str:folio_id>/estado/', views.LoteEstadoView.as_view(), name='lote-estado'),
    path('lotes/<str:folio_id>/revision/', views.LoteRevisionView.as_view(), name='lote-revision'),
    path('lotes/<str:folio_id>/archivo/', views.LoteArchivoView.as_view(), name='lote-archivo'),
]
