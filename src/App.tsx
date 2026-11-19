import { useEffect, useMemo, useState } from 'react';

type BillingMode = 'invoice' | 'hourly';
type Settings = {
  gross: number;
  proRate: number;
  inssRate: number;
  dasRate: number;
  accounting: number;
  billingMode: BillingMode;
  hourlyRate: number;
  monthlyHours: number;
};
type NumericSetting = Exclude<keyof Settings, 'billingMode'>;
type HourlySetting = 'hourlyRate' | 'monthlyHours';

const DEFAULTS: Settings = {
  gross: 10000,
  proRate: 28,
  inssRate: 11,
  dasRate: 6,
  accounting: 168,
  billingMode: 'invoice',
  hourlyRate: 100,
  monthlyHours: 100,
};
const STORAGE_KEY = 'pj-net-revenue-settings-v2';
const PRESETS = [5000, 10000, 15000, 20000];
const LIMITS: Record<NumericSetting, number> = {
  gross: 1_000_000_000_000,
  proRate: 100,
  inssRate: 100,
  dasRate: 100,
  accounting: 1_000_000_000,
  hourlyRate: 1_000_000_000,
  monthlyHours: 744,
};
const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const number = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
const decimal = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function formatMoney(value: number): string {
  return currency.format(Number.isFinite(value) ? value : 0);
}

function parseMoney(input: string): number {
  let value = input.replace(/[^\d,.-]/g, '').trim();
  if (value.includes(',')) value = value.replace(/\./g, '').replace(',', '.');
  else if ((value.match(/\./g) || []).length > 1) value = value.replace(/\./g, '');
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(LIMITS.gross, Math.max(0, parsed)) : 0;
}

function formatAmount(value: number): string {
  return decimal.format(value);
}

function validStoredSettings(value: unknown): Partial<Settings> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const stored = value as Record<string, unknown>;
  const valid: Partial<Settings> = {};

  (Object.keys(LIMITS) as NumericSetting[]).forEach((key) => {
    const item = stored[key];
    if (typeof item === 'number' && Number.isFinite(item) && item >= 0 && item <= LIMITS[key]) {
      Object.assign(valid, { [key]: item });
    }
  });
  if (stored.billingMode === 'invoice' || stored.billingMode === 'hourly') {
    valid.billingMode = stored.billingMode;
  }
  return valid;
}

function loadSettings(): Settings {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as unknown;
    const settings = { ...DEFAULTS, ...validStoredSettings(stored) };
    if (settings.billingMode === 'hourly') {
      settings.gross = Math.min(LIMITS.gross, settings.hourlyRate * settings.monthlyHours);
    }
    return settings;
  } catch {
    return { ...DEFAULTS };
  }
}

type CardProps = { label: string; value: number; note: string; primary?: boolean };

function Card({ label, value, note, primary = false }: CardProps) {
  return <article className={`panel card${primary ? ' primary' : ''}`}>
    <div className="card-label">{label}</div>
    <div className="card-value">{formatMoney(value)}</div>
    <div className="card-note">{note}</div>
  </article>;
}

type ParameterProps = {
  id: string;
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  step: string;
  explanation: string;
  max: number;
  onChange: (value: string) => void;
};

function Parameter({ id, label, value, prefix, suffix, step, explanation, max, onChange }: ParameterProps) {
  return <div className="param">
    <label htmlFor={id}>{label}</label>
    <div className="param-control">
      {prefix && <span>{prefix}</span>}
      <input id={id} type="number" min="0" max={max} step={step} value={value} onChange={(event) => onChange(event.target.value)} aria-describedby={`${id}-help`} />
      {suffix && <span>{suffix}</span>}
    </div>
    <small id={`${id}-help`}>{explanation}</small>
  </div>;
}

function App() {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [grossText, setGrossText] = useState(() => formatAmount(loadSettings().gross));
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // O simulador continua funcionando mesmo quando o navegador bloqueia o armazenamento local.
    }
  }, [settings]);

  useEffect(() => {
    if (settings.billingMode === 'hourly') setGrossText(formatAmount(settings.gross));
  }, [settings.billingMode, settings.gross]);

  const values = useMemo(() => {
    const gross = settings.gross;
    const proLabore = gross * settings.proRate / 100;
    const inss = proLabore * settings.inssRate / 100;
    const das = gross * settings.dasRate / 100;
    const directCosts = inss + das + settings.accounting;
    const profitDistribution = gross - das - settings.accounting - proLabore;
    const netProLabore = proLabore - inss;
    const net = netProLabore + profitDistribution;
    return { gross, proLabore, inss, das, directCosts, profitDistribution, netProLabore, net };
  }, [settings]);

  function updateSetting(key: NumericSetting, input: string): void {
    const parsed = Number(input);
    const value = Number.isFinite(parsed) ? Math.min(LIMITS[key], Math.max(0, parsed)) : 0;
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function updateHourlySetting(key: HourlySetting, input: string): void {
    const parsed = Number(input);
    const value = Number.isFinite(parsed) ? Math.min(LIMITS[key], Math.max(0, parsed)) : 0;
    setSettings((current) => {
      const next = { ...current, [key]: value };
      next.gross = Math.min(LIMITS.gross, next.hourlyRate * next.monthlyHours);
      return next;
    });
  }

  function changeGross(value: string): void {
    setGrossText(value);
    updateSetting('gross', String(parseMoney(value)));
  }

  function chooseGross(value: number): void {
    setGrossText(formatAmount(value));
    updateSetting('gross', String(value));
  }

  function chooseMode(mode: BillingMode): void {
    setSettings((current) => ({
      ...current,
      billingMode: mode,
      gross: mode === 'hourly' ? Math.min(LIMITS.gross, current.hourlyRate * current.monthlyHours) : current.gross,
    }));
  }

  function restoreDefaults(): void {
    setSettings({ ...DEFAULTS });
    setGrossText(formatAmount(DEFAULTS.gross));
  }

  async function copySummary(): Promise<void> {
    const text = [
      'SIMULAÇÃO DE FATURAMENTO LÍQUIDO PJ',
      settings.billingMode === 'hourly'
        ? `Estimativa por hora: ${formatMoney(settings.hourlyRate)} × ${number.format(settings.monthlyHours)} horas/mês`
        : null,
      `Faturamento bruto: ${formatMoney(values.gross)}`,
      `Pró-labore (${number.format(settings.proRate)}%): ${formatMoney(values.proLabore)}`,
      `Transferência do pró-labore após INSS: ${formatMoney(values.netProLabore)}`,
      `INSS (${number.format(settings.inssRate)}% do pró-labore): ${formatMoney(values.inss)}`,
      `DAS (${number.format(settings.dasRate)}% do faturamento): ${formatMoney(values.das)}`,
      `Contabilidade: ${formatMoney(settings.accounting)}`,
      `Impostos + contabilidade: ${formatMoney(values.directCosts)}`,
      `Distribuição de lucros prevista: ${formatMoney(values.profitDistribution)}`,
      `Valor líquido previsto: ${formatMoney(values.net)}`,
    ].filter((line): line is string => line !== null).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  }

  return <main className="shell">
    <div className="topline"><span className="mark" aria-hidden="true">↗</span> Planejamento financeiro PJ</div>
    <header className="hero">
      <div><h1>Simulador de Faturamento<br className="desktop-break" /> Líquido PJ</h1><p>Entenda quanto entra, quanto sai e quanto fica disponível no mês.</p></div>
      <div className="live"><span className="dot" /> Cálculo atualizado em tempo real</div>
    </header>

    <section className="panel input-panel" aria-labelledby="gross-label">
      <div className="billing-modes" role="group" aria-label="Modo de cálculo do faturamento">
        <button type="button" className={settings.billingMode === 'invoice' ? 'selected' : ''} aria-pressed={settings.billingMode === 'invoice'} onClick={() => chooseMode('invoice')}>Informar valor da nota</button>
        <button type="button" className={settings.billingMode === 'hourly' ? 'selected' : ''} aria-pressed={settings.billingMode === 'hourly'} onClick={() => chooseMode('hourly')}>Calcular por valor/hora</button>
      </div>
      {settings.billingMode === 'hourly' && <div className="hourly-inputs">
        <div className="param"><label htmlFor="hourly-rate">Valor da hora</label><div className="param-control"><span>R$</span><input id="hourly-rate" type="number" min="0" max={LIMITS.hourlyRate} step="0.01" value={settings.hourlyRate} onChange={(event) => updateHourlySetting('hourlyRate', event.target.value)} /></div></div>
        <div className="param"><label htmlFor="monthly-hours">Horas previstas no mês</label><div className="param-control"><input id="monthly-hours" type="number" min="0" max={LIMITS.monthlyHours} step="0.5" value={settings.monthlyHours} onChange={(event) => updateHourlySetting('monthlyHours', event.target.value)} /><span>horas</span></div></div>
        <p className="hourly-formula">Nota estimada = valor da hora × horas previstas no mês</p>
      </div>}
      <div className="field-head"><label id="gross-label" htmlFor="gross">{settings.billingMode === 'hourly' ? 'Valor estimado da nota' : 'Faturamento bruto previsto'}</label><span className="hint">{settings.billingMode === 'hourly' ? 'Preenchido automaticamente pelo cálculo por hora' : 'Informe o valor mensal previsto na sua nota fiscal'}</span></div>
      <div className="money-input"><span className="currency-prefix" aria-hidden="true">R$</span><input id="gross" inputMode="decimal" autoComplete="off" value={grossText} readOnly={settings.billingMode === 'hourly'} onChange={(event) => changeGross(event.target.value)} onBlur={() => setGrossText(formatAmount(settings.gross))} aria-label="Faturamento bruto previsto em reais" /></div>
      {settings.billingMode === 'invoice' && <div className="suggestions"><span>Sugestões rápidas</span>{PRESETS.map((amount) => <button type="button" key={amount} className={settings.gross === amount ? 'active' : ''} onClick={() => chooseGross(amount)}>{formatMoney(amount).replace(',00', '')}</button>)}</div>}
    </section>

    <section className="summary" aria-label="Resumo do faturamento">
      <Card label="Faturamento bruto" value={values.gross} note="Receita mensal prevista" />
      <Card label={`Pró-labore (${number.format(settings.proRate)}%)`} value={values.proLabore} note={`Transferência após INSS: ${formatMoney(values.netProLabore)}`} />
      <Card label="Impostos + contabilidade" value={values.directCosts} note="DAS + INSS + contabilidade" />
      <Card label="Distribuição de lucros prevista" value={values.profitDistribution} note="Após DAS, contabilidade e pró-labore" />
      <Card label="Valor líquido previsto" value={values.net} note="Pró-labore líquido + distribuição" primary />
    </section>

    <section className="grid">
      <article className="panel detail">
        <div className="section-title"><h2>Detalhamento dos valores</h2><small>Estimativa mensal</small></div>
        <p className="sub">Bases de cálculo e saídas previstas para o cenário atual.</p>
        <div className="table-wrap"><table><thead><tr><th>Descrição</th><th>Regra / base de incidência</th><th>Valor</th></tr></thead>
          <tbody>
            <tr><td>Faturamento bruto<span className="detail-sub">{settings.billingMode === 'hourly' ? `${formatMoney(settings.hourlyRate)} × ${number.format(settings.monthlyHours)} horas/mês` : 'Receita prevista no mês'}</span></td><td className="rule">{settings.billingMode === 'hourly' ? 'Valor da hora × horas do mês' : 'Valor informado'}</td><td>{formatMoney(values.gross)}</td></tr>
            <tr><td>Pró-labore<span className="detail-sub">Retirada simulada do sócio</span></td><td className="rule">{number.format(settings.proRate)}% sobre faturamento bruto</td><td>{formatMoney(values.proLabore)}</td></tr>
            <tr><td>INSS sobre pró-labore<span className="detail-sub">Contribuição previdenciária simulada</span></td><td className="rule">{number.format(settings.inssRate)}% sobre pró-labore de {formatMoney(values.proLabore)}</td><td>{formatMoney(values.inss)}</td></tr>
            <tr><td>Imposto DAS<span className="detail-sub">Simulação de faixa inicial do Anexo III</span></td><td className="rule">{number.format(settings.dasRate)}% sobre faturamento bruto</td><td>{formatMoney(values.das)}</td></tr>
            <tr><td>Contabilidade<span className="detail-sub">Custo fixo mensal configurado</span></td><td className="rule">Valor mensal configurado</td><td>{formatMoney(settings.accounting)}</td></tr>
            <tr><td>Distribuição de lucros prevista<span className="detail-sub">Valor remanescente após despesas e pró-labore</span></td><td className="rule">Faturamento − DAS − contabilidade − pró-labore</td><td>{formatMoney(values.profitDistribution)}</td></tr>
            <tr className="total-row"><td colSpan={2}>Custos e impostos diretos (DAS + INSS + contabilidade)</td><td>{formatMoney(values.directCosts)}</td></tr>
            <tr><td>Pró-labore líquido<span className="detail-sub">Pró-labore após desconto do INSS</span></td><td className="rule">Pró-labore − INSS</td><td>{formatMoney(values.netProLabore)}</td></tr>
            <tr className="total-row"><td colSpan={2}>Valor líquido previsto (pró-labore líquido + distribuição)</td><td>{formatMoney(values.net)}</td></tr>
          </tbody></table></div>
        <div className="actions"><button className="copy" type="button" onClick={copySummary}>Copiar resumo</button><span className="saved" role="status">{copied ? 'Resumo copiado.' : 'Parâmetros salvos neste dispositivo.'}</span></div>
      </article>

      <aside className="panel insight">
        <h2>Como o valor se distribui</h2><p>O pró-labore é a retirada do sócio. Os custos diretos são pagos à parte e incluem impostos e contabilidade.</p>
        <div className="split">
          <div className="split-row"><span>Pró-labore bruto</span><strong>{formatMoney(values.proLabore)}</strong></div>
          <div className="split-row"><span>INSS descontado do pró-labore</span><strong>{formatMoney(values.inss)}</strong></div>
          <div className="split-row"><span>Pró-labore líquido</span><strong>{formatMoney(values.netProLabore)}</strong></div>
          <div className="split-row"><span>Impostos + contabilidade</span><strong>{formatMoney(values.directCosts)}</strong></div>
        </div>
        <div className="split-row"><span>Distribuição de lucros prevista</span><strong>{formatMoney(values.profitDistribution)}</strong></div>
        <div className="final-available"><span>Valor líquido previsto</span><strong>{formatMoney(values.net)}</strong></div>
      </aside>
    </section>

    <details className="panel config">
      <summary>Parâmetros e definição das regras</summary>
      <div className="config-body">
        <p>Use estes campos para montar cenários. As taxas são aplicadas às bases descritas; o resultado não substitui a apuração da sua contabilidade.</p>
        <div className="params">
          <Parameter id="pro-rate" label="Pró-labore sobre faturamento" value={settings.proRate} suffix="%" onChange={(value) => updateSetting('proRate', value)} step="0.1" max={LIMITS.proRate} explanation="Percentual do faturamento bruto destinado à retirada simulada do sócio." />
          <Parameter id="inss-rate" label="INSS sobre pró-labore" value={settings.inssRate} suffix="%" onChange={(value) => updateSetting('inssRate', value)} step="0.1" max={LIMITS.inssRate} explanation="Percentual aplicado ao pró-labore calculado, não ao faturamento bruto." />
          <Parameter id="das-rate" label="DAS sobre faturamento" value={settings.dasRate} suffix="%" onChange={(value) => updateSetting('dasRate', value)} step="0.1" max={LIMITS.dasRate} explanation="Alíquota estimada aplicada diretamente ao faturamento bruto." />
          <Parameter id="accounting" label="Contabilidade mensal" value={settings.accounting} prefix="R$" onChange={(value) => updateSetting('accounting', value)} step="1" max={LIMITS.accounting} explanation="Custo fixo mensal. Informe o valor cobrado pelo escritório contábil." />
        </div>
        <button className="restore" type="button" onClick={restoreDefaults}>Restaurar padrão (28% / 11% / 6% / R$ 168)</button>
      </div>
    </details>

    <p className="footnote">Simulação simplificada para planejamento. As alíquotas efetivas dependem da atividade, do faturamento acumulado e do enquadramento tributário. Confirme as regras e valores com sua contabilidade.</p>
  </main>;
}

export default App;
