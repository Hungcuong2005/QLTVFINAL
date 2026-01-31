import React, { useEffect, useRef, useState } from "react";
import axiosClient from "../api/axiosClient";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import {
  toggleCategoryListPopup,
  toggleAddCategoryPopup,
} from "../store/slices/popUpSlice";
import AddCategoryPopup from "./AddCategoryPopup"; // nhớ đúng path

const CategoryListPopup = () => {
  const dispatch = useDispatch();

  // ✅ Redux là nguồn sự thật duy nhất
  const isAddCategoryOpen = useSelector(
    (state) => state?.popup?.addCategoryPopup
  );

  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [justAddedKey, setJustAddedKey] = useState(null);

  const listWrapRef = useRef(null);

  const fetchCategories = async (tag = "normal") => {
    try {
      setLoading(true);
      const res = await axiosClient.get("/category/all");

      setCategories(res.data?.categories || []);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Không lấy được danh sách thể loại!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories("initial");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openAdd = () => dispatch(toggleAddCategoryPopup());
  const closeAdd = () => dispatch(toggleAddCategoryPopup());

  // ✅ Thêm xong: update ngay + refetch để đồng bộ _id
  const handleAdded = async (createdCategory) => {
    if (!createdCategory) return;

    const key =
      createdCategory._id || createdCategory.__tempId || `tmp_${Date.now()}`;
    setJustAddedKey(key);

    // 1) show ngay (prepend)
    setCategories((prev) => {
      const newKey = createdCategory._id || createdCategory.__tempId;
      const exists = prev.some((x) => (x?._id || x?.__tempId) === newKey);
      if (exists) return prev;
      return [createdCategory, ...prev];
    });

    // 2) scroll lên đầu
    requestAnimationFrame(() => {
      if (listWrapRef.current) listWrapRef.current.scrollTop = 0;
    });

    // 3) refetch để lấy data chuẩn từ server
    await fetchCategories("after_add");

    // 4) bỏ highlight
    setTimeout(() => setJustAddedKey(null), 1500);
  };

  return (
    <>
      <style>{`
        .thin-scrollbar { scrollbar-width: thin; scrollbar-color: rgba(0,0,0,.25) transparent; }
        .thin-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .thin-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,.25); border-radius: 999px; }
        .thin-scrollbar::-webkit-scrollbar-track { background: transparent; }
      `}</style>

      <div className="fixed inset-0 bg-black/50 p-3 md:p-5 flex items-center justify-center z-40">
        <div className="w-full bg-white rounded-lg shadow-lg border-t-4 border-[#C41526] md:w-[640px] lg:w-[720px]">
          <div className="p-4 md:p-5">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="text-lg md:text-xl font-bold text-[#C41526]">
                Danh sách thể loại
              </h3>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="px-3 md:px-4 py-2 rounded-lg transition text-white font-semibold bg-[#C41526] hover:bg-[#A81220] text-sm"
                  onClick={openAdd}
                >
                  Thêm thể loại
                </button>

                <button
                  type="button"
                  className="px-3 py-2 bg-gray-200 rounded-md hover:bg-gray-300 transition text-sm"
                  onClick={() => dispatch(toggleCategoryListPopup())}
                >
                  Đóng
                </button>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div
                ref={listWrapRef}
                className="max-h-[340px] md:max-h-[380px] overflow-auto thin-scrollbar"
              >
                <table className="min-w-full text-sm table-fixed">
                  <thead className="bg-[#FDE8EA] text-gray-900">
                    <tr>
                      <th className="text-left px-3 py-3 font-bold text-[#C41526] w-[64px]">
                        STT
                      </th>
                      <th className="text-left px-3 py-3 font-bold text-[#C41526] w-[220px]">
                        Tên thể loại
                      </th>
                      <th className="text-left px-3 py-3 font-bold text-[#C41526] w-auto">
                        Mô tả
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {loading ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-6 text-gray-500">
                          Đang tải danh sách...
                        </td>
                      </tr>
                    ) : categories.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-6 text-gray-500">
                          Chưa có thể loại nào.
                        </td>
                      </tr>
                    ) : (
                      categories.map((c, idx) => {
                        const rowKey = c?._id || c?.__tempId || idx;
                        const isJustAdded = justAddedKey === rowKey;

                        return (
                          <tr
                            key={rowKey}
                            className={`hover:bg-gray-50 ${isJustAdded ? "bg-green-50" : ""
                              }`}
                          >
                            <td className="px-3 py-3 align-top">{idx + 1}</td>
                            <td className="px-3 py-3 font-semibold text-gray-900 align-top break-words">
                              {c?.name}
                              {isJustAdded && (
                                <span className="ml-2 text-xs font-semibold text-green-700">
                                  (vừa thêm)
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-3 text-gray-700 align-top whitespace-normal break-words">
                              {c?.description || "—"}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                className="px-3 py-2 bg-gray-100 rounded-md hover:bg-gray-200 transition text-sm"
                onClick={() => fetchCategories("manual_refresh")}
              >
                Tải lại
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ Add popup chỉ render theo Redux */}
      {isAddCategoryOpen && (
        <AddCategoryPopup onAdded={handleAdded} onClose={closeAdd} />
      )}
    </>
  );
};

export default CategoryListPopup;