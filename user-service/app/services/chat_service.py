import httpx
import re
from pydantic import BaseModel
from typing import Optional,Dict,Any
from openai import OpenAI
import os
INVENTORY_URL = "http://inventory-service:8000"
ORDER_URL = "http://order-service:8000"
BILLING_URL = "http://billing-service:8000"
SEARCH_URL = "http://common-lib:8000/search"

class ChatRequest(BaseModel):
    message:str
class ChatResponse(BaseModel):
    intent: str
    reply: str
    data: Optional[Dict[str, Any]] = None    
class ChatbotService:

    @staticmethod
    def classify_intent(message: str):
        msg = message.lower()

        if any(word in msg for word in ["menu", "items", "food"]):
            return "SHOW_MENU"

        if any(word in msg for word in ["order", "ordered", "popular"]):
            return "ORDER_INFO"

        if any(word in msg for word in ["bill", "invoice"]):
            return "BILL_INFO"

        return "GENERAL"

    @staticmethod
    def extract_order_id(message: str):
        match = re.search(r"\d+", message)
        return int(match.group()) if match else None



client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY")
)

async def ask_restaurant_ai(
    message: str,
    context: str = ""
):

    response = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[
            {
                "role": "system",
                "content": f"""
                You are a restaurant assistant.

                Context:
                {context}

                Rules:
                - Be short and friendly
                - Answer restaurant-related questions
                - If information is not available, say so
                """
            },
            {
                "role": "user",
                "content": message
            }
        ],
        temperature=0.3
    )

    return response.choices[0].message.content
