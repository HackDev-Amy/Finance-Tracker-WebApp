"""
Views for FinanceApp core API.
All ViewSets automatically filter data to the authenticated user.
"""

from django.contrib.auth.models import User
from django.db.models import Sum
from django.db.models.functions import TruncMonth
from rest_framework import viewsets, generics, status, filters
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from django_filters.rest_framework import DjangoFilterBackend
from datetime import date, timedelta
from decimal import Decimal
import calendar

from .models import Income, Expense, SavingsGoal
from .serializers import (
    CustomTokenObtainPairSerializer,
    RegisterSerializer,
    UserSerializer,
    IncomeSerializer,
    ExpenseSerializer,
    SavingsGoalSerializer,
)
from .filters import IncomeFilter, ExpenseFilter


# ─── Auth Views ───────────────────────────────────────────────────────────────

class CustomTokenObtainPairView(TokenObtainPairView):
    """Returns JWT tokens with enriched payload (username, email)."""
    serializer_class = CustomTokenObtainPairSerializer


class RegisterView(generics.CreateAPIView):
    """Public endpoint for new user registration."""
    queryset = User.objects.all()
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {'message': 'Account created successfully.', 'username': user.username},
            status=status.HTTP_201_CREATED
        )


class ProfileView(generics.RetrieveAPIView):
    """Returns the authenticated user's profile."""
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


# ─── Income ViewSet ───────────────────────────────────────────────────────────

class IncomeViewSet(viewsets.ModelViewSet):
    """
    CRUD for Income entries.
    Automatically scopes queryset to the authenticated user.
    """
    serializer_class = IncomeSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_class = IncomeFilter
    ordering_fields = ['date', 'amount', 'created_at']
    ordering = ['-date']

    def get_queryset(self):
        return Income.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get'])
    def monthly_total(self, request):
        """Returns total income for the current month."""
        today = date.today()
        total = self.get_queryset().filter(
            date__year=today.year,
            date__month=today.month
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        return Response({'month': today.strftime('%B %Y'), 'total': total})


# ─── Expense ViewSet ──────────────────────────────────────────────────────────

class ExpenseViewSet(viewsets.ModelViewSet):
    """
    CRUD for Expense entries with category and date filtering.
    """
    serializer_class = ExpenseSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_class = ExpenseFilter
    ordering_fields = ['date', 'amount', 'category', 'created_at']
    ordering = ['-date']

    def get_queryset(self):
        return Expense.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get'])
    def monthly_total(self, request):
        """Returns total expenses for the current month."""
        today = date.today()
        total = self.get_queryset().filter(
            date__year=today.year,
            date__month=today.month
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        return Response({'month': today.strftime('%B %Y'), 'total': total})

    @action(detail=False, methods=['get'])
    def by_category(self, request):
        """Returns expense totals grouped by category."""
        totals = (
            self.get_queryset()
            .values('category')
            .annotate(total=Sum('amount'))
            .order_by('-total')
        )
        data = [
            {
                'category': item['category'],
                'label': dict(Expense.CATEGORY_CHOICES).get(item['category'], item['category']),
                'total': item['total'],
            }
            for item in totals
        ]
        return Response(data)


# ─── Savings Goal ViewSet ─────────────────────────────────────────────────────

class SavingsGoalViewSet(viewsets.ModelViewSet):
    """
    CRUD for SavingsGoal with progress tracking.
    """
    serializer_class = SavingsGoalSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return SavingsGoal.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['patch'])
    def add_funds(self, request, pk=None):
        """Add an amount to the goal's current_amount."""
        goal = self.get_object()
        amount = request.data.get('amount')

        if not amount:
            return Response({'error': 'Amount is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            amount = Decimal(str(amount))
            if amount <= 0:
                raise ValueError()
        except (ValueError, Exception):
            return Response({'error': 'Amount must be a positive number.'}, status=status.HTTP_400_BAD_REQUEST)

        goal.current_amount += amount
        goal.save()
        return Response(SavingsGoalSerializer(goal).data)


# ─── Dashboard View ───────────────────────────────────────────────────────────

class DashboardView(generics.GenericAPIView):
    """
    Aggregated dashboard data:
    - Total income & expenses (all time + current month)
    - Balance
    - Expenses breakdown by category
    - Monthly income vs expenses (last 6 months)
    - Savings goals summary
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        today = date.today()

        # All-time totals
        total_income = Income.objects.filter(user=user).aggregate(
            total=Sum('amount'))['total'] or Decimal('0.00')
        total_expenses = Expense.objects.filter(user=user).aggregate(
            total=Sum('amount'))['total'] or Decimal('0.00')
        balance = total_income - total_expenses

        # Current month totals
        month_income = Income.objects.filter(
            user=user, date__year=today.year, date__month=today.month
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

        month_expenses = Expense.objects.filter(
            user=user, date__year=today.year, date__month=today.month
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

        # Expenses by category (pie chart data)
        category_totals = (
            Expense.objects.filter(user=user)
            .values('category')
            .annotate(total=Sum('amount'))
            .order_by('-total')
        )
        expenses_by_category = [
            {
                'name': dict(Expense.CATEGORY_CHOICES).get(item['category'], item['category']),
                'value': float(item['total']),
                'category': item['category'],
            }
            for item in category_totals
        ]

        # Monthly bar chart — last 6 months
        monthly_data = []
        for i in range(5, -1, -1):
            # Calculate target month
            month_date = today.replace(day=1)
            for _ in range(i):
                month_date = (month_date - timedelta(days=1)).replace(day=1)

            m_income = Income.objects.filter(
                user=user,
                date__year=month_date.year,
                date__month=month_date.month
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

            m_expenses = Expense.objects.filter(
                user=user,
                date__year=month_date.year,
                date__month=month_date.month
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

            monthly_data.append({
                'month': month_date.strftime('%b %Y'),
                'income': float(m_income),
                'expenses': float(m_expenses),
            })

        # Savings goals summary
        goals = SavingsGoal.objects.filter(user=user)
        savings_summary = SavingsGoalSerializer(goals, many=True).data

        return Response({
            'total_income': float(total_income),
            'total_expenses': float(total_expenses),
            'balance': float(balance),
            'month_income': float(month_income),
            'month_expenses': float(month_expenses),
            'expenses_by_category': expenses_by_category,
            'monthly_data': monthly_data,
            'savings_summary': savings_summary,
        })
