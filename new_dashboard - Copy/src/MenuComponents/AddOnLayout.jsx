import React, { useState } from "react";
import AddonGroupList from './AddOnGroupManager'
import AddonItemManager from './AddOnItemManager'

function AddonLayout({ clientId }) {
  const [selectedGroup, setSelectedGroup] = useState(null);

  return (
    <div className="menu-manager-item-view">
      <div className="menu-category-sidebar">
        <AddonGroupList clientId={clientId} onGroupSelect={setSelectedGroup} />
      </div>
      <div className="menu-items-panel">
        <AddonItemManager group={selectedGroup} />
      </div>
    </div>
  );
}

export default AddonLayout;
