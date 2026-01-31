import { catchAsyncErrors } from "./catchAsyncErrors.js";
import ErrorHandler from "./errorMiddlewares.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";



/**
 * =====================================================
 * ✅ Middleware: isAuthenticated
 * =====================================================
 * CHỨC NĂNG: Xác thực người dùng đã đăng nhập hay chưa (Authentication)
 *
 * Mục tiêu:
 * - Kiểm tra cookie có token không
 * - Giải mã token để lấy userId
 * - Tìm user trong DB theo userId
 * - Nếu hợp lệ -> gán user vào req.user để các controller dùng tiếp
 *
 * Luồng xử lý:
 * 1. Lấy token từ req.cookies (cookie-parser phải được cấu hình)
 * 2. Nếu không có token -> trả lỗi 401 (chưa đăng nhập)
 * 3. Giải mã token bằng JWT_SECRET_KEY
 * 4. Tìm user theo decoded.id
 * 5. Nếu không tìm thấy user -> 404
 * 6. Gán user vào req.user rồi next()
 *
 * Lưu ý:
 * - jwt.verify() sẽ throw nếu token sai/hết hạn -> catchAsyncErrors sẽ đẩy vào error middleware
 */
export const isAuthenticated = catchAsyncErrors(async (req, res, next) => {
  // 1) Lấy token từ cookie (yêu cầu app.use(cookieParser()))
  const { token } = req.cookies;

  // 2) Không có token -> chưa đăng nhập
  if (!token) return next(new ErrorHandler("User is not authenticated.", 401));

  // 3) Giải mã token -> lấy payload (thường chứa id user)
  const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

  // 4) Tìm user trong DB
  const user = await User.findById(decoded.id);

  // 5) Token hợp lệ nhưng user không tồn tại nữa (bị xóa/không có)
  if (!user) return next(new ErrorHandler("User not found.", 404));

  // 6) Gán user vào request để controller phía sau dùng
  req.user = user;

  // 7) Cho đi tiếp sang middleware/controller tiếp theo
  next();
});




/**
 * =====================================================
 * ✅ Middleware: isAuthorized(...roles)
 * =====================================================
 * CHỨC NĂN: Phân quyền theo vai trò (Authorization)
 *
 * Cách dùng ví dụ:
 *   router.get("/admin/users",
 *     isAuthenticated,
 *     isAuthorized("Admin"),
 *     getAllUsers
 *   );
 *
 * Input:
 * - roles: danh sách role được phép truy cập (vd: "Admin", "User", ...)
 *
 * Luồng xử lý:
 * 1. Kiểm tra req.user đã tồn tại chưa (phải chạy isAuthenticated trước)
 * 2. Nếu chưa có req.user -> báo lỗi 401
 * 3. Kiểm tra role của user có nằm trong roles cho phép không
 * 4. Nếu không -> báo lỗi 403
 * 5. Nếu hợp lệ -> next()
 *
 * Lưu ý:
 * - Middleware này phải dùng SAU isAuthenticated
 */
export const isAuthorized = (...roles) => {
  return (req, res, next) => {
    // 1) Nếu không có req.user nghĩa là chưa xác thực
    if (!req.user) return next(new ErrorHandler("User not authenticated.", 401));

    // 2) Nếu role của user không nằm trong danh sách role được phép
    if (!roles.includes(req.user.role)) {
      return next(new ErrorHandler("Not allowed.", 403));
    }

    // 3) Cho phép đi tiếp
    next();
  };
};
