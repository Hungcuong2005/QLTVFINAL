import React, { useEffect, useMemo, useState } from "react";
import { BookA, Search, Tag } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import {
  toggleReadBookPopup,
} from "../store/slices/popUpSlice";
import { fetchAllBooks, resetBookSlice } from "../store/slices/bookSlice";
import Header from "../layout/Header";
import ReadBookPopup from "../popups/ReadBookPopup";
import axiosClient from "../api/axiosClient";

const MAX_CATEGORIES = 3;

// ✅ PLACEHOLDER IMAGE
const PLACEHOLDER_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='140' viewBox='0 0 100 140'%3E%3Crect width='100' height='140' fill='%23FDE8EA'/%3E%3Ctext x='50%25' y='50%25' font-family='Arial' font-size='14' fill='%23C41526' text-anchor='middle' dy='.3em'%3ENo Image%3C/text%3E%3C/svg%3E";

const BookManagementUser = () => {
  const dispatch = useDispatch();

  // ===== REDUX STATES =====
  const { loading, error, message, books, totalBooks, totalPages } = useSelector(
    (state) => state.book
  );

  const { readBookPopup } = useSelector((state) => state.popup);

  // ===== LOCAL STATES =====
  const [readBook, setReadBook] = useState({});
  const [searchedKeyword, setSearchedKeyword] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortOption, setSortOption] = useState("newest");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12); // 12 sách = 3 dòng x 4 cột

  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [categoriesList, setCategoriesList] = useState([]);
  const [categoryIdToName, setCategoryIdToName] = useState({});

  const fetchCategoryMap = async () => {
    try {
      const res = await axiosClient.get("/category/all");
      const list = res?.data?.categories || [];

      setCategoriesList(list);

      const map = {};
      for (const c of list) {
        if (c?._id && c?.name) map[c._id] = c.name;
      }
      setCategoryIdToName(map);
    } catch (err) {
      setCategoryIdToName({});
      setCategoriesList([]);
    }
  };

  useEffect(() => {
    fetchCategoryMap();
  }, []);

  useEffect(() => {
    const handler = () => fetchCategoryMap();
    window.addEventListener("category:refresh", handler);
    return () => window.removeEventListener("category:refresh", handler);
  }, []);

  // ===== FUNCTIONS =====
  const openReadPopup = (id) => {
    const book = (books || []).find((b) => b._id === id);
    setReadBook(book);
    dispatch(toggleReadBookPopup());
  };

  const getCategoryNames = (book) => {
    const raw =
      book?.categories ||
      book?.categoryIds ||
      book?.categoriesIds ||
      book?.category ||
      [];

    if (!Array.isArray(raw)) return [];

    const names = raw
      .map((x) => {
        if (typeof x === "string") return categoryIdToName[x] || "Không rõ";
        if (x?.name) return x.name;
        if (x?._id) return categoryIdToName[x._id] || "Không rõ";
        return null;
      })
      .filter(Boolean);

    return Array.from(new Set(names)).slice(0, MAX_CATEGORIES);
  };

  const moneyVND = (value) => {
    if (typeof value === "number") return `${value.toLocaleString("vi-VN")}₫`;
    if (value === null || value === undefined) return "—";
    return `${value}₫`;
  };

  // ===== QUERY PARAMS =====
  const queryParams = useMemo(() => {
    const params = {
      page,
      limit,
      sort: sortOption,
      deleted: "active" // User chỉ xem sách active
    };

    const keyword = searchedKeyword.trim();
    if (keyword) params.search = keyword;
    if (availabilityFilter !== "all") params.availability = availabilityFilter;
    if (minPrice !== "") params.minPrice = minPrice;
    if (maxPrice !== "") params.maxPrice = maxPrice;
    if (selectedCategoryId) params.categoryId = selectedCategoryId;

    return params;
  }, [
    page,
    limit,
    sortOption,
    searchedKeyword,
    availabilityFilter,
    minPrice,
    maxPrice,
    selectedCategoryId,
  ]);

  useEffect(() => {
    if (message) {
      dispatch(fetchAllBooks(queryParams));
      dispatch(resetBookSlice());
    }

    if (error) {
      dispatch(resetBookSlice());
    }
  }, [dispatch, message, error, queryParams]);

  useEffect(() => {
    dispatch(fetchAllBooks(queryParams));
  }, [dispatch, queryParams]);

  useEffect(() => {
    if (page > totalPages && totalPages > 0) setPage(totalPages);
  }, [page, totalPages]);

  const searchedBooks = books || [];

  return (
    <>
      <main className="relative flex-1 p-6 pt-28">
        <Header />

        {/* SEARCH & FILTER BAR */}
        <div className="bg-white rounded-xl shadow-md border border-[#FDE8EA] p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl md:text-2xl font-semibold text-[#C41526]">
                Khám phá kho sách
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Tìm kiếm và khám phá các đầu sách trong thư viện
              </p>
            </div>

            <div className="flex flex-col gap-3 rounded-xl border border-[#FDE8EA] bg-[#FFFDFD] p-3 sm:p-4">
              <div className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
                Tìm kiếm & lọc
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Tìm theo tên / tác giả..."
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-0 focus:border-gray-300"
                    value={searchedKeyword}
                    onChange={(e) => {
                      setSearchedKeyword(e.target.value);
                      setPage(1);
                    }}
                  />
                </div>

                <select
                  className="w-full sm:w-auto px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-0 focus:border-gray-300"
                  value={selectedCategoryId}
                  onChange={(e) => {
                    setSelectedCategoryId(e.target.value);
                    setPage(1);
                  }}
                  title="Lọc theo thể loại"
                >
                  <option value="">Tất cả thể loại</option>
                  {categoriesList.map((c) => (
                    <option key={c?._id} value={c?._id}>
                      {c?.name}
                    </option>
                  ))}
                </select>

                <select
                  className="w-full sm:w-auto px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-0 focus:border-gray-300"
                  value={availabilityFilter}
                  onChange={(e) => {
                    setAvailabilityFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="true">Còn sách</option>
                  <option value="false">Hết sách</option>
                </select>

                <select
                  className="w-full sm:w-auto px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-0 focus:border-gray-300"
                  value={sortOption}
                  onChange={(e) => {
                    setSortOption(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="newest">Mới nhất</option>
                  <option value="price_asc">Giá tăng dần</option>
                  <option value="price_desc">Giá giảm dần</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* STATS BAR */}
        <div className="mt-6 bg-white rounded-xl shadow-md border border-[#FDE8EA] px-5 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#C41526]" />
              <span className="font-semibold text-gray-800">
                Tổng: {totalBooks} sách
              </span>
            </div>

            {loading && (
              <span className="text-sm text-gray-500">Đang tải...</span>
            )}
          </div>
        </div>

        {/* BOOKS GRID */}
        {searchedBooks.length > 0 ? (
          <div className="mt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {searchedBooks.map((book) => {
                const categoryNames = getCategoryNames(book);
                const isDeleted = !!book?.isDeleted;

                return (
                  <div
                    key={book._id}
                    className="bg-white rounded-xl shadow-lg border border-[#FDE8EA] overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col"
                  >
                    {/* ẢNH BÌA */}
                    <div className="relative w-full overflow-hidden aspect-[2/3] bg-gray-100">
                      <img
                        src={book?.coverImage?.url || PLACEHOLDER_IMAGE}
                        alt={book?.title || "Book cover"}
                        className="w-full h-full object-cover object-center"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.src = PLACEHOLDER_IMAGE;
                        }}
                      />

                      {/* TRẠNG THÁI BADGE (đè lên ảnh) */}
                      <div className="absolute top-0 right-0 z-20">
                        {book.availability ? (
                          <span className="inline-flex items-center px-3 py-1 text-xs font-bold bg-green-500 text-white shadow-lg rounded-bl-xl">
                            Còn sách
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 text-xs font-bold bg-red-500 text-white shadow-lg rounded-bl-xl">
                            Hết sách
                          </span>
                        )}
                      </div>
                    </div>

                    {/* THÔNG TIN SÁCH */}

                    <div className="p-4 flex-1 flex flex-col">
                      {/* TÊN SÁCH */}
                      <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 min-h-[3.5rem]">
                        {book.title}
                      </h3>

                      {/* TÁC GIẢ */}
                      <p className="text-sm text-gray-600 mb-3">
                        Tác giả: <span className="font-medium">{book.author}</span>
                      </p>

                      {/* THỂ LOẠI */}
                      <div className="mb-3 flex-1">
                        {categoryNames.length === 0 ? (
                          <div className="flex items-center gap-2 text-gray-400 text-sm">
                            <Tag className="w-4 h-4" />
                            <span>Chưa phân loại</span>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {categoryNames.map((name, i) => (
                              <span
                                key={`${book._id}-cat-${i}`}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold bg-[#EDE9FE] text-[#5B21B6]"
                                title={name}
                              >
                                <Tag className="w-3 h-3" />
                                {name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* GIÁ MƯỢN */}
                      <div className="mb-4 pt-3 border-t border-gray-100">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Giá mượn:</span>
                          <span className="text-lg font-bold text-[#C41526]">
                            {moneyVND(book.price)}
                          </span>
                        </div>
                      </div>

                      {/* ACTIONS */}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => openReadPopup(book._id)}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#C41526] text-white font-semibold hover:bg-[#A81220] transition"
                          title="Xem chi tiết"
                        >
                          <BookA className="w-4 h-4" />
                          <span>Xem chi tiết</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mt-6 bg-white rounded-xl shadow-lg border border-[#FDE8EA] p-12 text-center">
            <h3 className="text-2xl font-semibold text-[#C41526] mb-2">
              Không tìm thấy sách!
            </h3>
            <p className="text-gray-600">
              Thử nhập từ khóa khác hoặc điều chỉnh bộ lọc
            </p>
          </div>
        )}

        {/* PAGINATION */}
        <div className="mt-6 bg-white rounded-xl shadow-md border border-[#FDE8EA] px-5 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <span className="font-semibold text-gray-700">
                Hiển thị {searchedBooks.length} / {totalBooks} sách
              </span>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Giá</span>
                <input
                  type="number"
                  min="0"
                  placeholder="Từ"
                  className="w-20 px-2 py-1 border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-0 focus:border-gray-300"
                  value={minPrice}
                  onChange={(e) => {
                    setMinPrice(e.target.value);
                    setPage(1);
                  }}
                />
                <span className="text-gray-400">-</span>
                <input
                  type="number"
                  min="0"
                  placeholder="Đến"
                  className="w-20 px-2 py-1 border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-0 focus:border-gray-300"
                  value={maxPrice}
                  onChange={(e) => {
                    setMaxPrice(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <button
                type="button"
                className="px-3 py-1 rounded-md border border-[#FDE8EA] text-[#C41526] font-semibold hover:bg-[#FDE8EA] transition"
                onClick={() => {
                  setSearchedKeyword("");
                  setAvailabilityFilter("all");
                  setMinPrice("");
                  setMaxPrice("");
                  setSortOption("newest");
                  setSelectedCategoryId("");
                  setPage(1);
                }}
              >
                Xóa lọc
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>Hiển thị</span>
                <select
                  className="px-2 py-1 border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-0 focus:border-gray-300"
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                >
                  <option value={8}>8</option>
                  <option value={12}>12</option>
                  <option value={16}>16</option>
                  <option value={20}>20</option>
                </select>
                <span>sách / trang</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  disabled={page <= 1}
                  className="px-3 py-1 rounded-md border border-gray-200 text-sm font-semibold text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:border-[#C41526] hover:text-[#C41526] transition"
                >
                  Trước
                </button>
                <span className="text-sm text-gray-600">
                  Trang {page} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={page >= totalPages}
                  className="px-3 py-1 rounded-md border border-gray-200 text-sm font-semibold text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:border-[#C41526] hover:text-[#C41526] transition"
                >
                  Sau
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {readBookPopup && <ReadBookPopup book={readBook} />}
    </>
  );
};

export default BookManagementUser;