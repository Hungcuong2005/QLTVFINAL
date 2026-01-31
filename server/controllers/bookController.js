import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import ErrorHandler from "../middlewares/errorMiddlewares.js";
import { Book } from "../models/book.model.js";
import BookCopy from "../models/bookCopy.model.js";
import { Category } from "../models/category.model.js";
import { uploadBufferToCloudinary } from "../utils/cloudinaryUpload.js";

const MAX_CATEGORIES = 3;

// ==========================================
// HÀM CÔNG CỤ (HELPER FUNCTIONS)
// ==========================================

/**
 * CHỨC NĂNG: Chuẩn hóa ISBN
 * - Xóa khoảng trắng, dấu gạch ngang
 * - Chuyển chữ thường -> chữ hoa
 * - Trả về chuỗi ISBN sạch để so sánh/lưu DB ổn định
 */
const normalizeIsbn = (isbn) =>
  String(isbn || "")
    .trim()
    .replace(/[-\s]/g, "")
    .toUpperCase();



/**
 * CHỨC NĂNG: Tính lại các chỉ số số lượng của Book từ bảng BookCopy
 *
 * Luồng xử lý:
 * 1. Đếm tổng số bản sao (total)
 * 2. Đếm số bản sao đang available (available)
 * 3. quantity = available (số lượng còn có thể mượn)
 * 4. totalCopies = total (tổng số bản sao)
 * 5. availability = quantity > 0
 * 6. Update lại vào document Book
 */
const recomputeBookCounts = async (bookId) => {
  const [total, available] = await Promise.all([
    BookCopy.countDocuments({ bookId }),
    BookCopy.countDocuments({ bookId, status: "available" }),
  ]);

  const quantity = available;
  const totalCopies = total;
  const availability = quantity > 0;

  await Book.findByIdAndUpdate(bookId, { quantity, totalCopies, availability });
};



/**
 * CHỨC NĂNG: Lấy số lượng bản sao hiện tại của 1 đầu sách
 * - total: tổng BookCopy
 * - available: số BookCopy còn sẵn
 */
const getBookCopyCounts = async (bookId) => {
  const [total, available] = await Promise.all([
    BookCopy.countDocuments({ bookId }),
    BookCopy.countDocuments({ bookId, status: "available" }),
  ]);
  return { total, available };
};



/**
 * CHỨC NĂNG: Tạo mã copyCode cho mỗi BookCopy
 *
 * Format nếu có ISBN:
 *   <ISBN>-<số thứ tự 4 chữ số>
 *   Ví dụ: 9781234567890-0001
 *
 * Nếu không có ISBN:
 *   Lấy 12 ký tự cuối của Book._id làm "mã thay thế"
 */
const buildCopyCode = (book, copyNumber) => {
  const isbnNorm = String(book.isbn || "")
    .trim()
    .replace(/[-\s]/g, "")
    .toUpperCase();

  if (isbnNorm) {
    return `${isbnNorm}-${String(copyNumber).padStart(4, "0")}`;
  }

  const idTail = String(book._id)
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(-12)
    .toUpperCase();

  return `${idTail}-${String(copyNumber).padStart(4, "0")}`;
};




/**
 * CHỨC NĂNG: Chuẩn hóa và validate danh sách categoryId
 *
 * Luồng xử lý:
 * 1. Ép categories thành mảng (nếu không phải mảng -> [])
 * 2. Trim từng phần tử và loại bỏ phần tử rỗng
 * 3. Xóa trùng (Set)
 * 4. Chỉ lấy tối đa MAX_CATEGORIES (mặc định 3)
 * 5. Query DB kiểm tra các ID có tồn tại thật không
 *    - Nếu thiếu -> báo lỗi
 * 6. Trả về danh sách ID hợp lệ
 */
const normalizeAndValidateCategoryIds = async (categories, next) => {
  let arr = Array.isArray(categories) ? categories : [];
  arr = arr.map((x) => String(x || "").trim()).filter(Boolean);

  arr = Array.from(new Set(arr)).slice(0, MAX_CATEGORIES);
  if (arr.length === 0) return [];

  const found = await Category.find({ _id: { $in: arr } }).select("_id");
  if (found.length !== arr.length) {
    return next(new ErrorHandler("Có thể loại không tồn tại.", 400));
  }

  return arr;
};



// ==========================================
// CONTROLLER HANDLERS
// ==========================================


/**
 * CHỨC NĂNG: Kiểm tra sách có tồn tại theo ISBN
 * ROUTE: GET /api/v1/book/isbn/:isbn
 *
 * Luồng xử lý:
 * 1. Lấy isbn từ params và normalize
 * 2. Nếu thiếu ISBN -> báo lỗi
 * 3. Tìm Book theo ISBN
 * 4. Trả về exists = true/false và book (nếu có)
 */
export const getBookByIsbn = catchAsyncErrors(async (req, res, next) => {
  const isbn = normalizeIsbn(req.params.isbn);
  if (!isbn) return next(new ErrorHandler("Thiếu ISBN.", 400));

  const book = await Book.findOne({ isbn }).populate("categories", "name");

  res.status(200).json({
    success: true,
    exists: !!book,
    book: book || null,
  });
});




/**
 * CHỨC NĂNG: Lấy danh sách BookCopy đang "available" của 1 Book
 * ROUTE: GET /api/v1/book/:id/available-copies
 *
 * Luồng xử lý:
 * 1. Kiểm tra Book có tồn tại không
 * 2. Query BookCopy theo bookId + status="available"
 * 3. Sort theo copyNumber tăng dần (để hiển thị theo thứ tự)
 * 4. Chỉ trả về các field cần thiết (select)
 */
export const getAvailableCopies = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;

  const book = await Book.findById(id);
  if (!book) return next(new ErrorHandler("Không tìm thấy sách.", 404));

  const copies = await BookCopy.find({
    bookId: id,
    status: "available",
  })
    .sort({ copyNumber: 1 })
    .select("_id copyCode copyNumber status notes price");

  res.status(200).json({
    success: true,
    copies,
    total: copies.length,
    bookTitle: book.title,
  });
});



/**
 * CHỨC NĂNG: Thêm Book mới HOẶC thêm BookCopy cho Book đã có (theo ISBN)
 * ROUTE: POST /api/v1/book/admin/add
 *
 * LUỒNG XỬ LÝ CHÍNH:
 * A. Chuẩn hóa ISBN và validate categories
 * B. Tìm Book theo ISBN:
 *    - Nếu chưa tồn tại: tạo Book mới (bắt buộc có title + author)
 *    - Nếu đã tồn tại: cập nhật thông tin Book (nếu có) + khôi phục nếu bị xóa mềm
 * C. Tạo BookCopy theo quantity:
 *    - copyNumber nối tiếp số lớn nhất hiện có
 *    - copyCode sinh tự động (ISBN-0001, ...)
 *    - Nếu insertMany bị trùng key (11000) -> tính lại startNumber và thử insert lại
 * D. Tính lại quantity/totalCopies/availability dựa trên BookCopy
 * E. Trả về book mới nhất và số bản sao đã tạo
 */
export const addBookAndCopies = catchAsyncErrors(async (req, res, next) => {
  // 1) Tạo reqId phục vụ debug log
  const startedAt = Date.now();
  const reqId =
    (req.headers["x-request-id"] || "").toString() ||
    `addBook-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const log = (...args) => console.log(`[${reqId}]`, ...args);
  const logErr = (...args) => console.error(`[${reqId}]`, ...args);

  try {
    // 2) Lấy dữ liệu đầu vào
    const {
      isbn,
      title,
      author,
      description = "",
      price = 0,
      quantity = 1,
      categories,
    } = req.body;

    // 3) Normalize ISBN (nếu không có thì để undefined)
    const normalizedIsbn = normalizeIsbn(isbn);
    const finalIsbn = normalizedIsbn ? normalizedIsbn : undefined;

    // 4) Validate categories (tối đa 3 + tồn tại DB)
    const categoryIds = await normalizeAndValidateCategoryIds(categories, next);

    // 5) Tìm Book theo ISBN (nếu có ISBN)
    let book = null;
    if (finalIsbn) book = await Book.findOne({ isbn: finalIsbn });
    const existedBefore = !!book;

    // 6) Nếu chưa có book -> tạo mới (bắt buộc title + author)
    if (!book) {
      if (!title || !author) {
        return next(
          new ErrorHandler(
            "ISBN chưa có trong DB nên cần nhập tối thiểu: title + author.",
            400
          )
        );
      }

      book = await Book.create({
        title: String(title).trim(),
        author: String(author).trim(),
        description: String(description || "").trim(),
        isbn: finalIsbn,
        price: Number(price) || 0,
        categories: categoryIds,
        quantity: 0,
        totalCopies: 0,
        availability: false,
        holdCount: 0,
        isDeleted: false,
        deletedAt: null,
      });
    } else {
      // 7) Nếu có book -> update thông tin (nếu client gửi lên)
      if (title && String(title).trim()) book.title = String(title).trim();
      if (author && String(author).trim()) book.author = String(author).trim();
      if (typeof price !== "undefined") book.price = Number(price) || book.price;
      if (typeof description !== "undefined")
        book.description = String(description || "").trim();

      if (Array.isArray(categories)) book.categories = categoryIds;

      // Nếu book bị xóa mềm thì khôi phục
      if (book.isDeleted) {
        book.isDeleted = false;
        book.deletedAt = null;
      }

      await book.save();
    }

    // 8) Tạo số lượng BookCopy theo quantity
    const count = Math.max(parseInt(quantity, 10) || 1, 1);

    // 9) Lấy copyNumber lớn nhất hiện tại để đánh số tiếp
    const last = await BookCopy.findOne({ bookId: book._id })
      .sort({ copyNumber: -1 })
      .select("copyNumber");
    let startNumber = (last?.copyNumber || 0) + 1;

    // 10) Build danh sách docs BookCopy
    const docs = [];
    for (let i = 0; i < count; i++) {
      const copyNumber = startNumber + i;
      docs.push({
        bookId: book._id,
        copyNumber,
        copyCode: buildCopyCode(book, copyNumber),
        status: "available",
        acquiredAt: new Date(),
        price: Number(book.price) || 0,
        notes: "",
        currentBorrowId: null,
      });
    }

    // 11) insertMany BookCopy (có xử lý trùng key)
    let inserted = [];
    try {
      inserted = await BookCopy.insertMany(docs, { ordered: true });
    } catch (err) {
      // Nếu trùng unique key (duplicate) -> retry lại với startNumber mới
      if (err?.code === 11000) {
        const lastAgain = await BookCopy.findOne({ bookId: book._id })
          .sort({ copyNumber: -1 })
          .select("copyNumber");
        startNumber = (lastAgain?.copyNumber || 0) + 1;

        const docs2 = [];
        for (let i = 0; i < count; i++) {
          const copyNumber = startNumber + i;
          docs2.push({
            bookId: book._id,
            copyNumber,
            copyCode: buildCopyCode(book, copyNumber),
            status: "available",
            acquiredAt: new Date(),
            price: Number(book.price) || 0,
            notes: "",
            currentBorrowId: null,
          });
        }

        inserted = await BookCopy.insertMany(docs2, { ordered: true });
      } else {
        return next(new ErrorHandler(err?.message || "Tạo BookCopy thất bại.", 500));
      }
    }

    // 12) Tính lại tồn kho từ bảng BookCopy
    await recomputeBookCounts(book._id);

    // 13) Lấy Book mới nhất (kèm categories name)
    const latestBook = await Book.findById(book._id).populate("categories", "name");

    return res.status(201).json({
      success: true,
      message: existedBefore
        ? "ISBN đã tồn tại → đã thêm bản sao (BookCopy) và cập nhật số lượng."
        : "ISBN chưa có → đã tạo đầu sách và thêm bản sao (BookCopy).",
      book: latestBook,
      createdCopiesCount: inserted.length,
      reqId,
    });
  } catch (e) {
    return next(new ErrorHandler(e?.message || "Lỗi server.", 500));
  }
});




/**
 * CHỨC NĂNG: Lấy danh sách Book có lọc + sort + phân trang
 * ROUTE: GET /api/v1/book/all
 *
 * Hỗ trợ:
 * - search: tìm theo title/author/isbn (regex không phân biệt hoa thường)
 * - availability: lọc còn sách hay hết
 * - minPrice/maxPrice: lọc khoảng giá
 * - categoryId: lọc theo danh mục
 * - deleted: active | deleted | all
 * - sort: newest | price_asc | price_desc | quantity_asc | quantity_desc
 *
 * Lưu ý quan trọng:
 * - Có "tie-breaker": isbn tăng dần + _id để phân trang luôn ổn định
 *   (tránh lỗi trang bị nhảy khi nhiều bản ghi trùng điều kiện sort)
 */
export const getAllBooks = catchAsyncErrors(async (req, res, next) => {
  const {
    search,
    availability,
    minPrice,
    maxPrice,
    sort = "newest",
    page = 1,
    limit,
    categoryId,
    deleted = "active",
  } = req.query;

  const filters = {};

  // 1) Search theo từ khóa
  if (search) {
    const keyword = String(search).trim();
    if (keyword) {
      const regex = new RegExp(keyword, "i");
      filters.$or = [{ title: regex }, { author: regex }, { isbn: regex }];
    }
  }

  // 2) Filter availability
  if (availability === "true" || availability === "false") {
    filters.availability = availability === "true";
  }

  // 3) Filter price range
  if (minPrice !== undefined || maxPrice !== undefined) {
    filters.price = {};
    if (minPrice !== undefined && minPrice !== "")
      filters.price.$gte = Number(minPrice);
    if (maxPrice !== undefined && maxPrice !== "")
      filters.price.$lte = Number(maxPrice);
  }

  // 4) Filter theo category
  if (categoryId) filters.categories = categoryId;

  // 5) Filter theo trạng thái xóa mềm
  if (deleted === "active") filters.isDeleted = false;
  if (deleted === "deleted") filters.isDeleted = true;

  // 6) Sort + tie-breaker
  const sortOptions = {
    newest: { createdAt: -1, isbn: 1, _id: 1 },
    price_asc: { price: 1, isbn: 1, _id: 1 },
    price_desc: { price: -1, isbn: 1, _id: 1 },
    quantity_asc: { quantity: 1, isbn: 1, _id: 1 },
    quantity_desc: { quantity: -1, isbn: 1, _id: 1 },
  };
  const sortBy = sortOptions[sort] || sortOptions.newest;

  // 7) Tính phân trang
  const totalBooks = await Book.countDocuments(filters);
  const pageNumber = Math.max(Number(page) || 1, 1);
  const limitNumber = limit ? Math.max(Number(limit), 1) : 0;
  const totalPages = limitNumber ? Math.max(Math.ceil(totalBooks / limitNumber), 1) : 1;
  const currentPage = limitNumber ? Math.min(pageNumber, totalPages) : 1;

  let query = Book.find(filters).sort(sortBy);

  if (limitNumber) {
    const skip = (currentPage - 1) * limitNumber;
    query = query.skip(skip).limit(limitNumber);
  }

  const books = await query.populate("categories", "name");

  res.status(200).json({
    success: true,
    books,
    totalBooks,
    page: currentPage,
    limit: limitNumber || totalBooks,
    totalPages,
  });
});





/**
 * CHỨC NĂNG: Xóa mềm Book (không xóa hẳn khỏi DB)
 * ROUTE: PATCH /api/v1/book/:id/soft-delete
 *
 * Điều kiện bắt buộc:
 * - Tất cả BookCopy của sách phải đang available
 *   (tức là không có bản sao nào đang mượn)
 *
 * Luồng xử lý:
 * 1. Tìm book theo id
 * 2. Nếu đã xóa mềm rồi -> trả về luôn
 * 3. Đếm total và available của BookCopy
 * 4. Nếu available != total -> không cho xóa
 * 5. Đánh dấu isDeleted=true, deletedAt=now
 */
export const softDeleteBook = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;

  const book = await Book.findById(id);
  if (!book) return next(new ErrorHandler("Book not found.", 404));

  if (book.isDeleted) {
    return res.status(200).json({
      success: true,
      message: "Sách đã ở trạng thái 'đã xóa' từ trước.",
      book,
    });
  }

  const { total, available } = await getBookCopyCounts(id);

  if (available !== total) {
    return next(
      new ErrorHandler(
        "Không thể xóa: Tất cả bản sao phải ở trạng thái available.",
        400
      )
    );
  }

  await recomputeBookCounts(id);

  book.isDeleted = true;
  book.deletedAt = new Date();
  await book.save();

  res.status(200).json({
    success: true,
    message: "Đã xóa (soft delete) sách thành công.",
    book,
  });
});




/**
 * CHỨC NĂNG: Khôi phục Book đã bị xóa mềm
 * ROUTE: PATCH /api/v1/book/:id/restore
 *
 * Luồng xử lý:
 * 1. Tìm book theo id
 * 2. Nếu book chưa bị xóa -> trả về thông báo
 * 3. Set isDeleted=false, deletedAt=null
 * 4. Tính lại quantity/totalCopies/availability
 */
export const restoreBook = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;

  const book = await Book.findById(id);
  if (!book) return next(new ErrorHandler("Book not found.", 404));

  if (!book.isDeleted) {
    return res.status(200).json({
      success: true,
      message: "Sách đang hoạt động (chưa bị xóa).",
      book,
    });
  }

  book.isDeleted = false;
  book.deletedAt = null;
  await book.save();

  await recomputeBookCounts(id);

  res.status(200).json({
    success: true,
    message: "Khôi phục sách thành công.",
    book,
  });
});




/**
 * CHỨC NĂNG: Cập nhật ảnh bìa (coverImage) của Book
 * ROUTE: PUT /api/v1/book/admin/:id/cover
 *
 * Luồng xử lý:
 * 1. Log để debug request (headers, params, body, file)
 * 2. Kiểm tra book tồn tại
 * 3. Kiểm tra file upload có tồn tại không (req.file)
 *    - Nếu không có: thường do Multer không chạy / sai field name / body-parser ăn mất request
 * 4. Upload buffer lên Cloudinary (folder LIBRARY_BOOKS)
 * 5. Lưu lại public_id và url vào book.coverImage
 * 6. Trả response book đã cập nhật
 * 7. Nếu upload lỗi -> trả lỗi 500
 */
export const updateBookCover = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;

  // 1) Tìm book
  const book = await Book.findById(id);
  if (!book) {
    return next(new ErrorHandler("Không tìm thấy sách.", 404));
  }

  // 2) Validate file
  if (!req.file) {
    return next(new ErrorHandler("Vui lòng chọn ảnh bìa (coverImage).", 400));
  }

  if (!req.file.buffer) {
    return next(new ErrorHandler("File buffer không tồn tại.", 400));
  }

  // 3) Upload Cloudinary
  try {
    const result = await uploadBufferToCloudinary(req.file.buffer, "LIBRARY_BOOKS");

    // 4) Update coverImage
    book.coverImage = {
      public_id: result.public_id,
      url: result.secure_url,
    };
    await book.save();

    res.status(200).json({
      success: true,
      message: "Cập nhật ảnh bìa thành công.",
      book,
    });
  } catch (uploadError) {
    return next(
      new ErrorHandler(
        "Upload ảnh lên Cloudinary thất bại: " + uploadError.message,
        500
      )
    );
  }
});



/**
 * CHỨC NĂNG: Giữ route delete cũ nhưng thực tế trỏ vào softDeleteBook
 * -> Mục tiêu: an toàn dữ liệu, tránh xóa cứng khỏi DB
 */
export const deleteBook = softDeleteBook;
