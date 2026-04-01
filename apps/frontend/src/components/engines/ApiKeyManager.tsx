import React, { useState, useEffect } from 'react';
import { Key, Plus, Trash2, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useSuperadminAuth } from '@/lib/useSuperadminAuth';

interface ApiKey {
    id: string;
    key_prefix: string;
    label: string;
    created_at: string;
    last_used_at: string | null;
    is_active: boolean;
    full_key?: string; // Only present immediately after creation
}

interface ApiKeyManagerProps {
    engineId: string;
}

export function ApiKeyManager({ engineId }: ApiKeyManagerProps) {
    const { admin } = useSuperadminAuth();
    const token = admin?.token;
    const [keys, setKeys] = useState<ApiKey[]>([]);
    const [loading, setLoading] = useState(true);
    const [newKeyLabel, setNewKeyLabel] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [createdKey, setCreatedKey] = useState<string | null>(null);

    const fetchKeys = async () => {
        if (!token) return;
        try {
            const res = await fetch(`/api/superadmin/engines/${engineId}/keys`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) setKeys(data.keys || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (engineId && token) fetchKeys();
    }, [engineId, token]);

    const handleCreateKey = async () => {
        if (!newKeyLabel.trim() || !token) return;
        setIsCreating(true);
        try {
            const res = await fetch(`/api/superadmin/engines/${engineId}/keys`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ label: newKeyLabel, userId: admin?.adminId })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setCreatedKey(data.key.full_key);
            setNewKeyLabel('');
            fetchKeys();
            toast.success('API Key created');
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteKey = async (keyId: string) => {
        if (!token || !confirm('Are you sure you want to revoke this key? Integrations using it will break.')) return;
        try {
            const res = await fetch(`/api/superadmin/engines/${engineId}/keys?key_id=${keyId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to revoke key');
            setKeys(keys.filter(k => k.id !== keyId));
            toast.success('Key revoked');
        } catch (error) {
            toast.error('Failed to revoke key');
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success('Copied to clipboard');
    };

    if (loading) return <div className="p-xl text-center text-textTertiary">Loading keys...</div>;

    return (
        <div className="space-y-lg">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-textPrimary">Access Keys</h3>
                    <p className="text-sm text-textSecondary">Manage keys for external API access</p>
                </div>
            </div>

            {/* New Key Creation */}
            <div className="flex gap-sm items-end bg-surfaceHover p-md rounded-[var(--radius-lg)] border border-border">
                <div className="flex-1">
                    <label className="text-xs font-medium text-textTertiary mb-xs block">
                        New Key Label
                    </label>
                    <input
                        type="text"
                        value={newKeyLabel}
                        onChange={(e) => setNewKeyLabel(e.target.value)}
                        placeholder="e.g. Zapier Integration"
                        className="w-full px-sm py-xs rounded border border-border bg-background focus:outline-none focus:border-primary"
                    />
                </div>
                <button
                    onClick={handleCreateKey}
                    disabled={isCreating || !newKeyLabel}
                    className="
                        flex items-center gap-xs px-md py-xs
                        bg-primary text-white rounded
                        disabled:opacity-50 disabled:cursor-not-allowed
                        hover:bg-primary/90 transition-colors
                    "
                >
                    <Plus className="w-4 h-4" />
                    Create Key
                </button>
            </div>

            {/* Recently Created Key Alert */}
            {createdKey && (
                <div className="p-md bg-surfaceElevated border border-border rounded-[var(--radius-lg)] space-y-sm">
                    <div className="flex items-start gap-sm">
                        <Check className="w-5 h-5 text-success mt-0.5" />
                        <div className="flex-1">
                            <p className="font-bold text-success">Key Created Successfully</p>
                            <p className="text-sm text-success/80">
                                Copy this key now. You won't be able to see it again!
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-sm bg-background/50 p-sm rounded border border-border">
                        <code className="flex-1 font-mono text-sm text-textPrimary break-all">
                            {createdKey}
                        </code>
                        <button
                            onClick={() => copyToClipboard(createdKey)}
                            className="p-xs hover:bg-surfaceElevated rounded text-success"
                        >
                            <Copy className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Keys List */}
            <div className="space-y-sm">
                {keys.length === 0 ? (
                    <div className="p-xl text-center border border-dashed border-border rounded-[var(--radius-lg)]">
                        <p className="text-textSecondary">No active API keys</p>
                    </div>
                ) : (
                    keys.map(key => (
                        <div key={key.id} className="flex items-center justify-between p-md bg-background border border-border rounded-[var(--radius-md)]">
                            <div className="flex items-center gap-md">
                                <div className="p-sm bg-surfaceHover rounded">
                                    <Key className="w-4 h-4 text-primary" />
                                </div>
                                <div>
                                    <p className="font-medium text-textPrimary">{key.label}</p>
                                    <p className="text-xs font-mono text-textTertiary">
                                        {key.key_prefix}••••••••••••••••••••••••
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-lg">
                                <div className="text-right">
                                    <p className="text-xs text-textTertiary">Created</p>
                                    <p className="text-xs text-textSecondary">
                                        {new Date(key.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleDeleteKey(key.id)}
                                    className="p-sm text-textTertiary hover:text-error hover:bg-surfaceElevated rounded transition-colors"
                                    title="Revoke Key"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
