import React, { useState, useEffect } from "react";
import axiosClient from "../api/axiosClient";
import { useDispatch } from "react-redux";
import { recordBorrowBook } from "../store/slices/borrowSlice";
import { toggleRecordBookPopup } from "../store/slices/popUpSlice";
import { toast } from "react-toastify";

/**
 * RecordBookPopup - Popup Ghi nhận mượn sách (Dành cho Admin)
 * 
 * Luồng hoạt động:
 * 1. Admin mở popup từ danh sách sách.
 * 2. Hệ thống tải danh sách các bản sao (BookCopy) đang có sẵn (Available).
 * 3. Admin nhập Email người mượn và chọn Mã cuốn sách (Copy Code) cụ thể.
 * 4. Gửi yêu cầu mượn lên server.
 * 
 * Props:
 * - bookId: ID của đầu sách (Book) cần mượn.
 */
const RecordBookPopup = ({ bookId }) => {
  const dispatch = useDispatch();
  const [email, setEmail] = useState("");
  const [availableCopies, setAvailableCopies] = useState([]);
  const [selectedCopyId, setSelectedCopyId] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ Lấy danh sách BookCopy available khi mở popup
  useEffect(() => {
    if (bookId) {
      fetchAvailableCopies();
    }
  }, [bookId]);

  /**
   * Gọi API lấy danh sách các bản sao đang rảnh
   */
  const fetchAvailableCopies = async () => {
    setLoading(true);
    try {
      const { data } = await axiosClient.get(
        `/book/${bookId}/available-copies`
      );

      if (data.success && data.copies) {
        setAvailableCopies(data.copies);
        // Tự động chọn cuốn đầu tiên nếu có để tiện thao tác
        if (data.copies.length > 0) {
          setSelectedCopyId(data.copies[0]._id);
        }
      }
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Không thể tải danh sách bản sao."
      );
      setAvailableCopies([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Xử lý sự kiện Ghi nhận mượn
   */
  const handleRecordBook = (e) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error("Vui lòng nhập email người mượn.");
      return;
    }

    if (!selectedCopyId) {
      toast.error("Vui lòng chọn mã cuốn sách.");
      return;
    }

    // ✅ Gửi dispatch action: Cần cả Email người dùng và ID bản sao cụ thể
    dispatch(recordBorrowBook(email, bookId, selectedCopyId));
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 p-5 flex items-center justify-center z-50">
        <div className="w-full bg-white rounded-xl shadow-xl md:w-1/3 overflow-hidden border-t-4 border-[#C41526]">
          <div className="p-6">
            <h3 className="text-xl font-bold mb-4 text-[#C41526]">
              Ghi nhận mượn sách
            </h3>

            {loading ? (
              // Loading state
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C41526]"></div>
                <span className="ml-3 text-gray-600">Đang tải...</span>
              </div>
            ) : (
              <form onSubmit={handleRecordBook}>
                {/* Email người mượn */}
                <div className="mb-4">
                  <label className="block text-gray-900 font-medium mb-2">
                    Email người mượn
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Nhập email người mượn"
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-md focus:outline-none"
                    required
                  />
                </div>

                {/* Chọn mã BookCopy */}
                <div className="mb-4">
                  <label className="block text-gray-900 font-medium mb-2">
                    Chọn mã cuốn sách
                    <span className="text-sm text-gray-500 ml-2">
                      ({availableCopies.length} cuốn có sẵn)
                    </span>
                  </label>

                  {availableCopies.length > 0 ? (
                    <select
                      value={selectedCopyId}
                      onChange={(e) => setSelectedCopyId(e.target.value)}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-md focus:outline-none"
                      required
                    >
                      {availableCopies.map((copy) => (
                        <option key={copy._id} value={copy._id}>
                          {copy.copyCode}
                          {copy.notes ? ` - ${copy.notes}` : ""}
                        </option>
                      ))}
                    </select>
                  ) : (
                    // Thông báo khi hết sách
                    <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-red-600 font-semibold">
                        ⚠️ Không còn bản sao nào có sẵn!
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        Vui lòng chọn sách khác hoặc đợi người dùng trả sách.
                      </p>
                    </div>
                  )}
                </div>

                {/* Hiển thị thông tin chi tiết của cuốn đã chọn */}
                {selectedCopyId && availableCopies.length > 0 && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">Mã cuốn đã chọn:</span>{" "}
                      {
                        availableCopies.find((c) => c._id === selectedCopyId)
                          ?.copyCode
                      }
                    </p>
                    <p className="text-sm text-gray-700 mt-1">
                      <span className="font-semibold">Trạng thái:</span>{" "}
                      <span className="text-green-600 font-semibold">
                        Sẵn sàng cho mượn
                      </span>
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end space-x-4 mt-6">
                  <button
                    type="button"
                    className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 transition"
                    onClick={() => dispatch(toggleRecordBookPopup())}
                  >
                    Đóng
                  </button>

                  <button
                    type="submit"
                    disabled={availableCopies.length === 0}
                    className="px-4 py-2 bg-[#C41526] text-white rounded-md hover:bg-[#A81220] transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Ghi nhận
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default RecordBookPopup;