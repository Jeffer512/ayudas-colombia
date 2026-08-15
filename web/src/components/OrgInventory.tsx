import {
  HELP_ORG_ITEM_KIND_BADGE,
  HELP_ORG_ITEM_KIND_LABELS,
} from '../lib/constants'
import { formatItemQuantity, timeAgo } from '../lib/format'
import type { HelpOrgItem, HelpOrgItemKind } from '../lib/types'

const SECTION_META: Record<HelpOrgItemKind, { title: string; color: string }> = {
  available: { title: 'Tenemos disponible', color: 'text-emerald-700 dark:text-emerald-300' },
  needed: { title: 'Necesitamos', color: 'text-rose-700 dark:text-rose-300' },
}

function lastUpdatedAt(items: HelpOrgItem[]): Date {
  return items.reduce((max, item) => {
    const date = new Date(item.updatedAt)
    return date > max ? date : max
  }, new Date(0))
}

export default function OrgInventory({
  items,
  limit,
}: {
  items: HelpOrgItem[]
  limit?: number
}) {
  const sections = (Object.keys(SECTION_META) as HelpOrgItemKind[]).filter(
    (kind) => items.some((item) => item.kind === kind),
  )

  if (sections.length === 0) return null

  const shown = (kind: HelpOrgItemKind) => {
    const list = items.filter((item) => item.kind === kind)
    return limit ? list.slice(0, limit) : list
  }

  return (
    <div className="mt-3 space-y-3">
      {sections.map((kind) => (
        <div key={kind}>
          <p
            className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${SECTION_META[kind].color}`}
          >
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                HELP_ORG_ITEM_KIND_BADGE[kind].badgeClass
              }`}
            />
            {HELP_ORG_ITEM_KIND_LABELS[kind]}
          </p>
          <ul className="mt-1 space-y-1">
            {shown(kind).map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="text-text-main">{item.name}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    HELP_ORG_ITEM_KIND_BADGE[kind].badgeClass
                  } ${HELP_ORG_ITEM_KIND_BADGE[kind].textClass}`}
                >
                  {formatItemQuantity(item.quantity, item.unit)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <p className="text-xs text-text-muted">
        Inventario actualizado {timeAgo(lastUpdatedAt(items).toISOString())}
      </p>
    </div>
  )
}