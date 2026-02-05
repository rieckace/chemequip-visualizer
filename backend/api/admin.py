from django.contrib import admin

from .models import Dataset


@admin.register(Dataset)
class DatasetAdmin(admin.ModelAdmin):
	list_display = ('id', 'original_filename', 'uploaded_at', 'row_count')
	list_filter = ('uploaded_at',)
	search_fields = ('original_filename',)
