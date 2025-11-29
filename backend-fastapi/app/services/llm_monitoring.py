"""LLM monitoring and logging utilities

This module provides structured logging for all LLM requests, including:
- Prompt template versioning
- Token usage tracking
- Latency monitoring
- A/B experiment tracking
"""
import logging
import hashlib
import json
from typing import Optional, Dict, Any
from datetime import datetime
import time

logger = logging.getLogger(__name__)


def hash_user_id(user_id: str) -> str:
    """
    Hash user ID for privacy in logs.
    
    Args:
        user_id: Raw user ID
        
    Returns:
        Hashed user ID (first 16 chars of SHA256)
    """
    return hashlib.sha256(user_id.encode()).hexdigest()[:16]


class LLMMonitor:
    """Monitor for LLM requests and responses"""
    
    def __init__(self, user_id: Optional[str] = None):
        """
        Initialize monitor.
        
        Args:
            user_id: User ID for this monitoring session
        """
        self.user_id_hash = hash_user_id(user_id) if user_id else "anonymous"
        self.start_time = time.time()
    
    def log_prompt_request(
        self,
        feature: str,
        prompt_template_name: str,
        prompt_version: str,
        model_name: str,
        additional_data: Optional[Dict[str, Any]] = None
    ):
        """
        Log an LLM prompt request.
        
        Args:
            feature: Feature name (e.g., 'flashcards', 'qa', 'graph')
            prompt_template_name: Name of the prompt template used
            prompt_version: Version of the prompt template
            model_name: LLM model name
            additional_data: Optional additional data to log
        """
        log_data = {
            "event": "llm_prompt_request",
            "timestamp": datetime.utcnow().isoformat(),
            "user_id_hash": self.user_id_hash,
            "feature": feature,
            "prompt_template": prompt_template_name,
            "prompt_version": prompt_version,
            "model_name": model_name
        }
        
        if additional_data:
            log_data.update(additional_data)
        
        # Structured logging for Cloud Logging
        logger.info(
            f"LLM Request: {feature}/{prompt_template_name}",
            extra={"json_fields": log_data}
        )
    
    def log_prompt_response(
        self,
        token_count: Optional[int] = None,
        prompt_tokens: Optional[int] = None,
        completion_tokens: Optional[int] = None,
        success: bool = True,
        error: Optional[str] = None,
        additional_data: Optional[Dict[str, Any]] = None
    ):
        """
        Log an LLM response with metrics.
        
        Args:
            token_count: Total token count
            prompt_tokens: Prompt token count
            completion_tokens: Completion token count
            success: Whether the request succeeded
            error: Error message if failed
            additional_data: Optional additional data
        """
        latency_ms = int((time.time() - self.start_time) * 1000)
        
        log_data = {
            "event": "llm_prompt_response",
            "timestamp": datetime.utcnow().isoformat(),
            "user_id_hash": self.user_id_hash,
            "latency_ms": latency_ms,
            "success": success
        }
        
        if token_count is not None:
            log_data["token_count"] = token_count
        if prompt_tokens is not None:
            log_data["prompt_tokens"] = prompt_tokens
        if completion_tokens is not None:
            log_data["completion_tokens"] = completion_tokens
        if error:
            log_data["error"] = error
        
        if additional_data:
            log_data.update(additional_data)
        
        logger.info(
            f"LLM Response: {latency_ms}ms, {token_count or 0} tokens",
            extra={"json_fields": log_data}
        )
    
    def log_ab_experiment(
        self,
        experiment_name: str,
        variant: str,
        event_type: str,
        additional_data: Optional[Dict[str, Any]] = None
    ):
        """
        Log an A/B experiment event.
        
        Args:
            experiment_name: Name of the experiment
            variant: Variant assigned (e.g., 'A', 'B')
            event_type: Type of event (e.g., 'assignment', 'completion', 'success')
            additional_data: Optional additional data
        """
        log_data = {
            "event": "ab_experiment",
            "timestamp": datetime.utcnow().isoformat(),
            "user_id_hash": self.user_id_hash,
            "experiment_name": experiment_name,
            "experiment_variant": variant,
            "event_type": event_type
        }
        
        if additional_data:
            log_data.update(additional_data)
        
        logger.info(
            f"A/B Experiment: {experiment_name}/{variant}/{event_type}",
            extra={"json_fields": log_data}
        )


# Convenience functions for backwards compatibility
def log_prompt_request(
    user_id_hash: str,
    feature: str,
    prompt_template_name: str,
    prompt_version: str,
    model_name: str,
    **kwargs
):
    """Log a prompt request (convenience function)"""
    monitor = LLMMonitor(user_id=user_id_hash)
    monitor.log_prompt_request(
        feature=feature,
        prompt_template_name=prompt_template_name,
        prompt_version=prompt_version,
        model_name=model_name,
        additional_data=kwargs
    )


def log_prompt_response(
    token_count: int,
    latency_ms: int,
    **kwargs
):
    """Log a prompt response (convenience function)"""
    monitor = LLMMonitor()
    monitor.start_time = time.time() - (latency_ms / 1000.0)  # Backdate start time
    monitor.log_prompt_response(
        token_count=token_count,
        additional_data=kwargs
    )


def log_ab_experiment(
    user_id: str,
    experiment_name: str,
    variant: str,
    event_type: str,
    **kwargs
):
    """Log an A/B experiment event (convenience function)"""
    monitor = LLMMonitor(user_id=user_id)
    monitor.log_ab_experiment(
        experiment_name=experiment_name,
        variant=variant,
        event_type=event_type,
        additional_data=kwargs
    )
