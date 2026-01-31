import React, { useState } from "react";
import axiosClient from "../api/axiosClient";
import { toast } from "react-toastify";

/**
 * AddCategoryPopup - Popup thêm thể loại sách mới
 * 
 * Chức năng:
 * - Nhập tên và mô tả thể loại.
 * - Gọi API thêm mới.
 * - Refresh lại danh sách category ở component cha.
 */
const AddCategoryPopup = ({ onAdded, onClose }) => {

    const [loading, setLoading] = useState(false);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate tên thể loại
        const trimmedName = name.trim();
        if (!trimmedName) {
            toast.error("Vui lòng nhập tên thể loại!");
            return;
        }

        try {
            setLoading(true);

            // Gọi API thêm category
            const res = await axiosClient.post("/category/admin/add", {
                name: trimmedName,
                description,
            });

            const data = res.data;

            // Tạo object category tạm thời để update UI ngay lập tức
            const createdCategory =
                data?.category ||
                ({
                    __tempId: `tmp_${Date.now()}`,
                    name: trimmedName,
                    description,
                });

            // Callback báo cho component cha biết đã thêm thành công
            if (typeof onAdded === "function") {
                await onAdded(createdCategory);
            }

            toast.success(data?.message || "Thêm thể loại thành công!");

            // Phát sự kiện toàn cục để các component khác (nếu có) refresh lại list
            window.dispatchEvent(new Event("category:refresh"));

            // Đóng popup
            if (typeof onClose === "function") onClose();

            // Reset form
            setName("");
            setDescription("");
        } catch (err) {
            toast.error(err?.response?.data?.message || "Thêm thể loại thất bại!");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 p-5 flex items-center justify-center z-50">
            <div className="w-full bg-white rounded-lg shadow-lg md:w-2/3 lg:w-1/2 border-t-4 border-[#C41526]">
                <div className="p-6">
                    <div className="flex items-center justify-between gap-3 mb-4">
                        <h3 className="text-xl font-bold text-[#C41526]">Thêm thể loại</h3>

                        <button
                            type="button"
                            className="px-3 py-2 bg-gray-200 rounded-md hover:bg-gray-300 transition text-sm"
                            onClick={onClose}
                            disabled={loading}
                        >
                            Đóng
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Nhập Tên Category */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                                Tên thể loại <span className="text-[#C41526]">*</span>
                            </label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-0 focus:border-gray-300"
                                placeholder="Ví dụ: Khoa học, Văn học, CNTT..."
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                disabled={loading}
                            />
                        </div>

                        {/* Nhập Mô tả (Optional) */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                                Mô tả
                            </label>
                            <textarea
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-0 focus:border-gray-300"
                                placeholder="(Không bắt buộc)"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                disabled={loading}
                            />
                        </div>

                        {/* Button Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full px-4 py-2 rounded-lg transition text-white font-semibold ${loading
                                ? "bg-gray-400 cursor-not-allowed"
                                : "bg-[#C41526] hover:bg-[#A81220]"
                                }`}
                        >
                            {loading ? "Đang thêm..." : "Thêm thể loại"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AddCategoryPopup;