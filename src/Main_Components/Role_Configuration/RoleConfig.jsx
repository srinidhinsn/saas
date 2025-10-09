import React, { useState } from "react";

const RoleConfigUI = () => {
  const [accessiblePages, setAccessiblePages] = useState([
    "Dashboard",
    "Orders",
    "Menu",
    "Tables",
    "Reports",
  ]);
  const [nonAccessiblePages, setNonAccessiblePages] = useState([
    "Invoice",
    "KDS",
    "Notifications",
    "Users",
    "Documents",
  ]);

  const [selectedAccessible, setSelectedAccessible] = useState([]);
  const [selectedNonAccessible, setSelectedNonAccessible] = useState([]);

  const moveRight = () => {
    setAccessiblePages([...accessiblePages, ...selectedNonAccessible]);
    setNonAccessiblePages(nonAccessiblePages.filter(p => !selectedNonAccessible.includes(p)));
    setSelectedNonAccessible([]);
  };

  const moveLeft = () => {
    setNonAccessiblePages([...nonAccessiblePages, ...selectedAccessible]);
    setAccessiblePages(accessiblePages.filter(p => !selectedAccessible.includes(p)));
    setSelectedAccessible([]);
  };

  const toggleSelection = (item, selectedList, setSelectedList) => {
    if (selectedList.includes(item)) {
      setSelectedList(selectedList.filter(i => i !== item));
    } else {
      setSelectedList([...selectedList, item]);
    }
  };

  return (
    <div className="role-config-container">
      <div className="box non-accessible">
        <h3>Non-Accessible Pages</h3>
        <ul>
          {nonAccessiblePages.map(page => (
            <li
              key={page}
              className={selectedNonAccessible.includes(page) ? "selected" : ""}
              onClick={() => toggleSelection(page, selectedNonAccessible, setSelectedNonAccessible)}
            >
              {page}
            </li>
          ))}
        </ul>
      </div>

      <div className="controls">
        <button onClick={moveRight}>&gt;</button>
        <button onClick={moveLeft}>&lt;</button>
      </div>

      <div className="box accessible">
        <h3>Accessible Pages</h3>
        <ul>
          {accessiblePages.map(page => (
            <li
              key={page}
              className={selectedAccessible.includes(page) ? "selected" : ""}
              onClick={() => toggleSelection(page, selectedAccessible, setSelectedAccessible)}
            >
              {page}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default RoleConfigUI;
