from __future__ import annotations

from typing import Any

import pandas as pd
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .analytics import CsvValidationError, parse_and_analyze_csv
from .models import Dataset
from .pdf import build_dataset_report_pdf
from .serializers import DatasetSerializer, DatasetUploadSerializer


class HealthView(APIView):
	permission_classes = [AllowAny]

	def get(self, request):
		return Response({'status': 'ok'})


class DatasetListCreateView(APIView):
	def get(self, request):
		datasets = Dataset.objects.all()[:5]
		return Response(DatasetSerializer(datasets, many=True).data)

	def post(self, request):
		upload = DatasetUploadSerializer(data=request.data)
		upload.is_valid(raise_exception=True)
		file_obj = upload.validated_data['file']

		dataset = Dataset.objects.create(
			original_filename=getattr(file_obj, 'name', 'upload.csv'),
			csv_file=file_obj,
		)

		try:
			parsed = parse_and_analyze_csv(dataset.csv_file.path)
		except CsvValidationError as exc:
			dataset.delete()
			return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

		dataset.row_count = int(len(parsed.df))
		dataset.summary = parsed.summary
		dataset.save(update_fields=['row_count', 'summary'])

		# Keep only the most recent 5 datasets.
		old_ids = list(Dataset.objects.order_by('-uploaded_at').values_list('id', flat=True)[5:])
		if old_ids:
			Dataset.objects.filter(id__in=old_ids).delete()

		return Response(DatasetSerializer(dataset).data, status=status.HTTP_201_CREATED)


class DatasetDetailView(APIView):
	def get(self, request, dataset_id: int):
		dataset = get_object_or_404(Dataset, id=dataset_id)
		return Response(DatasetSerializer(dataset).data)


class DatasetDataView(APIView):
	def get(self, request, dataset_id: int):
		dataset = get_object_or_404(Dataset, id=dataset_id)

		try:
			parsed = parse_and_analyze_csv(dataset.csv_file.path)
		except CsvValidationError as exc:
			return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

		limit = int(request.query_params.get('limit', 200))
		offset = int(request.query_params.get('offset', 0))
		limit = max(1, min(limit, 2000))
		offset = max(0, offset)

		df = parsed.df
		total_rows = int(len(df))
		window = df.iloc[offset: offset + limit]
		window = window.where(pd.notnull(window), None)

		rows: list[dict[str, Any]] = window.to_dict(orient='records')
		return Response({
			'dataset_id': dataset.id,
			'columns': list(df.columns),
			'total_rows': total_rows,
			'offset': offset,
			'limit': limit,
			'rows': rows,
		})


class DatasetReportView(APIView):
	def get(self, request, dataset_id: int):
		dataset = get_object_or_404(Dataset, id=dataset_id)
		pdf_bytes = build_dataset_report_pdf(
			title=f"Equipment Dataset Report (#{dataset.id})",
			summary=dataset.summary or {},
		)

		from io import BytesIO
		buffer = BytesIO(pdf_bytes)
		return FileResponse(
			buffer,
			as_attachment=True,
			filename=f"dataset_{dataset.id}_report.pdf",
			content_type='application/pdf',
		)
