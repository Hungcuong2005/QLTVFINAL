import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import ErrorHandler from "../middlewares/errorMiddlewares.js";
import { User } from "../models/user.model.js";
import bcrypt from "bcrypt";
import { uploadBufferToCloudinary } from "../utils/cloudinaryUpload.js";



/**
 * =====================================================
 * ✅ GET /api/v1/user/all?status=active|deleted
 * =====================================================
 * CHỨC NĂNG: Lấy danh sách người dùng (Admin)
 *
 * Mục tiêu:
 * - Chỉ lấy user đã xác thực accountVerified=true
 * - Cho phép lọc theo trạng thái:
 *   + active  : user đang hoạt động (isDeleted=false)
 *   + deleted : user đã xóa mềm (isDeleted=true)
 *
 * Luồng xử lý:
 * 1. Đọc query status (mặc định active)
 * 2. Tạo filter bắt buộc: accountVerified=true
 * 3. Áp filter isDeleted theo status
 * 4. Query danh sách user và select email (vì có thể select:false trong schema)
 * 5. Trả response danh sách
 */
export const getAllUsers = catchAsyncErrors(async (req, res, next) => {
  const status = String(req.query.status || "active"); // active | deleted

  // Filter cơ bản: chỉ lấy user đã verify
  const filter = { accountVerified: true };

  // Lọc theo trạng thái xóa mềm
  if (status === "deleted") {
    filter.isDeleted = true;
  } else {
    filter.isDeleted = false; // mặc định active
  }

  // Lấy danh sách user, select +email để chắc chắn có field email trả về
  const users = await User.find(filter).select("+email");

  res.status(200).json({ success: true, users });
});





/**
 * =====================================================
 * ✅ POST /api/v1/user/add/new-admin
 * =====================================================
 * CHỨC NĂNG: Tạo tài khoản Admin mới (do Admin/Owner thực hiện)
 *
 * Input:
 * - body: name, email, password
 * - file: avatar (upload bằng multipart/form-data)
 *
 * Yêu cầu:
 * - Bắt buộc có avatar
 * - Email không được trùng
 *
 * Luồng xử lý:
 * 1. Log debug toàn bộ request (header/body/file) để bắt lỗi multipart
 * 2. Validate input: name/email/password
 * 3. Check email đã tồn tại chưa (lowercase để tránh trùng do hoa thường)
 * 4. Validate avatar: phải có req.file và req.file.buffer
 *    - Nếu không có buffer: thường do multer không dùng memoryStorage()
 * 5. Upload ảnh lên Cloudinary (folder LIBRARY_USERS)
 * 6. Hash password bằng bcrypt
 * 7. Tạo user role=Admin và set accountVerified=true
 * 8. Trả response admin vừa tạo
 *
 * Lưu ý:
 * - Nếu upload Cloudinary lỗi -> trả lỗi 500
 */
export const registerNewAdmin = catchAsyncErrors(async (req, res, next) => {
  console.log("\n");
  console.log("========================================");
  console.log("🔍 [registerNewAdmin] START");
  console.log("========================================");

  // 1) Log header để debug multipart
  console.log("📋 Request Headers:", {
    "content-type": req.headers["content-type"],
    "content-length": req.headers["content-length"],
  });

  // 2) Log body (che password)
  const { name, email, password } = req.body;
  console.log("📋 Request Body:", {
    name: name || "MISSING",
    email: email || "MISSING",
    password: password ? "***" : "MISSING",
    bodyKeys: Object.keys(req.body),
  });

  // 3) Log file (QUAN TRỌNG): nếu req.file null -> multer không nhận file
  console.log("📋 Request File (avatar):", {
    hasFile: !!req.file,
    file: req.file
      ? {
          fieldname: req.file.fieldname,
          originalname: req.file.originalname,
          encoding: req.file.encoding,
          mimetype: req.file.mimetype,
          size: req.file.size,
          hasBuffer: !!req.file.buffer,
          bufferLength: req.file.buffer?.length || 0,
        }
      : null,
  });

  // 4) Validate dữ liệu bắt buộc
  if (!name || !email || !password) {
    console.error("❌ Missing required fields!");
    console.log("========================================\n");
    return next(
      new ErrorHandler("Vui lòng nhập đầy đủ: tên, email, mật khẩu.", 400)
    );
  }

  // 5) Check email tồn tại chưa (chuyển lowercase để chuẩn hóa)
  console.log("🔍 Checking if email exists:", email);
  const existed = await User.findOne({ email: email.toLowerCase() });

  if (existed) {
    console.error("❌ Email already exists!");
    console.log("========================================\n");
    return next(new ErrorHandler("Email đã tồn tại.", 400));
  }

  console.log("✅ Email available");

  // 6) Validate file avatar
  if (!req.file) {
    console.error("❌ No avatar file in request!");
    console.error("💡 Possible reasons:");
    console.error("   - Multer middleware không chạy");
    console.error("   - Body parser đã consume request body");
    console.error("   - Field name không đúng (phải là 'avatar')");
    console.log("========================================\n");
    return next(new ErrorHandler("Vui lòng tải lên ảnh đại diện (avatar).", 400));
  }

  // Nếu multer không dùng memoryStorage thì thường sẽ không có buffer
  if (!req.file.buffer) {
    console.error("❌ No buffer in avatar file!");
    console.error("💡 Multer storage phải là memoryStorage()");
    console.log("========================================\n");
    return next(new ErrorHandler("File buffer không tồn tại.", 400));
  }

  // 7) Upload ảnh lên Cloudinary
  console.log("📤 Uploading avatar to Cloudinary...");
  console.log("   - Folder: LIBRARY_USERS");
  console.log("   - Buffer size:", req.file.buffer.length, "bytes");

  try {
    const result = await uploadBufferToCloudinary(
      req.file.buffer,
      "LIBRARY_USERS"
    );

    console.log("✅ Cloudinary upload SUCCESS:", {
      public_id: result.public_id,
      url: result.secure_url,
      format: result.format,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
    });

    // 8) Hash mật khẩu
    console.log("🔐 Hashing password...");
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log("✅ Password hashed");

    // 9) Tạo admin mới
    console.log("💾 Creating admin user...");
    const admin = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: "Admin",

      // Admin tạo từ backend -> coi như đã verify luôn
      accountVerified: true,

      // Trạng thái khóa / xóa mềm
      isLocked: false,
      lockedAt: null,
      lockReason: "",
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,

      // Avatar lưu thông tin Cloudinary
      avatar: {
        public_id: result.public_id,
        url: result.secure_url,
      },
    });

    console.log("✅ Admin created successfully:", {
      id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
    });

    console.log("========================================");
    console.log("🎉 [registerNewAdmin] SUCCESS");
    console.log("========================================\n");

    // 10) Trả response
    res.status(201).json({
      success: true,
      message: "Đăng ký Admin thành công.",
      admin,
    });
  } catch (uploadError) {
    // Nếu upload hoặc create lỗi
    console.error("========================================");
    console.error("❌ Cloudinary upload FAILED!");
    console.error("========================================");
    console.error("Error details:", {
      message: uploadError.message,
      stack: uploadError.stack,
      name: uploadError.name,
    });
    console.log("========================================\n");

    return next(
      new ErrorHandler(
        "Upload ảnh lên Cloudinary thất bại: " + uploadError.message,
        500
      )
    );
  }
});




/**
 * =====================================================
 * ✅ PATCH /api/v1/user/:id/lock
 * =====================================================
 * CHỨC NĂNG: Khóa hoặc mở khóa tài khoản người dùng
 *
 * Input:
 * - params: id (userId)
 * - body:
 *   + locked: boolean (true: khóa, false: mở)
 *   + reason: string (lý do khóa, optional)
 *
 * Quy tắc:
 * - Không cho khóa/mở khóa user đã bị xóa mềm (isDeleted=true)
 *
 * Luồng xử lý:
 * 1. Validate locked phải là boolean
 * 2. Tìm user theo id
 * 3. Nếu user bị xóa -> không cho thao tác
 * 4. Cập nhật isLocked, lockedAt, lockReason
 * 5. Save và trả về user
 */
export const setUserLock = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  const { locked, reason = "" } = req.body;

  // 1) locked bắt buộc phải là boolean
  if (typeof locked !== "boolean") {
    return next(new ErrorHandler("Trường 'locked' phải là boolean.", 400));
  }

  // 2) Tìm user
  const user = await User.findById(id);
  if (!user) return next(new ErrorHandler("Không tìm thấy người dùng.", 404));

  // 3) Nếu đã xóa mềm thì không cho khóa/mở
  if (user.isDeleted) {
    return next(
      new ErrorHandler("Tài khoản đã bị xóa. Không thể khóa/mở khóa.", 400)
    );
  }

  // 4) Cập nhật trạng thái khóa
  user.isLocked = locked;
  user.lockedAt = locked ? new Date() : null;
  user.lockReason = locked ? String(reason || "") : "";

  await user.save();

  res.status(200).json({
    success: true,
    message: locked ? "Đã khóa tài khoản." : "Đã mở khóa tài khoản.",
    user,
  });
});




/**
 * =====================================================
 * ✅ PATCH /api/v1/user/:id/soft-delete
 * =====================================================
 * CHỨC NĂNG: Xóa mềm người dùng (không xóa hẳn DB)
 *
 * Mục tiêu:
 * - Đánh dấu user.isDeleted = true
 * - Lưu thời gian xóa deletedAt
 * - Lưu người thực hiện deletedBy = req.user._id (nếu có)
 * - Đồng thời KHÓA tài khoản luôn để user không đăng nhập được
 *
 * Luồng xử lý:
 * 1. Tìm user theo id
 * 2. Nếu không tồn tại -> 404
 * 3. Nếu đã bị xóa -> trả về message (idempotent)
 * 4. Set isDeleted=true + deletedAt + deletedBy
 * 5. Set isLocked=true + lockedAt + lockReason
 * 6. Save và trả về user
 */
export const softDeleteUser = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;

  // 1) Tìm user
  const user = await User.findById(id);
  if (!user) return next(new ErrorHandler("Không tìm thấy người dùng.", 404));

  // 2) Nếu user đã bị xóa mềm rồi thì trả về luôn
  if (user.isDeleted) {
    return res.status(200).json({
      success: true,
      message: "Người dùng đã bị xóa.",
      user,
    });
  }

  // 3) Đánh dấu xóa mềm
  user.isDeleted = true;
  user.deletedAt = new Date();
  user.deletedBy = req.user?._id || null;

  // 4) Đồng thời khóa luôn (đảm bảo không đăng nhập)
  user.isLocked = true;
  user.lockedAt = new Date();

  // Nếu trước đó chưa có lý do khóa thì gán mặc định
  user.lockReason = user.lockReason || "Tài khoản đã bị xóa.";

  await user.save();

  res.status(200).json({
    success: true,
    message: "Đã xóa người dùng.",
    user,
  });
});




/**
 * =====================================================
 * ✅ PATCH /api/v1/user/:id/restore
 * =====================================================
 * CHỨC NĂNG: Khôi phục người dùng đã xóa mềm
 *
 * Mục tiêu:
 * - isDeleted=false, xóa thông tin deletedAt/deletedBy
 * - Mở khóa tài khoản: isLocked=false, lockedAt=null, lockReason=""
 *
 * Luồng xử lý:
 * 1. Tìm user theo id
 * 2. Nếu không tồn tại -> 404
 * 3. Set lại các field xóa mềm và khóa
 * 4. Save và trả response
 */
export const restoreUser = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;

  // 1) Tìm user
  const user = await User.findById(id);
  if (!user) return next(new ErrorHandler("Không tìm thấy người dùng.", 404));

  // 2) Bỏ trạng thái xóa mềm
  user.isDeleted = false;
  user.deletedAt = null;
  user.deletedBy = null;

  // 3) Mở khóa tài khoản
  user.isLocked = false;
  user.lockedAt = null;
  user.lockReason = "";

  await user.save();

  res.status(200).json({
    success: true,
    message: "Đã khôi phục người dùng.",
    user,
  });
});
