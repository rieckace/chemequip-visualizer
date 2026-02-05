from rest_framework import serializers

from .models import Dataset


class DatasetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Dataset
        fields = ['id', 'uploaded_at', 'original_filename', 'row_count', 'summary']


class DatasetUploadSerializer(serializers.Serializer):
    file = serializers.FileField()
