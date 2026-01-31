import React, { useMemo, useState } from "react";
import axiosClient from "../api/axiosClient";
import { useDispatch } from "react-redux";
import { fetchAllBorrowedBooks } from "../store/slices/borrowSlice";

/**
 * PaymentMethodPopup - Popup Chọn phương thức thanh toán
 * 
 * Các phương thức:
 * 1. Tiền mặt (Cash): Nhân viên xác nhận đã thu tiền tại quầy.
 * 2. VNPAY: Chuyển hướng sang cổng thanh toán VNPAY.
 * 3. ZaloPay: (Chưa tích hợp - Disabled).
 * 
 * Props:
 * - amount: Số tiền cần thanh toán.
 * - borrowId: ID lượt mượn sách.
 * - email: Email người mượn.
 */
const PaymentMethodPopup = ({
  amount = 0,
  defaultMethod = "cash",
  onClose,
  borrowId,
  email,
}) => {
  const dispatch = useDispatch();

  const [method, setMethod] = useState(defaultMethod);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Format tiền tệ VNĐ
  const moneyVND = useMemo(() => {
    if (typeof amount === "number") return `${amount.toLocaleString("vi-VN")}₫`;
    if (amount === null || amount === undefined) return "—";
    return `${amount}₫`;
  }, [amount]);

  // Xử lý khi bấm nút "Xác nhận thanh toán"
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validate dữ liệu đầu vào
    if (!borrowId) return setError("Thiếu borrowId (ID lượt mượn).");
    if (!email) return setError("Thiếu email người dùng.");

    if (method === "zalopay") {
      setError("ZaloPay chưa tích hợp. Hãy chọn VNPAY hoặc Tiền mặt.");
      return;
    }

    try {
      setLoading(true);

      // --- BƯỚC 1: Gọi API chuẩn bị thanh toán (Prepare) ---
      // API này sẽ tính toán lại số tiền (bao gồm phạt quá hạn mới nhất)
      // và tạo giao dịch pending.
      const prepareUrl = `/borrow/return/prepare/${borrowId}`;
      const { data } = await axiosClient.post(
        prepareUrl,
        { email, method }
      );

      // --- BƯỚC 2A: Xử lý VNPAY ---
      if (method === "vnpay") {
        if (!data?.paymentUrl) {
          setError("Không nhận được paymentUrl từ server.");
          return;
        }
        // Chuyển hướng trình duyệt sang trang thanh toán VNPAY
        window.location.href = data.paymentUrl;
        return;
      }

      // --- BƯỚC 2B: Xử lý Tiền mặt (Cash) ---
      if (method === "cash") {
        const realAmount = data?.amount ?? amount;

        // Gọi API xác nhận đã thu tiền mặt
        const confirmUrl = `/borrow/return/cash/confirm/${borrowId}`;
        await axiosClient.post(confirmUrl, { email });

        // Refresh lại danh sách và đóng popup
        onClose?.();
        await dispatch(fetchAllBorrowedBooks());

        alert(
          `Thanh toán tiền mặt thành công.\nSố tiền đã thu: ${Number(
            realAmount
          ).toLocaleString("vi-VN")}₫`
        );
      }
    } catch (err) {
      const status = err?.response?.status;
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Có lỗi khi tạo thanh toán. Vui lòng thử lại.";
      setError(status ? `${msg} (HTTP ${status})` : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 p-5 flex items-center justify-center z-50">
      <div className="w-full bg-white rounded-xl shadow-xl md:w-1/3 overflow-hidden border-t-4 border-[#C41526]">
        <div className="p-6">
          <h3 className="text-xl font-bold mb-2 text-[#C41526]">
            Chọn phương thức thanh toán
          </h3>

          <p className="text-sm text-gray-600 mb-4">
            Số tiền cần thanh toán:{" "}
            <span className="font-semibold text-gray-900">{moneyVND}</span>
          </p>

          {/* Hiển thị lỗi nếu có */}
          {error && (
            <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="space-y-3 mb-6">

              {/* Option 1: Tiền mặt */}
              <label className="flex items-center gap-3 p-3 rounded-lg border-2 border-gray-200 hover:border-[#C41526] hover:bg-[#FDE8EA] transition cursor-pointer">
                <input
                  type="radio"
                  name="payment"
                  value="cash"
                  checked={method === "cash"}
                  onChange={() => setMethod("cash")}
                  className="accent-[#C41526]"
                  disabled={loading}
                />
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">Tiền mặt</p>
                  <p className="text-sm text-gray-600">
                    Thanh toán trực tiếp tại quầy.
                  </p>
                </div>
              </label>

              {/* Option 2: ZaloPay */}
              <label className="flex items-center gap-3 p-3 rounded-lg border-2 border-gray-200 hover:border-[#C41526] hover:bg-[#FDE8EA] transition cursor-pointer">
                <input
                  type="radio"
                  name="payment"
                  value="zalopay"
                  checked={method === "zalopay"}
                  onChange={() => setMethod("zalopay")}
                  className="accent-[#C41526]"
                  disabled={loading}
                />
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">ZaloPay</p>
                  <p className="text-sm text-gray-600">
                    Quét QR hoặc chuyển khoản qua ZaloPay.
                  </p>
                </div>
              </label>

              {/* Option 3: VNPAY */}
              <label className="flex items-center gap-3 p-3 rounded-lg border-2 border-gray-200 hover:border-[#C41526] hover:bg-[#FDE8EA] transition cursor-pointer">
                <input
                  type="radio"
                  name="payment"
                  value="vnpay"
                  checked={method === "vnpay"}
                  onChange={() => setMethod("vnpay")}
                  className="accent-[#C41526]"
                  disabled={loading}
                />
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">VNPAY</p>
                  <p className="text-sm text-gray-600">
                    Thanh toán qua cổng VNPAY.
                  </p>
                </div>
              </label>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 transition disabled:opacity-60"
                onClick={onClose}
                disabled={loading}
              >
                Đóng
              </button>

              <button
                type="submit"
                className="px-4 py-2 bg-[#C41526] text-white rounded-md hover:bg-[#A81220] transition disabled:opacity-60"
                disabled={loading}
              >
                {loading ? "Đang xử lý..." : "Xác nhận thanh toán"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PaymentMethodPopup;