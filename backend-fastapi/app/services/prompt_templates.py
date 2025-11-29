"""Prompt template registry with versioning

This module provides a centralized registry for all LLM prompts used in the application.
Each prompt has a version number and metadata for tracking changes over time.
"""
from typing import Dict, Any, Optional
from datetime import datetime


# Prompt template registry
PROMPT_TEMPLATES: Dict[str, Dict[str, Any]] = {
    # Flashcard Generation Prompts
    "flashcard_generator_v1": {
        "version": "1.0",
        "template": """Generate exactly {count} flashcards based on the following text.
Focus on key concepts, definitions, and important details.

You must output valid JSON in this exact format:
{{
    "flashcards": [
        {{"term": "Concept or term", "definition": "Clear definition", "context": "Optional context or usage example"}}
    ]
}}

Text:
{text}
""",
        "metadata": {
            "created": "2025-11-20",
            "author": "system",
            "description": "Original flashcard generator prompt"
        }
    },
    "flashcard_generator_v2": {
        "version": "2.0",
        "template": """Create exactly {count} high-quality flashcards focusing on the key concepts from the text below.

Guidelines:
- Prioritize important concepts, definitions, and relationships
- Make questions clear and specific
- Keep definitions concise but complete
- Include practical context where helpful

Output as valid JSON:
{{
    "flashcards": [
        {{
            "term": "Clear question or concept",
            "definition": "Precise answer or definition",
            "context": "Real-world example or additional context"
        }}
    ]
}}

Text:
{text}
""",
        "metadata": {
            "created": "2025-11-29",
            "author": "system",
            "description": "Improved prompt with clearer guidelines and emphasis on quality"
        }
    },
    
    # Translation Prompts
    "translate_v1": {
        "version": "1.0",
        "template": """Translate the following text to {target_lang}.
Maintain the original formatting (Markdown).
Only output the translated text.

Text:
{text}
""",
        "metadata": {
            "created": "2025-11-20",
            "author": "system",
            "description": "Basic translation prompt"
        }
    },
    
    # Terminology Extraction Prompts
    "terminology_extractor_v1": {
        "version": "1.0",
        "template": """Extract key technical terms from the text.
For each term, provide:
- The term itself
- A brief definition (in the same language as the text)

Output JSON format:
{{
    "terms": [
        {{"term": "...", "definition": "..."}}
    ]
}}

Text:
{text}
""",
        "metadata": {
            "created": "2025-11-20",
            "author": "system",
            "description": "Basic terminology extraction"
        }
    },
    
    # Knowledge Graph Extraction
    "graph_extractor_v1": {
        "version": "1.0",
        "template": """Extract a knowledge graph from the following text.
Identify concepts and their relationships.

Output as JSON:
{{
    "nodes": [
        {{"id": "concept_id", "label": "Concept Name", "type": "concept"}}
    ],
    "edges": [
        {{"source": "concept1_id", "target": "concept2_id", "relationship": "relates to"}}
    ]
}}

Text:
{text}
""",
        "metadata": {
            "created": "2025-11-24",
            "author": "system",
            "description": "Knowledge graph extraction from notes"
        }
    }
}


def get_prompt(template_name: str, **kwargs) -> tuple[str, str]:
    """
    Get a prompt template and render it with provided variables.
    
    Args:
        template_name: Name of the template to use
        **kwargs: Variables to substitute in the template
        
    Returns:
        Tuple of (rendered_prompt, version)
        
    Raises:
        KeyError: If template not found
        KeyError: If required variables missing
    """
    if template_name not in PROMPT_TEMPLATES:
        raise KeyError(f"Prompt template '{template_name}' not found")
    
    template_data = PROMPT_TEMPLATES[template_name]
    template = template_data["template"]
    version = template_data["version"]
    
    try:
        rendered = template.format(**kwargs)
        return rendered, version
    except KeyError as e:
        raise KeyError(f"Missing required variable {e} for template '{template_name}'")


def get_version(template_name: str) -> str:
    """Get the version of a prompt template"""
    if template_name not in PROMPT_TEMPLATES:
        raise KeyError(f"Prompt template '{template_name}' not found")
    return PROMPT_TEMPLATES[template_name]["version"]


def get_metadata(template_name: str) -> Dict[str, Any]:
    """Get metadata for a prompt template"""
    if template_name not in PROMPT_TEMPLATES:
        raise KeyError(f"Prompt template '{template_name}' not found")
    return PROMPT_TEMPLATES[template_name]["metadata"]


def list_templates() -> Dict[str, str]:
    """
    List all available prompt templates.
    
    Returns:
        Dict mapping template names to versions
    """
    return {
        name: data["version"]
        for name, data in PROMPT_TEMPLATES.items()
    }


def list_templates_for_feature(feature: str) -> Dict[str, str]:
    """
    List all prompt templates for a specific feature.
    
    Args:
        feature: Feature name (e.g., 'flashcard', 'translate', 'graph')
        
    Returns:
        Dict mapping template names to versions
    """
    return {
        name: data["version"]
        for name, data in PROMPT_TEMPLATES.items()
        if feature.lower() in name.lower()
    }
