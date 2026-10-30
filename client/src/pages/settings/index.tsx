import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useTheme } from '@/lib/theme';
import { UI_THEMES, type UiTheme } from '../../../../shared/ui';

const LABEL: Record<UiTheme, string> = { light: 'Light', dark: 'Dark', system: 'System' };

/** /settings: the office's settings. A placeholder with the appearance section; the settings issue brings the rest. */
export default function SettingsPage() {
  const [theme, setTheme] = useTheme();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" description="How the office runs. Saved in the office, for every browser." />
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>The dashboard's theme.</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup value={theme} onValueChange={(v) => setTheme(v as UiTheme)} className="flex flex-wrap gap-4" aria-label="Theme">
            {UI_THEMES.map((t) => (
              <div key={t} className="flex items-center gap-2">
                <RadioGroupItem value={t} id={`theme-${t}`} />
                <Label htmlFor={`theme-${t}`}>{LABEL[t]}</Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>
    </div>
  );
}
