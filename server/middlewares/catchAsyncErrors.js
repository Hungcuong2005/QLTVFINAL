// middlewares/catchAsyncErrors.js

/**
 * =====================================================
 * ✅ Middleware: catchAsyncErrors
 * =====================================================
 * CHỨC NĂNG:
 * - Bọc (wrap) các hàm async trong controller / middleware
 * - Tự động bắt lỗi Promise reject hoặc throw error
 * - Đẩy lỗi về Error Handling Middleware (next(error))
 *
 * Mục tiêu giải quyết vấn đề:
 * ❌ Nếu không có middleware này:
 *    - Mỗi controller async phải viết try/catch thủ công
 *    - Code dài, khó đọc, dễ quên catch lỗi
 *
 * ✅ Với catchAsyncErrors:
 *    - Viết controller gọn gàng
 *    - Lỗi async tự động được bắt và xử lý tập trung
 *
 * Cách dùng:
 * export const myController = catchAsyncErrors(async (req, res, next) => {
 *   // code async
 * });
 */
export const catchAsyncErrors = (theFunction) => {
  /**
   * theFunction:
   * - Là hàm async thật sự (controller hoặc middleware)
   * - Có dạng: async (req, res, next) => {}
   */

  return (req, res, next) => {
    /**
     * safeNext:
     * - Đảm bảo luôn có hàm next hợp lệ để gọi
     * - Phòng trường hợp next không được truyền đúng (hiếm nhưng an toàn)
     */
    const safeNext =
      typeof next === "function"
        ? next
        : (error) => {
            // Nếu next không tồn tại -> throw để Node bắt lỗi
            throw error;
          };

    /**
     * Promise.resolve(...):
     * - Ép theFunction về Promise
     * - Nếu theFunction throw error hoặc reject
     *   => .catch(safeNext) sẽ bắt được
     *
     * Tương đương logic:
     * try {
     *   await theFunction(req, res, next)
     * } catch (error) {
     *   next(error)
     * }
     */
    Promise
      .resolve(theFunction(req, res, safeNext))
      .catch(safeNext);
  };
};
