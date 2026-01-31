import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import ErrorHandler from "../middlewares/errorMiddlewares.js";
import { Borrow } from "../models/borrow.model.js";
import { Book } from "../models/book.model.js";
import BookCopy from "../models/bookCopy.model.js";
import { User } from "../models/user.model.js";
import { calculateFine } from "../utils/fineCalculator.js";
import crypto from "crypto";

// =================================================================
// 🛠️ HÀM CÔNG CỤ (HELPER FUNCTIONS)
// =================================================================


/**
 * CHỨC NĂNG: Sắp xếp object theo thứ tự alphabet của key
 *
 * Mục đích:
 * - VNPAY yêu cầu các tham số phải được sắp xếp đúng thứ tự trước khi tạo chữ ký bảo mật
 *
 * Luồng xử lý:
 * 1. Lấy danh sách keys của obj
 * 2. Sort keys theo alphabet (A -> Z)
 * 3. Tạo object mới theo thứ tự đó
 */
const sortObject = (obj) => {
  const sorted = {};
  const keys = Object.keys(obj).sort();
  for (const k of keys) sorted[k] = obj[k];
  return sorted;
};



/**
 * CHỨC NĂNG: Tạo URL thanh toán VNPAY
 *
 * Input:
 * - amountVnd: số tiền (VNĐ)
 * - txnRef: mã giao dịch duy nhất
 * - orderInfo: mô tả đơn hàng
 * - ipAddr: IP người dùng
 *
 * Luồng xử lý:
 * 1. Lấy ENV cấu hình VNPAY (tmnCode, secretKey, vnpUrl, returnUrl)
 * 2. Tạo vnp_CreateDate dạng YYYYMMDDHHmmss
 * 3. Đổi amount sang đơn vị VNPAY yêu cầu: amount * 100
 * 4. Build object vnp_Params (Version/Command/TmnCode/Amount/ReturnUrl...)
 * 5. Sort tham số trước khi ký
 * 6. Tạo SecureHash bằng HMAC SHA512 (secretKey)
 * 7. Ghép thành URL hoàn chỉnh trả về frontend
 */
const createVnpayUrl = ({ amountVnd, txnRef, orderInfo, ipAddr }) => {
  const tmnCode = process.env.VNP_TMN_CODE;
  const secretKey = process.env.VNP_HASH_SECRET;
  const vnpUrl = process.env.VNP_URL;
  const returnUrl = process.env.VNP_RETURN_URL;

  // Kiểm tra cấu hình môi trường
  if (!tmnCode || !secretKey || !vnpUrl || !returnUrl) {
    throw new Error(
      "Thiếu ENV cấu hình VNPAY (VNP_TMN_CODE/VNP_HASH_SECRET/VNP_URL/VNP_RETURN_URL)."
    );
  }

  // Tạo mã thời gian (YYYYMMDDHHmmss)
  const date = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const vnp_CreateDate =
    date.getFullYear() +
    pad(date.getMonth() + 1) +
    pad(date.getDate()) +
    pad(date.getHours()) +
    pad(date.getMinutes()) +
    pad(date.getSeconds());

  // VNPAY yêu cầu số tiền * 100
  const vnp_Amount = Math.round(amountVnd) * 100;

  // Tham số cơ bản VNPAY yêu cầu
  let vnp_Params = {
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: tmnCode,
    vnp_Locale: "vn",
    vnp_CurrCode: "VND",
    vnp_TxnRef: txnRef,
    vnp_OrderInfo: orderInfo,
    vnp_OrderType: "other",
    vnp_Amount,
    vnp_ReturnUrl: returnUrl,
    vnp_IpAddr: ipAddr || "127.0.0.1",
    vnp_CreateDate,
  };

  // Sắp xếp tham số trước khi ký
  vnp_Params = sortObject(vnp_Params);

  // Tạo chữ ký bảo mật (Secure Hash) dùng HMAC SHA512
  const signData = new URLSearchParams(vnp_Params).toString();
  const hmac = crypto.createHmac("sha512", secretKey);
  const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");
  vnp_Params.vnp_SecureHash = signed;

  // Tạo URL thanh toán hoàn chỉnh
  const paymentUrl = `${vnpUrl}?${new URLSearchParams(vnp_Params).toString()}`;
  return paymentUrl;
};



/**
 * CHỨC NĂNG: Cấu hình số ngày mượn và gia hạn
 * - BORROW_DAYS: số ngày được mượn ban đầu
 * - RENEW_DAYS: số ngày cộng thêm mỗi lần gia hạn
 * - MAX_RENEWALS: số lần gia hạn tối đa
 */
const BORROW_DAYS = 7;
const RENEW_DAYS = 7;
const MAX_RENEWALS = 2;




/**
 * CHỨC NĂNG: Hoàn tất trả sách sau khi thanh toán thành công (hoặc xác nhận tiền mặt)
 *
 * Mục tiêu:
 * - Đánh dấu Borrow đã trả (returnDate)
 * - Đánh dấu User.borrowedBooks item -> returned = true
 * - Đổi BookCopy.status về "available" và xóa currentBorrowId
 * - Tăng Book.quantity và cập nhật availability
 *
 * Luồng xử lý:
 * 1. Tìm Borrow theo borrowId
 * 2. Nếu Borrow đã trả rồi -> return luôn
 * 3. Tìm User theo borrow.user.id
 * 4. Nếu Borrow thiếu borrow.book -> tìm lại từ BookCopy.bookId
 * 5. Tìm Book và BookCopy
 * 6. Set borrow.returnDate = now
 * 7. Cập nhật snapshot user.borrowedBooks -> returned = true
 * 8. Update BookCopy: chỉ cho trả nếu currentBorrowId khớp borrow._id
 * 9. Update Book: quantity +1, availability theo quantity
 */
const finalizeReturnAfterPaid = async ({ borrowId }) => {
  const borrow = await Borrow.findById(borrowId);
  if (!borrow) throw new ErrorHandler("Không tìm thấy thông tin mượn sách.", 404);

  // Nếu đã trả rồi thì bỏ qua
  if (borrow.returnDate) return borrow;

  const user = await User.findById(borrow.user.id);
  if (!user) throw new ErrorHandler("Không tìm thấy người dùng.", 404);

  // Nếu vì lý do nào đó thiếu Book ID, tìm lại qua BookCopy
  if (!borrow.book) {
    const bc = await BookCopy.findById(borrow.bookCopy);
    if (!bc) throw new ErrorHandler("Không tìm thấy BookCopy.", 404);
    borrow.book = bc.bookId;
    await borrow.save();
  }

  const book = await Book.findById(borrow.book);
  if (!book) throw new ErrorHandler("Không tìm thấy sách.", 404);

  const bookCopy = await BookCopy.findById(borrow.bookCopy);
  if (!bookCopy) throw new ErrorHandler("Không tìm thấy BookCopy.", 404);

  // 1. Cập nhật ngày trả
  borrow.returnDate = new Date();
  await borrow.save();

  // 2. Cập nhật trạng thái trong danh sách mượn của User
  const item = user.borrowedBooks?.find(
    (b) => b.borrowId && b.borrowId.toString() === borrow._id.toString()
  );
  if (item) item.returned = true;
  await user.save();

  // 3. Giải phóng BookCopy (status -> available)
  const updated = await BookCopy.findOneAndUpdate(
    { _id: bookCopy._id, currentBorrowId: borrow._id },
    { $set: { status: "available", currentBorrowId: null } },
    { new: true }
  );
  if (!updated) {
    throw new ErrorHandler("Trạng thái BookCopy không hợp lệ để trả.", 400);
  }

  // 4. Cộng lại số lượng sách chính
  book.quantity = (book.quantity || 0) + 1;
  book.availability = book.quantity > 0;
  await book.save();

  return borrow;
};



/**
 * CHỨC NĂNG: Ghi nhận lượt mượn sách (theo BookCopy)
 * ROUTE (gợi ý): POST /api/v1/borrow/:id
 *
 * Input:
 * - params: id = bookId
 * - body: email, copyId (optional)
 *
 * Luồng xử lý:
 * 1. Tìm Book theo bookId
 * 2. Tìm User theo email (đã xác thực)
 * 3. Kiểm tra user có đang mượn cùng đầu sách này chưa (returned=false)
 * 4. "Khóa" BookCopy:
 *    - Nếu có copyId: khóa đúng cuốn đó (status available -> borrowed)
 *    - Nếu không có copyId: tự lấy 1 cuốn available bất kỳ
 * 5. Tính dueDate = hiện tại + BORROW_DAYS
 * 6. Tạo Borrow record (gắn bookId + bookCopyId + snapshot user + payment pending)
 * 7. Update BookCopy.currentBorrowId = borrow._id
 * 8. Giảm Book.quantity đi 1, cập nhật availability
 * 9. Push snapshot vào user.borrowedBooks để UI hiển thị nhanh
 * 10. Trả về borrow + copyCode
 */
export const recordBorrowedBook = catchAsyncErrors(async (req, res, next) => {
  console.log("\n=== 📋 recordBorrowedBook START ===");
  console.log("📋 req.params:", req.params);
  console.log("📋 req.body:", req.body);

  const { id: bookId } = req.params;
  const { email, copyId } = req.body; // ✅ NHẬN copyId TỪ FRONTEND

  // --- BƯỚC 1: Tìm sách theo ID ---
  console.log("📗 Step 1: Finding book with ID:", bookId);
  const book = await Book.findById(bookId);
  console.log("📗 Book found:", book ? `YES - ${book.title}` : "NO");

  if (!book) {
    console.log("❌ Book not found!");
    return next(new ErrorHandler("Không tìm thấy sách.", 404));
  }

  // --- BƯỚC 2: Tìm người dùng theo Email (phải đã xác thực) ---
  console.log("👤 Step 2: Finding user with email:", email);
  const user = await User.findOne({ email, accountVerified: true });
  console.log("👤 User found:", user ? `YES - ${user.name}` : "NO");

  if (!user) {
    console.log("❌ User not found!");
    return next(new ErrorHandler("Không tìm thấy người dùng.", 404));
  }

  // --- BƯỚC 3: Kiểm tra xem người dùng đã mượn cuốn này chưa ---
  console.log("📖 Step 3: Checking if user already borrowed this book");
  const isAlreadyBorrowedSameTitle = user.borrowedBooks?.some(
    (b) => b.bookTitle === book.title && b.returned === false
  );
  console.log("📖 Already borrowed:", isAlreadyBorrowedSameTitle);

  if (isAlreadyBorrowedSameTitle) {
    console.log("❌ User already borrowed this book!");
    return next(new ErrorHandler("Bạn đã mượn sách này rồi.", 400));
  }

  // --- BƯỚC 4: Tìm và Khóa BookCopy cụ thể ---
  // Nếu frontend gửi copyId -> Khóa đúng cuốn đó.
  // Nếu không (hoặc null) -> Tự chọn 1 cuốn đang available.
  console.log("📚 Step 4: Locking specific BookCopy with copyId:", copyId);

  let lockedCopy;

  if (copyId) {
    // ✅ Nếu có copyId từ frontend → khóa cuốn cụ thể
    lockedCopy = await BookCopy.findOneAndUpdate(
      { _id: copyId, bookId: book._id, status: "available" },
      { $set: { status: "borrowed" } },
      { new: true }
    );

    if (!lockedCopy) {
      console.log("❌ Specific copy not available or not found!");
      return next(new ErrorHandler("Cuốn sách này không còn khả dụng.", 400));
    }
  } else {
    // ✅ Nếu không có copyId → tìm cuốn available bất kỳ (logic dự phòng)
    lockedCopy = await BookCopy.findOneAndUpdate(
      { bookId: book._id, status: "available" },
      { $set: { status: "borrowed" } },
      { new: true }
    );

    if (!lockedCopy) {
      console.log("❌ No available copy!");
      return next(new ErrorHandler("Sách đã hết (không còn cuốn available).", 400));
    }
  }

  console.log("📚 Locked copy:", lockedCopy ? `YES - ${lockedCopy.copyCode}` : "NO");

  // Tính ngày hết hạn (DueDate)
  const dueDate = new Date(Date.now() + BORROW_DAYS * 24 * 60 * 60 * 1000);
  console.log("📅 Due date:", dueDate);

  // --- BƯỚC 5: Tạo bản ghi Mượn (Borrow Record) ---
  console.log("💾 Step 5: Creating Borrow record");
  const borrow = await Borrow.create({
    user: { id: user._id, name: user.name, email: user.email },
    book: book._id,
    bookCopy: lockedCopy._id,
    dueDate,
    price: book.price,
    renewCount: 0,
    lastRenewedAt: null,
    payment: {
      method: "cash",
      status: "unpaid",
      amount: 0,
    },
  });
  console.log("💾 Borrow created:", borrow._id);

  // --- BƯỚC 6: Cập nhật BookCopy để liên kết với Borrow ID vừa tạo ---
  console.log("🔗 Step 6: Updating BookCopy with currentBorrowId");
  await BookCopy.findByIdAndUpdate(
    lockedCopy._id,
    { $set: { currentBorrowId: borrow._id } },
    { new: true, runValidators: false }
  );
  console.log("✅ BookCopy updated successfully");

  // --- BƯỚC 7: Cập nhật số lượng sách (Quantity giảm 1) ---
  console.log("📖 Step 7: Updating Book quantity");
  book.quantity = Math.max((book.quantity || 0) - 1, 0);
  book.availability = book.quantity > 0;
  await book.save();
  console.log("📖 Book quantity updated to:", book.quantity);

  // --- BƯỚC 8: Cập nhật danh sách sách đã mượn của User ---
  console.log("👤 Step 8: Updating User borrowedBooks");
  user.borrowedBooks.push({
    borrowId: borrow._id,
    returned: false,
    bookTitle: book.title,
    borrowedDate: new Date(),
    dueDate,
    renewCount: 0,
    lastRenewedAt: null,
  });
  await user.save();
  console.log("👤 User borrowedBooks updated");

  console.log("✅ recordBorrowedBook SUCCESS\n");

  return res.status(200).json({
    success: true,
    message: "Ghi nhận mượn sách thành công (theo BookCopy).",
    borrow,
    bookCopyCode: lockedCopy.copyCode,
  });
});




/**
 * CHỨC NĂNG: Gia hạn lượt mượn
 * ROUTE (gợi ý): PATCH /api/v1/borrow/renew/:borrowId
 *
 * Điều kiện:
 * - Borrow phải thuộc về user đang đăng nhập
 * - Borrow chưa trả (returnDate = null)
 * - Chưa quá hạn (dueDate > now)
 * - renewCount < MAX_RENEWALS
 *
 * Luồng xử lý:
 * 1. Tìm Borrow theo borrowId + userId + returnDate=null
 * 2. Nếu quá hạn -> báo lỗi không cho gia hạn
 * 3. Nếu vượt số lần gia hạn -> báo lỗi
 * 4. Tính newDueDate = dueDate + RENEW_DAYS
 * 5. Update Borrow: dueDate, renewCount++, lastRenewedAt
 * 6. Update snapshot trong user.borrowedBooks để UI hiển thị đúng
 * 7. Trả về dueDate mới + renewCount
 */
export const renewBorrowedBook = catchAsyncErrors(async (req, res, next) => {
  const { borrowId } = req.params;
  const user = req.user;

  // Tìm lượt mượn của user này (chưa trả)
  const borrow = await Borrow.findOne({
    _id: borrowId,
    "user.id": user._id,
    returnDate: null,
  });

  if (!borrow) return next(new ErrorHandler("Không tìm thấy lượt mượn.", 404));

  // Kiểm tra nếu đã quá hạn thì không cho gia hạn
  const dueDate = borrow.dueDate ? new Date(borrow.dueDate) : null;
  if (dueDate && dueDate <= new Date()) {
    return next(new ErrorHandler("Sách đã quá hạn, không thể gia hạn.", 400));
  }

  // Kiểm tra số lần gia hạn tối đa
  const renewCount = borrow.renewCount || 0;
  if (renewCount >= MAX_RENEWALS) {
    return next(
      new ErrorHandler(
        `Bạn đã gia hạn ${renewCount} lần. Không được gia hạn thêm.`,
        400
      )
    );
  }

  // Tính ngày hết hạn mới
  const newDueDate = dueDate
    ? new Date(dueDate.getTime() + RENEW_DAYS * 24 * 60 * 60 * 1000)
    : new Date(Date.now() + RENEW_DAYS * 24 * 60 * 60 * 1000);

  // Cập nhật thông tin gia hạn trong Borrow
  borrow.dueDate = newDueDate;
  borrow.renewCount = renewCount + 1;
  borrow.lastRenewedAt = new Date();
  await borrow.save();

  // Cập nhật thông tin gia hạn trong User snapshot
  const item = user.borrowedBooks?.find(
    (b) => b.borrowId && b.borrowId.toString() === borrow._id.toString()
  );
  if (item) {
    item.dueDate = newDueDate;
    item.renewCount = borrow.renewCount;
    item.lastRenewedAt = borrow.lastRenewedAt;
    await user.save();
  }

  res.status(200).json({
    success: true,
    message: "Gia hạn mượn sách thành công.",
    dueDate: newDueDate,
    renewCount: borrow.renewCount,
    maxRenewals: MAX_RENEWALS,
  });
});



/**
 * CHỨC NĂNG: Chuẩn bị trả sách (tính tiền + tạo payment)
 * ROUTE (gợi ý): POST /api/v1/borrow/return/prepare/:borrowId
 * (code hỗ trợ fallback :borrowId hoặc :bookId)
 *
 * Input:
 * - params: borrowId hoặc bookId
 * - body: email, method ("cash" | "vnpay")
 *
 * Luồng xử lý:
 * 1. Validate email + method
 * 2. Tìm Borrow chưa trả theo:
 *    - _id + user.email + returnDate=null
 *    - nếu không có thì fallback: book + user.email + returnDate=null
 * 3. Nếu Borrow thiếu bookId -> lấy lại qua BookCopy.bookId
 * 4. Tìm Book
 * 5. Tính fine = calculateFine(dueDate)
 * 6. total = book.price + fine
 * 7. Update borrow.payment: method, amount, status="pending"
 * 8. Nếu cash:
 *    - trả về amount + message cho admin thu tiền
 * 9. Nếu vnpay:
 *    - tạo txnRef
 *    - gắn txnRef vào borrow.payment.transactionId
 *    - tạo paymentUrl bằng createVnpayUrl()
 *    - trả về paymentUrl để frontend redirect
 */
export const prepareReturnPayment = catchAsyncErrors(async (req, res, next) => {
  const anyId = req.params.borrowId || req.params.bookId;
  const { email, method } = req.body;

  if (!email) return next(new ErrorHandler("Thiếu email.", 400));
  if (!method) return next(new ErrorHandler("Thiếu phương thức thanh toán.", 400));

  // 1. Tìm bản ghi mượn sách (Borrow)
  let borrow = await Borrow.findOne({
    _id: anyId,
    "user.email": email,
    returnDate: null,
  });

  // Fallback: Nếu không tìm thấy bằng ID, thử tìm bằng bookId (ít dùng hơn)
  if (!borrow) {
    borrow = await Borrow.findOne({
      book: anyId,
      "user.email": email,
      returnDate: null,
    });
  }

  if (!borrow) return next(new ErrorHandler("Không tìm thấy thông tin mượn sách.", 400));

  // Kiểm tra và sửa lỗi dữ liệu nếu thiếu bookId
  if (!borrow.book) {
    const bc = await BookCopy.findById(borrow.bookCopy);
    if (!bc) return next(new ErrorHandler("Không tìm thấy BookCopy.", 404));
    borrow.book = bc.bookId;
    await borrow.save();
  }

  const book = await Book.findById(borrow.book);
  if (!book) return next(new ErrorHandler("Không tìm thấy sách.", 404));

  // 2. Tính toán tiền phạt và tổng tiền
  const fine = calculateFine(borrow.dueDate);
  const total = (borrow.price || book.price || 0) + (fine || 0);

  // Cập nhật thông tin thanh toán vào bản ghi Borrow
  borrow.fine = fine;
  borrow.payment = {
    ...borrow.payment,
    method,
    amount: total,
    status: "pending",
  };
  await borrow.save();

  // 3. Xử lý theo phương thức thanh toán

  // -- Tiền mặt --
  if (method === "cash") {
    return res.status(200).json({
      success: true,
      method,
      amount: total,
      message: "Đã tạo yêu cầu thanh toán tiền mặt. Vui lòng thu tiền và xác nhận.",
      borrowId: borrow._id,
    });
  }

  // -- VNPAY --
  if (method === "vnpay") {
    const txnRef = `BORROW_${borrow._id.toString()}_${Date.now()}`;
    const ipAddr =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket?.remoteAddress ||
      "127.0.0.1";

    borrow.payment.transactionId = txnRef;
    await borrow.save();

    let paymentUrl;
    try {
      paymentUrl = createVnpayUrl({
        amountVnd: total,
        txnRef,
        orderInfo: `Thanh toan tra sach - Borrow ${borrow._id}`,
        ipAddr,
      });
    } catch (e) {
      return next(new ErrorHandler(e.message || "Không tạo được link VNPAY.", 500));
    }

    return res.status(200).json({
      success: true,
      method,
      amount: total,
      paymentUrl,
      borrowId: borrow._id,
    });
  }

  return next(new ErrorHandler("ZaloPay chưa được tích hợp trong bản sửa này.", 400));
});





/**
 * CHỨC NĂNG: Nhận kết quả thanh toán từ VNPAY (return/IPN)
 * ROUTE (gợi ý): GET /api/v1/borrow/vnpay/return
 *
 * Luồng xử lý:
 * 1. Lấy req.query thành vnp_Params
 * 2. Lấy vnp_SecureHash rồi xóa secureHash khỏi params để ký lại
 * 3. Tính lại chữ ký HMAC SHA512 với secretKey
 * 4. Nếu chữ ký sai -> redirect về frontend với status=failed
 * 5. Lấy responseCode và txnRef
 * 6. Tìm Borrow theo payment.transactionId = txnRef
 * 7. Nếu responseCode != "00" -> payment.failed, redirect failed
 * 8. Nếu thành công:
 *    - payment.paid, paidAt=now
 *    - gọi finalizeReturnAfterPaid() để thực sự trả sách
 * 9. Redirect về frontend /payment-result?status=success
 */
export const vnpayReturn = catchAsyncErrors(async (req, res, next) => {
  const vnp_Params = { ...req.query };

  // Xác thực chữ ký để đảm bảo request từ VNPAY là chuẩn
  const secureHash = vnp_Params.vnp_SecureHash;
  delete vnp_Params.vnp_SecureHash;
  delete vnp_Params.vnp_SecureHashType;

  const secretKey = process.env.VNP_HASH_SECRET;
  if (!secretKey) return next(new ErrorHandler("Thiếu ENV VNP_HASH_SECRET.", 500));

  const sorted = sortObject(vnp_Params);
  const signData = new URLSearchParams(sorted).toString();

  const hmac = crypto.createHmac("sha512", secretKey);
  const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

  const appBaseUrl = process.env.APP_BASE_URL || "http://localhost:5173";

  // Chữ ký không khớp -> Lỗi
  if (signed !== secureHash) {
    return res.redirect(`${appBaseUrl}/payment-result?status=failed&reason=invalid_signature`);
  }

  const responseCode = vnp_Params.vnp_ResponseCode;
  const txnRef = vnp_Params.vnp_TxnRef;

  // Tìm đơn hàng tương ứng
  const borrow = await Borrow.findOne({ "payment.transactionId": txnRef });
  if (!borrow) {
    return res.redirect(`${appBaseUrl}/payment-result?status=failed&reason=borrow_not_found`);
  }

  // Mã '00' là thành công, khác là thất bại
  if (responseCode !== "00") {
    borrow.payment.status = "failed";
    await borrow.save();
    return res.redirect(`${appBaseUrl}/payment-result?status=failed&reason=vnpay_${responseCode}`);
  }

  // Thanh toán thành công -> Cập nhật trạng thái
  borrow.payment.status = "paid";
  borrow.payment.paidAt = new Date();
  await borrow.save();

  try {
    // Gọi hàm hoàn tất trả sách (cộng kho, đổi status)
    await finalizeReturnAfterPaid({ borrowId: borrow._id.toString() });
  } catch (e) {
    return res.redirect(`${appBaseUrl}/payment-result?status=paid_but_finalize_failed`);
  }

  return res.redirect(`${appBaseUrl}/payment-result?status=success`);
});




/**
 * CHỨC NĂNG: Admin xác nhận đã thu tiền mặt + hoàn tất trả sách
 * ROUTE (gợi ý): POST /api/v1/borrow/return/confirm-cash/:borrowId
 *
 * Input:
 * - params: borrowId hoặc bookId
 * - body: email
 *
 * Luồng xử lý:
 * 1. Tìm Borrow chưa trả theo _id hoặc theo book
 * 2. Kiểm tra payment.method phải là "cash"
 * 3. Set payment.status="paid", payment.paidAt=now
 * 4. Gọi finalizeReturnAfterPaid() để:
 *    - set returnDate
 *    - đổi BookCopy -> available
 *    - tăng Book.quantity
 * 5. Trả response success
 */
export const confirmCashPaymentAndReturn = catchAsyncErrors(async (req, res, next) => {
  const anyId = req.params.borrowId || req.params.bookId;
  const { email } = req.body;

  let borrow = await Borrow.findOne({
    _id: anyId,
    "user.email": email,
    returnDate: null,
  });

  if (!borrow) {
    borrow = await Borrow.findOne({
      book: anyId,
      "user.email": email,
      returnDate: null,
    });
  }

  if (!borrow) return next(new ErrorHandler("Không tìm thấy thông tin mượn sách.", 400));

  if (borrow.payment?.method !== "cash") {
    return next(new ErrorHandler("Đơn này không phải thanh toán tiền mặt.", 400));
  }

  // Cập nhật đã trả tiền
  borrow.payment.status = "paid";
  borrow.payment.paidAt = new Date();
  await borrow.save();

  // Hoàn tất quy trình trả sách
  await finalizeReturnAfterPaid({ borrowId: borrow._id.toString() });

  res.status(200).json({
    success: true,
    message: "Đã xác nhận thanh toán tiền mặt và hoàn tất trả sách.",
  });
});




/**
 * CHỨC NĂNG: API cũ (deprecated)
 * - Không dùng nữa
 * - Trả lỗi để hướng dẫn gọi API mới (prepare payment trước)
 */
export const returnBorrowBook = catchAsyncErrors(async (req, res, next) => {
  return next(
    new ErrorHandler(
      "Luồng trả sách đã đổi: hãy gọi API /borrow/return/prepare/:bookId để thanh toán trước.",
      400
    )
  );
});



/**
 * CHỨC NĂNG: Lấy danh sách borrowedBooks của user đang đăng nhập
 * - Dữ liệu lấy từ req.user.borrowedBooks (snapshot trong User)
 * - Dùng cho màn hình user theo dõi sách đang mượn
 */
export const borrowedBooks = catchAsyncErrors(async (req, res, next) => {
  const { borrowedBooks } = req.user;

  res.status(200).json({
    success: true,
    borrowedBooks,
  });
});




/**
 * CHỨC NĂNG: Admin xem toàn bộ lịch sử mượn
 *
 * Luồng xử lý:
 * 1. Lấy tất cả Borrow
 * 2. Populate book (title, author) để hiển thị dễ
 * 3. Populate bookCopy (copyCode, status) để biết cuốn nào đang mượn
 */
export const getBorrowedBooksForAdmin = catchAsyncErrors(async (req, res, next) => {
  const borrowedBooks = await Borrow.find()
    .populate("book", "title author")
    .populate("bookCopy", "copyCode status");

  res.status(200).json({
    success: true,
    borrowedBooks,
  });
});
