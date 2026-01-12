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

import { useState } from "react";
import { Edit, Trash2 } from "lucide-react";
import { MdOutlineKeyboardArrowDown } from "react-icons/md";
import { RiArrowDropRightLine } from "react-icons/ri";

/* rotating colors like image */
const NODE_COLORS = [
  "#4DA3FF",
  "#FF8A3D",
  "#7ED957",
  "#00C2A8",
  "#2F5AA8",
  "#F94144",
  "#F9C74F",
];

const INDENT = 28;
const NODE_SIZE = 14;
const LINE_COLOR = "#9CA3AF";

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
  const color = NODE_COLORS[level % NODE_COLORS.length];

  return (
    <div
      className="relative flex items-start"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* CONNECTOR AREA */}
      <div
        className="relative shrink-0"
        style={{ width: level * INDENT }}
      >
        {level > 0 && (
          <>
            {/* vertical line */}
            <div
              style={{
                position: "absolute",
                left: level * INDENT - INDENT / 2,
                top: 0,
                bottom: isLast ? "50%" : 0,
                width: 1,
                backgroundColor: LINE_COLOR,
              }}
            />
            {/* horizontal elbow */}
            <div
              style={{
                position: "absolute",
                left: level * INDENT - INDENT / 2,
                top: 18,
                width: INDENT / 2,
                height: 1,
                backgroundColor: LINE_COLOR,
              }}
            />
          </>
        )}
      </div>

      {/* NODE BOX */}
      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(e) => e.key === "Enter" && onSelect()}
        className={`
          flex items-center gap-2
          px-2 py-1.5
          rounded-md
          border
          cursor-pointer
          select-none
          transition
          ${isSelected ? "bg-action-primary/10 border-action-primary" : "bg-white border-gray-300"}
        `}
      >
        {/* expand / collapse */}
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className="text-gray-600 hover:text-black"
          >
            {isExpanded ? (
              <MdOutlineKeyboardArrowDown size={16} />
            ) : (
              <RiArrowDropRightLine size={16} />
            )}
          </button>
        ) : (
          <span className="w-4" />
        )}

        {/* node dot */}
        <div
          style={{
            width: NODE_SIZE,
            height: NODE_SIZE,
            borderRadius: "50%",
            backgroundColor: color,
            border: `2px solid ${color}`,
          }}
        />

        {/* label */}
        <span
          className="text-sm font-medium whitespace-nowrap"
          style={{ color }}
        >
          {category.name}
        </span>

        {/* actions */}
        {(onEdit || onDelete) &&
          hovered &&
          category.id !== "dietery" &&
          category.name !== "All Categories" && (
            <div className="ml-2 flex gap-1 text-gray-500">
              {onEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(category);
                  }}
                  className="hover:text-blue-600"
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
                  className="hover:text-red-600"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          )}
      </div>
    </div>
  );
};

export default MenuTreeNode;
