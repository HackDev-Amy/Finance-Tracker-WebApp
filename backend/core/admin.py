from django.contrib import admin
from .models import Income, Expense, SavingsGoal


@admin.register(Income)
class IncomeAdmin(admin.ModelAdmin):
    list_display = ('user', 'source', 'amount', 'date')
    list_filter = ('user', 'date')
    search_fields = ('source', 'user__username')


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ('user', 'title', 'category', 'amount', 'date')
    list_filter = ('user', 'category', 'date')
    search_fields = ('title', 'user__username')


@admin.register(SavingsGoal)
class SavingsGoalAdmin(admin.ModelAdmin):
    list_display = ('user', 'name', 'target_amount', 'current_amount', 'deadline')
    list_filter = ('user', 'deadline')
    search_fields = ('name', 'user__username')
