from django.db import models


class Dataset(models.Model):
	uploaded_at = models.DateTimeField(auto_now_add=True)
	original_filename = models.CharField(max_length=255)
	csv_file = models.FileField(upload_to='datasets/')

	row_count = models.PositiveIntegerField(default=0)
	summary = models.JSONField(default=dict)

	class Meta:
		ordering = ['-uploaded_at']

	def __str__(self) -> str:
		return f"Dataset {self.id} ({self.original_filename})"

	def delete(self, using=None, keep_parents=False):
		storage = self.csv_file.storage
		name = self.csv_file.name
		super().delete(using=using, keep_parents=keep_parents)
		if name:
			storage.delete(name)
