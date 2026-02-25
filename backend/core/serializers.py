"""
Serializers for FinanceApp core models.
Includes user registration and JWT customization.
"""

from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from datetime import date
from .models import Income, Expense, SavingsGoal


# ─── Auth Serializers ─────────────────────────────────────────────────────────

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Extends JWT token payload with username and email."""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['username'] = user.username
        token['email'] = user.email
        return token


class RegisterSerializer(serializers.ModelSerializer):
    """Handles new user registration with password confirmation."""

    password = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'password2')

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({'password': 'Passwords do not match.'})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')
        user = User.objects.create_user(**validated_data)
        return user


class UserSerializer(serializers.ModelSerializer):
    """Read-only user profile info."""

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'date_joined')
        read_only_fields = fields


# ─── Income Serializers ───────────────────────────────────────────────────────

class IncomeSerializer(serializers.ModelSerializer):
    """Full CRUD serializer for Income entries."""

    class Meta:
        model = Income
        fields = ('id', 'source', 'amount', 'date', 'notes', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError('Amount must be greater than zero.')
        return value

    def validate_date(self, value):
        if value > date.today():
            raise serializers.ValidationError('Date cannot be in the future.')
        return value


# ─── Expense Serializers ──────────────────────────────────────────────────────

class ExpenseSerializer(serializers.ModelSerializer):
    """Full CRUD serializer for Expense entries."""

    category_display = serializers.CharField(source='get_category_display', read_only=True)

    class Meta:
        model = Expense
        fields = (
            'id', 'title', 'category', 'category_display',
            'amount', 'date', 'notes', 'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'category_display', 'created_at', 'updated_at')

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError('Amount must be greater than zero.')
        return value


# ─── Savings Goal Serializers ─────────────────────────────────────────────────

class SavingsGoalSerializer(serializers.ModelSerializer):
    """Full CRUD serializer for SavingsGoal with computed progress."""

    progress_percentage = serializers.ReadOnlyField()
    is_on_track = serializers.SerializerMethodField()
    days_remaining = serializers.SerializerMethodField()

    class Meta:
        model = SavingsGoal
        fields = (
            'id', 'name', 'target_amount', 'current_amount',
            'deadline', 'progress_percentage', 'is_on_track',
            'days_remaining', 'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'progress_percentage', 'is_on_track', 'days_remaining', 'created_at', 'updated_at')

    def get_days_remaining(self, obj):
        """Returns number of days until the deadline."""
        delta = obj.deadline - date.today()
        return delta.days

    def get_is_on_track(self, obj):
        """
        Determines if the savings goal is on track based on linear progress.
        On track = current_amount >= expected_amount_by_now
        """
        today = date.today()
        created = obj.created_at.date()
        deadline = obj.deadline

        total_days = (deadline - created).days
        elapsed_days = (today - created).days

        if total_days <= 0:
            return float(obj.current_amount) >= float(obj.target_amount)

        expected_progress = min(elapsed_days / total_days, 1.0)
        expected_amount = float(obj.target_amount) * expected_progress

        return float(obj.current_amount) >= expected_amount

    def validate_target_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError('Target amount must be greater than zero.')
        return value

    def validate_deadline(self, value):
        if value <= date.today():
            raise serializers.ValidationError('Deadline must be a future date.')
        return value


# ─── Dashboard Summary Serializer ─────────────────────────────────────────────

class DashboardSummarySerializer(serializers.Serializer):
    """Aggregated financial summary for the dashboard."""

    total_income = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_expenses = serializers.DecimalField(max_digits=12, decimal_places=2)
    balance = serializers.DecimalField(max_digits=12, decimal_places=2)
    expenses_by_category = serializers.ListField()
    monthly_data = serializers.ListField()
    savings_summary = serializers.ListField()
