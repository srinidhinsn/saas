import React from "react";
import { useNavigate } from "react-router-dom";
// import dineInImg from '../assets/dinein.webp'
// import homeDeliveryImg from '../assets/delivery.avif'
// import parcelImg from '../assets/food-parcel.jpg'
// import swiggyImg from '../assets/swiggy.webp'
// import zomatoImg from '../assets/zomato.jpg'

const menuTypes = [
  { type: "dine_in", label: "Base Menu", route: "/dinein-page", },
  { type: "home_delivery", label: "Home Delivery", route: "", },
  { type: "parcel", label: "Parcel", route: "/menu/parcel", },
  { type: "swiggy", label: "Swiggy", route: "/swiggy-page", },
  { type: "zomato", label: "Zomato", route: "/zomato-page" },
];

function MenuTypeSelector() {
  const navigate = useNavigate();

  const handleNavigate = (route) => {
    navigate(route);
  };

  return (
    <div className="menu-type-selector">
      {menuTypes.map((menu) => (
        <div
          key={menu.type}
          className="menu-type-card"
          onClick={() => handleNavigate(menu.route)}
        >
          <div className="menu-type-img-holder">
            {/* You can add real <img src={...} /> here later */}
            <span className="img-placeholder"><img src={menu.img} alt="" /></span>
          </div>
          <div className="menu-type-label">{menu.label}</div>
        </div>
      ))}
    </div>
  );
}

export default MenuTypeSelector;
