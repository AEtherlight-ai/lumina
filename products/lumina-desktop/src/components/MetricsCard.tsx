/**
 * MetricsCard Component - Reusable card for displaying individual metrics
 *
 * DESIGN DECISION: Reusable card component with props
 * WHY: DRY principle, consistent styling, easy to extend
 *
 * REASONING CHAIN:
 * 1. Dashboard needs multiple metrics cards
 * 2. Each card has: title, value, subtitle, icon
 * 3. Reusable component = less duplication
 * 4. Props allow customization (color, size, etc.)
 * 5. TypeScript ensures type safety
 *
 * PATTERN: Pattern-REACT-001 (Reusable Component with Props)
 * RELATED: Dashboard component
 * FUTURE: Add click handler for drill-down, add trend indicator (↑/↓)
 */

interface MetricsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
  color?: 'blue' | 'green' | 'purple' | 'orange';
}

/**
 * DESIGN DECISION: Default props for optional fields
 * WHY: Simplify usage, sensible defaults
 */
export default function MetricsCard({
  title,
  value,
  subtitle,
  icon,
  color = 'blue',
}: MetricsCardProps) {
  /**
   * DESIGN DECISION: CSS class for color variants
   * WHY: Allows theming, visual hierarchy
   */
  const cardClass = `metrics-card metrics-card-${color}`;

  return (
    <div className={cardClass}>
      {/* Icon (optional) */}
      {icon && <div className="metrics-card-icon">{icon}</div>}

      {/* Main Content */}
      <div className="metrics-card-content">
        <h3 className="metrics-card-title">{title}</h3>
        <div className="metrics-card-value">{value}</div>
        {subtitle && <div className="metrics-card-subtitle">{subtitle}</div>}
      </div>
    </div>
  );
}
