# Image Upload Testing Guide

## Endpoint
```
POST /api/admin/products/{productId}/upload-images
```

## Request Format (Correct Way)
**Use FormData with actual File object**, NOT base64 JSON:

```bash
curl -X POST http://localhost:5000/api/admin/products/b8d37835-405e-4d64-9ea4-367acc716f3d/upload-images \
  -F "image=@/path/to/image.jpg" \
  -F "imageIndex=0"
```

## Response Example
```json
{
  "success": true,
  "message": "Image 1 uploaded successfully",
  "imagePath": "products/a1b2c3d4e5f6g7h8.jpg",
  "imageUrl": "http://localhost:5000/products/a1b2c3d4e5f6g7h8.jpg",
  "image_url1": "http://localhost:5000/products/a1b2c3d4e5f6g7h8.jpg",
  "product": { ... }
}
```

## Storage Location
Files are stored at: `public/products/{unique_filename}`

## File Access
- **Direct URL**: `http://localhost:5000/products/{unique_filename}`
- **Database stores**: `products/{unique_filename}` (relative path)

## Troubleshooting

### Getting 404 error?
1. ✅ Make sure you're using FormData with an actual File object
2. ✅ Check Content-Type is NOT set (browser sets it automatically)
3. ✅ Verify the product ID exists
4. ✅ Check `/public/products/` folder has write permissions

### Files not showing after upload?
1. Restart the backend server (changes to static file serving require restart)
2. Clear browser cache
3. Check database for the image path: `SELECT * FROM bouquetbar.products WHERE id='...' LIMIT 1;`

### Common Mistakes:
❌ Sending base64 data in JSON:
```json
{
  "image": "data:image/jpeg;base64,/9j/4AAQSkZJ..."
}
```

✅ Correct: Use FormData with File object (frontend handles this automatically)

## Frontend Implementation (Already Fixed)
The Admin.tsx frontend already handles this correctly via the `uploadImagesOneByOne` function which:
- Creates FormData with actual File objects
- Sends multipart/form-data request
- Handles response and shows image URLs
