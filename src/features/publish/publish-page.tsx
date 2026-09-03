import { useMutation } from '@tanstack/react-query'
import { Send } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { toastApiError } from '@/lib/api'
import { endpoints } from '@/lib/endpoints'
import type { PublishRequest } from '@/lib/types'

export function PublishPage() {
  const { t } = useTranslation()
  const [topic, setTopic] = useState('')
  const [topics, setTopics] = useState('')
  const [payload, setPayload] = useState('')
  const [qos, setQos] = useState('0')
  const [retain, setRetain] = useState(false)
  const [encoding, setEncoding] = useState<'plain' | 'base64'>('plain')
  const [clientid, setClientid] = useState('')
  const [expiry, setExpiry] = useState('')
  const [responseTopic, setResponseTopic] = useState('')

  const mut = useMutation({
    mutationFn: (body: PublishRequest) => endpoints.publish(body),
    onSuccess: () => toast.success(t('publish.ok')),
    onError: toastApiError,
  })

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!topic.trim() && !topics.trim()) {
      toast.error(t('publish.needTopic'))
      return
    }
    const body: PublishRequest = {
      payload,
      qos: Number(qos) as 0 | 1 | 2,
      retain,
      encoding,
    }
    if (topic.trim()) body.topic = topic.trim()
    if (topics.trim()) body.topics = topics.trim()
    if (clientid.trim()) body.clientid = clientid.trim()
    const properties: NonNullable<PublishRequest['properties']> = {}
    if (expiry) properties.message_expiry_interval = Number(expiry)
    if (responseTopic.trim()) properties.response_topic = responseTopic.trim()
    if (Object.keys(properties).length) body.properties = properties
    mut.mutate(body)
  }

  return (
    <div>
      <PageHeader title={t('publish.title')} description={t('publish.desc')} />
      <Card className="max-w-3xl">
        <CardContent className="p-6">
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('common.topic')}>
                <Input className="font-mono" value={topic} onChange={(e) => setTopic(e.target.value)} />
              </Field>
              <Field label={`topics (${t('publish.topicsHint')})`}>
                <Input className="font-mono" value={topics} onChange={(e) => setTopics(e.target.value)} />
              </Field>
              <Field label={t('common.qos')}>
                <Select value={qos} onValueChange={setQos}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0</SelectItem>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label={t('publish.encoding')}>
                <Select value={encoding} onValueChange={(v) => setEncoding(v as 'plain' | 'base64')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="plain">{t('publish.plain')}</SelectItem>
                    <SelectItem value="base64">{t('publish.base64')}</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label={t('publish.clientid')}>
                <Input className="font-mono" value={clientid} onChange={(e) => setClientid(e.target.value)} placeholder="system" />
              </Field>
              <Field label={t('publish.expiry')}>
                <Input type="number" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
              </Field>
              <Field label={t('publish.responseTopic')}>
                <Input className="font-mono" value={responseTopic} onChange={(e) => setResponseTopic(e.target.value)} />
              </Field>
              <div className="flex items-center gap-3 pt-6">
                <Switch checked={retain} onCheckedChange={setRetain} id="retain" />
                <Label htmlFor="retain">{t('publish.retain')}</Label>
              </div>
            </div>
            <Field label={t('publish.payload')}>
              <Textarea className="min-h-40 font-mono" value={payload} onChange={(e) => setPayload(e.target.value)} />
            </Field>
            <Button type="submit" disabled={mut.isPending}>
              <Send />
              {mut.isPending ? t('publish.sending') : t('publish.send')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  )
}
