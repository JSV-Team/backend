const http = require('http');

http.get('http://localhost:3001/api/activities', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const activities = JSON.parse(data);
      console.log(`Total activities returned: ${activities.length}`);
      if (activities.length > 0) {
        console.log("Top 2 activities:", JSON.stringify(activities.slice(0, 2), null, 2));
      }
    } catch (e) {
      console.error("Error parsing response:", e.message);
      console.log("Raw Response:", data.substring(0, 500));
    }
  });
}).on("error", (err) => {
  console.log("Error: " + err.message);
});
