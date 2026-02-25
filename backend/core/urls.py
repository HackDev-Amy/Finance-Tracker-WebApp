"""
URL patterns for core app.
Uses DefaultRouter to auto-generate CRUD routes for all ViewSets.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RegisterView,
    ProfileView,
    DashboardView,
    IncomeViewSet,
    ExpenseViewSet,
    SavingsGoalViewSet,
)

router = DefaultRouter()
router.register(r'income', IncomeViewSet, basename='income')
router.register(r'expenses', ExpenseViewSet, basename='expense')
router.register(r'savings-goals', SavingsGoalViewSet, basename='savings-goal')

urlpatterns = [
    # Auth
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/profile/', ProfileView.as_view(), name='profile'),

    # Dashboard
    path('dashboard/', DashboardView.as_view(), name='dashboard'),

    # ViewSet routes (income, expenses, savings-goals)
    path('', include(router.urls)),
]
