from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APITestCase


SAMPLE_CSV = (
	"Equipment Name,Type,Flowrate,Pressure,Temperature\n"
	"Pump A,Pump,120.5,2.3,65.0\n"
	"Reactor R1,Reactor,45.2,5.8,180.0\n"
)


class ApiSmokeTests(APITestCase):
	def setUp(self):
		User = get_user_model()
		self.user = User.objects.create_user(username='tester', password='tester12345')
		self.other = User.objects.create_user(username='other', password='other12345')

	def test_health_no_auth(self):
		res = self.client.get('/api/health/')
		self.assertEqual(res.status_code, status.HTTP_200_OK)
		self.assertEqual(res.data.get('status'), 'ok')

	def test_datasets_requires_auth(self):
		res = self.client.get('/api/datasets/')
		self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

	def test_upload_flow_data_and_pdf(self):
		self.client.force_authenticate(user=self.user)

		upload = SimpleUploadedFile(
			'sample.csv',
			SAMPLE_CSV.encode('utf-8'),
			content_type='text/csv',
		)

		res = self.client.post('/api/datasets/', data={'file': upload}, format='multipart')
		self.assertEqual(res.status_code, status.HTTP_201_CREATED)
		dataset_id = res.data['id']
		self.assertEqual(res.data['row_count'], 2)

		res = self.client.get('/api/datasets/')
		self.assertEqual(res.status_code, status.HTTP_200_OK)
		self.assertTrue(len(res.data) >= 1)

		res = self.client.get(f'/api/datasets/{dataset_id}/data/?limit=10&offset=0')
		self.assertEqual(res.status_code, status.HTTP_200_OK)
		self.assertIn('rows', res.data)
		self.assertEqual(len(res.data['rows']), 2)

		res = self.client.get(f'/api/datasets/{dataset_id}/report/')
		self.assertEqual(res.status_code, status.HTTP_200_OK)
		content = b''.join(res.streaming_content)
		self.assertTrue(content.startswith(b'%PDF'))

		res = self.client.get(f'/api/datasets/{dataset_id}/csv/')
		self.assertEqual(res.status_code, status.HTTP_200_OK)
		csv_bytes = b''.join(res.streaming_content)
		self.assertIn(b'Equipment Name,Type,Flowrate,Pressure,Temperature', csv_bytes)

	def test_datasets_are_isolated_per_user_and_deletable(self):
		upload = SimpleUploadedFile(
			'sample.csv',
			SAMPLE_CSV.encode('utf-8'),
			content_type='text/csv',
		)

		self.client.force_authenticate(user=self.user)
		res = self.client.post('/api/datasets/', data={'file': upload}, format='multipart')
		self.assertEqual(res.status_code, status.HTTP_201_CREATED)
		my_id = res.data['id']

		self.client.force_authenticate(user=self.other)
		res = self.client.get('/api/datasets/')
		self.assertEqual(res.status_code, status.HTTP_200_OK)
		self.assertEqual(len(res.data), 0)

		res = self.client.get(f'/api/datasets/{my_id}/')
		self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

		self.client.force_authenticate(user=self.user)
		res = self.client.delete(f'/api/datasets/{my_id}/')
		self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)

		res = self.client.get('/api/datasets/')
		self.assertEqual(res.status_code, status.HTTP_200_OK)
		self.assertEqual(len(res.data), 0)
