import React, { useEffect, useMemo, useState } from "react";
import axiosClient from "../api/axiosClient";
import { toast } from "react-toastify";

/**
 * Popup upload/cập nhật ảnh bìa sách
 * - API: PUT /api/v1/book/admin/:id/cover
 * - FormData field: coverImage
 */
const UploadBookCoverPopup = ({ open, onClose, book, onUpdated }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);

  const currentUrl = useMemo(() => book?.coverImage?.url || "", [book]);

  useEffect(() => {
    if (!open) return;
    setFile(null);
    setPreview("");
  }, [open, book?._id]);

  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    const bookId = book?._id;
    if (!bookId) {
      toast.error("Không tìm thấy sách để cập nhật ảnh.");
      return;
    }
    if (!file) {
      toast.error("Vui lòng chọn ảnh.");
      return;
    }

    const allowed = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
    if (!allowed.includes(file.type)) {
      toast.error("Chỉ chấp nhận ảnh JPG/PNG/WEBP.");
      return;
    }

    // ✅ DEBUG: endpoint & baseURL
    const endpoint = `/book/admin/${bookId}/cover`;
    const baseURL = axiosClient?.defaults?.baseURL || "(no baseURL)";
    console.log("🌐 Upload endpoint:", { baseURL, endpoint, full: `${baseURL}${endpoint}` });

    try {
      setLoading(true);

      const fd = new FormData();
      fd.append("coverImage", file);

      // ✅ DEBUG: kiểm tra FormData có field gì
      // (Browser console sẽ in được)
      console.log("📦 FormData entries:");
      for (const [k, v] of fd.entries()) {
        if (v instanceof File) {
          console.log(" -", k, {
            name: v.name,
            type: v.type,
            size: v.size,
            lastModified: v.lastModified,
          });
        } else {
          console.log(" -", k, v);
        }
      }

      // ✅ DEBUG: thông tin file
      console.log("📤 Uploading cover image:", {
        bookId,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
      });

      const res = await axiosClient.put(endpoint, fd);

      console.log("✅ Upload response:", {
        status: res.status,
        statusText: res.statusText,
        headers: res.headers,
        data: res.data,
      });

      const data = res.data;
      if (!data?.success) {
        throw new Error(data?.message || "Cập nhật ảnh thất bại.");
      }

      toast.success(data?.message || "Cập nhật ảnh bìa thành công!");
      onUpdated?.(data.book);
      onClose?.();
    } catch (err) {
      // ✅ DEBUG: log đầy đủ lỗi axios
      const isAxios = !!err?.isAxiosError;
      const status = err?.response?.status;
      const respData = err?.response?.data;
      const respHeaders = err?.response?.headers;

      console.group("❌ Upload error (debug)");
      console.log("isAxiosError:", isAxios);
      console.log("message:", err?.message);
      console.log("code:", err?.code);
      console.log("status:", status);
      console.log("response headers:", respHeaders);
      console.log("response data:", respData);
      console.log("config:", err?.config);
      console.log("stack:", err?.stack);
      console.groupEnd();

      // ✅ Message ưu tiên từ backend
      let errorMsg =
        respData?.message ||
        err?.message ||
        "Có lỗi xảy ra.";

      // ✅ Gợi ý nhanh theo status (để bạn nhìn console là biết ngay)
      if (status === 401) errorMsg = errorMsg || "401: Bạn chưa đăng nhập hoặc phiên hết hạn.";
      if (status === 403) errorMsg = errorMsg || "403: Không đủ quyền (Admin?).";
      if (status === 404) errorMsg = errorMsg || "404: Sai route upload cover.";
      if (status === 413) errorMsg = errorMsg || "413: File quá lớn (vượt giới hạn server).";
      if (status >= 500) errorMsg = errorMsg || "Server lỗi (500+). Xem log backend.";

      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 p-5 flex items-center justify-center z-50">
      <div className="w-full bg-white rounded-xl shadow-xl md:w-1/3 overflow-hidden border-t-4 border-[#C41526]">
        <div className="p-6">
          <h3 className="text-xl font-bold mb-4 text-[#C41526]">
            Cập nhật ảnh bìa
          </h3>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C41526]"></div>
              <span className="ml-3 text-gray-600">Đang tải...</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="flex flex-col items-center">
                  <p className="block text-gray-900 font-medium mb-2">Ảnh hiện tại</p>
                  <div className="mx-auto w-28 sm:w-32 md:w-36 h-44 sm:h-52 md:h-56 bg-gray-100 rounded-md overflow-hidden border-2 border-gray-200 flex items-center justify-center">
                    {currentUrl ? (
                      <img src={currentUrl} alt="Ảnh hiện tại" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm text-gray-500">Chưa có ảnh</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-center">
                  <p className="block text-gray-900 font-medium mb-2">Ảnh mới</p>
                  <div className="mx-auto w-28 sm:w-32 md:w-36 h-44 sm:h-52 md:h-56 bg-gray-100 rounded-md overflow-hidden border-2 border-gray-200 flex items-center justify-center">
                    {preview ? (
                      <img src={preview} alt="Ảnh mới" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm text-gray-500">Chưa chọn ảnh</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-gray-900 font-medium mb-2">Chọn ảnh bìa</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-md focus:outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">Hỗ trợ: JPG/PNG/WEBP (tối đa 5MB).</p>
              </div>

              <div className="flex justify-end space-x-4 mt-6">
                <button
                  type="button"
                  className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 transition"
                  onClick={onClose}
                >
                  Đóng
                </button>

                <button
                  type="submit"
                  disabled={!file}
                  className="px-4 py-2 bg-[#C41526] text-white rounded-md hover:bg-[#A81220] transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Lưu
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadBookCoverPopup;
