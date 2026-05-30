import httpx
import re

INVENTORY_URL = "http://inventory-service:8000"
ORDER_URL = "http://order-service:8000"
BILLING_URL = "http://billing-service:8000"
SEARCH_URL = "http://common-lib:8000/search"

class ChatService:
    async def fetch_menu(self):
        async with httpx.AsyncClient() as client:
            return (await client.get(f"{INVENTORY_URL}/menus")).json()

    async def place_order(self, order_data):
        async with httpx.AsyncClient() as client:
            return (await client.post(f"{ORDER_URL}/orders", json=order_data)).json()

    async def generate_bill(self, order_id):
        async with httpx.AsyncClient() as client:
            return (await client.get(f"{BILLING_URL}/bill/{order_id}")).json()

    async def accept_payment(self, order_id, payment_data):
        async with httpx.AsyncClient() as client:
            return (await client.post(f"{BILLING_URL}/pay/{order_id}", json=payment_data)).json()

    async def generic_search(self, query: str):
        async with httpx.AsyncClient() as client:
            return (await client.get(f"{SEARCH_URL}?q={query}")).json()

    def classify_intent(self, msg: str):
        msg_lower = msg.lower()
        if "menu" in msg_lower or "show" in msg_lower:
            return "ShowMenu"
        elif "order" in msg_lower or "buy" in msg_lower:
            return "PlaceOrder"
        elif "bill" in msg_lower or "receipt" in msg_lower:
            return "GetBill"
        elif "pay" in msg_lower or "payment" in msg_lower:
            return "PayBill"
        else:
            return "GenericSearch"

    async def chat(self, websocket):
        await websocket.accept()
        await websocket.send_text("Hello! You can ask naturally: 'show me the menu', 'order a pizza', 'get my bill', 'pay for order 12', or any general question.")

        while True:
            msg = await websocket.receive_text()
            intent = self.classify_intent(msg)

            if intent == "ShowMenu":
                menus = await self.fetch_menu()
                await websocket.send_json(menus)

            elif intent == "PlaceOrder":
                match = re.search(r"order (.+)", msg.lower())
                item = match.group(1) if match else "unknown"
                order = await self.place_order({"item": item})
                await websocket.send_json(order)

            elif intent == "GetBill":
                match = re.search(r"bill (\d+)", msg.lower())
                order_id = match.group(1) if match else None
                bill = await self.generate_bill(order_id) if order_id else {"error": "No order id found"}
                await websocket.send_json(bill)

            elif intent == "PayBill":
                match = re.search(r"pay (\d+)", msg.lower())
                order_id = match.group(1) if match else None
                payment = await self.accept_payment(order_id, {"method": "card"}) if order_id else {"error": "No order id found"}
                await websocket.send_json(payment)

            else:
                result = await self.generic_search(msg)
                await websocket.send_json(result)
