/**
 * NODE STYLE SERVICE
 * Provides consistent styling for workflow nodes based on category
 * Ported from Lekhika's alchemistNodeStyleService.js
 * Uses Axiom CSS variables for theming
 */

// ============================================================================
// CATEGORY COLOR MAPPING (Axiom CSS Variables)
// ============================================================================

export const categoryColors: Record<string, { primary: string; secondary: string; border: string; text: string }> = {
    trigger: {
        primary: 'var(--color-warning)',
        secondary: 'rgba(245, 158, 11, 0.1)',
        border: 'rgba(245, 158, 11, 0.3)',
        text: 'var(--color-warning)',
    },
    input: {
        primary: 'var(--color-accent)',
        secondary: 'rgba(99, 102, 241, 0.1)',
        border: 'rgba(99, 102, 241, 0.3)',
        text: 'var(--color-accent)',
    },
    process: {
        primary: 'var(--color-success)',
        secondary: 'rgba(16, 185, 129, 0.1)',
        border: 'rgba(16, 185, 129, 0.3)',
        text: 'var(--color-success)',
    },
    condition: {
        primary: 'var(--color-info)',
        secondary: 'rgba(59, 130, 246, 0.1)',
        border: 'rgba(59, 130, 246, 0.3)',
        text: 'var(--color-info)',
    },
    preview: {
        primary: 'var(--color-primary)',
        secondary: 'rgba(168, 85, 247, 0.1)',
        border: 'rgba(168, 85, 247, 0.3)',
        text: 'var(--color-primary)',
    },
    output: {
        primary: 'var(--color-secondary)',
        secondary: 'rgba(236, 72, 153, 0.1)',
        border: 'rgba(236, 72, 153, 0.3)',
        text: 'var(--color-secondary)',
    },
    structural: {
        primary: 'var(--text-tertiary)',
        secondary: 'rgba(156, 163, 175, 0.1)',
        border: 'rgba(156, 163, 175, 0.3)',
        text: 'var(--text-tertiary)',
    },
};

// ============================================================================
// CATEGORY ICONS (Lucide icon names)
// ============================================================================

export const categoryIcons: Record<string, string> = {
    trigger: 'Zap',
    input: 'ArrowDownToLine',
    process: 'Cog',
    condition: 'GitBranch',
    preview: 'Eye',
    output: 'ArrowUpFromLine',
    structural: 'Layers',
};

// ============================================================================
// NODE STYLE GENERATORS
// ============================================================================

export interface NodeStyle {
    container: React.CSSProperties;
    header: React.CSSProperties;
    body: React.CSSProperties;
    icon: React.CSSProperties;
    title: React.CSSProperties;
    description: React.CSSProperties;
    handle: React.CSSProperties;
    featureTag: React.CSSProperties;
    actionButton: React.CSSProperties;
}

/**
 * Get styles for a node based on its category
 */
export function getNodeStyles(category: string, isSelected: boolean = false): NodeStyle {
    const colors = categoryColors[category] || categoryColors.structural;

    return {
        container: {
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: `1px solid ${isSelected ? colors.primary : colors.border}`,
            borderRadius: 'var(--radius-lg)',
            boxShadow: isSelected
                ? `0 0 20px ${colors.secondary}, var(--shadow-lg)`
                : 'var(--shadow-md)',
            transition: 'all 0.2s ease',
            minWidth: '280px',
            maxWidth: '360px',
        },
        header: {
            background: colors.secondary,
            borderBottom: `1px solid ${colors.border}`,
            padding: 'var(--spacing-3) var(--spacing-4)',
            borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-3)',
        },
        body: {
            padding: 'var(--spacing-4)',
        },
        icon: {
            color: colors.primary,
            width: '20px',
            height: '20px',
        },
        title: {
            color: 'var(--text-primary)',
            fontSize: 'var(--font-size-sm)',
            fontWeight: 600,
            margin: 0,
        },
        description: {
            color: 'var(--text-secondary)',
            fontSize: 'var(--font-size-xs)',
            margin: 'var(--spacing-2) 0 0 0',
            lineHeight: 1.5,
        },
        handle: {
            width: '12px',
            height: '12px',
            background: colors.primary,
            border: '2px solid var(--bg-primary)',
            borderRadius: '50%',
        },
        featureTag: {
            background: colors.secondary,
            color: colors.text,
            fontSize: 'var(--font-size-xs)',
            padding: 'var(--spacing-1) var(--spacing-2)',
            borderRadius: 'var(--radius-full)',
            border: `1px solid ${colors.border}`,
        },
        actionButton: {
            background: 'transparent',
            border: `1px solid ${colors.border}`,
            color: colors.text,
            padding: 'var(--spacing-1) var(--spacing-2)',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            fontSize: 'var(--font-size-xs)',
            transition: 'all 0.2s ease',
        },
    };
}

/**
 * Get handle positions for a node
 * Returns positions for all 4 sides
 */
export function getHandlePositions() {
    return {
        top: { top: '-6px', left: '50%', transform: 'translateX(-50%)' },
        right: { right: '-6px', top: '50%', transform: 'translateY(-50%)' },
        bottom: { bottom: '-6px', left: '50%', transform: 'translateX(-50%)' },
        left: { left: '-6px', top: '50%', transform: 'translateY(-50%)' },
    };
}

/**
 * Get edge styles based on connection type
 */
export function getEdgeStyles(sourceCategory: string, targetCategory: string) {
    const sourceColors = categoryColors[sourceCategory] || categoryColors.structural;

    return {
        stroke: sourceColors.primary,
        strokeWidth: 2,
        animated: true,
    };
}

/**
 * Get glow effect for selected/active nodes
 */
export function getGlowEffect(category: string, intensity: 'low' | 'medium' | 'high' = 'medium'): string {
    const colors = categoryColors[category] || categoryColors.structural;
    const intensityMap = {
        low: '0 0 10px',
        medium: '0 0 20px',
        high: '0 0 30px',
    };

    return `${intensityMap[intensity]} ${colors.secondary}`;
}

/**
 * Get category label for display
 */
export function getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
        trigger: 'Trigger',
        input: 'Input',
        process: 'Process',
        condition: 'Condition',
        preview: 'Preview',
        output: 'Output',
        structural: 'Structural',
    };

    return labels[category] || 'Unknown';
}

/**
 * Get category description
 */
export function getCategoryDescription(category: string): string {
    const descriptions: Record<string, string> = {
        trigger: 'Initiates workflow execution based on events or schedules',
        input: 'Receives data from external sources or user input',
        process: 'Transforms, analyzes, or generates content using AI',
        condition: 'Routes workflow based on logic or data conditions',
        preview: 'Displays content for review before proceeding',
        output: 'Delivers results to external systems or users',
        structural: 'Organizes and structures workflow logic',
    };

    return descriptions[category] || '';
}

// ============================================================================
// ANIMATION HELPERS
// ============================================================================

export const nodeAnimations = {
    enter: {
        initial: { opacity: 0, scale: 0.8, y: 20 },
        animate: { opacity: 1, scale: 1, y: 0 },
        transition: { duration: 0.3, ease: 'easeOut' },
    },
    hover: {
        scale: 1.02,
        transition: { duration: 0.2 },
    },
    tap: {
        scale: 0.98,
    },
    selected: {
        scale: 1.02,
        transition: { duration: 0.2 },
    },
};

export const handleAnimations = {
    hover: {
        scale: 1.3,
        transition: { duration: 0.2 },
    },
    connecting: {
        scale: 1.5,
        boxShadow: '0 0 10px currentColor',
    },
};

// ============================================================================
// EXPORT SERVICE OBJECT
// ============================================================================

export const nodeStyleService = {
    categoryColors,
    categoryIcons,
    getNodeStyles,
    getHandlePositions,
    getEdgeStyles,
    getGlowEffect,
    getCategoryLabel,
    getCategoryDescription,
    nodeAnimations,
    handleAnimations,
};

export default nodeStyleService;
