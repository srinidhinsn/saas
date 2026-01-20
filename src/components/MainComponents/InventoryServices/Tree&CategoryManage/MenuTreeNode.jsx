// import { useState } from "react";
// import { MdOutlineKeyboardArrowDown } from "react-icons/md";
// import { RiArrowDropRightLine } from "react-icons/ri";
// import { Edit, Trash2 } from 'lucide-react';

// const MenuTreeNode = ({
//   category,
//   isExpanded,
//   onToggle,
//   isSelected,
//   onSelect,
//   hasChildren,
//   level,
//   onEdit,
//   onDelete
// }) => {
//   const [isHovered, setIsHovered] = useState(false);

//   return (
//     <div className="select-none">
//       <div
//         role="button"
//         tabIndex={0}
//         onClick={onSelect}
//         onMouseEnter={() => setIsHovered(true)}
//         onMouseLeave={() => setIsHovered(false)}
//         onKeyDown={(e) => { if (e.key === 'Enter') onSelect(); }}
//         className={`flex items-center space-x-2 px-3 py-2 rounded-lg cursor-pointer transition-all text-text-primary 
//        ${isSelected ? "bg-action-primary text-text-white" : "bg-bg-primary"} hover:bg-bg-secondary group`}
//       >
//         {hasChildren ? (
//           <button
//             onClick={(e) => { e.stopPropagation(); onToggle(); }}
//             className="focus:outline-none text-text-white hover:text-action-primary transition-colors"
//             aria-label={isExpanded ? 'Collapse' : 'Expand'}
//           >
//             {isExpanded ?
//               <MdOutlineKeyboardArrowDown size={18} /> :
//               <RiArrowDropRightLine size={18} />
//             }
//           </button>
//         ) : (
//           <span className="w-[18px]" />
//         )}

//         <span className={`flex-1 text-sm ${isSelected ? "text-text-white" : "text-text-primary"}`}>
//           {category.name}
//         </span>
//         {category.children && category.children.length > 0 && (
//           <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-bg-tertiary text-text-primary">
//             {category.children.length}
//           </span>
//         )}

//         {/* Action buttons - only show on hover and if callbacks are provided, but hide for "All Categories" */}
//         {(onEdit || onDelete) && category.id !== 'dietery' && category.name !== 'All Categories' && (
//           <div className={`flex gap-1 transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
//             {onEdit && (
//               <button
//                 onClick={(e) => {
//                   e.stopPropagation();
//                   onEdit(category);
//                 }}
//                 className="p-1 hover:bg-action-primary hover:text-white text-text-secondary rounded transition-colors"
//                 title="Edit category"
//               >
//                 <Edit size={14} />
//               </button>
//             )}
//             {onDelete && (
//               <button
//                 onClick={(e) => {
//                   e.stopPropagation();
//                   onDelete(category);
//                 }}
//                 className="p-1 hover:bg-action-danger hover:text-white text-text-secondary rounded transition-colors"
//                 title="Delete category"
//               >
//                 <Trash2 size={14} />
//               </button>
//             )}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default MenuTreeNode;



// -------------------------------------------------------------------   second version  --------------------------------------------- //

// import { RiEdit2Line } from "react-icons/ri";
// import { MdOutlineDeleteOutline } from "react-icons/md";
// const LEVEL_ACCENTS = [
//   "bg-emerald-500",
//   "bg-cyan-500",
//   "bg-violet-500",
//   "bg-amber-500",
// ];

// export default function MenuTreeNode({
//   category,
//   level,
//   isExpanded,
//   isSelected,
//   hasChildren,
//   onToggle,
//   onSelect,
//   onEdit,
//   onDelete,
// }) {
//   const accent = LEVEL_ACCENTS[level % LEVEL_ACCENTS.length];

//   return (
//     <div className="relative pl-4">
//       {/* vertical tree line */}
//       {level > 0 && (
//         <span className="absolute left-[9px] top-0 bottom-0 w-px bg-bg-primary" />
//       )}

//       <div
//         onClick={onSelect}
//         className={`
//           group relative flex items-center justify-between
//           rounded-md px-3 py-2
//           bg-bg-primary
//           border border-border-hovering
//           cursor-pointer
//           transition-all duration-150
//           ${isSelected ? "ring-1 ring-cyan-400 bg-action-primary" : ""}
//         `}
//       >
//         {/* left accent bar */}
//         <span
//           className={`absolute left-0 top-1 bottom-1 w-[3px] rounded ${accent}`}
//         />

//         {/* left content */}
//         <div className="flex items-center gap-2 min-w-0">
//           {/* expand arrow */}
//           {hasChildren ? (
//             <button
//               onClick={(e) => {
//                 e.stopPropagation();
//                 onToggle();
//               }}
//               className="text-text-primary hover:text-white"
//             >
//               {isExpanded ? "▾" : "▸"}
//             </button>
//           ) : (
//             <span className="w-4" />
//           )}

//           {/* visibility icon */}
//           <span className="text-white/40">👁</span>

//           {/* name */}
//           <span className="truncate text-sm text-text-primary">
//             {category.name}
//           </span>
//         </div>

//         {/* right actions */}
//         <div className="opacity-0 group-hover:opacity-100 flex gap-2 text-text-primary">
//           <button onClick={(e) => { e.stopPropagation(); onEdit(category); }}>
//           <RiEdit2Line />
//           </button>
//           <button onClick={(e) => { e.stopPropagation(); onDelete(category); }}>
//           <MdOutlineDeleteOutline />
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }



// -------------------------------------------------------------------   Third version  --------------------------------------------- //


import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Plus, X, Edit, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { jwtDecode } from 'jwt-decode';

const MenuTreeNode = ({
  category,
  level = 0,
  isExpanded,
  hasChildren,
  isLast,
  isSelected,
  onToggle,
  onSelect,
  onEdit,
  onDelete,
}) => {
  const [hovered, setHovered] = useState(false);
  const canEdit = category.id !== "dietery" && category.name !== "All Categories";
  const showCount = hasChildren; // Only show count if has subcategories

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(e) => e.key === "Enter" && onSelect()}
        className={`
          flex items-center justify-between gap-2
          px-3 py-2.5
          rounded-lg
          cursor-pointer
          select-none
          transition-all
          group
          ${isSelected 
            ? "bg-action-primary text-white shadow-md" 
            : "bg-bg-primary hover:bg-bg-tertiary border m-0.5 border-border-default"
          }
        `}
        style={{ marginLeft: `${level * 16}px` }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
              }}
              className={`flex-shrink-0 ${isSelected ? "text-white" : "text-text-secondary"}`}
            >
              {isExpanded ? (
                <ChevronDown size={16} />
              ) : (
                <ChevronRight size={16} />
              )}
            </button>
          ) : (
            <span className="w-4 flex-shrink-0" />
          )}

          <span className={`text-sm font-medium truncate ${isSelected ? "text-white" : "text-text-primary"}`}>
            {category.name}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {showCount && (
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                isSelected
                  ? "bg-white text-action-primary"
                  : "bg-bg-tertiary text-text-secondary"
              }`}
            >
              {category.count}
            </span>
          )}

          {canEdit && hovered && !isSelected && (
            <div className="flex gap-1">
              {onEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(category);
                  }}
                  className="p-1 rounded hover:bg-action-primary hover:text-white transition-colors"
                >
                  <Edit size={12} />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(category);
                  }}
                  className="p-1 rounded hover:bg-action-danger hover:text-white transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MenuTreeNode;
