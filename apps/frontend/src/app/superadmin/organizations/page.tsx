'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Building2,
    Plus,
    Edit,
    Search,
    Users,
    Database,
    Activity,
    Loader2,
} from 'lucide-react';
import CreateOrgModal from '@/components/modals/CreateOrgModal';
import { useSuperadminAuth } from '@/lib/useSuperadminAuth';

interface Organization {
    id: string;
    name: string;
    slug: string;
    plan: string;
    status: string;
    created_at: string;
    current_team_size: number;
    current_kbs_count: number;
    total_runs: number;
    max_team_members: number;
    max_kbs: number;
    max_runs_per_month: number;
}

export default function OrganizationsPage() {
    const router = useRouter();
    const { fetchWithAuth } = useSuperadminAuth();
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterPlan, setFilterPlan] = useState('all');
    const [showCreateModal, setShowCreateModal] = useState(false);

    useEffect(() => {
        loadOrganizations();
    }, []);

    const loadOrganizations = async () => {
        try {
            const response = await fetchWithAuth('/api/superadmin/organizations');

            if (!response.ok) throw new Error('Failed to load organizations');

            const data = await response.json();
            setOrganizations(data.organizations);
        } catch (error) {
            console.error('Error loading organizations:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredOrgs = organizations.filter((org) => {
        const matchesSearch = org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            org.slug.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesPlan = filterPlan === 'all' || org.plan === filterPlan;
        return matchesSearch && matchesPlan;
    });

    const getPlanBadgeColor = (plan: string) => {
        switch (plan) {
            case 'free': return 'bg-textTertiary/10 text-textTertiary';
            case 'starter': return 'bg-surfaceElevated text-info';
            case 'pro': return 'bg-surfaceElevated text-primary';
            case 'enterprise': return 'bg-accent/10 text-accent';
            default: return 'bg-textSecondary/10 text-textSecondary';
        }
    };

    const getStatusBadgeColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-surfaceElevated text-success';
            case 'suspended': return 'bg-surfaceElevated text-warning';
            case 'cancelled': return 'bg-surfaceElevated text-error';
            default: return 'bg-textSecondary/10 text-textSecondary';
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-lg">
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-lg">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-md">
                <div>
                    <h1 className="text-3xl font-bold text-textPrimary mb-xs">
                        Organizations
                    </h1>
                    <p className="text-textSecondary">
                        Manage all customer organizations and licenses
                    </p>
                </div>

                <button
                    onClick={() => setShowCreateModal(true)}
                    className="
            flex items-center gap-xs
            btn btn-primary
            px-md py-sm
            rounded-[var(--radius-md)]
            font-medium
            hover:opacity-90
            hover:shadow-[var(--shadow-md)]
            active:scale-[0.98]
            transition-all
          "
                >
                    <Plus className="w-5 h-5" />
                    <span>Create Organization</span>
                </button>
            </div>

            {/* Filters */}
            <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-md">
                <div className="flex flex-col sm:flex-row gap-md">
                    {/* Search */}
                    <div className="flex-1">
                        <div className="relative">
                            <Search className="absolute left-sm top-1/2 -translate-y-1/2 w-5 h-5 text-textTertiary" />
                            <input
                                type="text"
                                placeholder="Search organizations..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="
                  w-full
                  bg-background
                  text-textPrimary
                  border border-border
                  rounded-[var(--radius-md)]
                  pl-10 pr-sm py-xs
                  transition-all
                  focus:outline-none
                  focus:ring-2
                  focus:ring-borderFocus
                "
                            />
                        </div>
                    </div>

                    {/* Plan Filter */}
                    <div className="sm:w-48">
                        <select
                            value={filterPlan}
                            onChange={(e) => setFilterPlan(e.target.value)}
                            className="
                w-full
                bg-background
                text-textPrimary
                border border-border
                rounded-[var(--radius-md)]
                px-sm py-xs
                transition-all
                focus:outline-none
                focus:ring-2
                focus:ring-borderFocus
              "
                        >
                            <option value="all">All Plans</option>
                            <option value="free">Free</option>
                            <option value="starter">Starter</option>
                            <option value="pro">Pro</option>
                            <option value="enterprise">Enterprise</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Organizations Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-md">
                {filteredOrgs.map((org) => (
                    <div
                        key={org.id}
                        className="
              bg-surface
              border border-border
              rounded-[var(--radius-lg)]
              p-md
              hover:shadow-[var(--shadow-md)]
              transition-all
              group
            "
                    >
                        {/* Header */}
                        <div className="flex items-start justify-between mb-md">
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-textPrimary mb-xs">
                                    {org.name}
                                </h3>
                                <p className="text-sm text-textSecondary">
                                    /{org.slug}
                                </p>
                            </div>

                            <button
                                onClick={() => router.push(`/superadmin/organizations/${org.id}`)}
                                className="
                  p-xs
                  rounded-[var(--radius-sm)]
                  hover:bg-surfaceHover
                  opacity-0 group-hover:opacity-100
                  transition-all
                "
                                title="Edit organization"
                            >
                                <Edit className="w-4 h-4 text-textSecondary" />
                            </button>
                        </div>

                        {/* Badges */}
                        <div className="flex items-center gap-xs mb-md">
                            <span className={`px-sm py-xs text-xs font-medium rounded-[var(--radius-sm)] ${getPlanBadgeColor(org.plan)}`}>
                                {org.plan.toUpperCase()}
                            </span>
                            <span className={`px-sm py-xs text-xs font-medium rounded-[var(--radius-sm)] ${getStatusBadgeColor(org.status)}`}>
                                {org.status.toUpperCase()}
                            </span>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-md mb-md">
                            <div>
                                <div className="flex items-center gap-xs text-textTertiary text-xs mb-xs">
                                    <Users className="w-3 h-3" />
                                    <span>Team</span>
                                </div>
                                <p className="text-textPrimary font-medium">
                                    {org.current_team_size} / {org.max_team_members}
                                </p>
                            </div>

                            <div>
                                <div className="flex items-center gap-xs text-textTertiary text-xs mb-xs">
                                    <Database className="w-3 h-3" />
                                    <span>KBs</span>
                                </div>
                                <p className="text-textPrimary font-medium">
                                    {org.current_kbs_count} / {org.max_kbs}
                                </p>
                            </div>

                            <div>
                                <div className="flex items-center gap-xs text-textTertiary text-xs mb-xs">
                                    <Activity className="w-3 h-3" />
                                    <span>Runs</span>
                                </div>
                                <p className="text-textPrimary font-medium">
                                    {org.total_runs}
                                </p>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="pt-md border-t border-border flex items-center justify-between text-xs text-textTertiary">
                            <span>Created {new Date(org.created_at).toLocaleDateString()}</span>
                            <a
                                href={`/superadmin/organizations/${org.id}`}
                                className="text-primary hover:underline"
                            >
                                View Details →
                            </a>
                        </div>
                    </div>
                ))}
            </div>

            {/* Empty State */}
            {filteredOrgs.length === 0 && (
                <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-2xl text-center">
                    <Building2 className="w-12 h-12 text-textTertiary mx-auto mb-md" />
                    <h3 className="text-lg font-bold text-textPrimary mb-xs">
                        No organizations found
                    </h3>
                    <p className="text-textSecondary mb-md">
                        {searchQuery || filterPlan !== 'all'
                            ? 'Try adjusting your filters'
                            : 'Create your first organization to get started'}
                    </p>
                    {!searchQuery && filterPlan === 'all' && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="
                inline-flex items-center gap-xs
                btn btn-primary
                px-md py-sm
                rounded-[var(--radius-md)]
                font-medium
                hover:opacity-90
                transition-all
              "
                        >
                            <Plus className="w-5 h-5" />
                            <span>Create Organization</span>
                        </button>
                    )}
                </div>
            )}

            {/* Create Organization Modal */}
            <CreateOrgModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSuccess={loadOrganizations}
            />
        </div>
    );
}
