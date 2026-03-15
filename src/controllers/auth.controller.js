const authService = require("../services/auth.service");

const register = async (req, res) => {
  try {
    console.log("[REGISTER] Full request:", {
      method: req.method,
      path: req.path,
      headers: req.headers,
      body: req.body,
      bodyKeys: req.body ? Object.keys(req.body) : 'NO BODY'
    });
    
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        error: "Request body is empty or not parsed correctly"
      });
    }

    const result = await authService.registerUser(req.body);

    res.status(201).json({
      message: "User registered successfully",
      user_id: result.recordset?.[0]?.user_id || "Created"
    });

  } catch (err) {
    console.error("[REGISTER ERROR]:", err.message);
    
    let statusCode = 500;
    let errorMessage = err.message;

    // Handle specific SQL errors
    if (err.message.includes("UNIQUE constraint failed") || 
        err.message.includes("Violation of PRIMARY KEY constraint")) {
      statusCode = 400;
      errorMessage = "Username hoặc Email đã tồn tại";
    }

    res.status(statusCode).json({
      error: errorMessage
    });
  }
};

module.exports = {
  register
};