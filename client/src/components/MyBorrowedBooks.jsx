import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Header from "../layout/Header";
import { toast } from "react-toastify";
import {
  fetchUserBorrowedBooks,
  renewBorrowedBook,
  resetBorrowSlice,
} from "../store/slices/borrowSlice";

const MyBorrowedBooks = ({ defaultFilter = "returned" }) => {
  const dispatch = useDispatch();

  const { userBorrowedBooks, message, error } = useSelector(
    (state) => state.borrow
  );

  const formatDate = (timeStamp) => {
    const date = new Date(timeStamp);

    const formattedDate = `${String(date.getDate()).padStart(2, "0")}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}-${date.getFullYear()}`;

    const formattedTime = `${String(date.getHours()).padStart(
      2,
      "0"
    )}:${String(date.getMinutes()).padStart(2, "0")}:${String(
      date.getSeconds()
    ).padStart(2, "0")}`;

    return `${formattedDate} ${formattedTime}`;
  };

  const [filter, setFilter] = useState(defaultFilter);

  useEffect(() => {
    if (defaultFilter) setFilter(defaultFilter);
  }, [defaultFilter]);

  useEffect(() => {
    if (message) {
      toast.success(message);
      dispatch(fetchUserBorrowedBooks());
      dispatch(resetBorrowSlice());
    }

    if (error) {
      toast.error(error);
      dispatch(resetBorrowSlice());
    }
  }, [dispatch, message, error]);

  const maxRenewals = 2;

  const returnedBooks = userBorrowedBooks?.filter(
    (book) => book.returned === true
  );
  const nonReturnedBooks = userBorrowedBooks?.filter(
    (book) => book.returned === false
  );

  const booksToDisplay = filter === "returned" ? returnedBooks : nonReturnedBooks;

  return (
    <>
      <main className="relative flex-1 p-6 pt-28">
        <Header />

        <header className="flex flex-col gap-3 md:flex-row md:justify-between md:items-center">
          <h2 className="text-xl font-medium md:text-2xl md:font-semibold text-[#C41526]">
            Sách bạn đã mượn
          </h2>
        </header>

        <header className="flex flex-col gap-3 sm:flex-row md:items-center mt-4">
          <button
            className={`relative rounded sm:rounded-tr-none sm:rounded-br-none sm:rounded-tl-lg sm:rounded-bl-lg
            text-center border-2 font-semibold py-2 w-full sm:w-72 transition ${
              filter === "returned"
                ? "bg-[#C41526] text-white border-[#C41526]"
                : "bg-gray-200 text-black border-gray-200 hover:bg-gray-300"
            }`}
            onClick={() => setFilter("returned")}
          >
            Sách đã trả
          </button>

          <button
            className={`relative rounded sm:rounded-tl-none sm:rounded-bl-none sm:rounded-tr-lg sm:rounded-br-lg
            text-center border-2 font-semibold py-2 w-full sm:w-72 transition ${
              filter === "nonReturned"
                ? "bg-[#C41526] text-white border-[#C41526]"
                : "bg-gray-200 text-black border-gray-200 hover:bg-gray-300"
            }`}
            onClick={() => setFilter("nonReturned")}
          >
            Sách chưa trả
          </button>
        </header>

        {booksToDisplay && booksToDisplay.length > 0 ? (
          <div className="mt-6 overflow-auto bg-white rounded-md shadow-lg border-t-4 border-[#C41526]">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-[#FDE8EA]">
                  <th className="px-6 py-3 text-left text-base font-bold text-[#C41526]">
                    STT
                  </th>
                  <th className="px-6 py-3 text-left text-base font-bold text-[#C41526]">
                    Tên sách
                  </th>
                  <th className="px-6 py-3 text-left text-base font-bold text-[#C41526]">
                    Ngày giờ mượn
                  </th>
                  <th className="px-6 py-3 text-left text-base font-bold text-[#C41526]">
                    Hạn trả
                  </th>
                  <th className="px-6 py-3 text-left text-base font-bold text-[#C41526]">
                    Trạng thái
                  </th>
                  <th className="px-6 py-3 text-left text-base font-bold text-[#C41526]">
                    Gia hạn
                  </th>
                </tr>
              </thead>

              <tbody>
                {booksToDisplay.map((book, index) => {
                  const today = new Date();
                  const dueDate = book.dueDate ? new Date(book.dueDate) : null;
                  const isOverdue = dueDate ? dueDate <= today : false;
                  const renewCount = book.renewCount || 0;
                  const isDisabled =
                    book.returned || isOverdue || renewCount >= maxRenewals;

                  return (
                    <tr
                      key={index}
                      className={(index + 1) % 2 === 0 ? "bg-gray-50" : ""}
                    >
                      <td className="px-4 py-2">{index + 1}</td>
                      <td className="px-4 py-2">{book.bookTitle}</td>
                      <td className="px-4 py-2">
                        {formatDate(book.borrowedDate)}
                      </td>
                      <td className="px-4 py-2">{formatDate(book.dueDate)}</td>

                      <td className="px-4 py-2">
                        {book.returned ? (
                          <span className="inline-flex items-center px-5 py-1 rounded-md text-sm font-semibold bg-[#E9FBEF] text-[#0F7A2A]">
                            Đã trả
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-4 py-1 rounded-md text-sm font-semibold bg-[#FDE8EA] text-[#C41526]">
                            Chưa trả
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-2">
                        <div className="flex flex-col gap-2">
                          <span className="text-xs text-gray-500">
                            Lần {renewCount}/{maxRenewals}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              dispatch(renewBorrowedBook(book.borrowId))
                            }
                            disabled={isDisabled}
                            className="px-3 py-1 rounded-md border border-[#FDE8EA] text-sm font-semibold text-[#C41526] hover:bg-[#FDE8EA] disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {book.returned
                              ? "Đã trả"
                              : isOverdue
                              ? "Quá hạn"
                              : renewCount >= maxRenewals
                              ? "Hết lượt"
                              : "Gia hạn +7 ngày"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : filter === "returned" ? (
          <h3 className="text-3xl mt-5 font-medium text-[#C41526]">
            Không có sách đã trả!
          </h3>
        ) : (
          <h3 className="text-3xl mt-5 font-medium text-[#C41526]">
            Không có sách chưa trả!
          </h3>
        )}
      </main>
    </>
  );
};

export default MyBorrowedBooks;