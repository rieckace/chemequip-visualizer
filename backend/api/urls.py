from django.urls import path

from .views import (
    DatasetDataView,
    DatasetCsvDownloadView,
    DatasetDetailView,
    DatasetListCreateView,
    DatasetReportView,
    HealthView,
    RegisterView,
)

urlpatterns = [
    path('health/', HealthView.as_view(), name='health'),

	path('auth/register/', RegisterView.as_view(), name='auth-register'),

    path('datasets/', DatasetListCreateView.as_view(), name='dataset-list-create'),
    path('datasets/<int:dataset_id>/', DatasetDetailView.as_view(), name='dataset-detail'),
    path('datasets/<int:dataset_id>/data/', DatasetDataView.as_view(), name='dataset-data'),
    path('datasets/<int:dataset_id>/csv/', DatasetCsvDownloadView.as_view(), name='dataset-csv'),
    path('datasets/<int:dataset_id>/report/', DatasetReportView.as_view(), name='dataset-report'),
]
