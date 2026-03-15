const testData = {
  email: "test@example.com",
  username: "testuser",
  password: "password123",
  full_name: "Test User",
  location: "Ho Chi Minh"
};

async function testRegister() {
  console.log("🔍 Testing Register API\n");
  console.log("📝 Test Data:", testData);
  
  try {
    const response = await fetch("http://localhost:3001/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(testData)
    });

    const data = await response.json();
    
    console.log(`\n📊 Response Status: ${response.status}`);
    console.log("📊 Response Data:", data);

    if (response.ok) {
      console.log("\n✅ Register thành công!");
    } else {
      console.log("\n❌ Register thất bại!");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

testRegister();
