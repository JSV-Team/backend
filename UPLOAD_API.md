# 🖼️ Image Upload API Documentation

## Supported Formats & Limits

### ✅ Allowed Image Types
- **JPEG/JPG** (.jpg, .jpeg)
- **PNG** (.png) 
- **GIF** (.gif)
- **WebP** (.webp)

### 📏 File Limits
- **Max Size**: 2MB per image
- **Max Files**: 5 images per post
- **Max Field Size**: 1MB
- **Max Fields**: 10

## API Endpoints

### 1. Upload Avatar
```http
POST /api/upload/avatar
Content-Type: multipart/form-data
Authorization: Bearer <token>

Form Data:
- avatar: <image_file>
```

**Response:**
```json
{
  "success": true,
  "message": "Upload ảnh đại diện thành công",
  "data": {
    "filename": "img-1709558400000-abc12345.jpg",
    "originalName": "my-avatar.jpg",
    "size": 1048576,
    "sizeKB": 1024,
    "type": "jpg",
    "url": "/uploads/img-1709558400000-abc12345.jpg",
    "fullUrl": "https://backend-1wyh.onrender.com/uploads/img-1709558400000-abc12345.jpg",
    "uploadedAt": "2024-03-24T10:30:00.000Z"
  }
}
```

### 2. Upload Post Media (Multiple Images)
```http
POST /api/upload/post-media
Content-Type: multipart/form-data
Authorization: Bearer <token>

Form Data:
- media: <image_file_1>
- media: <image_file_2>
- media: <image_file_3>
```

**Response:**
```json
{
  "success": true,
  "message": "Upload thành công 3 ảnh",
  "data": {
    "files": [
      {
        "filename": "img-1709558400000-abc12345.jpg",
        "originalName": "photo1.jpg",
        "size": 1048576,
        "sizeKB": 1024,
        "type": "jpg",
        "url": "/uploads/img-1709558400000-abc12345.jpg",
        "uploadedAt": "2024-03-24T10:30:00.000Z"
      }
    ],
    "count": 3
  }
}
```

### 3. Upload Single Image
```http
POST /api/upload/image
Content-Type: multipart/form-data
Authorization: Bearer <token>

Form Data:
- image: <image_file>
```

### 4. Get File Info
```http
GET /api/upload/info/:filename
Authorization: Bearer <token>
```

## Error Responses

### File Too Large
```json
{
  "success": false,
  "message": "File quá lớn. Kích thước tối đa là 2MB"
}
```

### Invalid File Type
```json
{
  "success": false,
  "message": "Định dạng file không được hỗ trợ. Chỉ chấp nhận: .jpg, .jpeg, .png, .gif, .webp"
}
```

### File Content Mismatch
```json
{
  "success": false,
  "message": "File không phải là ảnh hợp lệ hoặc đã bị chỉnh sửa"
}
```

### Too Many Files
```json
{
  "success": false,
  "message": "Chỉ được upload 1 file mỗi lần"
}
```

## Security Features

### ✅ Implemented
- **File Type Validation**: MIME type + extension + magic bytes
- **Size Limits**: 2MB max per file
- **Content Validation**: Real file signature checking
- **Secure Filenames**: Timestamp + random suffix
- **Authentication**: JWT required for all uploads
- **Error Handling**: Automatic cleanup of invalid files

### 🔒 File Validation Process
1. **MIME Type Check**: Validates `Content-Type` header
2. **Extension Check**: Validates file extension
3. **Magic Bytes Check**: Reads actual file signature
4. **Size Validation**: Ensures file within limits
5. **Content Integrity**: Verifies MIME matches actual content

## Frontend Usage Example

```javascript
// Single image upload
const uploadImage = async (file) => {
  const formData = new FormData();
  formData.append('image', file);
  
  const response = await fetch('/api/upload/image', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });
  
  return await response.json();
};

// Multiple images upload
const uploadPostMedia = async (files) => {
  const formData = new FormData();
  files.forEach(file => {
    formData.append('media', file);
  });
  
  const response = await fetch('/api/upload/post-media', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });
  
  return await response.json();
};
```

## File Naming Convention
- **Pattern**: `img-{timestamp}-{random}.{ext}`
- **Example**: `img-1709558400000-abc12345.jpg`
- **Benefits**: 
  - Prevents filename conflicts
  - Chronological ordering
  - Secure random component