import React from "react";
import { useSelector } from "react-redux";

import BookManagementAdmin from "./BookManagementAdmin";
import BookManagementUser from "./BookManagementUser";

const BookManagement = () => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  if (!isAuthenticated || String(user?.role || "").toLowerCase() !== "admin") {
    return <BookManagementUser />;
  }

  return <BookManagementAdmin />;
};

export default BookManagement;