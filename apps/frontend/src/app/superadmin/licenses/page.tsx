'use client';

import React, { useState, useEffect } from 'react';
import {
    FileText,
    Plus,
    TrendingUp,
    TrendingDown,
    DollarSign,
    Calendar,
    Search,
    Filter,
    Download,
    Eye,
    Loader2,
} from 'lucide-react';

interface LicenseTransaction {
    id: string;
    org_id: string;
    org_name: string;
    transaction_type: string;
    from_plan: string | null;
    to_plan: string | null;
    price_usd: number | null;
    quota_changes: any;
    notes: string | null;
    created_at: string;
    admin_email: string;
}

interface LicenseStats {
    total_transactions: number;
    total_revenue: number;
    upgrades_count: number;
    downgrades_count: number;
    active_paid_orgs: number;
    mrr: number;
}

export default function LicensesPage() {
    const [transactions, setTransactions] = useState<LicenseTransaction[]>([]);
    const [stats, setStats] = useState<LicenseStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [showTransactionModal, setShowTransactionModal] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            // Load transactions
            const txRes = await fetch('/api/superadmin/licenses/transactions');
            const txData = await txRes.json();
            setTransactions(txData.transactions || []);

            // Load stats
            const statsRes = await fetch('/api/superadmin/licenses/stats');
            const statsData = await statsRes.json();
            setStats(statsData.stats || null);
        } catch (error) {
            console.error('Failed to load license data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredTransactions = transactions.filter((tx) => {
        const matchesSearch =
            tx.org_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            tx.transaction_type.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filterType === 'all' || tx.transaction_type === filterType;
        return matchesSearch && matchesFilter;
    });

    const getTransactionIcon = (type: string) => {
        switch (type) {
            case 'upgraded': return <TrendingUp className="w-4 h-4 text-success" />;
            case 'downgraded': return <TrendingDown className="w-4 h-4 text-warning" />;
            case 'created': return <Plus className="w-4 h-4 text-info" />;
            default: return <FileText className="w-4 h-4 text-textSecondary" />;
        }
    };

    const getTransactionColor = (type: string) => {
        switch (type) {
            case 'upgraded': return 'bg-success/10 text-success border-success/20';
            case 'downgraded': return 'bg-warning/10 text-warning border-warning/20';
            case 'created': return 'bg-info/10 text-info border-info/20';
            case 'suspended': return 'bg-error/10 text-error border-error/20';
            case 'reactivated': return 'bg-success/10 text-success border-success/20';
            default: return 'bg-surfaceHover text-textSecondary border-border';
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-lg">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-textPrimary mb-xs">
                    License Management
                </h1>
                <p className="text-textSecondary">
                    Track license transactions, revenue, and organization upgrades
                </p>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
                    <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-lg">
                        <div className="flex items-center justify-between mb-sm">
                            <p className="text-sm text-textSecondary">Total Revenue</p>
                            <DollarSign className="w-5 h-5 text-success" />
                        </div>
                        <p className="text-3xl font-bold text-textPrimary">
                            ${stats.total_revenue.toLocaleString()}
                        </p>
                        <p className="text-xs text-textTertiary mt-xs">
                            {stats.total_transactions} transactions
                        </p>
                    </div>

                    <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-lg">
                        <div className="flex items-center justify-between mb-sm">
                            <p className="text-sm text-textSecondary">Monthly Revenue</p>
                            <TrendingUp className="w-5 h-5 text-primary" />
                        </div>
                        <p className="text-3xl font-bold text-textPrimary">
                            ${stats.mrr.toLocaleString()}<span className="text-lg text-textTertiary">/mo</span>
                        </p>
                        <p className="text-xs text-textTertiary mt-xs">
                            {stats.active_paid_orgs} paid orgs
                        </p>
                    </div>

                    <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-lg">
                        <div className="flex items-center justify-between mb-sm">
                            <p className="text-sm text-textSecondary">Upgrades vs Downgrades</p>
                            <TrendingUp className="w-5 h-5 text-info" />
                        </div>
                        <div className="flex items-baseline gap-md">
                            <p className="text-3xl font-bold text-success">
                                {stats.upgrades_count}
                            </p>
                            <p className="text-xl text-textTertiary">/</p>
                            <p className="text-3xl font-bold text-warning">
                                {stats.downgrades_count}
                            </p>
                        </div>
                        <p className="text-xs text-textTertiary mt-xs">
                            {((stats.upgrades_count / (stats.upgrades_count + stats.downgrades_count || 1)) * 100).toFixed(0)}% upgrade rate
                        </p>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-md">
                <div className="flex flex-col sm:flex-row gap-md">
                    {/* Search */}
                    <div className="flex-1">
                        <div className="relative">
                            <Search className="absolute left-sm top-1/2 -translate-y-1/2 w-5 h-5 text-textTertiary" />
                            <input
                                type="text"
                                placeholder="Search by organization or type..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="
                                    w-full bg-background text-textPrimary
                                    border border-border rounded-[var(--radius-md)]
                                    pl-10 pr-sm py-xs
                                    focus:outline-none focus:ring-2 focus:ring-borderFocus
                                    transition-all
                                "
                            />
                        </div>
                    </div>

                    {/* Type Filter */}
                    <div className="sm:w-48">
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="
                                w-full bg-background text-textPrimary
                                border border-border rounded-[var(--radius-md)]
                                px-sm py-xs
                                focus:outline-none focus:ring-2 focus:ring-borderFocus
                                transition-all
                            "
                        >
                            <option value="all">All Types</option>
                            <option value="created">Created</option>
                            <option value="upgraded">Upgraded</option>
                            <option value="downgraded">Downgraded</option>
                            <option value="suspended">Suspended</option>
                            <option value="reactivated">Reactivated</option>
                        </select>
                    </div>

                    {/* Export Button */}
                    <button className="
                        flex items-center gap-xs
                        bg-surfaceHover text-textPrimary
                        border border-border
                        px-md py-xs
                        rounded-[var(--radius-md)]
                        hover:bg-surface
                        transition-all
                    ">
                        <Download className="w-4 h-4" />
                        <span className="text-sm font-medium">Export</span>
                    </button>
                </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-surface border border-border rounded-[var(--radius-lg)] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-surfaceHover border-b border-border">
                            <tr>
                                <th className="px-md py-sm text-left text-xs font-medium text-textSecondary">Date</th>
                                <th className="px-md py-sm text-left text-xs font-medium text-textSecondary">Organization</th>
                                <th className="px-md py-sm text-left text-xs font-medium text-textSecondary">Type</th>
                                <th className="px-md py-sm text-left text-xs font-medium text-textSecondary">Plan Change</th>
                                <th className="px-md py-sm text-left text-xs font-medium text-textSecondary">Amount</th>
                                <th className="px-md py-sm text-left text-xs font-medium text-textSecondary">Admin</th>
                                <th className="px-md py-sm text-left text-xs font-medium text-textSecondary">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTransactions.map((tx) => (
                                <tr key={tx.id} className="border-b border-border hover:bg-surfaceHover transition-colors">
                                    <td className="px-md py-sm">
                                        <div className="flex items-center gap-xs text-sm text-textSecondary">
                                            <Calendar className="w-4 h-4" />
                                            <span>{new Date(tx.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </td>
                                    <td className="px-md py-sm">
                                        <p className="text-sm font-medium text-textPrimary">{tx.org_name}</p>
                                    </td>
                                    <td className="px-md py-sm">
                                        <span className={`
                                            inline-flex items-center gap-xs
                                            px-sm py-xs
                                            text-xs font-medium
                                            rounded-[var(--radius-sm)]
                                            border
                                            ${getTransactionColor(tx.transaction_type)}
                                        `}>
                                            {getTransactionIcon(tx.transaction_type)}
                                            {tx.transaction_type}
                                        </span>
                                    </td>
                                    <td className="px-md py-sm">
                                        {tx.from_plan && tx.to_plan ? (
                                            <div className="flex items-center gap-xs text-sm">
                                                <span className="text-textTertiary">{tx.from_plan}</span>
                                                <span className="text-textTertiary">→</span>
                                                <span className="text-textPrimary font-medium">{tx.to_plan}</span>
                                            </div>
                                        ) : tx.to_plan ? (
                                            <span className="text-sm text-textPrimary font-medium">{tx.to_plan}</span>
                                        ) : (
                                            <span className="text-sm text-textTertiary">-</span>
                                        )}
                                    </td>
                                    <td className="px-md py-sm">
                                        {tx.price_usd ? (
                                            <span className="text-sm font-medium text-success">
                                                ${tx.price_usd.toFixed(2)}
                                            </span>
                                        ) : (
                                            <span className="text-sm text-textTertiary">-</span>
                                        )}
                                    </td>
                                    <td className="px-md py-sm">
                                        <span className="text-sm text-textSecondary">{tx.admin_email}</span>
                                    </td>
                                    <td className="px-md py-sm">
                                        <button className="
                                            p-xs
                                            text-primary
                                            hover:bg-primary/10
                                            rounded-[var(--radius-sm)]
                                            transition-all
                                        ">
                                            <Eye className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Empty State */}
            {filteredTransactions.length === 0 && (
                <div className="text-center py-2xl">
                    <FileText className="w-12 h-12 mx-auto mb-md text-textTertiary opacity-50" />
                    <p className="text-textPrimary mb-xs">No transactions found</p>
                    <p className="text-sm text-textSecondary">
                        {searchQuery || filterType !== 'all'
                            ? 'Try adjusting your filters'
                            : 'License transactions will appear here'}
                    </p>
                </div>
            )}
        </div>
    );
}
