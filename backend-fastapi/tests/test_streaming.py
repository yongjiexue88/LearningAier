
import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch

@patch("app.api.chat.ChatService")
def test_streaming_endpoint(MockChatService, client):
    # Setup mock
    mock_service = MockChatService.return_value
    
    async def mock_stream_generator(*args, **kwargs):
        yield "Hello"
        yield " "
        yield "World"
        
    mock_service.stream_message = mock_stream_generator

    with client.stream("POST", "/api/chat/conv_123/stream", json={"message": "Hello"}) as response:
        assert response.status_code == 200
        assert "text/event-stream" in response.headers["content-type"]
        
        lines = list(response.iter_lines())
        content = "\n".join(lines)
        assert "data: Hello" in content
        assert "data: World" in content
        assert "data: [DONE]" in content
