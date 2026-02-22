"""
Standard API response formatters
Ensures consistent JSON responses across all endpoints
"""

def success(data=None, message=None):
    """Standard success response"""
    response = {"success": True}
    if data is not None:
        response["data"] = data
    if message:
        response["message"] = message
    return response

def error(message, code=400):
    """Standard error response"""
    return {"success": False, "message": message}, code
