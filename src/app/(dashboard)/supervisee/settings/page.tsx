import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { AgentTone, EscalationSensitivity } from '@/types';

const tones: AgentTone[] = ['gentle', 'neutral', 'firm'];
const sensitivities: EscalationSensitivity[] = ['low', 'medium', 'high'];

export default function SuperviseeSettingsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">Agent settings</h1>

      <Card title="Agent tone">
        <div className="flex flex-col gap-2">
          {tones.map((tone) => (
            <label
              key={tone}
              className="flex cursor-pointer items-center gap-3 capitalize"
            >
              <input
                type="radio"
                name="agentTone"
                value={tone}
                className="accent-indigo-600"
              />
              <span className="text-sm text-gray-700">{tone}</span>
            </label>
          ))}
        </div>
      </Card>

      <Card title="Escalation sensitivity">
        <p className="mb-3 text-xs text-gray-500">
          How quickly the agent escalates repeated drift to your supervisor.
        </p>
        <div className="flex flex-col gap-2">
          {sensitivities.map((s) => (
            <label
              key={s}
              className="flex cursor-pointer items-center gap-3 capitalize"
            >
              <input
                type="radio"
                name="escalationSensitivity"
                value={s}
                className="accent-indigo-600"
              />
              <span className="text-sm text-gray-700">{s}</span>
            </label>
          ))}
        </div>
      </Card>

      <Card title="Focus hours">
        <div className="grid grid-cols-2 gap-4">
          <Input id="start" label="Start" type="time" defaultValue="09:00" />
          <Input id="end" label="End" type="time" defaultValue="17:00" />
        </div>
      </Card>

      <Card title="Supervisor notifications">
        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-3">
            <input type="checkbox" className="accent-indigo-600" />
            <span className="text-sm text-gray-700">Email alerts</span>
          </label>
          <label className="flex items-center gap-3">
            <input type="checkbox" className="accent-indigo-600" />
            <span className="text-sm text-gray-700">SMS alerts</span>
          </label>
          <Input
            id="supervisor-email"
            label="Supervisor email"
            type="email"
            placeholder="supervisor@example.com"
          />
          <Input
            id="supervisor-phone"
            label="Supervisor phone"
            type="tel"
            placeholder="+1 555 000 0000"
          />
        </div>
      </Card>

      <Button size="lg" className="w-full">
        Save settings
      </Button>
    </div>
  );
}
