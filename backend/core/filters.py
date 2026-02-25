"""
Django-filter FilterSets for Income and Expense models.
"""

import django_filters
from .models import Income, Expense


class IncomeFilter(django_filters.FilterSet):
    """Filter income by date range and source."""

    date_from = django_filters.DateFilter(field_name='date', lookup_expr='gte')
    date_to = django_filters.DateFilter(field_name='date', lookup_expr='lte')
    source = django_filters.CharFilter(field_name='source', lookup_expr='icontains')
    year = django_filters.NumberFilter(field_name='date', lookup_expr='year')
    month = django_filters.NumberFilter(field_name='date', lookup_expr='month')

    class Meta:
        model = Income
        fields = ['date_from', 'date_to', 'source', 'year', 'month']


class ExpenseFilter(django_filters.FilterSet):
    """Filter expenses by category, date range."""

    date_from = django_filters.DateFilter(field_name='date', lookup_expr='gte')
    date_to = django_filters.DateFilter(field_name='date', lookup_expr='lte')
    category = django_filters.ChoiceFilter(choices=Expense.CATEGORY_CHOICES)
    title = django_filters.CharFilter(field_name='title', lookup_expr='icontains')
    year = django_filters.NumberFilter(field_name='date', lookup_expr='year')
    month = django_filters.NumberFilter(field_name='date', lookup_expr='month')

    class Meta:
        model = Expense
        fields = ['category', 'date_from', 'date_to', 'title', 'year', 'month']
