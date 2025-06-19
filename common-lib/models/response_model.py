from typing import TypeVar, Generic, Optional
from pydantic import BaseModel

# Define a generic type variable
T = TypeVar("T")

# Create a generic response model with a custom constructor
class ResponseModel(BaseModel, Generic[T]):
    screenId: Optional[str] = None
    status: Optional[str] = None
    message: Optional[str] = None
    data: Optional[T] = None

    def __init__(self, screenId: Optional[str] = None, status: Optional[str] = None, 
                 message: Optional[str] = None, data: Optional[T] = None):
        super().__init__(screenId=screenId, status=status, message=message, data=data)

    def set_response(self, screenId: Optional[str] = None, status: Optional[str] = None, 
                     message: Optional[str] = None, data: Optional[T] = None):
        """Setter method to update response attributes"""
        if screenId is not None:
            self.screenId = screenId
        if status is not None:
            self.status = status
        if status is None:
            self.status = "200"
        if message is not None:
            self.message = message
        if message is None:
            self.message = "success"
        if data is not None:
            self.data = data
        super().__init__(screenId=screenId, status=status, message=message, data=data)

# Example usage
response = ResponseModel(screenId="home", status="success", message="Operation completed", data={"id": 1, "name": "Rajath"})
print(response)

# Updating response using setter method
response.set_response(message="Updated successfully", status="updated")
print(response)