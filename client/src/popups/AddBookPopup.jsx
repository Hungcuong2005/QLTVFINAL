import React, { useEffect, useRef, useState } from "react";
import axiosClient from "../api/axiosClient";
import { useDispatch, useSelector } from "react-redux";
import { addBook } from "../store/slices/bookSlice";
import { toggleAddBookPopup } from "../store/slices/popUpSlice";
import { toast } from "react-toastify";

// Giới hạn max thể loại chọn
const MAX_CATEGORIES = 3;

/**
 * AddBookPopup - Popup Thêm mới sách (Admin)
 * 
 * Logic quan trọng:
 * 1. Kiểm tra ISBN real-time:
 *    - Nếu ISBN đã tồn tại -> Tự động điền thông tin (Title, Author...) và chuyển sang chế độ "Thêm bản sao" (BookCopy).
 *    - Nếu ISBN chưa có -> Cho phép nhập mới toàn bộ để tạo đầu sách (Book) + bản sao đầu tiên.
 * 
 * 2. Validate:
 *    - Bắt buộc nhập Title, Author, Price.
 *    - Tối đa 3 thể loại.
 */
const AddBookPopup = () => {
  const dispatch = useDispatch();
  const { loading } = useSelector((state) => state.book);

  // Form States
  const [isbn, setIsbn] = useState("");
  const [isbnStatus, setIsbnStatus] = useState("idle"); // idle | checking | exists | new

  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [description, setDescription] = useState("");

  // Category Selection
  const [allCategories, setAllCategories] = useState([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);

  // Chế độ chỉnh sửa: Khi ISBN đã tồn tại, mặc định sẽ khóa các ô input (chỉ thêm bản sao).
  // Admin phải bấm "Bật chỉnh sửa" nếu muốn sửa thông tin gốc.
  const [allowEdit, setAllowEdit] = useState(false);

  const lastCheckedIsbnRef = useRef("");

  // Chuẩn hóa ISBN (viết hoa, xóa ký tự lạ)
  const normalizeIsbn = (v) =>
    String(v || "")
      .trim()
      .replace(/[-\s]/g, "")
      .toUpperCase();

  const inputClass =
    "w-full px-4 py-2 border-2 border-gray-300 rounded-md " +
    "focus:outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-200";

  const disabledInputClass =
    "w-full px-4 py-2 border-2 border-gray-200 rounded-md bg-gray-100 cursor-not-allowed";

  // Lấy danh sách thể loại từ server
  const fetchCategories = async () => {
    try {
      const res = await axiosClient.get("/category/all");
      setAllCategories(res?.data?.categories || []);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Không tải được thể loại.");
    }
  };

  useEffect(() => {
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helper: map dữ liệu category từ API vào state selectedCategoryIds
  const applyBookCategoriesFromAPI = (book) => {
    const raw =
      book?.categories ||
      book?.categoryIds ||
      book?.categoriesIds ||
      book?.category ||
      [];

    const ids = Array.isArray(raw)
      ? raw
        .map((x) => (typeof x === "string" ? x : x?._id))
        .filter(Boolean)
      : [];

    setSelectedCategoryIds(ids.slice(0, MAX_CATEGORIES));
  };

  /**
   * Hàm kiểm tra ISBN (Debounce)
   * Gọi API /book/isbn/:isbn để xem sách đã có chưa
   */
  const checkIsbn = async ({ force = false, signal } = {}) => {
    const normalized = normalizeIsbn(isbn);

    if (!normalized) {
      setIsbnStatus("idle");
      setAllowEdit(false);
      return "idle";
    }

    if (!force && lastCheckedIsbnRef.current === normalized) return isbnStatus;

    setIsbnStatus("checking");
    lastCheckedIsbnRef.current = normalized;

    try {
      const { data } = await axiosClient.get(
        `/book/isbn/${normalized}`,
        { signal }
      );

      // TRƯỜNG HỢP 1: ISBN ĐÃ TỒN TẠI
      if (data?.exists && data?.book) {
        setIsbnStatus("exists");

        // Auto-fill dữ liệu cũ vào form
        setTitle(data.book.title || "");
        setAuthor(data.book.author || "");
        setDescription(String(data.book.description || ""));
        if (typeof data.book.price === "number") setPrice(String(data.book.price));

        applyBookCategoriesFromAPI(data.book);

        // Mặc định khóa không cho sửa (để tránh sửa nhầm thông tin gốc)
        setAllowEdit(false);
        return "exists";
      }

      // TRƯỜNG HỢP 2: ISBN MỚI TINH
      setIsbnStatus("new");
      setAllowEdit(true); // Cho phép nhập liệu full
      return "new";
    } catch (err) {
      if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED") {
        return isbnStatus;
      }

      setIsbnStatus("idle");
      setAllowEdit(true);
      toast.error(err?.response?.data?.message || "Không kiểm tra được ISBN.");
      return "idle";
    }
  };

  // Debounce effect cho việc check ISBN
  useEffect(() => {
    const controller = new AbortController();

    const t = setTimeout(() => {
      const normalized = normalizeIsbn(isbn);
      if (!normalized) return;
      checkIsbn({ signal: controller.signal });
    }, 450);

    return () => {
      clearTimeout(t);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isbn]);

  const canEditMeta = isbnStatus !== "exists" || allowEdit;
  const canEditDescription = canEditMeta || isbnStatus === "exists";

  // Toggle chọn category
  const toggleCategory = (id) => {
    setSelectedCategoryIds((prev) => {
      const exists = prev.includes(id);
      if (exists) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_CATEGORIES) {
        toast.info(`Mỗi sách tối đa ${MAX_CATEGORIES} thể loại.`);
        return prev;
      }
      return [...prev, id];
    });
  };

  // Submit Form
  const handleAddBook = async (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (loading) return;

    const normalized = normalizeIsbn(isbn);
    let statusToUse = isbnStatus;

    // Đảm bảo check ISBN lần cuối nếu user nhập nhanh quá rồi bấm Enter
    if (normalized) {
      if (isbnStatus === "checking") {
        toast.info("Đang kiểm tra ISBN, vui lòng đợi...");
        return;
      }
      if (isbnStatus === "idle") {
        statusToUse = await checkIsbn({ force: true });
      }
    }

    const q = Math.max(parseInt(quantity, 10) || 1, 1);

    // KỊCH BẢN A: Thêm BẢN SAO CHO SÁCH CŨ (ISBN tồn tại & Không sửa meta)
    // Chỉ gửi ISBN và Quantity lên server
    if (statusToUse === "exists" && !allowEdit) {
      const payload = {
        isbn: normalized || "",
        quantity: q,
        description,
        categories: (selectedCategoryIds || []).slice(0, MAX_CATEGORIES),
      };
      dispatch(addBook(payload));
      return;
    }

    // KỊCH BẢN B: Thêm MỚI HOÀN TOÀN hoặc SỬA THÔNG TIN SÁCH CŨ
    const trimmedTitle = title.trim();
    const trimmedAuthor = author.trim();

    if (!trimmedTitle || !trimmedAuthor) {
      toast.error("Vui lòng nhập Tên sách và Tác giả.");
      return;
    }

    const priceValue = Number(price);
    if (Number.isNaN(priceValue) || priceValue < 0) {
      toast.error("Giá mượn không hợp lệ.");
      return;
    }

    const categoriesToSend = (selectedCategoryIds || []).slice(0, MAX_CATEGORIES);

    // Validate category hợp lệ
    if (categoriesToSend.length > 0) {
      const invalidCats = categoriesToSend.filter(
        id => !allCategories.some(c => c._id === id)
      );
      if (invalidCats.length > 0) {
        toast.error("Có thể loại không hợp lệ.");
        return;
      }
    }

    const payload = {
      isbn: normalized || "",
      title: trimmedTitle,
      author: trimmedAuthor,
      price: priceValue,
      quantity: q,
      description,
      categories: categoriesToSend,
    };

    dispatch(addBook(payload));
  };

  return (
    <div className="fixed inset-0 bg-black/50 p-5 flex items-center justify-center z-50">
      <div className="w-full bg-white rounded-lg shadow-lg md:w-1/2 lg:w-1/3 border-t-4 border-[#C41526]">
        <div className="p-6">
          <h3 className="text-xl font-bold mb-4 text-[#C41526]">
            Thêm sách / Thêm bản sao
          </h3>

          {/* Trạng thái ISBN */}
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="text-sm">
              {isbnStatus === "checking" && (
                <span className="inline-flex items-center px-3 py-1 rounded-md bg-gray-100 text-gray-700">
                  Đang kiểm tra ISBN...
                </span>
              )}

              {isbnStatus === "exists" && (
                <span className="inline-flex items-center px-3 py-1 rounded-md bg-[#E9FBEF] text-[#0F7A2A] font-semibold">
                  ISBN đã tồn tại → mặc định chỉ thêm bản sao
                </span>
              )}

              {isbnStatus === "new" && (
                <span className="inline-flex items-center px-3 py-1 rounded-md bg-[#FDE8EA] text-[#C41526] font-semibold">
                  ISBN chưa có → tạo đầu sách + thêm bản sao
                </span>
              )}
            </div>

            {/* Nút bật tắt chỉnh sửa khi trùng ISBN */}
            {isbnStatus === "exists" ? (
              <button
                type="button"
                onClick={() => setAllowEdit((prev) => !prev)}
                className="px-3 py-1 rounded-md border border-gray-400 text-gray-700 font-semibold hover:bg-gray-100 transition"
                disabled={loading}
                title="Bật để sửa thông tin đầu sách, tắt để chỉ thêm bản sao"
              >
                {allowEdit ? "Tắt chỉnh sửa" : "Bật chỉnh sửa"}
              </button>
            ) : null}
          </div>

          <form onSubmit={handleAddBook}>
            {/* Input ISBN */}
            <div className="mb-4">
              <label className="block text-gray-900 font-medium">
                ISBN (khuyến nghị)
              </label>
              <input
                type="text"
                value={isbn}
                onChange={(e) => {
                  setIsbn(e.target.value);
                  setIsbnStatus("idle");
                  lastCheckedIsbnRef.current = "";
                  setAllowEdit(false);
                }}
                onBlur={checkIsbn}
                placeholder="Ví dụ: 9786041234567"
                className={inputClass}
              />
            </div>

            {/* Input Title */}
            <div className="mb-4">
              <label className="block text-gray-900 font-medium">Tên sách</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Nhập tên sách"
                disabled={!canEditMeta}
                className={canEditMeta ? inputClass : disabledInputClass}
                required={isbnStatus === "new" || allowEdit || !isbn}
              />
              {isbnStatus === "exists" && !allowEdit && (
                <p className="mt-1 text-xs text-gray-500">
                  Đang khóa (bấm “Bật chỉnh sửa” nếu muốn sửa).
                </p>
              )}
            </div>

            {/* Input Author */}
            <div className="mb-4">
              <label className="block text-gray-900 font-medium">Tác giả</label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Nhập tên tác giả"
                disabled={!canEditMeta}
                className={canEditMeta ? inputClass : disabledInputClass}
                required={isbnStatus === "new" || allowEdit || !isbn}
              />
            </div>

            {/* Input Price */}
            <div className="mb-4">
              <label className="block text-gray-900 font-medium">
                Giá mượn (phí mượn sách)
              </label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Nhập giá mượn"
                disabled={!canEditMeta}
                className={canEditMeta ? inputClass : disabledInputClass}
                required={isbnStatus === "new" || allowEdit}
              />
            </div>

            {/* Input Quantity (BookCopy) */}
            <div className="mb-4">
              <label className="block text-gray-900 font-medium">
                Số bản sao muốn thêm
              </label>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className={inputClass}
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Mã cuốn sẽ tự sinh và tăng dần theo số lượng bạn nhập.
              </p>
            </div>

            {/* Select Categories */}
            <div className="mb-4">
              <label className="block text-gray-900 font-medium">
                Thể loại (tối đa {MAX_CATEGORIES})
              </label>

              <div
                className={`mt-2 border-2 rounded-md p-3 ${canEditMeta
                  ? "border-gray-300 bg-white"
                  : "border-gray-200 bg-gray-100 cursor-not-allowed"
                  }`}
              >
                {allCategories.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    Chưa tải được danh sách thể loại.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {allCategories.map((c) => {
                      const checked = selectedCategoryIds.includes(c._id);
                      return (
                        <button
                          key={c._id}
                          type="button"
                          onClick={() => {
                            if (!canEditMeta) {
                              toast.info("Bật chỉnh sửa để thay đổi thể loại.");
                              return;
                            }
                            toggleCategory(c._id);
                          }}
                          className={`px-3 py-1 rounded-md text-sm font-semibold transition border ${checked
                            ? "bg-[#EDE9FE] text-[#5B21B6] border-[#C4B5FD]"
                            : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                            } ${!canEditMeta ? "opacity-60 cursor-not-allowed" : ""}`}
                          title={c?.description || c?.name}
                        >
                          {c?.name}
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="mt-2 text-xs text-gray-500">
                  Đã chọn:{" "}
                  <span className="font-semibold text-gray-700">
                    {selectedCategoryIds.length}/{MAX_CATEGORIES}
                  </span>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-gray-900 font-medium">Mô tả</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={canEditDescription ? inputClass : disabledInputClass}
                rows={3}
                disabled={!canEditDescription}
                required={isbnStatus === "new" || allowEdit}
              />
            </div>

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 transition"
                onClick={() => dispatch(toggleAddBookPopup())}
                disabled={loading}
              >
                Đóng
              </button>

              <button
                type="submit"
                disabled={loading}
                className={`px-4 py-2 rounded-md transition text-white ${loading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-[#C41526] hover:bg-[#A81220]"
                  }`}
              >
                {loading ? "Đang thêm..." : "Thêm"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddBookPopup;