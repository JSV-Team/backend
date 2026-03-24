// TEMPORARY CORS FIX - CHỈ DÙNG KHI CẦN GẤP
// Thay thế CORS config trong app.js bằng:

app.use(cors({
  origin: true, // Allow all origins temporarily
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-user-id', 'x-requested-with'],
  credentials: true,
  optionsSuccessStatus: 200
}));

// SAU KHI FIX XONG, PHẢI ĐỔI LẠI THÀNH SECURE CONFIG!