"""Custom exceptions"""


class LearningAierException(Exception):
    """Base exception for LearningAier backend"""
    pass


class NotFoundError(LearningAierException):
    """Resource not found"""
    pass


class UnauthorizedError(LearningAierException):
    """Unauthorized access"""
    pass


class ValidationError(LearningAierException):
    """Validation error"""
    pass
