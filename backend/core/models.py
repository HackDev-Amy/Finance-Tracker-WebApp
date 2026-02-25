"""
Core models for FinanceApp.
All financial data is scoped to the authenticated user via ForeignKey.
"""

from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator
from decimal import Decimal


class Income(models.Model):
    """Represents a single income entry for a user."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='incomes')
    source = models.CharField(max_length=200, help_text="E.g. Salary, Freelance, Investment")
    amount = models.DecimalField(
        max_digits=12, decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    date = models.DateField()
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f"{self.user.username} — {self.source}: ${self.amount} on {self.date}"


class Expense(models.Model):
    """Represents a single expense entry for a user."""

    CATEGORY_CHOICES = [
        ('food', 'Food & Dining'),
        ('rent', 'Rent & Housing'),
        ('utilities', 'Utilities'),
        ('travel', 'Travel & Transport'),
        ('entertainment', 'Entertainment'),
        ('health', 'Health & Fitness'),
        ('shopping', 'Shopping'),
        ('education', 'Education'),
        ('savings', 'Savings Transfer'),
        ('other', 'Other'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='expenses')
    title = models.CharField(max_length=200)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='other')
    amount = models.DecimalField(
        max_digits=12, decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    date = models.DateField()
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f"{self.user.username} — {self.title} ({self.category}): ${self.amount}"


class SavingsGoal(models.Model):
    """A savings goal with auto-calculated progress from income/expense data."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='savings_goals')
    name = models.CharField(max_length=200)
    target_amount = models.DecimalField(
        max_digits=12, decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    # Manually tracked contributions; auto-calculated field is derived in serializer
    current_amount = models.DecimalField(
        max_digits=12, decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    deadline = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    @property
    def progress_percentage(self):
        """Returns float 0–100 representing goal completion."""
        if self.target_amount <= 0:
            return 0
        return min(float(self.current_amount / self.target_amount * 100), 100)

    def __str__(self):
        return f"{self.user.username} — {self.name}: ${self.current_amount}/${self.target_amount}"
