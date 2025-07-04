import React, { useState } from "react";
import axios from "axios";

function AddMenuItemForm({ clientId, categoryId, onAdd }) {
  const emptyItem = {
    itemId: "",
    name: "",
    description: "",
    price: "",
    imageFile: null,
    dietary: "",
    gst: "",
    swiggyPrice: "",
    zomatoPrice: "",
    isAvailableSwiggy: false,
    isAvailableZomato: false
  };


  const [items, setItems] = useState([{ ...emptyItem }]);

  const handleChange = (index, field, value) => {
    const updatedItems = [...items];
    updatedItems[index][field] = value;
    setItems(updatedItems);
  };

  const handleAddItem = () => {
    setItems([...items, { ...emptyItem }]);
  };

  const handleCancel = (index) => {
    if (items.length === 1) {
      setItems([{ ...emptyItem }]);
    } else {
      const newItems = [...items];
      newItems.splice(index, 1);
      setItems(newItems);
    }
  };

  // const handleSubmit = async (e) => {
  //   e.preventDefault();
  //   try {
  //     const responses = await Promise.all(
  //       items.map((item) =>
  //         axios.post(`http://localhost:8000/api/v1/${clientId}/menu/items`, {
  //           itemCode: parseInt(item.itemId),
  //           name: item.name,
  //           description: item.description,
  //           price: parseFloat(item.price),
  //           image_url: item.imageUrl,
  //           dietary: item.dietary,
  //           gst: parseFloat(item.gst),
  //           swiggyPrice: parseFloat(item.swiggyPrice),
  //           zomatoPrice: parseFloat(item.zomatoPrice),

  //           isAvailableSwiggy: !!item.isAvailableSwiggy,  // ✅ now added
  //           isAvailableZomato: !!item.isAvailableZomato,  // ✅ now added

  //           client_id: clientId,
  //           category_id: categoryId
  //         })
  //       )
  //     );
  //     responses.forEach((res) => onAdd(res.data));
  //     setItems([{ ...emptyItem }]);
  //   } catch (err) {
  //     console.error("Submission error:", err);
  //     alert("One or more items failed to submit.");
  //   }
  // };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const responses = await Promise.all(
        items.map(async (item) => {
          const formData = new FormData();
          formData.append("itemCode", parseInt(item.itemId));
          formData.append("name", item.name);
          formData.append("description", item.description);
          formData.append("price", parseFloat(item.price));
          formData.append("dietary", item.dietary);
          formData.append("gst", parseFloat(item.gst));
          formData.append("swiggyPrice", parseFloat(item.swiggyPrice));
          formData.append("zomatoPrice", parseFloat(item.zomatoPrice));
          formData.append("isAvailableSwiggy", item.isAvailableSwiggy);
          formData.append("isAvailableZomato", item.isAvailableZomato);
          formData.append("category_id", categoryId);
          if (item.imageFile) {
            formData.append("image", item.imageFile);
          }

          const response = await axios.post(
            `http://localhost:8000/api/v1/${clientId}/menu/items/upload`,
            formData,
            { headers: { "Content-Type": "multipart/form-data" } }
          );
          return response;
        })
      );
      responses.forEach((res) => onAdd(res.data));
      setItems([{ ...emptyItem }]);
    } catch (err) {
      console.error("Submit error", err);
      alert("Failed to submit one or more items.");
    }
  };


  return (
    <form onSubmit={handleSubmit} className="add-menu-item-form">
      {items.map((item, index) => (
        <div key={index} className="form-entry-wrapper">

          {/* Row 1 */}
          <div className="form-row">
            <input
              value={item.itemId}
              onChange={(e) => handleChange(index, "itemId", e.target.value)}
              placeholder="Item Code"
              className="form-input short"
              required
            />
            <input
              value={item.name}
              onChange={(e) => handleChange(index, "name", e.target.value)}
              placeholder="Item Name"
              className="form-input"
              required
            />
            <input
              value={item.description}
              onChange={(e) => handleChange(index, "description", e.target.value)}
              placeholder="Description"
              className="form-input"
            />
            {/* <input
            type="file"
              value={item.imageUrl}
              onChange={(e) => handleChange(index, "imageUrl", e.target.value)}
              placeholder="Image URL"
              className="form-input"
            /> */}


            <input
              type="file"
              accept="image/*"
              onChange={(e) =>
                setEditingItem({
                  ...editingItem,
                  imageFile: e.target.files[0],
                })
              }
            />
 
            <select
              value={item.dietary}
              onChange={(e) => handleChange(index, "dietary", e.target.value)}
              className="form-input"
              required
            >
              <option value="">Select Dietary</option>
              <option value="VEG">VEG</option>
              <option value="NON-VEG">NON-VEG</option>
            </select>

          </div>

          {/* Row 2 */}
          <div className="form-row">
            <input
              type="number"
              value={item.price}
              onChange={(e) => handleChange(index, "price", e.target.value)}
              placeholder="Price"
              className="form-input short"
              required
            />
            <input
              type="number"
              value={item.gst}
              onChange={(e) => handleChange(index, "gst", e.target.value)}
              placeholder="GST (%)"
              className="form-input short"
              required
            />

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={item.isAvailableSwiggy || false}
                onChange={(e) => handleChange(index, "isAvailableSwiggy", e.target.checked)}
              /> Swiggy
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={item.isAvailableZomato || false}
                onChange={(e) => handleChange(index, "isAvailableZomato", e.target.checked)}
              /> Zomato
            </label>

            <input
              type="number"
              value={item.swiggyPrice}
              onChange={(e) => handleChange(index, "swiggyPrice", e.target.value)}
              placeholder="Swiggy Price"
              className="form-input short"
              required={item.isAvailableSwiggy}
              disabled={!item.isAvailableSwiggy}
            />

            <input
              type="number"
              value={item.zomatoPrice}
              onChange={(e) => handleChange(index, "zomatoPrice", e.target.value)}
              placeholder="Zomato Price"
              className="form-input short"
              required={item.isAvailableZomato}
              disabled={!item.isAvailableZomato}
            />


            <button
              type="button"
              className="btn-cancel-row"
              onClick={() => handleCancel(index)}
            >
              Cancel
            </button>
          </div>

        </div>
      ))}

      <div className="form-actions">
        <button type="button" className="btn-add-another" onClick={handleAddItem}>
          + Add Another Item
        </button>
        <button type="submit" className="btn-add-item">
          Submit
        </button>
      </div>
    </form>
  );
}

export default AddMenuItemForm;
