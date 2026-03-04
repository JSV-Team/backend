const { io } = require("socket.io-client");

// Kết nối với danh phận User 2 (Guest)
const socket = io("http://localhost:3001", {
    auth: { userId: 2 }
});

socket.on("connect", () => {
    console.log("✅ Đã kết nối Socket.IO thành công với User 2!");

    // Test Lấy danh sách nhóm (Nôm na gọi API, nhưng ở đây test gọi fetch nhanh bằng node)
    fetch('http://localhost:3001/api/chat/conversations?userId=2')
        .then(res => res.json())
        .then(data => {
            console.log("📦 Danh sách nhóm của User 2:", data);
            if (data && data.length > 0) {
                const convId = data[0].conversation_id;
                socket.emit("join_rooms", [convId]);
                console.log("✅ Đã xin server Join vao room group:", convId);

                // Gửi thử một tin nhắn
                console.log("💬 Đang thử gửi tin nhắn...");
                socket.emit("send_message", {
                    conversationId: convId,
                    content: "Tin nhắn tự động test từ Script lúc " + new Date().toLocaleTimeString()
                }, (res) => {
                    console.log("📤 Phản hồi từ server khi gửi tin:", res);
                    if (res.status === 'sent') {
                        console.log("🎉 TEST CHAT THÀNH CÔNG! Đang ngắt kết nối...");
                        setTimeout(() => process.exit(0), 1000);
                    } else {
                        console.error("❌ LỖI GỬI TIN BẰNG SOCKET:", res);
                        process.exit(1);
                    }
                });
            } else {
                console.log("⚠️ Không có nhóm nào để test socket.");
                process.exit(0);
            }
        })
        .catch(err => {
            console.error("❌ LỖI KẾT NỐI API REST:", err);
            process.exit(1);
        });
});

socket.on("receive_message", (msg) => {
    console.log("📥 Nhận được tin nhắn broadcast:", msg.content);
});

socket.on("connect_error", (err) => {
    console.log(`❌ Lỗi kết nối Socket: ${err.message}`);
    process.exit(1);
});
