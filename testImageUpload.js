const fs = require('fs');
const path = require('path');

// Test flow: Upload ảnh + Tạo activity + Lấy activities kiểm tra ảnh

const testFlow = async () => {
  console.log('=== TEST IMAGE UPLOAD FLOW ===\n');

  // 1. Upload ảnh
  console.log('1️⃣  Uploading image...');
  const formData = new FormData();
  // Tạo file giả cho test
  const buffer = Buffer.from('fake image data');
  const blob = new (require('stream').Readable)();
  blob.push(buffer);
  blob.push(null);
  
  // Chúng ta sẽ dùng curl thay vì giả test
  console.log('   (Skipping actual upload, assuming image URL: /uploads/test-image.jpg)\n');

  // 2. Tạo activity kèm image URL
  console.log('2️⃣  Creating activity with image...');
  try {
    const response = await fetch('http://localhost:3001/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 2,
        title: 'Test Activity with Image',
        content: 'This is a test activity',
        imageUrl: '/uploads/test-image.jpg',
        location: 'Test Location',
        maxParticipants: 10,
        duration: 60
      })
    });

    const data = await response.json();
    console.log('   Response:', data);
    
    if (!response.ok) {
      console.error('   ❌ Failed to create activity');
      process.exit(1);
    }

    const activityId = data.activity_id;
    console.log(`   ✅ Activity created with ID: ${activityId}\n`);

    // 3. Lấy list activities và kiểm tra ảnh
    console.log('3️⃣  Fetching activities...');
    const listResponse = await fetch('http://localhost:3001/api/activities');
    const activities = await listResponse.json();
    
    // Tìm activity vừa tạo
    const testActivity = activities.find(a => a.status_id === activityId);
    
    if (testActivity) {
      console.log('   ✅ Activity found in list');
      console.log(`   Title: ${testActivity.content}`);
      console.log(`   Image URL: ${testActivity.image_url}`);
      
      if (testActivity.image_url) {
        console.log('   ✅ IMAGE URL EXISTS - Test PASSED!');
      } else {
        console.log('   ❌ IMAGE URL IS EMPTY - Test FAILED!');
      }
    } else {
      console.log('   ❌ Activity not found in list');
    }

    console.log('\n4️⃣  First 3 activities:');
    activities.slice(0, 3).forEach((a, i) => {
      console.log(`   ${i + 1}. ${a.content} - Image: ${a.image_url || '(empty)'}`);
    });

  } catch (error) {
    console.error('Error during test:', error.message);
    process.exit(1);
  }

  process.exit(0);
};

testFlow();
