import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import ErrorHandler from "../middlewares/errorMiddlewares.js";
import { User } from "../models/user.model.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { sendVerificationCode } from "../utils/sendVerificationCode.js";
import { sendToken } from "../utils/sendToken.js";
import { generateForgotPasswordEmailTemplate } from "../utils/emailTemplates.js";
import { sendEmail } from "../utils/sendEmail.js";
import { validatePassword } from "./validatePassword.js";

/**
 * CHỨC NĂNG: ĐĂNG KÝ TÀI KHOẢN
 *
 * Luồng xử lý:
 * 1. Lấy name, email, password từ request body
 * 2. Kiểm tra thiếu dữ liệu đầu vào
 * 3. Kiểm tra email đã tồn tại và đã xác thực chưa
 * 4. Kiểm tra độ mạnh mật khẩu
 * 5. Hash mật khẩu
 * 6. Tạo user mới (chưa xác thực)
 * 7. Sinh OTP xác thực và gửi qua email
 */
export const register = catchAsyncErrors(async (req, res, next) => {
    const { name, email, password } = req.body;

    // 1. Validate dữ liệu đầu vào
    if (!name || !email || !password) {
        return next(new ErrorHandler("Please enter all fields.", 400));
    }

    // 2. Kiểm tra user đã tồn tại và đã xác thực chưa
    const isRegistered = await User.findOne({ email, accountVerified: true });
    if (isRegistered) {
        return next(new ErrorHandler("User already exists", 400));
    }

    // 3. Kiểm tra độ mạnh mật khẩu
    const isPasswordValidate = validatePassword(password);
    if (isPasswordValidate) {
        return next(new ErrorHandler(isPasswordValidate, 400));
    }

    // 4. Mã hóa mật khẩu
    const hashedPassword = await bcrypt.hash(password, 10);

    // 5. Tạo user mới (chưa xác thực)
    const user = await User.create({
        name,
        email,
        password: hashedPassword,
    });

    // 6. Sinh mã OTP xác thực
    const verificationCode = await user.generateVerificationCode();
    await user.save();

    // 7. Gửi OTP qua email
    return sendVerificationCode(verificationCode, email, res);
});



/**
 * CHỨC NĂNG: XÁC THỰC OTP
 *
 * Luồng xử lý:
 * 1. Nhận email và otp từ client
 * 2. Tìm user chưa xác thực theo email
 * 3. Nếu có nhiều bản ghi trùng email → dọn rác
 * 4. Kiểm tra OTP đúng hay không
 * 5. Kiểm tra OTP còn hạn hay đã hết hạn
 * 6. Xác thực tài khoản và đăng nhập luôn
 */
export const verifyOTP = catchAsyncErrors(async (req, res, next) => {
    const { email, otp } = req.body;

    // 1. Validate dữ liệu
    if (!email || !otp) {
        return next(new ErrorHandler("Email or otp is missing.", 400));
    }

    // 2. Tìm các user chưa xác thực theo email
    const userAllEntries = await User.find({
        email,
        accountVerified: false,
    }).sort({ createdAt: -1 });

    if (!userAllEntries || userAllEntries.length === 0) {
        return next(new ErrorHandler("User not found.", 404));
    }

    let user;

    // 3. Nếu có nhiều user trùng email → giữ bản ghi mới nhất
    if (userAllEntries.length > 1) {
        user = userAllEntries[0];
        await User.deleteMany({
            _id: { $ne: user._id },
            email,
            accountVerified: false,
        });
    } else {
        user = userAllEntries[0];
    }

    // 4. Kiểm tra OTP
    if (user.verificationCode !== Number(otp)) {
        return next(new ErrorHandler("Invalid OTP.", 400));
    }

    // 5. Kiểm tra hạn OTP
    if (Date.now() > new Date(user.verficationCodeExpire).getTime()) {
        return next(new ErrorHandler("OTP expired.", 400));
    }

    // 6. Xác thực thành công
    user.accountVerified = true;
    user.verificationCode = null;
    user.verficationCodeExpire = null;
    await user.save({ validateModifiedOnly: true });

    // 7. Gửi token đăng nhập
    sendToken(user, 200, "Account Verified.", res);
});



/**
 * CHỨC NĂNG: ĐĂNG NHẬP
 *
 * Luồng xử lý:
 * 1. Kiểm tra email và password
 * 2. Tìm user đã xác thực và chưa bị xóa
 * 3. Kiểm tra trạng thái khóa tài khoản
 * 4. So sánh mật khẩu
 * 5. Gửi token đăng nhập
 */
export const login = catchAsyncErrors(async (req, res, next) => {
    const { email, password } = req.body;

    // 1. Validate dữ liệu
    if (!email || !password) {
        return next(new ErrorHandler("Please enter all fields.", 400));
    }

    // 2. Tìm user và lấy cả password
    const user = await User.findOne({
        email,
        accountVerified: true,
        isDeleted: false,
    }).select("+password");

    if (!user) {
        return next(new ErrorHandler("Invalid email or password.", 400));
    }

    // 3. Kiểm tra khóa tài khoản
    if (user.isLocked) {
        return next(new ErrorHandler(user.lockReason || "Tài khoản đã bị khóa.", 403));
    }

    // 4. So sánh mật khẩu
    const isPasswordMatched = await bcrypt.compare(password, user.password);
    if (!isPasswordMatched) {
        return next(new ErrorHandler("Invalid email or password.", 400));
    }

    // 5. Gửi token
    sendToken(user, 200, "User login successfully.", res);
});


/**
 * CHỨC NĂNG: ĐĂNG XUẤT
 *
 * Luồng xử lý:
 * - Xóa cookie token bằng cách set thời gian hết hạn về hiện tại
 */
export const logout = catchAsyncErrors(async (req, res, next) => {
    const isProd = process.env.NODE_ENV === "production";

    res
        .status(200)
        .cookie("token", "", {
            expires: new Date(Date.now()),
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? "none" : "lax",
        })
        .json({
            success: true,
            message: "Logged out successfully.",
        });
});



/**
 * CHỨC NĂNG: LẤY THÔNG TIN USER ĐANG ĐĂNG NHẬP
 *
 * - User đã được middleware xác thực gán vào req.user
 */
export const getUser = catchAsyncErrors(async (req, res, next) => {
    res.status(200).json({
        success: true,
        user: req.user,
    });
});



/**
 * CHỨC NĂNG: QUÊN MẬT KHẨU
 *
 * Luồng xử lý:
 * 1. Nhận email từ client
 * 2. Tìm user theo email
 * 3. Sinh token reset password
 * 4. Gửi link reset password qua email
 */
export const forgotPassword = catchAsyncErrors(async (req, res, next) => {
    if (!req.body.email) {
        return next(new ErrorHandler("Email is required."));
    }

    const user = await User.findOne({
        email: req.body.email,
        accountVerified: true,
    });

    if (!user) {
        return next(new ErrorHandler("Invalid email.", 400));
    }

    // Sinh token reset
    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    // Tạo link reset
    const resetPasswordUrl = `${process.env.FRONTEND_URL}/password/reset/${resetToken}`;
    const message = generateForgotPasswordEmailTemplate(resetPasswordUrl);

    try {
        await sendEmail({
            email: user.email,
            subject: "Bookworm Library Management System Password Recovery",
            message,
        });

        res.status(200).json({
            success: true,
            message: `Email sent to ${user.email} successfully.`,
        });
    } catch (error) {
        // Rollback nếu gửi mail lỗi
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save({ validateBeforeSave: false });

        return next(new ErrorHandler("Cannot send email.", 500));
    }
});




/**
 * CHỨC NĂNG: ĐẶT LẠI MẬT KHẨU
 *
 * Luồng xử lý:
 * 1. Nhận token từ URL
 * 2. Hash token để so sánh DB
 * 3. Kiểm tra token còn hạn
 * 4. Validate mật khẩu mới
 * 5. Hash và lưu mật khẩu mới
 */
export const resetPassword = catchAsyncErrors(async (req, res, next) => {
    const resetPasswordToken = crypto
        .createHash("sha256")
        .update(req.params.token)
        .digest("hex");

    const user = await User.findOne({
        resetPasswordToken,
        resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
        return next(new ErrorHandler("Reset password token is invalid or expired.", 400));
    }

    const isPasswordValidate = validatePassword(
        req.body.password,
        req.body.confirmNewPassword
    );
    if (isPasswordValidate) {
        return next(new ErrorHandler(isPasswordValidate, 400));
    }

    user.password = await bcrypt.hash(req.body.password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    sendToken(user, 200, "Password reset successfully.", res);
});


/**
 * CHỨC NĂNG: ĐỔI MẬT KHẨU (USER ĐÃ ĐĂNG NHẬP)
 *
 * Luồng xử lý:
 * 1. Kiểm tra mật khẩu cũ
 * 2. Validate mật khẩu mới
 * 3. Hash và lưu mật khẩu mới
 */
export const updatePassword = catchAsyncErrors(async (req, res, next) => {
    const user = await User.findById(req.user._id).select("+password");
    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmNewPassword) {
        return next(new ErrorHandler("Please enter all fields.", 400));
    }

    const isPasswordMatched = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordMatched) {
        return next(new ErrorHandler("Current password is incorrect.", 400));
    }

    const isPasswordValidate = validatePassword(newPassword, confirmNewPassword);
    if (isPasswordValidate) {
        return next(new ErrorHandler(isPasswordValidate, 400));
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.status(200).json({
        success: true,
        message: "Password updated.",
    });
});
