# API Update: Thêm Tọa Độ Địa Lý

## Tổng Quan
Để hỗ trợ matching dựa trên khoảng cách thực tế, cần cập nhật API để nhận và lưu tọa độ GPS từ frontend.

## 1. Update Profile API

### Endpoint: `PUT /api/users/profile`

#### Request Body (Thêm 2 trường mới):
```json
{
  "full_name": "Nguyễn Văn A",
  "bio": "Yêu thích đọc sách",
  "location": "Hà Nội",
  "latitude": 21.0285,    // ← MỚI
  "longitude": 105.8542,  // ← MỚI
  "avatar_url": "https://...",
  "dob": "1995-03-22",
  "gender": "male"
}
```

#### Validation:
```javascript
// Trong controller hoặc middleware
const validateCoordinates = (req, res, next) => {
  const { latitude, longitude } = req.body;
  
  // Cho phép null (user không muốn chia sẻ vị trí)
  if (latitude === null || latitude === undefined) {
    return next();
  }
  
  // Validate range
  if (latitude < -90 || latitude > 90) {
    return res.status(400).json({
      error: 'Invalid latitude. Must be between -90 and 90'
    });
  }
  
  if (longitude < -180 || longitude > 180) {
    return res.status(400).json({
      error: 'Invalid longitude. Must be between -180 and 180'
    });
  }
  
  next();
};
```

#### Controller Update:
```javascript
// backend/src/controllers/userController.js

async updateProfile(req, res) {
  try {
    const userId = req.user.userId;
    const {
      full_name,
      bio,
      location,
      latitude,    // ← MỚI
      longitude,   // ← MỚI
      avatar_url,
      dob,
      gender
    } = req.body;
    
    const query = `
      UPDATE users 
      SET 
        full_name = COALESCE($1, full_name),
        bio = COALESCE($2, bio),
        location = COALESCE($3, location),
        latitude = COALESCE($4, latitude),      -- ← MỚI
        longitude = COALESCE($5, longitude),    -- ← MỚI
        avatar_url = COALESCE($6, avatar_url),
        dob = COALESCE($7, dob),
        gender = COALESCE($8, gender)
      WHERE user_id = $9
      RETURNING user_id, username, full_name, bio, location, 
                latitude, longitude, avatar_url, dob, gender
    `;
    
    const result = await pool.query(query, [
      full_name,
      bio,
      location,
      latitude,    // ← MỚI
      longitude,   // ← MỚI
      avatar_url,
      dob,
      gender,
      userId
    ]);
    
    res.json({
      success: true,
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
}
```

## 2. Get Profile API

### Endpoint: `GET /api/users/profile`

#### Response (Thêm 2 trường mới):
```json
{
  "success": true,
  "user": {
    "user_id": 2,
    "username": "nguyen_minh",
    "full_name": "Nguyễn Văn Minh",
    "email": "minh.nguyen@gmail.com",
    "bio": "Thích đọc sách và leo núi",
    "location": "Hà Nội",
    "latitude": 21.0285,    // ← MỚI
    "longitude": 105.8542,  // ← MỚI
    "avatar_url": "https://...",
    "dob": "1995-03-22",
    "gender": "male",
    "reputation_score": 320,
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

#### Controller Update:
```javascript
async getProfile(req, res) {
  try {
    const userId = req.user.userId;
    
    const query = `
      SELECT 
        user_id, username, full_name, email, bio, location,
        latitude, longitude,  -- ← MỚI
        avatar_url, dob, gender, reputation_score, created_at
      FROM users 
      WHERE user_id = $1
    `;
    
    const result = await pool.query(query, [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      success: true,
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
}
```

## 3. Match Result API

### Endpoint: `GET /api/match/result/:matchId`

#### Response (Thêm distance):
```json
{
  "success": true,
  "match": {
    "match_id": 123,
    "partner": {
      "user_id": 5,
      "username": "pham_thu_ha",
      "full_name": "Phạm Thu Hà",
      "avatar_url": "https://...",
      "bio": "Đầu bếp nghiệp dư",
      "location": "Hải Phòng"
    },
    "match_score": {
      "total_score": 85.5,
      "interest_score": 60.5,
      "numerology_score": 25,
      "distance": 102.5,  // ← MỚI (km)
      "common_interests": [
        { "interest_id": 7, "name": "Nấu ăn" },
        { "interest_id": 19, "name": "Làm bánh" }
      ]
    },
    "created_at": "2024-03-27T10:30:00Z"
  }
}
```

## 4. Frontend Integration

### A. Lấy Tọa Độ GPS

```javascript
// frontend/src/utils/geolocation.js

export const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  });
};
```

### B. Update Profile với Tọa Độ

```javascript
// frontend/src/pages/EditProfile/ProfileEdit.jsx

import { getCurrentLocation } from '../../utils/geolocation';

const ProfileEdit = () => {
  const [profile, setProfile] = useState({
    full_name: '',
    bio: '',
    location: '',
    latitude: null,
    longitude: null,
    // ... other fields
  });
  
  const [locationPermission, setLocationPermission] = useState('prompt');
  
  // Xin quyền truy cập vị trí
  const requestLocationPermission = async () => {
    try {
      const coords = await getCurrentLocation();
      
      setProfile(prev => ({
        ...prev,
        latitude: coords.latitude,
        longitude: coords.longitude
      }));
      
      setLocationPermission('granted');
      
      toast.success('Đã cập nhật vị trí của bạn');
    } catch (error) {
      console.error('Location error:', error);
      setLocationPermission('denied');
      
      if (error.code === 1) {
        toast.error('Bạn đã từ chối quyền truy cập vị trí');
      } else {
        toast.error('Không thể lấy vị trí của bạn');
      }
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profile)
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Cập nhật thành công!');
      }
    } catch (error) {
      toast.error('Cập nhật thất bại');
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* ... other fields ... */}
      
      <div className="location-section">
        <label>Vị trí</label>
        <input
          type="text"
          value={profile.location}
          onChange={(e) => setProfile({ ...profile, location: e.target.value })}
          placeholder="VD: Hà Nội"
        />
        
        <button
          type="button"
          onClick={requestLocationPermission}
          className="btn-location"
        >
          📍 Sử dụng vị trí hiện tại
        </button>
        
        {profile.latitude && profile.longitude && (
          <div className="location-info">
            ✅ Vị trí đã được cập nhật
            <small>
              ({profile.latitude.toFixed(4)}, {profile.longitude.toFixed(4)})
            </small>
          </div>
        )}
      </div>
      
      <button type="submit">Lưu thay đổi</button>
    </form>
  );
};
```

### C. Hiển thị Khoảng Cách trong Match Result

```javascript
// frontend/src/pages/Match/MatchFoundState.jsx

const MatchFoundState = ({ matchData }) => {
  const formatDistance = (km) => {
    if (km === null || km === undefined) {
      return 'Không xác định';
    }
    
    if (km < 1) {
      return `${Math.round(km * 1000)}m`;
    }
    
    return `${km.toFixed(1)}km`;
  };
  
  return (
    <div className="match-found">
      <h2>Đã tìm thấy người phù hợp!</h2>
      
      <div className="partner-info">
        <img src={matchData.partner.avatar_url} alt={matchData.partner.full_name} />
        <h3>{matchData.partner.full_name}</h3>
        <p>{matchData.partner.bio}</p>
        <p>📍 {matchData.partner.location}</p>
      </div>
      
      <div className="match-score">
        <div className="score-item">
          <span className="label">Độ phù hợp</span>
          <span className="value">{matchData.match_score.total_score}%</span>
        </div>
        
        <div className="score-item">
          <span className="label">Khoảng cách</span>
          <span className="value">
            {formatDistance(matchData.match_score.distance)}
          </span>
        </div>
        
        <div className="score-item">
          <span className="label">Sở thích chung</span>
          <span className="value">
            {matchData.match_score.common_interests.length}
          </span>
        </div>
      </div>
      
      <div className="common-interests">
        <h4>Sở thích chung:</h4>
        <div className="interest-chips">
          {matchData.match_score.common_interests.map(interest => (
            <span key={interest.interest_id} className="chip">
              {interest.name}
            </span>
          ))}
        </div>
      </div>
      
      <button onClick={handleAccept}>Chấp nhận</button>
      <button onClick={handleReject}>Từ chối</button>
    </div>
  );
};
```

## 5. Privacy & UX Considerations

### A. Xin Phép User
```javascript
// Hiển thị modal giải thích trước khi xin quyền
const LocationPermissionModal = ({ onAccept, onDecline }) => {
  return (
    <div className="modal">
      <h3>Cho phép truy cập vị trí?</h3>
      <p>
        Chúng tôi sử dụng vị trí của bạn để tìm những người phù hợp gần bạn hơn.
        Vị trí của bạn sẽ không được hiển thị công khai.
      </p>
      <button onClick={onAccept}>Cho phép</button>
      <button onClick={onDecline}>Không, cảm ơn</button>
    </div>
  );
};
```

### B. Cho Phép Tắt Location
```javascript
const LocationSettings = () => {
  const [shareLocation, setShareLocation] = useState(true);
  
  const handleToggle = async () => {
    if (!shareLocation) {
      // Bật lại location
      const coords = await getCurrentLocation();
      await updateProfile({ latitude: coords.latitude, longitude: coords.longitude });
    } else {
      // Tắt location (set null)
      await updateProfile({ latitude: null, longitude: null });
    }
    
    setShareLocation(!shareLocation);
  };
  
  return (
    <div className="setting-item">
      <label>Chia sẻ vị trí để tìm người gần hơn</label>
      <input
        type="checkbox"
        checked={shareLocation}
        onChange={handleToggle}
      />
    </div>
  );
};
```

## 6. Testing Checklist

- [ ] Test update profile với latitude/longitude hợp lệ
- [ ] Test update profile với latitude/longitude null
- [ ] Test update profile với latitude/longitude không hợp lệ (ngoài range)
- [ ] Test get profile trả về latitude/longitude
- [ ] Test matching với 2 user có tọa độ
- [ ] Test matching với 1 user không có tọa độ
- [ ] Test matching với 2 user không có tọa độ
- [ ] Test frontend lấy GPS thành công
- [ ] Test frontend lấy GPS bị từ chối
- [ ] Test hiển thị khoảng cách trong match result

## 7. Database Migration

Nhớ chạy migration trước khi deploy:
```bash
psql -U postgres -d SoThichDB -f backend/migrations/add_coordinates_to_users.sql
```
