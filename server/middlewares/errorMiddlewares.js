/**
 * =====================================================
 * ✅ Class: ErrorHandler
 * =====================================================
 * CHỨC NĂNG:
 * - Tạo ra một kiểu Error tùy biến để thống nhất lỗi trong dự án
 * - Có thêm thuộc tính statusCode để trả về HTTP status phù hợp
 *
 * Cách dùng:
 * return next(new ErrorHandler("Không tìm thấy dữ liệu", 404));
 */
class ErrorHandler extends Error {
  constructor(message, statusCode) {
    super(message);           // Gọi constructor Error gốc để set message
    this.statusCode = statusCode; // Gắn statusCode để middleware biết trả mã nào
  }
}

/**
 * =====================================================
 * ✅ Middleware: errorMiddleware
 * =====================================================
 * CHỨC NĂNG:
 * - Middleware bắt lỗi tổng (Global Error Handler) cho Express
 * - Tất cả lỗi từ controller/middleware (next(err)) sẽ đi qua đây
 * - Chuẩn hóa message + statusCode
 * - Xử lý các lỗi phổ biến: Mongo duplicate, JWT invalid/expired, CastError,...
 *
 * Lưu ý:
 * - Middleware này phải được đặt CUỐI cùng trong app.js/server.js
 *   app.use(errorMiddleware);
 */
export const errorMiddleware = (err, req, res, next) => {
  /**
   * 1) Chuẩn hóa lỗi nếu thiếu thông tin
   * - Nếu err.message không có -> gán mặc định
   * - Nếu err.statusCode không có -> mặc định 500
   */
  err.message = err.message || "Internal Server Error";
  err.statusCode = err.statusCode || 500;

  /**
   * 2) Lỗi MongoDB duplicate key (code 11000)
   * - Xảy ra khi bạn lưu dữ liệu bị trùng field unique (vd: email, isbn, copyCode,...)
   * - Ở đây bạn đang trả message chung chung "Duplicate Field Value Entered"
   *
   * Gợi ý nâng cấp:
   * - Có thể lấy field bị trùng từ err.keyValue để báo rõ field nào trùng
   */
  if (err.code === 11000) {
    const statusCode = 400;
    const message = `Duplicate Field Value Entered`;
    err = new ErrorHandler(message, statusCode);
  }

  /**
   * 3) JWT không hợp lệ (token sai format / signature sai)
   * - Thường xảy ra khi token bị sửa hoặc sai secret
   * - Trả 400 (bạn đang dùng 400; nhiều dự án dùng 401)
   */
  if (err.name === "JsonWebTokenError") {
    const statusCode = 400;
    const message = `Json Web Token is invalid. Try again.`;
    err = new ErrorHandler(message, statusCode);
  }

  /**
   * 4) JWT hết hạn (TokenExpiredError)
   * - Thường xảy ra khi token đã qua thời gian expire
   * - Trả 400 (bạn đang dùng 400; nhiều dự án dùng 401)
   */
  if (err.name === "TokenExpiredError") {
    const statusCode = 400;
    const message = `Json Web Token is expired. Try again.`;
    err = new ErrorHandler(message, statusCode);
  }

  /**
   * 5) Lỗi CastError (Mongoose)
   * - Thường xảy ra khi truyền id không hợp lệ dạng ObjectId
   *   ví dụ: /book/abc -> CastError: Cast to ObjectId failed
   * - Trả 400 và báo rõ path lỗi (err.path)
   */
  if (err.name === "CastError") {
    const statusCode = 400;
    const message = `Resource not found. Invalid: ${err.path}`;
    err = new ErrorHandler(message, statusCode);
  }

  /**
   * 6) Nếu là lỗi validate schema của Mongoose:
   * - err.errors tồn tại -> lấy tất cả message của từng field rồi nối lại
   * - Nếu không có err.errors -> dùng err.message
   */
  const errorMessage = err.errors
    ? Object.values(err.errors)
        .map((error) => error.message)
        .join(" ")
    : err.message;

  /**
   * 7) Trả response lỗi thống nhất
   * - success: false
   * - message: message đã chuẩn hóa
   * - status: err.statusCode
   */
  return res.status(err.statusCode).json({
    success: false,
    message: errorMessage,
  });
};

export default ErrorHandler;
