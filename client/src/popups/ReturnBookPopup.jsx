import React, { useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { toggleReturnBookPopup } from "../store/slices/popUpSlice";
import PaymentMethodPopup from "./PaymentMethodPopup";

/**
 * ReturnBookPopup - Popup Xác nhận trả sách
 * 
 * Luồng hoạt động:
 * 1. Hiển thị thông tin cơ bản: Email người mượn, Số tiền phạt/phí cần trả.
 * 2. Khi user bấm "Trả sách" -> Mở tiếp Popup chọn phương thức thanh toán (PaymentMethodPopup).
 * 
 * Props:
 * - borrowId: ID của lượt mượn (Borrow._id)
 * - email: Email người mượn
 * - amount: Tổng số tiền cần thanh toán (Giá sách + Phạt)
 */
const ReturnBookPopup = ({ borrowId, email, amount = 0 }) => {
  const dispatch = useDispatch();

  // State để điều khiển việc hiển thị Popup chọn phương thức thanh toán
  const [showPayment, setShowPayment] = useState(false);

  // Format số tiền sang định dạng tiền tệ Việt Nam (VD: 50.000₫)
  const moneyVND = useMemo(() => {
    if (typeof amount === "number") return `${amount.toLocaleString("vi-VN")}₫`;
    if (amount === null || amount === undefined) return "—";
    return `${amount}₫`;
  }, [amount]);

  // Xử lý khi bấm nút "Trả sách" -> Mở PaymentMethodPopup
  const handleOpenPayment = (e) => {
    e.preventDefault();
    setShowPayment(true);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 p-5 flex items-center justify-center z-50">
        <div className="w-full bg-white rounded-xl shadow-xl md:w-1/3 overflow-hidden border-t-4 border-[#C41526]">
          <div className="p-6">
            <h3 className="text-xl font-bold mb-2 text-[#C41526]">
              Xác nhận trả sách
            </h3>

            <p className="text-sm text-gray-600 mb-4">
              Phí cần thanh toán:{" "}
              <span className="font-semibold text-gray-900">{moneyVND}</span>
            </p>

            <form onSubmit={handleOpenPayment}>
              {/* EMAIL NGƯỜI MƯỢN (Read-only) */}
              <div className="mb-4">
                <label className="block text-gray-900 font-medium">
                  Email người mượn
                </label>
                <input
                  type="email"
                  defaultValue={email}
                  placeholder="Email người mượn"
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-md bg-gray-100 text-gray-700"
                  required
                  disabled
                />
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 transition"
                  onClick={() => dispatch(toggleReturnBookPopup())}
                >
                  Đóng
                </button>

                <button
                  type="submit"
                  className="px-4 py-2 bg-[#C41526] text-white rounded-md hover:bg-[#A81220] transition"
                >
                  Trả sách
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* POPUP CHỌN PHƯƠNG THỨC THANH TOÁN (Cash / Online) */}
      {showPayment && (
        <PaymentMethodPopup
          amount={amount}
          borrowId={borrowId}
          email={email}
          onClose={() => {
            setShowPayment(false);
            dispatch(toggleReturnBookPopup()); // Đóng cả popup cha khi xong
          }}
        />
      )}
    </>
  );
};

export default ReturnBookPopup;