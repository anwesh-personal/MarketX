// Email Hub shared types

export interface MtaList {
  listUid: string
  name: string
  subscriberCount: number
}

export interface CampaignStats {
  campaignId: string
  campaignName?: string
  sent: number
  opens: number
  uniqueOpens: number
  clicks: number
  uniqueClicks: number
  replies: number
  bounces: number
  complaints: number
  openRate: number
  clickRate: number
  replyRate: number
  bounceRate: number
}

export interface Campaign {
  campaignUid: string
  name: string
  status: string
  type: string
  list: { list_uid: string; name: string } | null
  sendAt: string | null
  stats: CampaignStats | null
}

export interface DeliveryServer {
  id: number
  name: string
}

export type TabId = 'lists' | 'campaigns' | 'servers'

export const TABS: { id: TabId; label: string; emoji: string }[] = [
  { id: 'lists', label: 'Subscriber Lists', emoji: '📋' },
  { id: 'campaigns', label: 'Campaigns', emoji: '🚀' },
  { id: 'servers', label: 'Delivery Servers', emoji: '🖥️' },
]

export const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  sent:              { bg: 'bg-surfaceElevated', text: 'text-success',       dot: 'bg-success' },
  sending:           { bg: 'bg-surfaceElevated', text: 'text-info',          dot: 'bg-info' },
  draft:             { bg: 'bg-surface',         text: 'text-textTertiary',  dot: 'bg-textTertiary' },
  paused:            { bg: 'bg-surfaceElevated', text: 'text-warning',       dot: 'bg-warning' },
  'pending-sending': { bg: 'bg-surfaceElevated', text: 'text-warning',       dot: 'bg-warning' },
  'pending-delete':  { bg: 'bg-surfaceElevated', text: 'text-error',         dot: 'bg-error' },
  processing:        { bg: 'bg-surfaceElevated', text: 'text-info',          dot: 'bg-info' },
  completed:         { bg: 'bg-surfaceElevated', text: 'text-success',       dot: 'bg-success' },
  blocked:           { bg: 'bg-surfaceElevated', text: 'text-error',         dot: 'bg-error' },
}
