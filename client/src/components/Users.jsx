import React, { useEffect, useMemo, useState } from "react";
import axiosClient from "../api/axiosClient";
import { Search, Lock, Unlock, Trash2, RotateCcw } from "lucide-react";
import { toast } from "react-toastify";
import { useSelector, useDispatch } from "react-redux";
import Header from "../layout/Header";
import { fetchAllUsers } from "../store/slices/userSlice";

/**
 * Users - Component Quản lý Người dùng (Dành cho Admin)
 * 
 * Chức năng:
 * - Hiển thị danh sách user.
 * - Lọc theo Tab: Chưa xóa (Active) / Đã xóa (Deleted).
 * - Tìm kiếm theo Tên / Email.
 * - Thao tác: Khóa/Mở khóa tài khoản, Xóa mềm, Khôi phục.
 */
const Users = () => {
  const { users } = useSelector((state) => state.user);

  const [localUsers, setLocalUsers] = useState([]);
  const [searchedKeyword, setSearchedKeyword] = useState("");
  const [viewDeleted, setViewDeleted] = useState(false); // Tab state
  const [loadingMap, setLoadingMap] = useState({}); // Trạng thái loading từng nút

  const dispatch = useDispatch();

  // Load danh sách user khi chuyển tab
  useEffect(() => {
    dispatch(fetchAllUsers(viewDeleted ? "deleted" : "active"));
  }, [viewDeleted, dispatch]);

  // Sync redux state vào local state
  useEffect(() => {
    setLocalUsers(users || []);
  }, [users]);

  // Helper format ngày tháng
  const formatDate = (timeStamp) => {
    if (!timeStamp) return "—";
    const date = new Date(timeStamp);

    const formattedDate = `${String(date.getDate()).padStart(2, "0")}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}-${date.getFullYear()}`;

    const formattedTime = `${String(date.getHours()).padStart(2, "0")}:${String(
      date.getMinutes()
    ).padStart(2, "0")}`;

    return `${formattedDate} ${formattedTime}`;
  };

  /**
   * Filter users theo từ khóa tìm kiếm
   */
  const filteredUsers = useMemo(() => {
    const key = searchedKeyword.trim().toLowerCase();
    let list = localUsers || [];

    // Chỉ lấy đúng theo tab hiện tại
    list = list.filter((u) => (viewDeleted ? !!u?.isDeleted : !u?.isDeleted));

    if (!key) return list;

    return list.filter((u) => {
      const name = (u?.name || "").toLowerCase();
      const email = (u?.email || "").toLowerCase();
      return name.includes(key) || email.includes(key);
    });
  }, [localUsers, searchedKeyword, viewDeleted]);

  // Set trạng thái loading cho từng user
  const setBusy = (id, busy) =>
    setLoadingMap((prev) => ({ ...prev, [id]: !!busy }));

  // Update local state sau khi thao tác API thành công
  const patchLocalUser = (updatedUser) => {
    setLocalUsers((prev) =>
      (prev || []).map((u) => (u._id === updatedUser._id ? updatedUser : u))
    );
  };

  /**
   * Xử lý Khóa / Mở khóa tài khoản
   * PATCH /api/v1/user/:id/lock
   */
  const handleLockToggle = async (u) => {
    try {
      setBusy(u._id, true);
      const nextLocked = !u.isLocked;

      const { data } = await axiosClient.patch(
        `/user/${u._id}/lock`,
        { locked: nextLocked } // body: { locked: true/false }
      );

      toast.success(
        data?.message ||
        (nextLocked ? "Đã khóa tài khoản." : "Đã mở khóa tài khoản.")
      );

      if (data?.user) patchLocalUser(data.user);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Thao tác thất bại.");
    } finally {
      setBusy(u._id, false);
    }
  };

  /**
   * Xử lý Xóa mềm user
   * PATCH /api/v1/user/:id/soft-delete
   */
  const handleDelete = async (u) => {
    try {
      setBusy(u._id, true);

      const { data } = await axiosClient.patch(
        `/user/${u._id}/soft-delete`,
        {}
      );

      toast.success(data?.message || "Đã xóa người dùng.");
      if (data?.user) patchLocalUser(data.user);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Xóa thất bại.");
    } finally {
      setBusy(u._id, false);
    }
  };

  /**
   * Xử lý Khôi phục user
   * PATCH /api/v1/user/:id/restore
   */
  const handleRestore = async (u) => {
    try {
      setBusy(u._id, true);

      const { data } = await axiosClient.patch(
        `/user/${u._id}/restore`,
        {}
      );

      toast.success(data?.message || "Đã khôi phục người dùng.");
      if (data?.user) patchLocalUser(data.user);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Khôi phục thất bại.");
    } finally {
      setBusy(u._id, false);
    }
  };

  return (
    <>
      <main className="relative flex-1 p-6 pt-28">
        <Header />

        {/* --- Header / Filter Controls --- */}
        <div className="bg-white rounded-xl shadow-md border border-[#FDE8EA] p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl md:text-2xl font-semibold text-[#C41526]">
                Quản lý người dùng
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Tab "Chưa xóa" và "Đã xóa". Xóa có thể khôi phục.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              {/* Search Box */}
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm theo tên hoặc email..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none"
                  value={searchedKeyword}
                  onChange={(e) => setSearchedKeyword(e.target.value)}
                />
              </div>

              {/* Toggle Tab */}
              <button
                type="button"
                onClick={() => setViewDeleted((v) => !v)}
                className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold transition border ${viewDeleted
                  ? "bg-[#FDE8EA] border-[#C41526] text-[#C41526]"
                  : "bg-white border-gray-200 text-gray-700 hover:border-[#C41526] hover:bg-[#FDE8EA]"
                  }`}
              >
                {viewDeleted ? "Đã xóa" : "Chưa xóa"}
              </button>
            </div>
          </div>
        </div>

        {/* --- List Table --- */}
        <div className="mt-6 bg-white rounded-xl shadow-lg border border-[#FDE8EA] overflow-hidden">
          <div className="px-5 py-3 border-b border-[#FDE8EA] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#C41526]" />
              <span className="font-semibold text-gray-800">
                Tổng: {filteredUsers.length} người dùng
              </span>
            </div>
          </div>

          {filteredUsers && filteredUsers.length > 0 ? (
            <div className="overflow-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="bg-[#FDE8EA]">
                    <th className="px-4 py-3 text-left text-base font-bold text-[#C41526]">
                      STT
                    </th>
                    <th className="px-4 py-3 text-left text-base font-bold text-[#C41526]">
                      Tên
                    </th>
                    <th className="px-4 py-3 text-left text-base font-bold text-[#C41526]">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-base font-bold text-[#C41526]">
                      Vai trò
                    </th>
                    <th className="px-4 py-3 text-left text-base font-bold text-[#C41526]">
                      Trạng thái
                    </th>
                    <th className="px-4 py-3 text-left text-base font-bold text-[#C41526]">
                      Ngày tạo
                    </th>
                    <th className="px-4 py-3 text-center text-base font-bold text-[#C41526]">
                      Thao tác
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredUsers.map((u, index) => {
                    const isBusy = !!loadingMap[u._id];
                    const isAdmin =
                      String(u?.role || "").toLowerCase() === "admin";

                    const statusBadge = u?.isDeleted ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-md text-sm font-semibold bg-[#FDE8EA] text-[#C41526]">
                        Đã xóa
                      </span>
                    ) : u?.isLocked ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-md text-sm font-semibold bg-[#FFF7E6] text-[#B45309]">
                        Đã khóa
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 rounded-md text-sm font-semibold bg-[#E9FBEF] text-[#0F7A2A]">
                        Hoạt động
                      </span>
                    );

                    return (
                      <tr
                        key={u._id}
                        className={`border-t border-gray-100 ${(index + 1) % 2 === 0 ? "bg-gray-50" : "bg-white"
                          } hover:bg-[#FFF5F6] transition`}
                      >
                        <td className="px-4 py-3">{index + 1}</td>
                        <td className="px-4 py-3 font-bold text-gray-900">
                          {u?.name || "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {u?.email || "—"}
                        </td>
                        <td className="px-4 py-3">
                          {String(u?.role || "User").toLowerCase() === "admin" ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-md text-sm font-semibold bg-[#EEF2FF] text-[#3730A3]">
                              Admin
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-md text-sm font-semibold bg-[#E9FBEF] text-[#0F7A2A]">
                              User
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3">{statusBadge}</td>
                        <td className="px-4 py-3">{formatDate(u?.createdAt)}</td>

                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            {/* ✅ TAB ĐÃ XÓA: chỉ hiện 1 nút Khôi phục */}
                            {viewDeleted ? (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleRestore(u)}
                                className={`p-2 rounded-lg border border-gray-200 transition ${isBusy
                                  ? "opacity-50 cursor-not-allowed"
                                  : "hover:border-[#C41526] hover:bg-[#FDE8EA]"
                                  }`}
                                title="Khôi phục"
                              >
                                <RotateCcw className="w-5 h-5 text-[#C41526]" />
                              </button>
                            ) : (
                              <>
                                {/* ✅ TAB CHƯA XÓA: không có nút khôi phục */}
                                {isAdmin ? (
                                  <span
                                    className="px-2 text-sm text-gray-400 select-none"
                                    title="Không có thao tác cho Admin"
                                  >
                                    —
                                  </span>
                                ) : (
                                  <>
                                    {/* Lock/Unlock */}
                                    <button
                                      type="button"
                                      disabled={isBusy}
                                      onClick={() => handleLockToggle(u)}
                                      className={`p-2 rounded-lg border border-gray-200 transition ${isBusy
                                        ? "opacity-50 cursor-not-allowed"
                                        : "hover:border-[#C41526] hover:bg-[#FDE8EA]"
                                        }`}
                                      title={
                                        u?.isLocked
                                          ? "Mở khóa"
                                          : "Khóa tài khoản"
                                      }
                                    >
                                      {u?.isLocked ? (
                                        <Unlock className="w-5 h-5 text-[#C41526]" />
                                      ) : (
                                        <Lock className="w-5 h-5 text-[#C41526]" />
                                      )}
                                    </button>

                                    {/* Delete */}
                                    <button
                                      type="button"
                                      disabled={isBusy}
                                      onClick={() => handleDelete(u)}
                                      className={`p-2 rounded-lg border border-gray-200 transition ${isBusy
                                        ? "opacity-50 cursor-not-allowed"
                                        : "hover:border-[#C41526] hover:bg-[#FDE8EA]"
                                        }`}
                                      title="Xóa"
                                    >
                                      <Trash2 className="w-5 h-5 text-[#C41526]" />
                                    </button>
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6">
              <h3 className="text-lg font-semibold text-[#C41526]">
                Không có người dùng nào.
              </h3>
              <p className="text-gray-600 mt-1">
                Thử đổi tab hoặc nhập từ khoá khác.
              </p>
            </div>
          )}
        </div>
      </main>
    </>
  );
};

export default Users;