"""A/B experiment framework for prompt testing

This module provides utilities for running A/B tests on different prompt variants.
Supports:
- Sticky variant assignment (same user always gets same variant)
- Configurable traffic splits
- Event logging for analysis
"""
import hashlib
from typing import Dict, Any, Optional, Literal
from enum import Enum


# Experiment configuration
EXPERIMENTS: Dict[str, Dict[str, Any]] = {
    "flashcard_prompt_test": {
        "active": True,  # Set to True to start experiment
        "description": "Test flashcard_generator_v1 vs v2 for better quality",
        "variants": {
            "A": "flashcard_generator_v1",  # Original prompt
            "B": "flashcard_generator_v2"   # Improved prompt with clearer guidelines
        },
        "traffic_split": 0.5,  # 50% A, 50% B
        "metrics": [
            "acceptance_rate",   # How often users keep generated cards
            "edit_rate",         # How often users edit cards
            "latency"           # Response time
        ]
    },
    "qa_prompt_test": {
        "active": False,
        "description": "Test different QA prompt styles",
        "variants": {
            "A": "qa_prompt_v1",
            "B": "qa_prompt_v2_detailed"
        },
        "traffic_split": 0.5,
        "start_date": "2025-12-01",
        "metrics": [
            "answer_length",
            "user_helpfulness_rating"
        ]
    }
}


def assign_variant(user_id: str, experiment_name: str) -> Optional[str]:
    """
    Assign a variant to a user for an experiment.
    
    Uses deterministic hashing to ensure same user always gets same variant (sticky).
    
    Args:
        user_id: User ID
        experiment_name: Name of the experiment
        
    Returns:
        Variant name ('A', 'B', etc.) or None if experiment not active
    """
    if experiment_name not in EXPERIMENTS:
        return None
    
    experiment = EXPERIMENTS[experiment_name]
    
    if not experiment.get("active", False):
        return None
    
    # Use hash of user_id + experiment_name for deterministic variant assignment
    hash_input = f"{user_id}:{experiment_name}"
    hash_value = int(hashlib.sha256(hash_input.encode()).hexdigest(), 16)
    
    # Normalize to 0-1 range
    normalized = (hash_value % 10000) / 10000.0
    
    # Assign based on traffic split
    traffic_split = experiment.get("traffic_split", 0.5)
    
    if normalized < traffic_split:
        return "A"
    else:
        return "B"


def get_experiment_prompt(experiment_name: str, variant: str) -> Optional[str]:
    """
    Get the prompt template name for a given experiment variant.
    
    Args:
        experiment_name: Name of the experiment
        variant: Variant name ('A' or 'B')
        
    Returns:
        Prompt template name or None if not found
    """
    if experiment_name not in EXPERIMENTS:
        return None
    
    experiment = EXPERIMENTS[experiment_name]
    variants = experiment.get("variants", {})
    
    return variants.get(variant)


def is_experiment_active(experiment_name: str) -> bool:
    """Check if an experiment is currently active"""
    if experiment_name not in EXPERIMENTS:
        return False
    return EXPERIMENTS[experiment_name].get("active", False)


def get_experiment_config(experiment_name: str) -> Optional[Dict[str, Any]]:
    """Get full configuration for an experiment"""
    return EXPERIMENTS.get(experiment_name)


def list_active_experiments() -> Dict[str, Dict[str, Any]]:
    """List all currently active experiments"""
    return {
        name: config
        for name, config in EXPERIMENTS.items()
        if config.get("active", False)
    }


class ExperimentEvent:
    """Helper class for logging experiment events"""
    
    ASSIGNMENT = "assignment"
    GENERATION = "generation"
    USER_ACTION = "user_action"
    COMPLETION = "completion"
    ERROR = "error"


def log_experiment_event(
    user_id: str,
    experiment_name: str,
    variant: str,
    event_type: str,
    metadata: Optional[Dict[str, Any]] = None
):
    """
    Log an experiment event.
    
    Args:
        user_id: User ID
        experiment_name: Experiment name
        variant: Assigned variant
        event_type: Type of event (use ExperimentEvent constants)
        metadata: Additional event metadata
    """
    from app.services.llm_monitoring import log_ab_experiment
    
    log_ab_experiment(
        user_id=user_id,
        experiment_name=experiment_name,
        variant=variant,
        event_type=event_type,
        **(metadata or {})
    )


# Example usage:
# 
# In flashcard_service.py:
# 
# if is_experiment_active("flashcard_prompt_test"):
#     variant = assign_variant(user_id, "flashcard_prompt_test")
#     template_name = get_experiment_prompt("flashcard_prompt_test", variant)
#     log_experiment_event(user_id, "flashcard_prompt_test", variant, ExperimentEvent.ASSIGNMENT)
#     # Use template_name for generation
# else:
#     # Use default template
